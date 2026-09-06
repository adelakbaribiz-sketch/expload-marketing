# Performance Engineering — Phase 16

**Every finding below was measured, not guessed** — against a running dev server, using real seeded data (305 leads, 15 email campaigns) and the Prometheus metrics/structured-logging infrastructure Phase 15 built. Where measurement wasn't possible in this environment (queue concurrency — see §5), that's stated explicitly rather than presented as measured.

## Method

Started `next dev`, signed up a real test tenant, seeded realistic data volume via a direct DB script, then hit real endpoints with `performance.now()`-timed `fetch()` calls from the browser, cross-checked against `GET /api/metrics`'s `http_request_duration_seconds` / `db_query_duration_seconds` histograms (Phase 15). All test data and the temporary `METRICS_TOKEN` used to scrape metrics were removed after measurement.

## 1. Frontend Load

Code-splitting (Phase 09: all 63 dashboard views + the landing page via `next/dynamic`, `src/app/page.tsx`) was already in place and confirmed still correct. Production build: `.next/static/chunks` totals 4.3MB raw across every route's code-split chunk (no single page load pulls all of it — a logged-out visitor to `/` only downloads the landing page + shared framework chunks, not the 63 dashboard views). `compress: true` is set; `next.config.ts` sets 1-year immutable cache headers on `/_next/static/*` and `/fonts/*`. `next/image` is unused (0 components; 1 plain `<img>` for a generated QR-code data URL, not a real optimization opportunity). **No change made here** — this was already in a reasonable state from Phase 09's own work; re-measuring confirmed it, didn't find a new problem.

## 2. API Latency — measured, one real bottleneck found and fixed

Baseline steady-state latencies (5 requests each, first excluded as dev-compile noise):

| Endpoint | Before | Notes |
|---|---|---|
| `GET /api/leads` (200 rows) | ~50-70ms | fine |
| `GET /api/leads?q=...` (4-field OR search, 305 rows) | ~64ms | fine |
| `GET /api/campaigns` | ~60-90ms | fine |
| `GET /api/stats` | ~87ms | fine |
| `GET /api/dashboard/unified` | **~97-184ms** | 37 parallel queries — see §4 |
| `POST /api/leads/search` (10 results, enrich+persist) | **~21,200ms** | sequential AI calls — see §5 |

`dashboard/unified` and `campaigns`/`stats` GETs turned out to have **no `withProtection` at all** — the same gap Phase 15 found and fixed once for `leads` GET, recurring here. This meant zero rate limiting and zero visibility to this phase's own measurement tooling. **Fixed**: `dashboard/unified` now goes through `withProtection` (§4); `campaigns`/`stats` were left as-is (not the routes this phase's measurement needed instrumented) — same "found, not mechanically fixed everywhere" call `OBSERVABILITY.md` §8 already made for the other 58.

## 3. Database — indexing gap found and fixed

304 `@@index` entries already exist in `prisma/schema.prisma` (Phase 04). Spot-checking hot query paths found **`EmailCampaign` was the one model in the entire schema with zero `@@index` entries**, despite every real query against it filtering by `tenantId` (list, counts across 8+ files, a monthly-report date-range query). **Fixed**: added `@@index([tenantId, createdAt])`, matching the exact pattern every other tenant-scoped, list/date-sorted model already uses. Applied via `prisma db push` (no migration system yet — `adr/0006`, unchanged from every prior phase that touched the schema) and `prisma generate`. At the current seeded volume (305 leads / 15 campaigns) this made no measurable difference — SQLite full-scans 15 rows instantly regardless of an index — so this is deliberately framed as **consistency/correctness for scale, not a measured speedup at today's data volume**; the value shows up once a tenant has thousands of campaigns, not now.

## 4. Queries — `dashboard/unified`'s 37-query fan-out, measured and cached

`GET /api/dashboard/unified` issues **37 independent `count()`/`aggregate()` queries in `Promise.all`** to build the cross-phase KPI summary. Individually each is fast (`db_query_duration_seconds` showed 92% of all queries across the whole measurement session completing under 5ms), but the sheer count made this route the slowest plain-read endpoint measured (~97-184ms steady state, vs ~50-90ms for single/few-query endpoints).

**Fixed with caching, not a query rewrite**: dashboard KPIs tolerate a few seconds of staleness with zero correctness impact — a completely standard tradeoff for exactly this kind of summary view. Added `src/lib/cache/ttl-cache.ts` (dependency-free, in-process, `globalThis`-cached for the same cross-route-bundle-singleton reason `OBSERVABILITY.md` documents in detail for the Prometheus registry — the identical bug class would have silently broken this cache too if built the naive way, so the lesson from that phase was applied here from the start rather than rediscovered). 30-second TTL, keyed per-tenant.

**Measured result**: steady-state latency dropped from ~97-184ms to **~20-39ms** (matching the floor already observed for other simple `withProtection`-wrapped GETs — i.e., the 37-query cost is now genuinely eliminated on cache hits, confirmed by comparison against that floor, not just "it got faster").

## 5. AI Processing — the phase's most severe finding

**`POST /api/leads/search`** (with `enrich: true`) ran its lead-enrichment loop as a **sequential `for` loop with `await extractLeadInfo()` inside** (already flagged, unaddressed, in `BACKEND-ARCHITECTURE.md` from an earlier phase). Measured with real configured provider keys (Groq/Cerebras/OpenRouter/Mistral/HuggingFace — all present in this environment, though see below): **21.2 seconds for 10 leads** — ~2.1s/lead. At `maxResults`'s cap of 20, this projects to 40+ seconds synchronous response time, well past what a browser or load balancer tolerates.

Investigating *why* each call cost ~2.1s (not assumed — traced via structured logs) found the real driver was **not network latency** — all 5 configured provider keys are empty strings in this environment, so `provider.complete()` throws instantly with no network call. The actual cost was `llmAggregator.complete()`'s fallback loop doing **~2 DB round trips (quota check) + 1 DB write (usage record) per candidate provider, for all 5 providers, before giving up** — 15 sequential DB operations per single failed extraction, for a provider that was structurally incapable of succeeding.

**Two fixes applied, in order of how much each contributed**:
1. **`src/lib/llm/aggregator.ts`**: added a cheap synchronous "does this provider have any API key at all" check *before* the quota-check/audit-write machinery, skipping providers with literally no key configured without touching the DB for them at all. `loadApiKey()` only ever resolves an env var today (no per-tenant DB key yet), so this check is exactly as complete as the existing one, just moved earlier.
2. **`src/app/api/leads/search/route.ts`**: replaced the sequential `for` loop with a new `src/lib/async/concurrency.ts` (`mapWithConcurrency`, dependency-free — no `p-limit` needed for a dozen lines), running up to 5 enrichment calls at once. Confirmed safe: the aggregator's quota/cooldown tracking (`src/lib/llm/aggregator.ts`) is keyed per-provider and DB-persisted, not per-caller-concurrency-assuming, so concurrent calls don't bypass it.

**Measured result**: 21.2s → **6.1-6.3s** for the same 10-lead request (reproduced after a clean server restart) — a ~3.4x improvement. The remaining ~600ms/lead in *this* dev environment is not fully explained by DB-query time alone (the DB histogram shows sub-5ms per query); the most likely remaining cause is SQLite's single-writer lock serializing the concurrent `Lead`/`Activity`/`Notification` writes this loop still performs per lead — a SQLite-specific characteristic of this dev database, not expected to reproduce the same way against Postgres (true concurrent writes via MVCC) in a production deployment. Stated honestly as reasoned, not re-measured against Postgres.

**Separately, a real latent risk found (not the same as the above) and left unfixed, documented**: none of the 5 LLM provider files (`src/lib/llm/providers/*.ts`) put a timeout on their `fetch()` calls to the actual completion endpoint. `src/lib/integrations/types.ts`'s `withTimeout()` helper already exists and is used by Email/SMS/Payment (Phase 13) for exactly this reason — a hung vendor connection must not hang the request that triggered it — but that phase's own comment explicitly says AI "already has its own adapter... and isn't duplicated here." That reasoning didn't anticipate this specific gap: with all keys correctly configured and a provider that hangs instead of failing fast, a single `extractLeadInfo()` call has no upper bound today. **Not fixed this phase** (couldn't be measured live — this environment's keys are empty, so no real provider call was ever actually attempted) — flagged as the top follow-up for this file, with the exact fix (wrap each provider's `chat/completions` fetch in the existing `withTimeout()`) already identified.

## 6. Caching — applied where measured (§4), not elsewhere

No caching layer existed anywhere before this phase (`src/lib/cache/ttl-cache.ts` is new). Applied to `dashboard/unified` only — the one endpoint measurement showed was both slow-relative-to-its-peers and safe to cache (read-heavy, tolerant of staleness). `stats` (~87ms) and other endpoints were left uncached: no measurement showed them as a bottleneck, and caching something that isn't slow just adds staleness risk for no benefit — consistent with this phase's own "no optimization without measurement" mandate.

## 7. Connection Pooling

`prisma/schema.prisma`'s datasource has no `connection_limit`/`pool_timeout` tuning — moot for SQLite (this dev environment and, per the schema's own comment, the intended path before Postgres is activated for production). Already documented in `DATABASE-AUDIT.md` as a gap to address "when/if the commented-out Postgres provider block... is activated" — **not re-fixed here**, since there's nothing to tune against SQLite, and guessing pool numbers for a Postgres deployment that isn't running would be exactly the kind of unmeasured change this phase's own instruction rules out.

## 8. Queue — could not be measured live, reasoned from code instead

`src/lib/queue/index.ts`'s `processJobQueue()` processes **one job at a time** (a `while(true)` loop, no concurrency), polling every 1000ms when idle. This phase could not live-measure real queue throughput: this dev environment's `REDIS_URL` is configured but no Redis is actually reachable (a pre-existing, already-documented gap from Phase 10/15), so `enqueue()` 500s here rather than running. Reasoned, not measured: the queue's only two real job types today are `email_campaign` (which already does its own internal batching+concurrency inside `sendCampaign()` — batches of 10, `Promise.all` per batch) and `document_extract`; `lead_enrich` exists but per `BACKEND-ARCHITECTURE.md` has no live caller. Given that, the outer queue loop being sequential mostly matters if *many* jobs are queued in a burst, which isn't this app's current real usage shape — **not changed this phase**, flagged as a candidate only if real job volume grows enough to matter, which needs actual production metrics (now collectible via `queue_depth`/`queue_job_duration_seconds`, Phase 15) to confirm before touching it.

## 9. File Processing

`document_extract` (onboarding document text extraction) already runs async via the job queue (built in Phase 10, never blocks the upload request) — confirmed unchanged, no new finding.

## 10. Horizontal Scaling

`src/lib/security/rate-limit.ts` remains in-memory/single-process — the same accepted, already-documented limitation as `KNOWN-ISSUES.md` #13 ("would need a Redis-backed store... not urgent today"). **Not changed this phase**: this app runs as a single Docker container today (`docker-compose.prod.yml`), so there is no second instance for the in-memory limiter to be inconsistent across — fixing it now would be unmeasured, speculative work against a scaling scenario that doesn't exist yet, exactly what this phase's mandate says not to do. The seam for the fix (swap the module-level store for a Redis-backed one) is already noted in that file's own comment, unchanged, ready whenever horizontal scaling is actually planned.

## Deferred (prioritized, not fixed this phase)

1. **Medium** — Per-provider request timeouts on the 5 LLM provider `fetch()` calls (§5) — a real latent risk, not measured live only because no configured key in this environment ever reached a real network call.
2. **Low-Medium** — Rolling `withProtection` out to the ~58 bespoke GET routes `OBSERVABILITY.md` already catalogued (includes `campaigns`, `stats` — measured this phase but not wrapped, since they weren't the bottleneck).
3. **Low** — Postgres connection-pool tuning — moot until Postgres is actually activated for production (`adr/0006`/`DATABASE-AUDIT.md`).
4. **Low** — Queue concurrency — only worth changing once real job-burst volume is observed via the now-available `queue_depth` metric; not measurable in this environment today (Redis unreachable).
5. **Low** — Redis-backed rate limiter — deferred until horizontal scaling is actually planned, per `KNOWN-ISSUES.md` #13's existing stance, unchanged.

## Verified

`bun run typecheck` / `bun run lint` / `next build --webpack` all clean. `bun test`: 78/78 pass (69 pre-existing + 9 new: `mapWithConcurrency` ordering/concurrency-bound/error-propagation, `ttl-cache` get/set/expiry/invalidate/compute-once). Both fixes live-verified end to end against a running dev server, including after a clean server restart: `POST /api/leads/search` (10 leads, enrich+persist) went from a measured 21.2s to 6.1-6.3s; `GET /api/dashboard/unified` went from a measured 97-184ms to a steady 20-39ms. Test tenant and seeded data (305 leads, 15 campaigns) removed after measurement.

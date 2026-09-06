# Logging, Monitoring & Observability — Phase 15

## Starting point

Confirmed via `docs/PROJECT-PHASE-MATRIX.md`'s pre-existing Phase 15 row and a direct search: no APM/error-tracking/metrics tooling existed anywhere (no Sentry, Datadog, Prometheus, Grafana). All logging was 47 raw `console.log`/`console.error` calls across 17 files, no structured format, no request correlation. `GET /api/health` already existed and was genuinely well-designed (DB/Redis/SMTP checks, role-gated detail) but combined liveness and readiness into one endpoint. No metrics, no tracing, no alerting of any kind.

## 1. Logging — structured, searchable, traceable

`src/lib/observability/logger.ts` — every line is a single JSON object on stdout/stderr (`{ts, level, message, requestId, correlationId, tenantId?, userId?, meta?}`). No logging library added: the actual need (leveled JSON lines + automatic id attachment + redaction) is a few dozen lines, not a dependency — same reasoning this project already applied to CSV export in Phase 14.

- **Searchable**: JSON-per-line means any log aggregator that tails container stdout (Loki, CloudWatch, ELK, plain `docker logs`) can parse and index it with no shipping agent.
- **Traceable**: `runWithLogContext()` uses `AsyncLocalStorage` so every `logger.*()` call inside a request automatically carries its `requestId`/`correlationId` — no manual threading through every function call.
- **Levels**: `debug`/`info`/`warn`/`error`, controlled by `LOG_LEVEL` (defaults to `info` in production, `debug` otherwise).
- **Redaction**: a fixed denylist (`password`, `token`, `apiKey`, `secret`, `authorization`, `cookie`, `ssn`, `creditCard`, etc., case-insensitive) is scrubbed from `meta` at any nesting depth via a `JSON.stringify` replacer — a caller passing a whole object into `meta` can't leak a secret through it. Unit-tested (`tests/observability.test.ts`), including that a circular-reference object never throws (falls back to a minimal safe line).
- **Rollout**: wired into the highest-value existing call sites — `with-protection.ts` (every protected route's errors), `db.ts` (query/slow-query/error/warn), `src/lib/queue/index.ts` (job lifecycle, Redis connection), `src/lib/security/audit.ts` (replacing its raw `console.log`/`console.error`), `src/lib/payment/crypto.ts` (webhook handling), `src/app/api/auth/signup/route.ts`. The remaining ~30 lower-traffic `console.*` call sites (LLM aggregator, lead extractor, various report generators) are unchanged — a mechanical full rollout wasn't attempted, same "representative fix, document the rest" discipline as every prior phase's rollout items.

## 2. Metrics — Prometheus format via `GET /api/metrics`

`src/lib/observability/metrics.ts`, using `prom-client` (a new, real dependency — chosen because it's the industry-standard, self-hosted-friendly choice with zero native deps, same bar Phase 14 applied when adding `pdfkit`).

| Requirement | Metric(s) | Source |
|---|---|---|
| CPU | `process_cpu_*_seconds_total` | `prom-client`'s `collectDefaultMetrics()` — standard Node process metrics, no custom code needed |
| Memory | `nodejs_heap_*`, `process_resident_memory_bytes` | same |
| API | `http_requests_total{method,route,status}`, `http_request_duration_seconds{...}` | `with-protection.ts` — the one chokepoint every protected route already passes through |
| DB | `db_queries_total`, `db_query_duration_seconds` | Prisma's event-based query log (`db.$on('query', ...)`) |
| Queue | `queue_jobs_total{type,status}`, `queue_job_duration_seconds{type}`, `queue_depth{status}` | `src/lib/queue/index.ts` — duration is now actually computed (it wasn't before this phase — `Job.startedAt`/`completedAt` existed but nothing subtracted them) |
| Errors | `app_errors_total{source,route}` | `with-protection.ts`'s catch block + `db.$on('error')` |
| Latency | `http_request_duration_seconds` histogram | same as API |
| Business Metrics | `business_events_total{event}` | `recordBusinessEvent()` — wired into the CRUD factory's create/update/delete (all 91 domains, one chokepoint — `src/lib/crud/domain-handler.ts`), plus `signup`, `campaign.sent`, `payment.completed` at their bespoke call sites |

**Route label cardinality**: raw pathnames would create one time series per database row hit (`/api/leads/ckx7f...`, `/api/leads/ckx7g...`, ...). `normalizeRoute()` collapses cuid/uuid/numeric/job-id path segments to `:id` before use as a label (unit-tested).

**Access**: `GET /api/metrics` requires `Authorization: Bearer <METRICS_TOKEN>` (timing-safe compared). A Prometheus scraper can't carry the app's session cookie, so this route is public in `proxy.ts` and does its own auth — the same pattern already used for the crypto webhook receiver. Security-by-default: **with no `METRICS_TOKEN` configured, the endpoint refuses every request (503) rather than serving metrics with no auth at all.** Live-verified: no token → 503; wrong token → 401; correct token → 200 with real Prometheus text output.

## 3. Tracing — Request ID, Correlation ID, distributed tracing

- **Request ID**: generated in `src/proxy.ts` (the single global entry point, using `crypto.randomUUID()`) for every request that doesn't already carry one, forwarded to the route handler as a request header and echoed back as `X-Request-Id` on the response.
- **Correlation ID**: defaults to the request ID, but a caller can supply its own `X-Correlation-Id` to tie a chain of related requests together. Threaded into `with-protection.ts` via `AsyncLocalStorage` (so every log line for that request carries both automatically) and into `src/lib/queue/index.ts`'s `Job.correlationId` at `enqueue()` time — so a job processed by the background worker, potentially seconds later, still logs with the correlationId of the request that triggered it.
- **Distributed tracing**: deliberately not implemented. This app is a single-process monolith calling third-party APIs (LLM providers, payment gateways, SMTP) — there is no second internally-owned service to propagate a trace context across. Pulling in OpenTelemetry for that would be exactly the kind of unjustified dependency this project has repeatedly ruled out elsewhere (Playwright for PDF, FTS5 without migrations). The correlation ID is the practical seam already in place if that ever changes — it's a plain header, forwardable to any future internal service with no new plumbing.

## 4. Health — Liveness, Readiness, Health

The pre-existing `/api/health` combined liveness and readiness into one check. Its own code comment already reasoned carefully about the difference; this phase makes that reasoning into three actual endpoints, sharing logic via `src/lib/health/checks.ts`:

- **`GET /api/health/live`** — zero dependency checks, just "is the process responding." The endpoint an orchestrator should use to decide whether to *restart* the container — a slow/unreachable database must never trigger a restart loop, since restarting the app fixes nothing about the database.
- **`GET /api/health/ready`** — DB + configured Redis/SMTP reachability. The endpoint an orchestrator should use to decide whether to *route traffic* to the instance.
- **`GET /api/health`** — kept unchanged in shape for backward compatibility (Dockerfile's `HEALTHCHECK` and the admin panel both already depend on it): combined check, role-gated detail (booleans only for anonymous callers, full error text + config for a real SuperAdmin — this hardening already existed, untouched).

Live-verified: `/live` → 200 always; `/ready` and `/health` → 503 in this dev environment specifically because `REDIS_URL` is configured but no Redis is actually running here (a pre-existing, already-documented environment gap from Phase 10 — not something this phase introduced or needed to fix) — which is exactly the intended behavior: liveness stays green while readiness correctly reports "can't serve traffic," rather than the old combined endpoint conflating the two.

## 5. Alerts for critical errors

`src/lib/observability/alerts.ts` — `alertCritical()` always logs locally (so an alert is never silently lost even if nothing is configured), and additionally POSTs to `ALERT_WEBHOOK_URL` when set (a generic JSON body with a `text` field, Slack-incoming-webhook compatible, but works with any endpoint that accepts JSON). No real alerting *service* (PagerDuty, Opsgenie, a Slack workspace) is available in this environment, so this builds the mechanism honestly — exactly the same unconfigured-by-default pattern `SIEM_WEBHOOK_URL` already established in `src/lib/security/audit.ts`, not a faked integration.

- **Cooldown**: 5 minutes per alert `source`, so a hot failure loop (a downed dependency causing every request to 500) sends one alert, not one per request.
- **Wired into**: `with-protection.ts`'s catch block, for any response status ≥ 500 (never for 4xx — those are expected client/authorization outcomes, not incidents). `/api/health`'s combined check, when it transitions to unhealthy.

## 6. Never log sensitive data

The pre-existing codebase had no active credential leak (confirmed via a systematic review of all 47 `console.*` call sites) but had no systematic redaction layer either, and two real gaps:

- **Fixed**: `ConsoleEmailProvider`/`ConsoleSmsProvider` (the dev-mode fallback used when no SMTP/SMS gateway is configured) logged the **full message body and recipient address/phone number** to stdout with no guard — including in a production deployment that simply forgot to configure SMTP. Now: in production, this fallback logs only that the fallback fired (diagnosing the misconfiguration), never the message content or recipient PII; the full dev-mode dump is preserved for local development, where it's a genuinely useful way to see campaign content without a real mail server.
- **Structural backstop**: `logger`'s field-name denylist (§1) means even a caller who accidentally passes a password/token/secret into a log call's `meta` object gets it redacted, rather than relying on every call site remembering not to.

## 7. Real bugs found while building and live-verifying this phase

Every phase in this engagement live-verifies against a running server rather than trusting code review alone; this phase's live-verification surfaced two genuine, non-obvious defects in the observability code itself before they shipped:

1. **Critical — metrics were invisible across routes.** The first live test hit `GET /api/leads` (via `withProtection`) then scraped `/api/metrics` in the same request chain: `http_requests_total` and `queue_depth` had zero series, even though the underlying `Counter`/`Gauge` were correctly registered (HELP/TYPE lines present). Root cause: Next.js compiles each `route.ts` into its own module bundle — a plain module-level `new client.Registry()` (and a plain `new AsyncLocalStorage()` in the logger) becomes a *different object* per bundle, so an increment recorded from `with-protection.ts`'s bundle never reaches the object `/api/metrics`'s own bundle reads from. **Fixed** by caching the registry, every metric, and the logger's `AsyncLocalStorage` on `globalThis` — the exact same pattern `src/lib/db.ts` already used for the Prisma client, for the identical reason. Live-verified after the fix: `http_requests_total{method="GET",route="/api/leads",status="200"} 3` correctly matched 3 real requests.
2. **A second, related bug the first fix's investigation surfaced**: `db.ts`'s `db.$on('query', ...)` listener registration ran unconditionally at module top-level — meaning every bundle that imports `db.ts` attached its *own* extra listener to the one cached `PrismaClient` instance, so a single query fired N listeners and `db_queries_total` was inflated by however many distinct route bundles had loaded so far (observed: 155 for a workload that should have produced roughly 39). **Fixed** with a `WeakSet<PrismaClient>`-keyed guard so listeners attach at most once per actual client instance — correct whether that instance is a cross-bundle singleton (dev, this app's deployment mode) or genuinely re-created per invocation (a serverless deployment mode this codebase doesn't currently use, but the fix doesn't assume either way).

Both were confirmed via real HTTP requests against a running dev server, not inferred from reading the code — the discipline this whole engagement has used in every prior phase.

## 8. Other findings from live-verification

- **`logEnvStatus()` was dead code** — fully built (Phase-1-era, prints a startup diagnostic banner covering DB/Redis/SMTP/SIEM/etc.) but never called anywhere in the app. New `src/instrumentation.ts` (Next.js's standard startup hook) now calls it, and also eagerly imports the queue module so its Prometheus queue-depth gauge sampler registers at boot instead of only after the first job is ever enqueued.
- **`GET /api/leads` had no `withProtection` at all** (bespoke, non-CRUD-factory route) — found because its traffic simply never showed up while verifying API metrics coverage. This meant no rate limiting, no consistent error handling, and (as of this phase) no metrics/tracing either. **Fixed** — now wrapped like its sibling `POST` handler.
- **Broader, deliberately-not-fixed finding**: a repo-wide check found **58 other bespoke GET routes** with the same missing-`withProtection` shape (`admin/stats`, `campaigns/[id]`, `team/members`, `tenants/[id]`, and more — full list is reproducible via `grep -rl "^export async function GET(" src/app/api --include=route.ts`, excluding the 3 intentionally-raw health/metrics endpoints). This is the same class of gap Phase 08 fixed for all 91 CRUD-factory domains, just for bespoke routes instead — real, but a separate, large body of work needing case-by-case review (some may have deliberate custom behavior), not something to mechanically bulk-wrap inside an observability phase. Documented here as the single highest-leverage follow-up for API metrics/tracing coverage to actually be complete.
- **`queue_depth` silently disappearing when Redis is configured but unreachable** — this dev environment's `.env` has `REDIS_URL` set to a Redis that isn't running (a pre-existing, already-documented gap from Phase 10), so the gauge's `collect()` sampler throws. It was being caught and silently swallowed; now logs a `metrics.queue_depth_sample_failed` warning instead, so a real operator sees why the gauge went quiet rather than just losing the series with no explanation.

## 9. Deferred (prioritized, not fixed this phase)

1. **Medium** — Rolling `withProtection` out to the 58 bespoke GET routes identified in §8 (rate limiting + metrics + tracing coverage completeness).
2. **Medium** — Rolling the structured logger out to the ~30 remaining lower-traffic `console.*` call sites not touched this phase.
3. **Low** — No real alerting *service* is connected (no Slack workspace, no PagerDuty) in this environment — `ALERT_WEBHOOK_URL` is the integration point whenever one exists.
4. **Low** — `queue_depth`/DB-latency dashboards, Grafana, or any visualization layer on top of `/api/metrics` — out of this app's own scope; any standard Prometheus + Grafana stack can point at this endpoint today.
5. **Low** — Distributed tracing (§3) — deliberately scoped out; revisit only if a second internally-owned service is ever introduced.

## Verified

`bun run typecheck` / `bun run lint` / `next build --webpack` all clean. `bun test`: 69/69 pass (61 pre-existing + 8 new observability tests: log redaction at depth, circular-object safety, AsyncLocalStorage context propagation, route-label normalization, business-event counting). Live end-to-end against a running dev server: real signup + `GET /api/leads` × 3 → `/api/metrics` showed exactly matching `http_requests_total`/`db_queries_total`/`business_events_total` series; `/api/health/live` always 200; `/api/health/ready` and `/api/health` correctly 503 with Redis unreachable; `/api/metrics` correctly 503/401/200 across no-token/wrong-token/correct-token; a real unhandled exception in a CRUD-factory item route was caught, produced a full latency histogram + `app_errors_total` series, and its structured log line (`api.unhandled_error`, with requestId/correlationId) immediately pinpointed the exact root cause (a missing session) with no further digging required — the concrete demonstration of what this phase set out to deliver.

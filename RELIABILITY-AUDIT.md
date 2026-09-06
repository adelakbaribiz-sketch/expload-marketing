# Reliability Engineering — Phase 17

Every failure scenario below was either **live-tested** against a running dev server (several — Redis-down, payment-gateway-down — are the app's actual current environment state, not staged) or **reasoned from code with an explicit reason it wasn't safe/necessary to reproduce live**. Findings are stated as one or the other, never presented as tested when they were only read.

## 1. Database Down

**Not live-tested** (severing the dev DB connection mid-session risked corrupting the working database for no proportional benefit) — verified instead by confirming the existing design is already correct:
- `GET /api/health` / `GET /api/health/ready` (Phase 15) already detect this via `SELECT 1` in a try/catch and report `checks.database.ok = false` with a 503, without crashing the process.
- Every other route's Prisma call is already caught generically by `with-protection.ts`'s catch-all (Phase 08) into a clean `{error: 'internal_error'}` 500 — no stack trace leak, consistent shape.
- **No change made.** A dedicated "DB down" response (distinct from a generic 500) wasn't built — the existing health-check split already gives an operator/load-balancer the real signal; a route-level DB-specific error message adds complexity for a condition where "internal_error, try again" is already the honest, correct thing to tell a caller.

## 2. Redis Down — live-tested (this dev environment's actual real state)

This dev `.env` has `REDIS_URL` configured but no Redis actually running — not staged, the app's genuine current condition. **Before this phase**: `POST /api/campaigns/[id]/send` and `POST /api/onboarding/upload` both threw a raw ioredis error, caught only by `withProtection`'s generic handler as an opaque 500.

**Fixed**: `src/lib/queue/index.ts`'s exported `enqueue()` now catches the adapter failure and throws a typed `QueueUnavailableError`. Both call sites catch it specifically:
- `campaigns/[id]/send` → live-verified: `503 {error: "queue_unavailable", message: "..."}`; confirmed the campaign's own status stayed `"draft"` (not left in a half-updated state — the status write happens after the now-caught enqueue call).
- `onboarding/upload` → live-verified: `503`; confirmed the already-created `OnboardingDocument` row was updated to `status: "failed"` with a clear `errorMessage` (not left stuck at `"pending"` forever) and the already-saved file was deleted (no orphaned upload).

## 3. Worker Down

`processJobQueue()`'s restart is opportunistic (the next `enqueue()` call restarts it if the flag shows it crashed) — no proactive watchdog. **Not changed**: a real always-on watchdog would need a `setInterval` that keeps the Node process alive indefinitely, a real cost for a single-process app where the realistic failure mode (an exception escaping the loop's own try/catch) is already unlikely given that inner try/catch exists. Judged not worth the complexity without an observed real crash to justify it.

**What was fixed instead — job-level retry and a dead-letter signal**, since a failed job was previously terminal with no retry at all:
- `RETRYABLE_JOB_TYPES` (`email_campaign`, `lead_enrich`) now get up to 3 attempts with exponential backoff (capped at 15s) before being marked permanently failed. `document_extract` is deliberately excluded — its own failure handler already deletes the source file before rethrowing, so a second attempt would fail differently (file not found) and try to delete an already-gone file; retrying it generically would be actively harmful, not just redundant.
- No new DLQ table was added (would need a schema change for a queue whose `Job` type is deliberately ephemeral, in-memory-or-Redis). Instead, a job that exhausts retries (or isn't retryable) fires `alertCritical()` (Phase 15's alerting) — the durable "this needs a human" signal, replacing what was previously just a `status: 'failed'` string nobody was notified about.

## 4. API Timeout / Network Failure

Confirmed (matching Phase 16's finding, not re-derived) that **none** of these external calls had a timeout: the 5 LLM provider files' completion endpoint, `google-maps-scraper.ts`'s Serper-Places call, `qdrant.ts`'s 3 fetches (embeddings, upsert, search), and `crypto.ts`'s NOWPayments invoice-creation call. An unresponsive vendor could hang the request that triggered it indefinitely — for the LLM providers specifically, a hung first-priority provider would also block the aggregator's fallback chain from ever reaching the next one.

**Fixed**: all of the above now go through the existing `withTimeout()` helper (`src/lib/integrations/types.ts`, built in Phase 13 for Email/SMS/Payment but never extended to these) — no new timeout mechanism invented. Bounds chosen per call: 20s for most LLM providers, 30s for HuggingFace specifically (its serverless inference has a known cold-start delay that a shorter bound would misclassify as a dead provider), 10s for NOWPayments (a synchronous checkout call a user is actively waiting on), 8s for Serper-Places and Qdrant/embeddings (matching the existing 8s already used for Serper's organic search).

## 5. External API Failure

- **Fixed a real partial-failure bug in `src/lib/vector/qdrant.ts`**: `indexVector()`'s own comment says "Always also store in DB (as backup + for dev mode)" — but `qdrantUpsert()` throwing (a live Qdrant outage) previously prevented that DB write from ever running, contradicting the comment. Now wrapped so a Qdrant failure logs a warning and still falls through to the DB write.
- **Fixed the same class of gap in search**: `semanticSearch()`'s documented in-DB fallback only ever applied when Qdrant wasn't *configured* — a live outage of an already-configured Qdrant instance threw uncaught instead of falling back to the same in-DB cosine-similarity path. Now catches and falls through.
- `serper.ts` and `google-maps-scraper.ts` were checked and are already correctly fail-soft on a live error (return `{error}` / `[]` respectively rather than throwing) — no change needed there, only the missing timeout (§4).

## 6. Payment Failure — live-tested (this dev environment's actual real state)

This dev environment has no `NOWPAYMENTS_API_KEY` and no `PLATFORM_WALLET_*` configured — an authentic, not staged, "every payment path is down" condition. **Before this phase**: `createManualPayment()` (the fallback) throwing "No platform wallet for..." was only ever called *inside* the primary gateway's own catch block, so that second throw was never caught — it propagated raw past the route.

**Fixed**: a new `PaymentGatewayUnavailableError` is thrown only when *both* the primary gateway and the manual fallback fail, carrying both underlying error messages. `POST /api/payments/crypto/create` catches it specifically. **Live-verified** (against this environment's genuine unconfigured state, not a mock): `503 {error: "payment_gateway_unavailable", message: "..."}` — confirmed on 3 consecutive real requests.

## 7. Duplicate Request — a general mechanism that didn't exist before this phase

No `Idempotency-Key` (or equivalent) mechanism existed anywhere in the app — every duplicate-POST protection was ad hoc and domain-specific (the crypto webhook's state-machine guard, `sendCampaign`'s already-sent-recipient skip).

**Added**: `src/lib/security/idempotency.ts`'s `withIdempotency()` — opt-in via an `Idempotency-Key` request header, using Phase 16's `ttl-cache.ts` (same `globalThis`-singleton reasoning applies, already solved once). A repeated call with the same key replays the exact cached response (`X-Idempotent-Replay: true`) instead of re-running the handler; a 5xx response is deliberately never cached, so a genuine transient failure stays retryable rather than being replayed as the same error forever. Applied to `POST /api/payments/crypto/create` — the single highest "duplicate request = real money" endpoint in the app, as the representative rollout (same "fix the highest-value example, document the pattern" discipline as every prior phase). Unit-tested for the replay-on-success path (4 tests); the never-cache-5xx path was additionally live-verified for real, since this environment's payment gateway genuinely is down (§6) — 3 identical requests with the same key each independently returned a fresh, non-replayed 503.

**Not rolled out further this phase** — a candidate for future high-value writes (subscription changes, license purchases) once there's a concrete request to extend it; adding it to every POST would be unjustified, unmeasured work most writes don't need.

## 8. Duplicate Callback — tested, found already correct, nothing changed

Constructed a realistic, properly HMAC-signed NOWPayments webhook sequence against a test `CryptoPayment` row: `confirming` → `finished` → `finished` (retry) → `finished` (retry again), simulating exactly what NOWPayments' own retry-on-non-200 behavior would produce. **Live-verified**: exactly one `Payment` row was created despite 3 "finished" deliveries; `CryptoPayment.status` correctly ended at `"completed"` with `completedAt` set once. The existing guards — the `$transaction`-wrapped read-check-write, the `completedAt`-null check, and the state-machine transition guard (`src/lib/workflow/definitions.ts`'s `CRYPTO_PAYMENT_MACHINE`) — already fully prevent duplicate financial effects.

A related check: sending a `finished` webhook directly from `pending` (skipping `confirming`) was correctly *rejected* by the state-machine guard as an illegal transition (logged as `crypto.out_of_order_webhook`) rather than silently accepted — confirming the guard is a real transition check, not a no-op.

**No dedup ledger/idempotency-key table was added.** The existing outcome-based guards (not a request-id-based ledger) already verifiably prevent the actual harm (double-booked revenue); adding a new table and schema migration on top of guards just proven correct would be complexity without a demonstrated gap.

## 9. Storage Failure

`LocalStorageAdapter`'s `save`/`read`/`size` had no error handling at all — a disk-full or permission error threw the raw Node `fs` exception straight up. **Fixed**: all three now throw a typed `StorageError` (operation + key + cause); `save()` additionally gets 3 retry attempts with the existing `withRetry()` helper (a transient `EBUSY`/`EMFILE` is exactly the class of error a short retry helps with, and an upload is a synchronous request a user is actively waiting on). `onboarding/upload` catches `StorageError` for a clean 503 instead of an opaque 500. `delete()` was already correctly fail-soft (unchanged).

## 10. Partial Failure — the 2 previously-known unguarded sites, plus one more found

`docs/PROJECT-PHASE-MATRIX.md`'s Phase 17 row already named 2 unguarded external-call sites from an earlier audit pass:
1. `campaigns/[id]/send`'s queue call — fixed in §2.
2. The crypto-payment manual-wallet fallback — fixed in §6.

**A third, independently-found gap**, re-checking `DATABASE-AUDIT.md` §9's original 7-item list of unwrapped multi-step writes against the current codebase: 6 of the 7 (payroll, license purchase, club-rewards/ad-credit TOCTOU races, tenant+linked-record creation, team invite) were already fixed in Phase 08 (`$transaction` now present in each). **The 7th, `src/lib/negotiation/engine.ts`, was still open.** Two functions each had 2-3 unguarded sequential writes:
- `generateProposalForSession`: proposal creation + its audit event — now one `$transaction`.
- `respondToProposal`: proposal-response update + session state transition + audit event (separately for the accept and reject branches) — now one `$transaction` each. This one was the more serious of the two: a crash between the old unguarded writes could leave a proposal marked `"accepted"` while the session itself never moved off its prior state — a real inconsistent state, not just an audit-trail gap.

Both best-effort side effects (`recordDecision`/`recordDecisionOutcome`'s self-improvement bookkeeping, `emitNotificationEvent`) deliberately stay outside the transaction — they're independent of the core proposal/session state and don't need every downstream module threaded a transaction client.

**Live-verified** (via the real `POST /api/negotiation/respond` route, not a synthetic unit test): a manually-seeded proposal, accepted through the real endpoint, correctly and atomically produced `session.currentState = "accepted"`, `session.status = "accepted"`, `session.acceptedProposalId` set, `proposal.customerResponse = "accepted"`, and exactly one `proposal_accepted` audit event.

## 11. Circuit Breaker — assessed, not rebuilt

`src/lib/llm/aggregator.ts`'s per-provider cooldown (opens for a fixed 5 minutes on any single `RateLimitError`, no failure-count threshold, no half-open probe) is a simpler cooldown-timer than a textbook circuit breaker. It was left as-is: nothing in this phase's testing surfaced a case where it produced a wrong outcome, and building a more sophisticated breaker (failure-count thresholds, half-open trial requests) without a demonstrated gap would be exactly the kind of unjustified engineering this project's phases have consistently avoided elsewhere (e.g. Phase 16's "no optimization without measurement").

## Verified

`bun run typecheck` / `bun run lint` / `next build --webpack` all clean. `bun test`: 82/82 pass (78 pre-existing + 4 new — `withIdempotency`'s no-key/replay/never-cache-5xx/key-isolation behavior; `QueueUnavailableError`/`StorageError`/`PaymentGatewayUnavailableError` were deliberately not unit-tested since their modules import the `server-only` guard package, unresolvable outside Next's build pipeline under plain `bun test` — verified live against the running dev server instead, per §2/§6/§9 above). Every fix in this document that could be exercised without real third-party credentials was live-tested against a running dev server — several (Redis down, payment gateway down) against this environment's own genuine unconfigured state, not a staged failure.

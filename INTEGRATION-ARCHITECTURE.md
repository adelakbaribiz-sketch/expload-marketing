# External Integration Architecture — Phase 13

**Scope check**: of the categories the phase brief lists as examples (Payment, SMS, Email, Maps, AI, Storage, Shipping, CRM, Analytics), this app has real integrations for **Payment** (partial — one real gateway, ten fabricated), **Email**, **SMS** (no vendor, now honestly adapter-shaped), **Maps** (via scraping, not an official Maps API), **AI** (`AI-STACK-AUDIT.md`, Phase 11), **Storage** (`FILE-MEDIA-STANDARD.md`, Phase 10), and **Search/Embeddings** (Serper, Qdrant). **Shipping, external Analytics (GA/Mixpanel/Segment), and external CRM sync (Salesforce/HubSpot) do not exist anywhere in this codebase** — this app *is* a CRM and has its own internal analytics computed from its own data, not a consumer of a third-party analytics or CRM API. Reported honestly rather than inventing an integration to audit.

## 1. Inventory

| Integration | Real vendor(s) | Adapter/Provider layer | Mock for tests |
|---|---|---|---|
| AI (LLM) | Groq, Cerebras, OpenRouter, Mistral, HuggingFace | `src/lib/llm/aggregator.ts` (Phase 11) — already a real, mature adapter, 5-provider fallback | N/A — provider fallback chain already serves this role |
| File storage | Local disk | `src/lib/storage/` (Phase 10) — already adapter-shaped | N/A — local adapter used directly in tests (`redeem-reward` style disposable fixtures) |
| Search | Serper.dev | `src/lib/services/serper.ts` — has its own honest mock fallback built in | Built-in (`mockSearch()`, always active without an API key) |
| Vector/Embeddings | OpenAI-compatible embeddings API, Qdrant | `src/lib/vector/qdrant.ts` (Phase 11 added a health-check flag for its own silent pseudo-embedding fallback) | Built-in (`pseudoEmbedding()`) |
| Maps | Google Maps (via Playwright scraping, not the official API) | `src/lib/services/google-maps-scraper.ts` | None — see §6 |
| Email | SMTP (any host) | **New this phase**: `src/lib/integrations/email-provider.ts` | `MockEmailProvider` |
| SMS | None configured (schema defaults to `kavenegar`, no vendor wired) | **New this phase**: `src/lib/integrations/sms-provider.ts` | `MockSmsProvider` |
| Payment | NOWPayments (crypto) only; 10 others fabricated | **New this phase**: `src/lib/integrations/payment-provider.ts` | `MockPaymentProvider` |
| Shipping | — | N/A, doesn't exist | — |
| Analytics (external) | — | N/A, doesn't exist (internal analytics only) | — |
| CRM (external) | — | N/A, doesn't exist (this app is the CRM) | — |

## 2. Shared conventions (new this phase)

`src/lib/integrations/types.ts` — every new adapter in this directory returns the same `IntegrationResult<T>` shape (`ok`, `data`, `error`, `mocked`, `latencyMs`) and uses the same `withTimeout`/`withRetry` helpers, so a caller learns one failure model instead of a different one per vendor. AI (`llmAggregator`) and Storage predate this convention and already have their own adequate (in AI's case, more sophisticated — quota tracking, cooldowns) patterns; not retrofitted onto this shape, since that would be a cosmetic rewrite of something already working well.

## 3. Payment

**Finding**: `src/lib/payment/gateway-router.ts` — a genuinely well-designed country/currency/method-based router — dispatched to 11 gateway functions, 10 of which (everything except NOWPayments) returned a **hardcoded fake checkout URL/clientSecret with no real API call and no indication it wasn't real**. The file had zero callers anywhere (fully dead code), so this was never reachable by a real user, but it's exactly the kind of "customer could believe card payments work" risk `KNOWN-ISSUES.md` already flagged for the exposed `payment-gateways-view.tsx` settings UI.

**Fixed**: `src/lib/integrations/payment-provider.ts` — a real `PaymentProvider` interface. `NowPaymentsProvider` wraps the actual working crypto integration (`src/lib/payment/crypto.ts`); `UnconfiguredPaymentProvider` replaces every other gateway's fabrication with an honest failure (`configured: false`, a real error, no fake URL). `gateway-router.ts` now uses this registry — same routing logic, honest results.

| Dimension | Detail |
|---|---|
| Timeout | Inherited from `payment/crypto.ts`'s own `fetch` to NOWPayments (no explicit timeout previously — see §7 deferred) |
| Retry | None currently on the NOWPayments create-invoice call; the existing `createManualPayment` fallback (wallet address) already covers "the API is down" at a different layer |
| Idempotency | `CryptoPayment` webhook status updates are idempotent (Phase 04's transaction fix + Phase 12's state-machine guard against regression) |
| Error Handling | `UnconfiguredPaymentProvider` fails explicitly instead of fabricating success — the core fix this phase |
| Logging | `DistributorAuditLog`/`console.warn` on gateway fallback (pre-existing) |
| Monitoring | None beyond DB records — no aggregate payment-provider health view exists (AI's `llmAggregator` has one; payment doesn't) |
| Fallback | Crypto: NOWPayments → manual wallet address (pre-existing, real). Card/other gateways: none — there's nothing to fall back to since none are real |

## 4. Email

**Finding**: SMTP send worked, but with no explicit timeout (nodemailer's own defaults only), no retry on a transient connection error, and — the significant one — **`sendCampaign` had no idempotency check**: calling it twice for the same campaign (a UI double-click, a retry after a partial failure) would re-email every matching recipient a second time, including ones who'd already received it.

**Fixed**: `src/lib/integrations/email-provider.ts`'s `SmtpEmailProvider` adds a 10s timeout and retries transient connection errors (`ECONNRESET`/`ETIMEDOUT`/`ECONNREFUSED`) up to 3 times with backoff — never retries an auth/rejection failure, which won't succeed on retry. `sendCampaign` (`src/lib/email/service.ts`) now skips any recipient who already has a `sent`/`pending`/`bounced` `EmailLog` for that campaign. Live-verified: sending the same campaign twice produced `{sent: 1, skipped: 0}` then `{sent: 0, skipped: 1}`.

| Dimension | Detail |
|---|---|
| Timeout | 10s on the SMTP send call (new) |
| Retry | 3 attempts, exponential backoff, transient-errors-only (new) |
| Idempotency | Per (campaignId, recipient) — a recipient is only ever emailed once per campaign, even across repeated `sendCampaign` calls (new) |
| Error Handling | Bounce-vs-failure heuristic on the error message (pre-existing); errors surfaced per-recipient via `EmailLog.error`, not swallowed |
| Logging | `EmailLog` row per attempt (pre-existing) — this is genuinely already a real, queryable send log |
| Monitoring | `EmailCampaign.sentCount`/`bounceCount` aggregates (pre-existing); no alerting on a high bounce rate (deferred, §7) |
| Fallback | `ConsoleEmailProvider` when SMTP isn't configured — explicit, clearly logged, never silently pretends |

## 5. SMS

**Finding**: `POST /api/messaging/sms` was a bare CRUD-factory route — a client could `POST` a row with `status: 'delivered'`, `sentAt: <any date>` directly, with **no SMS ever sent**, no vendor call of any kind. This is the SMS-specific version of the same "backend must be source of truth" issue Phase 12 fixed for business-workflow status fields, applied here to an integration-delivery status.

**Fixed**: `src/lib/integrations/sms-provider.ts` (`HttpSmsProvider` for a real REST gateway like Kavenegar, `ConsoleSmsProvider` as the honest no-credentials fallback). `POST /api/messaging/sms` is no longer CRUD-factory-backed for creation — it calls the provider and the **backend** decides `sent`/`failed` from the real result. The item-level `PATCH` route's field allowlist no longer includes `status`/`sentAt`/`deliveredAt`/`cost`/`errorMessage` — those can only be set by the send flow. Live-verified: a `PATCH` attempting to set `status: 'delivered'` directly is silently ignored (the field isn't writable), confirming the backend, not the client, owns delivery status now.

| Dimension | Detail |
|---|---|
| Timeout | 8s on the HTTP gateway call (new) |
| Retry | 2 attempts, skips retrying a 4xx (bad number/auth won't succeed on retry) (new) |
| Idempotency | Not addressed — no dedupe key exists yet for "don't send this SMS twice"; lower priority than email since there's no batch/campaign SMS-send path yet to accidentally double-fire (deferred, §7) |
| Error Handling | Provider failure → `SmsMessage.status = 'failed'` + `errorMessage`, `502` returned to the caller (new) |
| Logging | `SmsMessage` row per attempt (schema pre-existing, now actually populated by a real attempt instead of client-fabricated data) |
| Monitoring | None beyond the DB row — no aggregate SMS-provider health view (deferred, matches Payment's gap) |
| Fallback | `ConsoleSmsProvider` when no gateway is configured — explicit, `mocked: true` on the response, never silently claims delivery |

## 6. Maps

`src/lib/services/google-maps-scraper.ts` (281 lines) — a genuinely well-built 3-tier scraper (official-API-shaped attempt → Playwright scrape → deterministic mock), already has real Playwright-level timeouts (30s page load, 15s selector wait) and try/catch at each tier. **Not restructured this phase** — it already has the Timeout/Fallback dimensions this audit asks for; retrofitting it onto the new shared `IntegrationResult` shape would be a cosmetic rewrite of working code, not a fix for a real gap. Retry isn't implemented (a failed scrape falls through to the next tier rather than retrying the same one) — arguably correct behavior for a scrape (retrying the identical request against a page that just failed to load rarely helps; falling to the next tier already **is** the recovery strategy).

## 7. Credential security

Audited every credential this phase touched or introduced:
- `NOWPAYMENTS_API_KEY`, `SMTP_PASS`, `SERPER_API_KEY`, `SMS_API_KEY` — all read from `process.env` only, never persisted to a client-readable table, never included in any API response (spot-checked: `getPaymentProvider()`'s `configured` boolean is the only thing derived from a key that's ever exposed — the key value itself never leaves the server).
- `PaymentGatewayConfig`'s DB-stored per-gateway secrets (`apiKey`/`secretKey`/`webhookSecret`) were already locked down in Phase 05 (`GET /api/payments/gateways` requires `isSuperAdmin()` and omits those fields) — unchanged, still correct.
- New `.env.example` entries added for `SMS_API_URL`/`SMS_API_KEY` so this isn't tribal knowledge.

## 8. Mock adapters (this phase's explicit deliverable)

`MockEmailProvider`, `MockSmsProvider`, `MockPaymentProvider` — each records what was "sent" in memory (`.sent`/`.checkouts` arrays), supports `failNext` to simulate a failure on demand, and every result is `mocked: true` so a test (or a future caller) can never confuse a mock result for a real one. `email/service.ts` and `sms-provider.ts` both export a `_setProviderForTesting()`/`_setSmsProviderForTesting()` hook to swap in the mock without touching environment variables. 11 new unit tests (`tests/integration-providers.test.ts`) cover the mocks plus the shared `withTimeout`/`withRetry` helpers (timeout firing, retry-then-succeed, retry-exhaustion, `shouldRetry` short-circuit).

## 9. Deferred (prioritized, not fixed this phase)

1. **Medium** — No aggregate health/monitoring view for Payment or SMS providers, the way `llmAggregator` has for AI (per-provider usage records, quota warnings). Worth building once there's a real second vendor for either.
2. **Medium** — No explicit timeout on `payment/crypto.ts`'s own `fetch` to NOWPayments (the new `PaymentProvider` wrapper doesn't add one either, since the underlying function wasn't touched to avoid scope-creeping into Phase 04's already-shipped crypto-payment code).
3. **Low** — SMS idempotency (no dedupe key yet) — lower priority than email's, since there's no batch SMS-campaign path today that could double-fire the way `sendCampaign` could.
4. **Low** — `google-maps-scraper.ts` doesn't use the new shared `IntegrationResult`/`withTimeout` conventions — intentionally not retrofitted onto already-working code (§6).

## Verified

`bun run typecheck` / `bun run lint` / `next build` clean. `bun test`: 56/56 pass (45 pre-existing + 11 new). Live-verified against the dev server: SMS send actually calls the provider and the backend sets `status`/`provider` from the real result (a client-supplied `status: 'delivered'` via PATCH is silently ignored, not applied); email campaign idempotency confirmed by sending the same campaign twice (`{sent:1, skipped:0}` then `{sent:0, skipped:1}`).

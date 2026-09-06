# Complete Quality Assurance — Phase 18

**Coverage was never chased as a number.** Every test added this phase exists because auditing the current suite (§0) or exercising a critical path (§1-10) surfaced a real, previously-untested risk — several of which turned out to be real, live bugs, not hypothetical ones. Three are fixed below, each with its own regression test, directly serving this phase's stated goal: **Critical Bug = 0**.

## 0. Starting point — audit of the existing suite

82 tests across 9 `bun:test` files existed before this phase (Phases 08, 14-17), plus 1 Playwright E2E file (3 journeys: signup, CRM-deal-create, logout) and 2 CI-gate-capable ops scripts (`db:integrity-check`, `security-check`) that were never wired into any CI — because **no CI existed at all** (`.github/workflows/` didn't exist). The existing tests were genuinely good quality where they existed (thorough edge-case coverage on pure functions, one rigorous real-DB concurrency test), but narrow: zero tests touched any actual API route, zero touched RBAC/permissions, zero touched payments/webhooks/queue/team-invite. Several modules (`queue/index.ts`, `storage/index.ts`, `payment/crypto.ts`) import the `server-only` guard, which `bun test` cannot resolve outside Next's build pipeline — meaning a large share of Phase 15-17's reliability/observability fixes were structurally impossible to unit-test directly, only "live-verified" in those phases' own sessions, never captured as a repeatable regression check.

**Running `db:integrity-check` for the first time as a real gate (not just a script that exists) immediately found a live, currently-failing critical bug** — see §4.

## 1. Unit

Already well-covered (82 tests, 9 files, see §0) — no gap found here worth padding with low-value tests. Reused throughout this phase's own new code (`fetchWithRateLimitRetry`, `hasExactKeys` helpers in the new integration script) rather than adding parallel unit tests for one-off script helpers.

## 2. Integration — new: real-DB regression tests for the 2 schema bugs found this phase

`tests/tenant-cascade.integration.test.ts` (new, 2 tests) — real DB, no mocks, same disposable-tenant convention as the existing `redeem-reward.integration.test.ts`:
- Proves `Activity` now cascade-deletes with its `Tenant` (§4.1).
- Proves `CryptoPayment.paymentId` nulls out instead of dangling when its `Payment` is cascade-deleted (§4.2).

## 3. API — new: `scripts/api-integration-checks.ts`

No test at any level previously exercised an actual HTTP route for team invite, RBAC, payment webhooks, or campaign send. New script (same conventions as the existing `security-checks.ts`/`db-integrity-check.ts`: real signup/login/cleanup, proper exit codes, skips gracefully with no server reachable) covers:
- **Team invite → accept**: owner creates an invitation, a brand-new invitee accepts and lands in the correct tenant, a consumed token cannot be replayed.
- **Custom-role read-only enforcement**: the exact AC-7 scenario — confirmed broken, fixed, and now regression-tested (§4.3).
- **Crypto webhook duplicate-delivery idempotency**: automates the manual live-test from `RELIABILITY-AUDIT.md` (Phase 17) into a permanent, repeatable check — a real signed `confirming → finished ×3` sequence must produce exactly one `Payment` row.
- **Campaign send via queue**: environment-aware (accepts either success or the Phase 17 graceful-degradation 503, never a raw 500, depending on real Redis reachability — doesn't assume one or the other).
- **Response-shape contracts** (§8).

Building this script's `signupAndLogin()` helper hit the real `auth` rate limiter (5/min) shared across signup/login/invite-accept — confirming that limiter's real behavior under a realistic multi-step test flow, and requiring a `fetchWithRateLimitRetry()` wrapper (retries on 429 with the same courtesy a real client should show, not a demand that the limiter be loosened for testing's convenience).

## 4. Database — 2 real, live bugs found and fixed via `db:integrity-check`

**4.1 — `Activity.tenantId` had no `@relation` to `Tenant`.** Confirmed **50 real orphaned rows** in the live dev DB (dangling `tenantId` pointing at an already-deleted tenant) the first time this phase ran `db:integrity-check` as an actual gate. Root cause, traced to real application code, not just historical debris: `DELETE /api/tenants/[id]` (`src/app/api/tenants/[id]/route.ts`) does a raw `db.tenant.delete()`; every other tenant-scoped model (~75 of them) has a proper `@relation(onDelete: Cascade)` to `Tenant` that Prisma verified exists in Tenant's own ~90-field back-relation list — `Activity` was the one exception, unlike even its own sibling `userId`/`leadId` fields on the same row. **Fixed**: cleaned up the 50 orphaned rows, added the missing `@relation(onDelete: Cascade)`, added the corresponding `activities Activity[]` back-relation on `Tenant`, live-verified via `db:integrity-check` (24/24 clean) and a new regression test.

**4.2 — `CryptoPayment.paymentId` had no `@relation` to `Payment`.** Found one level deeper, by *running* the new webhook-idempotency integration check (§3) against real data and then re-running `db:integrity-check`: `CryptoPayment` deliberately survives tenant deletion (`onDelete: SetNull` — it's a financial/audit record, correctly kept unlike `Activity`), but its own `paymentId` field (linking to the `Payment` row created when a crypto payment completes) was a bare string with no relation at all — so when the linked `Payment` cascade-deleted with the tenant, the surviving `CryptoPayment` was left pointing at a `paymentId` that no longer existed. **Fixed**: added `@relation(onDelete: SetNull)`, matching this model's own "preserve the record, null the dangling pointer" philosophy already established for its tenant relation. Live-verified via `db:integrity-check` and a new regression test.

Both fixes applied via `prisma db push` (no migration system yet — `adr/0006`, unchanged from every prior phase that touched the schema).

## 5. Security — extended `scripts/security-checks.ts` coverage, re-verified live

No new checks were added to `security-checks.ts` itself this phase (its existing 24 checks — SSRF guard, rate-limit config, and 4 live adversarial checks: team/members privilege escalation, payment-gateway secret exposure, health-endpoint config leak, SSRF against the onboarding crawler — were re-run live against a running server and all still pass). The real security finding this phase belongs to RBAC, not this script — see §4.3/§7.

## 6. E2E — audited, not extended

The existing 3-journey Playwright suite (signup, CRM-deal-create, logout) was reviewed and left as-is. **Deliberate scoping decision**: the untested critical paths this phase found real bugs in (team invite, RBAC, payment webhooks) are backend-logic defects, not UI defects — the new API-level integration script (§3) catches them more precisely and far faster than a browser-driven test would (no production build + Chromium install per run). Adding E2E coverage for these same flows would be duplicate effort at a higher cost for the same assurance. Not extended this phase; flagged as a reasonable future addition if a UI-specific regression in these flows is ever found that an API-level test wouldn't catch.

## 7. Regression — every bug found this phase has one

| Bug | Regression test |
|---|---|
| `Activity` orphaned on tenant deletion | `tests/tenant-cascade.integration.test.ts` (test 1) |
| `CryptoPayment.paymentId` dangling on tenant deletion | `tests/tenant-cascade.integration.test.ts` (test 2) |
| Custom-role read-only enforcement was dead code (`getCurrentUser()` never returned `roleId`, so both `hasPermission()`'s existing lookup and `requireNonViewer()` never saw it) — the exact `ACCEPTANCE-CRITERIA.md` AC-7 scenario, confirmed still live | `scripts/api-integration-checks.ts`'s `checkCustomRoleReadOnly()` |

**AC-7 fix detail**: `getCurrentUser()`/`authenticateUser()` (`src/lib/auth/simple-session.ts`) now include `roleId` on the object they return — previously omitted entirely, making `hasPermission()`'s own existing `(user as any).roleId` lookup permanently `undefined`. `requireNonViewer()` (`src/lib/auth/rbac.ts`) now also denies a user whose assigned custom role has zero granted permissions — the unambiguous "read-only" case this app's permission model can express without inventing a write/read taxonomy that doesn't exist in the codebase. A drive-by consistency fix surfaced by writing the contract check in §8: `GET /api/auth/me` rebuilt its response by hand and had silently dropped `roleId` even after the above fix, while `POST /api/auth/login` (which forwards the full object) had it — now both match.

## 8. Contract

This app has no external API consumer (the frontend is the only caller), so full schema-registry-style contract testing would be manufactured, not real. What's real and now checked: `scripts/api-integration-checks.ts`'s `checkResponseContracts()` asserts the exact key set of `GET /api/auth/me` and `POST /api/auth/login`'s user object — the shape almost everything else depends on. Already caught one real inconsistency between them (§7's drive-by fix) the first time it ran.

## 9. Performance & Load — new: `scripts/load-check.ts`

Two checks, chosen because each answers a real question with zero prior coverage (not padding):
1. **Does the `auth` rate limiter (5/min) actually hold under concurrent load?** 20 concurrent login attempts from one client: confirmed at most 5 get through to real auth logic, zero 5xx regardless of the race. Only ever reasoned about from code before this; now actually exercised concurrently.
2. **Does a representative read endpoint stay within a latency budget under concurrent load?** 15 concurrent requests complete well within a generous 2s budget with zero errors — a regression guard against a future stampede (e.g. `PERFORMANCE-AUDIT.md` Phase 16's dashboard/unified cache silently breaking under concurrency), not a tight SLA.

## 10. CI/CD — built for the first time

`.github/workflows/ci.yml` (new) — 4 jobs: `quality` (typecheck, lint, `bun test`, `db:integrity-check`, static `security-check` — fast feedback on every push/PR), `build` (production build), `api-and-security-live` (builds, starts a real production server, runs the full live `security-check` plus the new `api-integration-checks.ts`), `e2e` (Playwright, uploads the report as an artifact on failure). This is the first time any of this project's existing CI-gate-capable scripts (`db:integrity-check`, `security-check` — both already had proper exit codes, built in Phases 04/05 but never wired anywhere) actually gate anything.

## Verified

`bun run typecheck` / `bun run lint` / `next build --webpack` all clean. `bun test`: 84/84 pass (82 pre-existing + 2 new regression tests). `bun run db:integrity-check`: 24/24 checks, 0 violations (was 1 check failing with 50 real violations at the start of this phase). `bun run security-check`: 24/24, including all 4 live adversarial checks against a running server. `bun run scripts/api-integration-checks.ts`: 10/10 against a running server (team invite ×3, RBAC ×2, webhook idempotency, campaign send, contracts ×2, custom-role creation). `bun run scripts/load-check.ts`: 4/4. All test tenants and data created during this phase's live verification were cleaned up afterward.

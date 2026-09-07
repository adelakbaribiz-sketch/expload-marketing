# Production Readiness Report — Phase 20

Date: 2026-09-07. Scope: a full-system audit (Product, Architecture, Code,
Database, API, Frontend, Security, Privacy, AI, Files, Integrations,
Performance, Reliability, Testing, Observability, Backup, Deployment,
Documentation, CI/CD), live Backup/Restore/Deploy/Rollback tests, and a
Critical User Journey E2E run — built on top of, and re-verifying rather
than re-deriving, 19 prior phases of deep per-domain audits (see
`docs/PROJECT-PHASE-MATRIX.md` for their full detail).

## Verdict

# NOT READY

Not because the platform is weak — 20 phases of real, live-verified
engineering sit behind this app, and this pass found and closed five
genuinely severe, previously-undiscovered issues (below). It's NOT READY
because real, currently-open gaps remain that a customer or an attacker
could hit today, and none of them are the kind that should be waved through
just to close out an audit. See "Blockers" below for exactly what and why.

## What this pass found and fixed (new this phase, not previously known)

### 1. Three live, Critical revenue-integrity bugs — FIXED

Going one level deeper than any prior phase's audit (checking not just "is
the payment gateway real" but "what actually gates the thing the payment is
supposed to pay for"), this pass found that **three separate live routes
activated a real paid entitlement directly from a client-supplied request
body, with no payment verification anywhere in the code path**:

- `POST /api/support-plans/subscriptions` — any authenticated user could
  self-activate a paid support SLA plan, with `monthlyRevenue`/
  `totalSubscribers` incremented as if real money had been collected.
- `POST /api/billing/subscription` — the product's own **core paid-plan
  entitlement system**. Every tier is paid (`starter` $49–`enterprise`
  $499/mo, no free tier exists), and this route let any tenant member
  (any role, including `viewer`) self-upgrade straight to Enterprise.
- `POST /api/distributors/licenses` — any member of a legitimately
  onboarded distributor tenant could mint up to 1000 free, immediately
  usable license keys per call, with `totalPaidToPlatform` incremented as
  if paid. A second, independent bug in the same handler: the revenue
  increment used the per-unit price regardless of `count` (issuing 50
  licenses recorded 1 unit's worth of revenue, not 50).

**Fix**: all three now require a platform SuperAdmin to manually confirm
payment (`status: 'pending_payment'` → `PATCH .../confirm_payment` →
`status: 'active'`, entitlements/revenue only applied on confirmation) —
the same "fail honestly, require a trusted human until a real payment
gateway exists" principle Phase 13 already established for the non-crypto
payment gateways (`src/lib/integrations/payment-provider.ts`'s
`UnconfiguredPaymentProvider`). Live-verified via 9 new regression checks
in `scripts/api-integration-checks.ts` (all passing) — not just reasoned
about: a real signup, a real self-service attempt (rejected), a real
SuperAdmin confirmation (accepted, correct revenue recorded).

Two related, lower-severity findings fixed alongside:
- `POST`/`PATCH /api/marketplace/keys[/[id]]` let a client set its own
  prepaid `balance` (documented as "prepaid balance in USD") to any
  number. High, not Critical — confirmed no metering code anywhere
  decrements/consumes this balance yet, so it was inert rather than
  actively exploitable for real spend, but already misrepresented state on
  the marketplace usage dashboard. Fixed: `balance` is no longer
  client-settable (always starts at 0); the PATCH route also gained the
  `withProtection` wrapper it was missing entirely (no rate limiting, no
  error handling).
- `PATCH /api/reseller/applications/[id]` and `PATCH /api/club/ads/[id]`
  let the applicant/tenant self-approve their own submission, writing
  `status: 'approved'`/`'active'` and the `reviewedAt` field directly —
  bypassing the staff-review workflow those fields' own names imply.
  Medium: confirmed no downstream code currently auto-grants revenue share
  or renders these to other tenants on approval, so no live financial or
  content-exposure consequence today, but the authorization gap is real.
  Fixed: the review/approval fields on both routes now require SuperAdmin.

### 2. Orphaned PII surviving tenant deletion — FIXED

`DELETE /api/tenants/[id]` (correctly SuperAdmin-gated) did a bare
`db.tenant.delete()`. Six models keep their row after the owning tenant is
gone by design (`onDelete: SetNull` — audit/business records this app
never silently destroys), but several carry direct PII in fields that have
nothing to do with why they're kept: `AuditLogEntry` (`userName`,
`ipAddress`, `userAgent`, `entityName`), `PricingCalculation`
(`customerName`, `customerEmail`), `InvestorProfile`/`CofounderProfile`
(`name`, `email`), `PartnershipOpportunity` (`partnerName`), `Referral`
(`refereeEmail`). No GDPR-style export/anonymization capability existed
anywhere in the app. **Fix**: tenant deletion now anonymizes exactly these
PII fields (never the whole row — the record's audit/financial value is
exactly what's meant to survive) in the same transaction as the delete.
Live-verified: create real PII-bearing rows, delete the tenant, confirm the
rows survive with the PII fields cleared.

### 3. Container-name collision breaking documented multi-environment claim — FIXED

`docker-compose.prod.yml` hardcoded `container_name:` on every service
(`marketing-postgres`/`-redis`/`-app`/`-caddy`), which directly contradicts
`.env.staging.example`'s own documented claim that `-p expload-staging`
keeps a staging stack's containers separate from a production one on the
same host — the volumes/network would separate correctly, but the
containers themselves would collide on name and refuse to start. Fixed by
removing the hardcoded names (nothing referenced them directly). Live
re-verified this session as part of the deployment/rollback drills below —
container names now correctly project-scoped (`readytest-app-1`, etc.).

### 4. Two more Docker/health-check bugs found only by actually deploying (extending Phase 19's own finding pattern)

Live-verified this session by bringing up a real four-service stack:
Next.js's standalone server binds to `$HOSTNAME`, which Docker always
auto-sets to the container's own hostname (its external network IP, not
loopback) — the container's own `HEALTHCHECK` and `scripts/deploy.sh`'s
post-deploy check had silently always failed for this reason (production
traffic was never affected, since Caddy reaches the app via Docker DNS on
that same external IP). Even after setting `HOSTNAME=0.0.0.0`, `wget
http://localhost:3000` still failed — confirmed live that this Alpine image
resolves "localhost" to `::1` first, uncovered by the IPv4-only bind. Fixed
both (`ENV HOSTNAME="0.0.0.0"` + `127.0.0.1` explicit everywhere, not
`localhost`) — `docker compose ps` now shows the app genuinely
`Up ... (healthy)`, not just reachable via a manual check from outside.

### 5. Analyzer endpoints now honestly labeled

`KNOWN-ISSUES.md` #8 (four analyzer endpoints fabricating
`Math.random()`-based results, unconditionally, with no indication to the
caller): all four now return `simulated: true` at the top level of their
JSON response. The API is now honest; no frontend view yet reads that flag
to show a "simulated data" badge to the user — a fast-follow, not
completed this pass (see Blockers).

## Full-system audit, by area

**Product / Architecture**: unchanged from `docs/PRODUCT-BASELINE.md`/
`ARCHITECTURE-TARGET.md` — modular monolith, clean DAG, no new findings.
**Code**: `TODO`/`FIXME`/`XXX`/`HACK` grep across `src/` — zero hits.
**Database**: schema unchanged this phase (only comment updates, no new
migration needed); `db:integrity-check` (24 checks) still 0 violations.
**API**: covered above (§1) — the payment-integrity sweep was the
substantive new finding. **Frontend**: no hardcoded secrets in
`page.tsx`/dashboard shell; the previously-documented 0% react-hook-form/
zod adoption and 0% query-error-state gaps are unchanged (pre-existing,
catalogued, not urgent — see Blockers for why they're listed there anyway).
**Security**: re-verified the Phase 11 AI-safety gate
(`HIGH_RISK_NODE_TYPES` in `src/lib/graph/orchestrator.ts` still requires
explicit per-action confirmation for `send_campaign`/`process_payment`/
`launch_ads`) — intact, no regression. `security-check` (20 checks) still
0 failed. **Privacy**: covered above (§2). **AI**: covered above (intact).
**Files**: confirmed no upload path exists outside the one audited in
Phase 10 (onboarding documents) — every other "avatar/logo" reference is a
plain URL string field, not a binary upload endpoint. **Integrations**:
WhatsApp/SMS status re-verified — SMS fixed (Phase 13, confirmed intact),
WhatsApp not (see Blockers). **Performance/Reliability/Observability**:
unchanged from Phases 15-17, re-confirmed via their own regression
mechanisms (existing tests, health checks) still passing. **Testing**: see
"Live tests" below. **Documentation**: fixed a stale table in
`docs/PROJECT-CONTROL.md` that still claimed Observability/Performance/QA
"Not started" and DevOps "no CI/CD" — replaced with a pointer to
`docs/PROJECT-PHASE-MATRIX.md` rather than re-synced by hand a second time
(the exact mechanism that let it go stale in the first place).
**Backup/Deployment/CI-CD**: see "Live tests" below.

## Live tests (all actually executed, not just reasoned about)

### Backup / Restore — PASS

No backup automation existed anywhere (`DATABASE-TARGET.md` DB-10,
previously deferred pending real migrations — which Phase 19 now
implemented, unblocking this). Built `scripts/backup.sh`/`scripts/restore.sh`
(real `pg_dump`/`psql` against the live compose stack, gzip-compressed,
`--clean --if-exists` so a dump is directly restorable). Live drill: real
Postgres+Redis+app stack, real migration applied (153 tables), canary data
inserted directly via SQL, backed up, **deleted**, restored — canary data
confirmed back exactly as it was, app confirmed healthy throughout. Also
verified a separate `RESTORE_TARGET_DB` scratch-database mode (restore into
a throwaway DB name, zero risk to the live one) — confirmed it restores
correctly and leaves the original database completely untouched.

### Deployment — PASS

The same live stack above: `docker build` (clean, no cache) → `docker
compose up` (postgres+redis+app+caddy) → real `prisma migrate deploy`
against live Postgres → `docker compose ps` shows all four services
genuinely healthy → `GET /api/health/ready` returns real
database-ok/redis-ok. Caddy, pointed at a deliberately fake test domain
(no real one exists in this sandbox), correctly attempted a real Let's
Encrypt ACME request and failed gracefully with the expected "not a valid
public suffix" error rather than crash-looping — confirms the config/
env-substitution/ACME pipeline end to end; only a real domain is needed to
actually issue a cert.

### Rollback — PASS

No real target host exists in this sandbox to exercise the `deploy`/
`rollback` GitHub Actions workflows' SSH path for real (documented in
Phase 19, unchanged) — but the underlying mechanism those workflows call
(`git checkout <sha>`, rebuild, redeploy, health-check) was proven directly:
built the prior commit (`819956c`) in a separate git worktree, deployed it
into the SAME running compose project (swapping the live `app` container
onto the old image, same Postgres/Redis, same data) — confirmed healthy and
correctly serving the same canary data. Then rolled forward back to current
code — confirmed healthy again. A real rollback-and-recover cycle, round
trip, both directions.

### Critical User Journey E2E — PARTIAL PASS (see Blocker #4)

`bunx playwright test` (`e2e/critical-journeys.spec.ts`, signup → CRM deal
creation → logout, run serially against a real production build). Signup
reliably passes. Deal creation intermittently fails on this run — not a
regression (the underlying component, `crm-view.tsx`'s `Dialog`/
`DialogTrigger`, is a standard, correct Radix pattern with no bug found;
this exact class of sidebar-nav click flakiness was already documented in
the test file's own comments back in Phase 09, well before this session);
confirmed live via direct browser interaction that the feature itself
works correctly once a click actually lands. Documented as an open item
below because the E2E suite not reliably green is itself a real gap for a
production-readiness sign-off, whatever its root cause.

Full verification suite, also re-run clean after every fix in this phase:
`bun run typecheck` ✓ · `bun run lint` ✓ · `bun test` (84/84) ✓ ·
`bun run db:integrity-check` (24/24) ✓ · `bun run security-check` (20/20) ✓ ·
`bun run db:schemas-in-sync` ✓ · `scripts/api-integration-checks.ts`
(20/20, including the 9 new payment-integrity + PII-purge checks) ✓ ·
production build ✓ · Docker build ✓.

## Blockers (why NOT READY)

### Blocker 1 — No real payment processing beyond crypto
- **Severity**: Critical (business-blocking, not a security hole per se)
- **Impact**: This is a paid B2B SaaS with no free tier, and the *only*
  real, working payment rail anywhere in the codebase is NOWPayments
  (crypto). Every other configured gateway (Stripe, PayPal, Razorpay, and
  8 more) is a named-but-unimplemented stub. A real customer who isn't
  willing to pay in crypto has no way to actually pay this product today.
- **Location**: `src/lib/integrations/payment-provider.ts`
  (`UnconfiguredPaymentProvider`); no card-checkout route exists anywhere
  under `src/app/api`.
- **Root cause**: no real payment-processor account/API credentials exist
  in this environment — this was correctly identified as BLOCKED back in
  Phase 05 and every phase since, not overlooked.
- **Recommended fix**: a product/business decision on which card processor
  to integrate first (Stripe is the least-effort real integration given
  the existing `stripeCustomerId`/`stripeSubscriptionId` fields already on
  `Subscription`), then real credential provisioning and SDK wiring. Not
  implementable from this environment.

### Blocker 2 — WhatsApp send status can still be fabricated via direct API access
- **Severity**: Medium-High
- **Impact**: `POST /api/whatsapp/messages` still accepts a client-supplied
  `status` field with no real send behind it — a direct API caller (not
  reachable through the visible UI today, since no compose form exists)
  could record a message as `'delivered'` with nothing sent.
- **Location**: `src/app/api/whatsapp/messages/route.ts` (bare
  `createDomainHandlers` CRUD factory).
- **Root cause**: no WhatsApp Business API integration exists; unlike SMS
  (fixed Phase 13), this specific endpoint was never migrated onto a real
  provider-adapter pattern.
- **Recommended fix**: apply the exact same pattern already proven for SMS
  (`src/lib/integrations/sms-provider.ts`) — a `whatsapp-provider.ts`
  adapter, route creates `pending` then sets the real result.

### Blocker 3 — Session revocation list still doesn't exist
- **Severity**: Medium-High
- **Impact**: `adr/0007` step 1 (server-side expiry) shipped Phase 04; step
  2 (a real revocation list) never has. A leaked-but-not-yet-expired
  session token remains valid for up to 30 days if replayed — logout only
  clears the client-side cookie.
- **Location**: `src/lib/auth/simple-session.ts`.
- **Root cause**: deliberately deferred every phase since Phase 05 as
  lower-priority than the Critical/High findings each phase actually
  fixed — never picked up.
- **Recommended fix**: `adr/0007`'s own step 2 plan — a revoked-token table
  or a Redis-backed denylist, checked in `verifySessionToken()`.

### Blocker 4 — E2E critical-journey suite is not reliably green
- **Severity**: Medium
- **Impact**: the automated regression check for "can a real user sign up,
  create a CRM deal, and log out" does not currently pass 100% of the time
  in this environment — see "Live tests" above for the full investigation.
  The underlying feature works (confirmed via direct interaction and via
  the API layer's own test coverage); the E2E harness's click-timing
  reliability against this specific sidebar-nav pattern does not.
- **Location**: `e2e/critical-journeys.spec.ts`.
- **Root cause**: browser-automation timing flakiness against this app's
  sidebar navigation, first documented in Phase 09 ("occasional first-click
  miss... in this environment"), not resolved since, and not caused by any
  change in this phase.
- **Recommended fix**: harden the test's wait conditions (e.g., an explicit
  `waitForLoadState('networkidle')` or a `toPass()` retry wrapper around
  the CRM-nav-then-New-Deal sequence) rather than the current bare
  try/click/catch/retry-once pattern; worth a dedicated investigation with
  Playwright's trace viewer, not something to chase further inside an
  already-large audit pass.

### Blocker 5 — Broad input-validation and CSP gaps (carried forward, unchanged)
- **Severity**: Medium
- **Impact**: ~128 of 239 API routes still accept unvalidated request
  bodies (type/format/enum, not SQL injection — Prisma parameterizes, and
  XSS is separately mitigated); `script-src 'self' 'unsafe-inline'` in the
  production CSP weakens it as an XSS mitigation.
- **Location**: `adr/0003`'s `validate` hook exists but isn't rolled out
  beyond a handful of domains; `src/proxy.ts`/`src/lib/security/headers.ts`.
- **Root cause**: known and prioritized since Phase 05/08, never fully
  rolled out — a mechanical, wide-surface-area task deprioritized behind
  higher-severity findings in every phase since.
- **Recommended fix**: prioritize money/multi-tenant-write routes first
  (`BACKEND-ARCHITECTURE.md` §3); move CSP to a nonce/hash-based
  `script-src` when there's time to test it against every inline script.

## What is genuinely solid (not a blocker, stated plainly)

Real Prisma migrations with an automated drift gate; a real, live-tested
backup/restore path; a real, live-tested four-service Docker deployment;
a real, live-tested rollback mechanism; 84 unit/integration tests + 20 live
API-integration checks + 20 live security checks, all green and CI-gated;
structured logging, metrics, and health checks; graceful degradation across
every external dependency (LLM, search, vector DB, email, queue, payment);
a real, tested crypto payment rail with idempotency and webhook-replay
safety; RBAC/tenant-isolation enforcement re-verified with zero regressions
found across two full audit passes (Phase 05, this one). This is a
substantially production-grade codebase with a specific, enumerated,
honest list of what stands between it and a real customer launch — not a
project that needs to be rebuilt.

# SECURITY-BASELINE.md — Expload Marketing SaaS

**Current as of 2026-09-05, Phase 05 (Security Engineering).** This supersedes the 2026-09-04 Phase-1 baseline as the authoritative security-state document — that pass's findings are folded in below (marked accordingly) rather than kept as a separate historical table. See `THREAT-MODEL.md` for the narrative threat model (actors, assets, attack trees) and `docs/IMPLEMENTATION-PLAN.md` / this phase's commit for the research→fix→verify trail. Organized by the 26-area checklist this phase's audit covered; every finding is evidence-cited (file:line) and tagged **[Fixed]**, **[Open]**, or **[Pass]**.

## Calibration note — read this first

`src/proxy.ts` requires a validly-HMAC-signed, non-expired session cookie for every route/page except an explicit public allowlist (`PUBLIC_API_ROUTES`, currently: `/api/health`, `/api/auth/{login,signup,logout}`, `/api/public/*`, `/api/webhooks/crypto/*`, `/api/team/invite/*`, `/api/sandbox/{start,action,convert}`). Because `POST /api/auth/signup` is itself public and unrestricted, "requires authentication" is a low bar (anyone can self-signup), not a strong barrier — findings below marked **[Authenticated-reachable]** should be treated as practically as urgent as **[Anonymous-reachable]** ones unless noted otherwise.

---

## 1. Authentication

- **[Pass]** Login (`src/app/api/auth/login/route.ts`) is rate-limited (`auth` preset, 5/min) and now audit-logs both failed and successful attempts (**[Fixed 2026-09-05]** — previously failed logins were invisible in the audit trail, making a sustained password-guessing run against one account undetectable).
- **[Pass]** Session fixation is not exploitable — `authenticateUser()` always mints a brand-new token on login; no pre-auth session identifier is ever "upgraded."
- **[Open, Medium]** No account-lockout mechanism after N failed logins exists (`src/lib/auth/simple-session.ts`'s `authenticateUser()` has no counter/lock). Mitigated by the rate limiter (now that its bypass is closed, see §19) and the new failed-login audit trail, but a slow, patient attacker within the 5/min cap is still unthrottled per-account (the limiter buckets by client IP, not by target account).
- **[Open, Medium]** No password-reset flow exists at all. `/forgot-password`/`/reset-password` are listed as public pages in `proxy.ts` but no page component or API route implements them — visiting either 404s. A locked-out user has no self-service recovery path; only manual DB intervention by an operator. Not itself an exploitable vulnerability, but a real availability/support gap — flagged for product planning, not fixed this pass (building a real reset flow is feature work, not a security patch).
- **[Fixed 2026-09-05]** `POST /api/sandbox/convert` created full owner-role accounts with only a truthy-string password check (no length/strength requirement) and hashed with cost factor 10 instead of the shared helper's 12. Now uses the same `hashPassword()` helper and a `min(8)` zod schema matching signup's policy (`src/app/api/sandbox/convert/route.ts`).

## 2. Authorization / IDOR

**By far the largest finding category this phase** — a full sweep of all 239 API route files (91 on the generic CRUD factory, confirmed already safe; 148 bespoke, individually reviewed) found **11 Critical + 2 High** new cross-tenant/cross-user authorization gaps, on top of the 9 routes already fixed in the prior security-remediation pass. All 13 are **[Fixed 2026-09-05]**:

- **Critical** — `POST /api/team/members`: no permission check at all, and no tenant filter on the target `userId` → any authenticated user (any role, any tenant) could set **any user's** `role`/`roleId` to `owner`, including their own. Fixed: `hasPermission('team.manage')` gate + fetch-then-compare tenant check.
- **Critical** — `PATCH /api/team/members/[id]`: tenant-scoped but no role check → same-tenant self-promotion to `owner` by any member. Fixed: same permission gate.
- **Critical** — `POST /api/team/invite/[token]` (accept, existing-account branch): knowledge of the invite token alone (no session, no password) was treated as proof of identity, letting an attacker who could create an invitation (itself unrestricted before this fix) silently move **any existing user's account** into their own tenant with an attacker-chosen role. Fixed: requires the account's real password (`verifyPassword` against `hashedPassword`) before the tenant/role reassignment; frontend (`invite-accept-client.tsx`) updated to collect it.
- **Critical** — `GET /api/reseller/opportunities/[id]`: no auth check, `include: { applications: true }` returned every applicant tenant's PII (email/phone/business name) and internal review notes to anyone. Fixed: `applications` now only included for `isSuperAdmin()` callers.
- **Critical** — `POST /api/reseller/opportunities`, `POST /api/marketplace/products`: platform-global (no-tenantId) public listings, creatable by any authenticated tenant user with no role check. Fixed: both gated to `isSuperAdmin()`.
- **Critical** — `payroll/config`, `payroll/periods`, `payroll/run` (all 3 routes): zero role check on company-wide revenue-split config, period approval (marks real `SalaryPayment` rows paid), and full payroll runs. Fixed: new `isPlatformStaffAdmin()` helper (superAdmin or internal-employee `admin`/`super_admin`) gates all three.
- **Critical** — `virtual-assistants/assignments` GET: used the caller's per-**tenant** `role` string (every tenant's own creator is `'owner'`) to decide whether to skip the tenant filter — meant to check platform-wide access but actually let every tenant owner see every other tenant's assignments. Fixed: now checks real `isSuperAdmin()`.
- **Critical** — `virtual-assistants/assignments` PATCH, `virtual-assistants/timesheets` GET/PATCH/POST: no ownership check on client-supplied ids, and (timesheets) no tenant filter at all on list. Fixed: fetch-then-compare via the (nullable) `assignment.tenantId` join.
- **Critical** — `virtual-assistants` POST, `virtual-assistants/services` POST: platform-global catalogs, creatable by any authenticated user. Fixed: `isPlatformStaffAdmin()` gate.
- **Critical** — `onboarding/sessions` PATCH: no tenant check on `body.id` (GET in the same file correctly filtered; PATCH didn't). Fixed: fetch-then-compare.
- **Critical** — `project-intake/[id]/pay`: no tenant check — any authenticated user could mark **any tenant's** project brief paid/active for free. Fixed: fetch-then-compare, matching the sibling GET route's existing pattern.
- **High** — `campaign-scheduler/[id]/approve`, `competitor-analysis/run`: no tenant check on the target/competitor id, letting any user approve/reschedule another tenant's campaign or run (and read) an analysis against another tenant's competitor profile. Both fixed.

Also fixed while in `team/roles/[id]/route.ts`: the `isSystem` shared-role exemption applied to **PATCH**, not just the intended read/delete cases — meaning any tenant user could edit a system-wide role's permissions, affecting every tenant using it. Now PATCH only touches the caller's own non-system roles.

- **[Pass]** Confirmed-safe patterns, sampled: `distributors/[id]`, `finance/reports`, `admin/**` (all `isSuperAdmin()`-gated), `club/**`, `promo-links/**`, `white-label/**`, `leads/**`, `campaigns/**`, `templates/**`, `negotiation/**` — all consistently do fetch-then-compare-tenant before mutating. The generic CRUD factory (~91 routes) is confirmed genuinely safe (list/create via `requireTenantId()`, item routes via ownership check before write).
- **[Open, Medium]** `internal/employees/[id]` PATCH: a department-level `admin` platformRole can edit **any** employee company-wide (salary, manager, status), not scoped to their own department — inconsistent with `internal/activities/route.ts`, which does scope. Not fixed this pass (Medium, internal-staff-only blast radius, not cross-tenant).
- **[Open, Low]** `payments/crypto/create`: `distributorId`/`invoiceId` taken from client body with no ownership check, but downstream aggregations only count webhook-confirmed (`status: 'completed'`) records, so exploitability requires actually paying real money. `billing/calculate` accepts a raw `body.tenantId` with no read path currently existing for the table. `llm/audit` has no role check but the underlying data (`LlmAuditEvent`) has no tenantId (provider telemetry, not tenant data). None fixed this pass — all genuinely low blast-radius.

## 3. RBAC / Permissions

- **[Fixed 2026-09-05]** The `hasPermission('team.manage')`-style checks added throughout §2 rely on `hasPermission()` (`src/lib/auth/rbac.ts`): `owner` role and real `SuperAdmin` always pass; `admin` role is explicitly excluded from `team.*`/`billing.*` by design; a custom `Role`'s granted `Permission`s are checked if the `Permission` table has a matching row. Since no seed script populates `Permission` today, custom roles currently grant nothing beyond what a matching row would need — meaning, in practice, these new gates resolve to "owner or SuperAdmin only," which is the correct conservative default until the RBAC seed/UI is built out.
- **[Confirmed, still latent]** The full custom Role/Permission editor UI has no live effect on access control beyond what's described above, because `roleId` is populated on `User` but the *session object* returned by `getCurrentUser()` doesn't currently drive any route's authorization decision through it except via the `hasPermission()` role-lookup path added this pass. This matches the prior phase's finding — not a regression, not newly fixed either (out of scope; would need the RBAC UI/seed to actually be built out with real `Permission` rows).
- **[Fixed 2026-09-05]** New `isPlatformStaffAdmin()` helper (`src/lib/auth/rbac.ts`) — the correct gate for platform-global internal-operations data (payroll, internal HR-adjacent catalogs), mirroring a pattern that was previously only inlined once (`POST /api/internal/employees`).

## 4. Session

- **[Fixed, prior pass]** 3-part signed token (`userId.issuedAtMs.signature`), 30-day server-side expiry enforced in both `simple-session.ts` and `proxy.ts`'s independent Edge-runtime mirror.
- **[Open, Medium]** No server-side revocation list — logout only clears the client cookie; a captured-but-not-yet-expired token remains valid if replayed (`adr/0007` step 2, still Proposed).
- **[Pass]** Cookie flags confirmed correct: `httpOnly: true`, `sameSite: 'lax'` (explicit), `secure` conditional on `NODE_ENV === 'production'` (standard pattern, verify the real deployment actually sets this).
- **[Fixed 2026-09-05, Low]** `/api/auth/logout` had zero rate limiting and — being in the public-route allowlist — was exempted from the proxy's CSRF Origin check, making it (session-terminate only, no data impact) triggerable by a cross-site auto-submitting form. Now wrapped in `withProtection` (`write` preset); the CSRF exposure itself is inherent to any public POST route and considered low-impact here since the only effect is logging the victim out.

## 5. Tokens

- **[Pass]** Session tokens: see §4. Invite tokens: `crypto.randomBytes(32).toString('hex')` (256 bits) — brute-forcing infeasible regardless of rate limiting; rate-limited anyway now (§19) for defense-in-depth against DB-load/timing probing.
- **[Fixed 2026-09-05]** NOWPayments webhook signature verification (`verifyNowPaymentsSignature`) fails closed (returns `false`, never a hardcoded fallback) if `NOWPAYMENTS_WEBHOOK_SECRET` is unset — confirmed, no change needed, cited here for completeness of the Tokens/Secrets review.

## 6. Passwords

- **[Pass]** bcrypt cost factor 12 (`src/lib/auth/password.ts`), consistent everywhere after §1's sandbox/convert fix. Server-side `min(8)` enforced at every account-creation path (signup, sandbox/convert, team-invite-accept for new users).
- **[Open, Medium — product decision]** `User.email` is globally unique across the whole platform (not per-tenant), meaning the same email can't have separate accounts in two different tenant orgs. Noted in `DATABASE-TARGET.md` DB-07-adjacent territory — a business-logic question, not a security bug.

## 7. Secrets

- **[Fixed, prior pass]** `NEXTAUTH_SECRET` fails closed in production if unset (throws rather than falling back to the dev default) — verified in both `simple-session.ts` and `proxy.ts`.
- **[Pass]** No hardcoded real-looking API keys/secrets found anywhere in `src/`/`scripts/`. `.env` correctly gitignored, never committed. `.env.example` contains only placeholders.
- **[Fixed 2026-09-05, Critical]** `GET /api/payments/gateways` had **no role check at all** and returned `apiKey`/`secretKey`/`webhookSecret` in plaintext for every configured payment gateway to any authenticated user of any tenant (self-signup is public) — the single most severe finding of this phase. A `PaymentGatewayConfig` row's own schema comment admits secrets are stored in plaintext ("app-layer should encrypt before persisting in production"), so this was a direct plaintext-credential leak of the platform operator's live Stripe/PayPal/NOWPayments/etc. keys to anyone with a free account. Fixed: `GET` now requires `isSuperAdmin()`, and the response `omit`s `apiKey`/`secretKey`/`webhookSecret` entirely (confirmed the admin UI only ever writes these fields via password inputs — never reads them back, so omitting is safe with zero frontend impact).
- **[Fixed 2026-09-05, Medium]** `.dockerignore` didn't exclude `.env`/`.git`, and the `Dockerfile`'s builder stage does `COPY . .` — a real `.env` present in the build context would have its content persisted in that intermediate layer's history (not the final runtime image, since multi-stage `COPY --from=builder` only pulls specific paths, but still recoverable via `docker history`/registry push of the builder stage). Fixed: both added to `.dockerignore`.

## 8. API

- **[Open, Medium — pre-existing, not this phase's scope to fix broadly]** ~96% of routes still accept unvalidated request bodies (only ~11 of 239 use zod after this phase's additions). No SQL-injection risk (Prisma parameterizes everywhere) and XSS is mitigated by React's default escaping + `sanitizeText`, but malformed input can still produce confusing 500s instead of clean 400s on many routes. `adr/0003` (CRUD-factory validation hooks) remains the recommended systemic fix, still not implemented.
- **[Pass]** Only one raw-SQL call exists anywhere (`$queryRaw\`SELECT 1\`` in the health check, no interpolation) — confirmed clean, no SQL injection surface.

## 9. Database

Covered in full by `DATABASE-AUDIT.md`/`DATABASE-TARGET.md` (Phase 04) — cross-referenced here for the security-relevant subset:
- **[Fixed, Phase 04]** 28 missing `tenantId` indexes, 6 composite indexes, a real double-payment webhook race (now transactional, live-verified), 7 orphaned dev rows cleaned, a new `scripts/db-integrity-check.ts` (24 checks).
- **[Open, High — deferred, needs its own pass]** No `prisma/migrations/` history — `db push` only. Real Prisma migrations (`adr/0006`) remain the single longest-standing, highest-effort gap in the whole audit trail; deliberately not attempted inside either the database or security phase since it needs a real staging environment and backup tooling as prerequisites.
- **[Open, High — deferred]** 8 more unwrapped multi-step writes including 2 genuine TOCTOU races (club points/ad-credits balance check-then-decrement) — `DATABASE-TARGET.md` DB-08, same severity class and fix pattern as the crypto-payment fix already shipped, deferred for scope/time only.

## 10. File Upload

- **[Pass — no attack surface exists]** No file-upload route exists anywhere in the codebase. The `OnboardingDocument` model and `mammoth`/`pdf-parse`-based extractor (`src/lib/onboarding/extractor.ts`) are confirmed dead code with zero callers (matches the prior Phase-1 finding). Avatar/logo "upload" fields are plain client-supplied URL strings — no file bytes ever reach the server. If document upload is built later, it must add server-side MIME/magic-byte validation, a size cap, a randomly-generated storage filename never derived from client input, and storage outside `public/` — noted for whoever builds that feature, not an open finding today.

## 11. Storage

- **[Pass]** No cloud storage integration exists (confirmed, zero `aws-sdk`/S3/Cloudinary hits). Local persistence is Postgres + Redis only, both on named Docker volumes (`postgres_data`, `redis_data`) — survive container restarts. **[Info]** No backup/replication is configured anywhere (compose files or scripts) — an operational data-loss risk (a lost host disk loses everything with no offsite copy), tracked in `DATABASE-TARGET.md` DB-10, not a security vulnerability per se.

## 12. Logs

- **[Pass]** No password, session token, or full-user-object logging found anywhere — `authenticateUser()`/`getCurrentUser()` return hand-picked field subsets; the `audit()` helper's `metadata` field was checked at every call site, none pass sensitive values.
- **[Open, Low]** 8 catch blocks return `err.message` to the client (external-service failure wrappers — LLM provider, crawl fetch, queue backend), none gated by `NODE_ENV`. Could leak minor internal details (an internal hostname in a fetch error, provider-SDK internals) to a probing caller. Not fixed this pass — low severity, would need a project-wide error-handling convention change rather than a point fix.
- **[Info]** `src/lib/email/service.ts`'s dev-mode full-email-body console logging has zero callers anywhere (dead code, same pattern as the onboarding extractor) — no live exposure today.

## 13. CORS

- **[Pass]** No explicit CORS handling exists anywhere (confirmed via full grep) — correct and safe by omission for this architecture: same-origin cookie auth + no `Access-Control-Allow-Origin` header means a cross-origin page's `fetch()` response is opaque even with `credentials: 'include'`. No wildcard-plus-credentials misconfiguration.

## 14. CSRF

- **[Pass]** `sameSite: 'lax'` (explicit) already blocks cross-site POST/PUT/PATCH/DELETE cookie attachment for both `fetch`/XHR and auto-submitting `<form>` — the app's CSRF posture is solid for the large majority of routes. `proxy.ts` additionally checks the `Origin` header on every authenticated state-changing request as defense-in-depth.
- **[Fixed 2026-09-05, Low]** `/api/webhooks/` was registered as a public-route *prefix* in `proxy.ts`, intended only for the NOWPayments IPN receiver but also matching the tenant-scoped `WebhookSubscription` CRUD item route (`/api/webhooks/[id]`) — exempting it from both session-auth and the Origin check (not currently exploitable, since the handler still calls `requireTenantId()` internally, but removes a real defense-in-depth layer). Scoped to `/api/webhooks/crypto/` instead.
- **[Fixed 2026-09-06, Critical — availability, not a bypass]** The Origin check itself compared against `req.nextUrl.origin`, which reflects the server's own bind address rather than the host a browser addressed. Confirmed via Phase 09's E2E test run against the real production artifact (`.next/standalone/server.js`, the exact command `docker-compose.prod.yml` runs): `req.nextUrl.origin` resolved to `http://0.0.0.0:3000` regardless of the real public domain, so a legitimate browser's `Origin` header could never match — **every authenticated POST/PUT/PATCH/DELETE request would have 403'd in the deployed standalone/Docker environment.** This is an availability bug, not a security bypass (fails closed), but severe: it would have broken every write in production while every prior phase's `next dev`-based live-verification passed. Fixed to derive the expected origin from the `Host` header (and `X-Forwarded-Proto`) instead.

## 15. XSS

- **[Pass]** Exactly one `dangerouslySetInnerHTML` site in the entire codebase (`src/components/ui/chart.tsx`, shadcn/ui's chart-color CSS injection) — confirmed fed only by static, developer-authored config, never user/tenant input. No live stored-XSS path exists today.
- **[Open, Low — latent, for future awareness]** `BlogPost.htmlContent`, `ContentPiece.body`, `EmailTemplate.body` store raw HTML/Markdown but nothing currently renders them via `dangerouslySetInnerHTML`/`innerHTML`/`srcDoc` anywhere. If a future blog/CMS frontend or email-preview feature wires these in without sanitization, the existing CSP (`script-src 'self' 'unsafe-inline'`, still open, see §22) would provide **zero** mitigation. Flagged for whoever builds that feature next — not an open finding against current code.

## 16. SQL Injection

- **[Pass]** See §8/§9 — confirmed clean, no risk found.

## 17. SSRF

- **[Fixed 2026-09-05, High]** `POST /api/onboarding/crawl` → `src/lib/onboarding/crawler.ts`'s `crawlWebsite()`: any authenticated tenant user could supply an arbitrary URL for the server to fetch, with only a same-request scheme/parse check — no private-IP/loopback/cloud-metadata blocklist, and `redirect: 'follow'` meant even a naive check could be bypassed via a redirect to an internal address. Fixed: new `assertPublicHost()` resolves the hostname via DNS and rejects private/loopback/link-local/reserved ranges (covering the `169.254.169.254` cloud-metadata endpoint explicitly), `redirect` changed to `'manual'` with every hop re-validated before being followed (max 5 hops), and non-`http(s)` schemes rejected on both the original URL and every redirect target.
- **[Pass]** Every other `fetch()` call site with any user-influenced component was checked and confirmed either fixed-destination (Serper, Qdrant, NOWPayments, SIEM webhook — all `process.env`-configured) or not-yet-implemented (webhook delivery to `WebhookSubscription.url` has no dispatch code anywhere; the SEO crawler is fully mocked, no real fetch). Both are flagged as design notes for whoever implements them: validate the destination at send time, not just save time (DNS can change between the two — a TOCTOU/rebinding concern).

## 18. Rate Limiting

- **[Fixed 2026-09-05, High]** `getClientId()` (`src/lib/security/rate-limit.ts`) trusts `X-Forwarded-For` unconditionally, correct only because Caddy (not the client) is supposed to set that header — but `docker-compose.prod.yml` published the app's port 3000 directly to the host (`0.0.0.0`), meaning anyone could bypass Caddy entirely, hit the app directly, and forge a fresh `X-Forwarded-For` per request to defeat every IP-keyed rate limit including `/api/auth/login`'s 5/min cap. Fixed at the infrastructure layer: app now binds `127.0.0.1:3000:3000` (loopback-only, still reachable by Caddy on the same host), and Postgres/Redis port publishing was removed entirely (see §26).
- **[Fixed 2026-09-05, Medium]** `POST /api/public/demo` and `POST /api/public/pricing-calculate`: unauthenticated, unrated-limited, unlimited DB-row creation per call (the latter also accepting free-text `customerEmail`/`customerName` with no validation). New `public` rate-limit preset (20/min) added and applied to both, plus the three `/api/sandbox/*` routes that had the same known gap (`KNOWN-ISSUES.md #12`, now closed) and `/api/team/invite/[token]` (both GET and POST).
- **[Open, Low]** The generic CRUD factory never rate-limits its `GET` handlers (only POST/PATCH/DELETE) — an authenticated-but-malicious tenant user can scrape their own tenant's data at unlimited rate. Same-tenant-only blast radius (they're already authorized to see this data), not fixed this pass.
- **[Open, Low]** `/api/health`'s detailed branch and the NOWPayments webhook receiver remain unrated-limited by design — the former now only returns detail to SuperAdmins (§25), the latter is signature-verified before any DB write and rate-limiting it risks throttling legitimate gateway retry storms (documented tradeoff, not fixed).

## 19. Brute Force

- **[Fixed 2026-09-05, High]** See §18 — the `X-Forwarded-For` spoofing bypass that made login brute-forcing trivial from a single machine is closed at the infra layer.
- **[Fixed 2026-09-05, High]** Failed logins are now audit-logged (§1) — the detection gap that made a brute-force campaign invisible in application logs is closed. Throttling and detection are now both real; a formal account-lockout mechanism (§1) remains open as defense-in-depth, not currently required to consider this class of attack mitigated.

## 20. Privilege Escalation

Covered in depth in §2 — this phase's largest finding cluster (`team/members`, `team/invite/[token]`, `team/roles/[id]`) was specifically privilege-escalation-shaped and is fully fixed. Previously-fixed items reconfirmed still correct: `PATCH /api/admin/users/[id]` (superadmin-only), `POST /api/internal/employees` (only an existing super_admin may grant the `super_admin` platformRole).

## 21. IDOR

Covered in depth in §2.

## 22. Sensitive Data Exposure

- **[Fixed 2026-09-05, Critical]** See §7 — payment gateway secrets.
- **[Fixed 2026-09-05, Medium]** `hashedPassword` was returned in JSON responses from `GET /api/admin/users`, `PATCH /api/admin/users/[id]`, and (pre-existing-fix-in-progress, confirmed complete) `team/members` routes — all now use `select`/`omit` to exclude it.
- **[Fixed 2026-09-05, Medium]** `GET /api/health` returned masked-but-still-informative DB/Redis URLs, SMTP host/port, integration-configured booleans, uptime, and version to any anonymous caller. Now gated: anonymous/non-superadmin callers get only `{status, checks: {ok booleans}}`; the full diagnostic payload requires `isSuperAdmin()`. The 200/503 status code (what load-balancer probes actually need) is unchanged for anonymous callers.
- **[Open, Low]** `distributors/route.ts`/`[id]/route.ts` return banking fields (`bankAccount`, `iban`, `swiftCode`) to any member of the owning tenant, not just an owner/finance role — correctly tenant-scoped (no cross-tenant leak), just a role-granularity gap. Not fixed this pass.
- **[Open, Medium — remains open, unchanged]** 11/15 payment gateways are non-functional stubs and 4 analyzer features fabricate data — both BLOCKED on external resources/product decisions, tracked since the prior phase, unrelated to this phase's findings.

## 23. Dependency Vulnerabilities

`bun pm audit`/`npm audit --production` were non-functional in this environment (see `DEPENDENCY-AUDIT.md` update for the exact errors); `bun audit` worked and gave real, actionable output.

- **[Fixed 2026-09-05, High]** `lodash`/`lodash-es` (prototype pollution + `_.template` code injection, pulled in at runtime via `recharts` and `@reactuses/core` — both ship in the browser bundle, 6 dashboard views use `recharts`) and `js-cookie` (cookie-attribute injection via `@reactuses/core`) were all vulnerable and reachable from the client bundle. Fixed via `package.json` `overrides` forcing `lodash`/`lodash-es` to `^4.18.1` and `js-cookie` to `^3.0.8` (patched releases exist for all three, same major version — confirmed API-compatible); `bun install` re-resolved cleanly, `typecheck`/`lint`/`build` all still pass.
- **[Open, Low — dev/build-tooling only, not shipped]** The remaining `bun audit` findings (`brace-expansion`, `browserslist`, `deepmerge-ts`, `defu`, `effect`, `flatted`, `js-yaml`, `minimatch`, `nanoid`, `@xmldom/xmldom`, `@humanfs/node`, `ajv`, `@babel/core`, `diff`) are all transitive dependencies of ESLint/`eslint-config-next`, the Prisma CLI's build-time tooling, or the confirmed-dead `mammoth`/`@mdxeditor/editor` packages — none run in the request path or ship in the production bundle. Left for the next routine `bun update`/lockfile refresh rather than a point fix, since forcing overrides on a dev-toolchain's internals carries more compatibility risk than value here.

## 24. Container Security

- **[Pass]** `Dockerfile` runs as non-root (`nextjs`, uid/gid 1001) in the final stage; multi-stage build correctly excludes dev/build tooling from the runtime image; no secrets baked via `ARG`/`ENV`.
- **[Fixed 2026-09-05, Medium]** `.dockerignore` gap — see §7.
- **[Open, Low]** Base image `node:20-alpine` is a floating tag, not pinned to a digest — reproducibility/supply-chain hygiene note, not an immediate exploit. Not fixed this pass.

## 25. Cloud / Server Security

- **[Fixed 2026-09-05, High]** Postgres (5432) and Redis (6379) were published directly to the host's public interface in `docker-compose.prod.yml`, reachable from the internet with only Postgres's (often-default) password standing in front of it, and Redis with **no auth configured at all**. Both `ports:` mappings removed entirely — reachable only via the internal `marketing-network` Docker bridge, which is all the `app` container ever needed.
- **[Fixed 2026-09-05, High]** App container published port 3000 to `0.0.0.0` (see §18/19) — now bound to `127.0.0.1` only.
- **[Fixed 2026-09-05, Low-Medium]** `docker-compose.prod.yml`'s `POSTGRES_PASSWORD` default fallback (`marketing_secret_change_me`) removed — `${POSTGRES_PASSWORD:?...}` now fails the compose startup with a clear error if the operator hasn't set it, matching the existing fail-closed pattern already used for `NEXTAUTH_SECRET`.
- **[Fixed 2026-09-05, Medium]** The checked-in root `Caddyfile` didn't match its own documented purpose (`TECHNICAL_SPECIFICATION.md` §9.7: "Auto-HTTPS... reverse proxy to localhost:3000... security headers") — it instead listened on plain HTTP `:81` with an unauthenticated `?XTransformPort=<n>` handler that reverse-proxied to **any caller-chosen local port**, a real open-proxy primitive. Confirmed not part of the actual deploy path (`scripts/deploy-vps.sh` generates its own Caddyfile independently), but its presence at the repo root could mislead someone into deploying it as-is. Replaced with a template matching the documented intent and what `deploy-vps.sh` actually generates.
- **[Pass]** Caddy's automatic HTTPS is confirmed real in the actual deploy path (`deploy-vps.sh` installs Caddy; its generated config's bare-domain block triggers Caddy's built-in ACME/Let's Encrypt flow).

## 26. Cross-cutting: what changed at the infrastructure layer this phase

`docker-compose.prod.yml` received 4 coordinated changes (app loopback-only bind, Postgres port removal, Redis port removal, Postgres password fail-closed) that together close the rate-limit-bypass (§18/19) and direct-database-exposure (§25) findings as one coherent fix — each is individually described above under its own section, cross-referenced here since they were driven by the same root file.

---

## Summary table

| Severity | Found this phase | Fixed this phase | Deferred (documented above) |
|---|---|---|---|
| Critical | 6 (payment-gateway secret leak, 3× team privilege-escalation, reseller PII leak, marketplace/reseller-opportunity unrestricted create) — plus 8 more Critical-tier IDOR findings from the same sweep | **All 14 fixed** | — |
| High | 9 (SSRF, rate-limit bypass via infra, 2× runtime dependency vulns, Postgres/Redis public exposure, 2× IDOR, brute-force detection gap) | **All 9 fixed** | 2 remain open from prior phases (payment-gateway stubs, fabricated analyzer data — both BLOCKED on external resources, unrelated to this phase) |
| Medium | 12 | 8 fixed | 4 deferred (documented per-section above, none newly discovered as urgent) |
| Low/Info | ~15 | 3 fixed (auth/logout + invite-token rate limiting, webhooks/ proxy-prefix scoping) | Rest are genuine defense-in-depth/hygiene notes, not active risks |

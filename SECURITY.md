# Security Policy

This document is the operational security policy for Expload Marketing. For the detailed, evidence-cited technical audit, see `SECURITY-BASELINE.md`. For the narrative threat model (who could attack this system and how), see `THREAT-MODEL.md`. For database-specific integrity/backup procedure, see `DATABASE-AUDIT.md` / `DATABASE-TARGET.md`.

## Reporting a vulnerability

This is currently a self-hosted, single-operator project rather than a published open-source library with an external user base — there is no public bug-bounty program or CVE process. If you are a developer or operator working on this codebase and find a security issue:

1. **Do not** open a public GitHub issue describing the vulnerability in detail.
2. Document the finding privately (file path, line, reproduction steps, real-world impact) the same way the findings in `SECURITY-BASELINE.md` are documented — evidence-cited, with a concrete exploit scenario, not just "this looks unsafe."
3. Fix Critical/High findings before merging any other work on the affected area, following the same investigate-before-changing discipline used throughout this project's engineering process (see the project's own `CLAUDE.md`/engineering-process conventions if present).
4. Record the fix in `KNOWN-ISSUES.md` and `SECURITY-BASELINE.md` with a status update, matching the format already used there — every fix in this project's history is traceable: what was broken, what changed, how it was verified.

If this project is ever published or opened to external contributors, this section should be replaced with a real disclosure address and a defined response-time commitment before that happens — publishing a multi-tenant SaaS's source without a reporting channel is itself a gap worth closing first.

## Supported configuration

- **Runtime**: Next.js 16 (App Router), Node 20 (per `Dockerfile`'s `node:20-alpine` base).
- **Database**: SQLite in development, PostgreSQL 15 intended for production (`prisma/schema.prisma`'s provider is currently set to `sqlite` even for the documented prod path — see `DATABASE-AUDIT.md` for the migration-adoption gap this implies).
- **Deployment**: Docker Compose (`docker-compose.prod.yml`) behind Caddy for TLS termination (`scripts/deploy-vps.sh` generates the real production Caddy config). Running the app directly with `bun`/`node` outside this topology (no reverse proxy in front) is **not supported from a security standpoint** — the app's rate limiter trusts `X-Forwarded-For` on the assumption that only a trusted reverse proxy can set it (see `SECURITY-BASELINE.md` §18/19/25).
- Security fixes target the `main` branch only; there is no maintained older-version branch to backport to.

## Secure development practices (what this project actually does, verified)

- **Authentication**: bcrypt (cost 12) password hashing, signed session tokens with server-side expiry, no hardcoded fallback secret in production (fails closed if `NEXTAUTH_SECRET` is unset).
- **Authorization**: every tenant-scoped route must independently verify the caller owns the record being read/modified before acting — see `THREAT-MODEL.md` §4 for why this is the one boundary that actually matters in this architecture, and `SECURITY-BASELINE.md` §2 for the sweep that closed 13 places this had been missed.
- **Secrets**: never logged, never committed (`.env` gitignored and confirmed clean across git history), never returned in an API response without an explicit reason (payment-gateway keys and password hashes were both audited and locked down this phase).
- **Dependencies**: `bun audit` run as part of this phase's review; runtime-shipped vulnerable transitive dependencies (`lodash`, `lodash-es`, `js-cookie`) are pinned to patched versions via `package.json` `overrides`. Re-run `bun audit` before any release and after any dependency bump.
- **Infrastructure**: only the reverse proxy's TLS ports (80/443, via Caddy on the host) and the app's loopback-bound port should ever be reachable from outside the Docker network — the database and cache must never be published to a public interface (`docker-compose.prod.yml` enforces this after this phase's fixes; don't reintroduce a `ports:` mapping on `postgres`/`redis` without a specific, reviewed reason).
- **Input handling**: Prisma's parameterized queries eliminate SQL injection by construction; React's default escaping plus the near-total absence of `dangerouslySetInnerHTML` eliminates most XSS risk today, but this is fragile — see `THREAT-MODEL.md` §6's note on the CSP `unsafe-inline` gap before wiring any stored-HTML field into a raw-render path.
- **SSRF**: any feature that has the *server* fetch a *user-supplied* URL (like the onboarding website crawler) must validate the resolved IP against private/loopback/link-local/cloud-metadata ranges and re-validate on every redirect hop — `src/lib/onboarding/crawler.ts`'s `assertPublicHost()` is the reference implementation; reuse it rather than re-deriving the check if a similar feature is added later.

## Data integrity and testing

- `scripts/db-integrity-check.ts` — read-only, checks for orphaned/spoofed references across the schema's soft-FK columns. Run via `bun run db:integrity-check` before trusting any claim that referential integrity is intact; it has already caught a real issue once (see `DATABASE-TARGET.md` DB-16).
- Security-relevant regressions in this phase were verified live, not just by code review: a concurrent-request simulation confirmed the crypto-payment double-booking fix actually prevents the race (see `DATABASE-TARGET.md` DB-06); the SSRF, IDOR, and privilege-escalation fixes in this phase should be verified the same way — with a real request against a running instance, using a real low-privilege test account, not just by reading the diff — before considering any of them "verified." See `scripts/security-checks.ts` for the automated subset of this that can run without a live server (see below).

## Known, accepted, or deferred risk (do not re-report these as new findings)

The following are documented, tracked gaps — not oversights in this policy:

- No `prisma/migrations/` history exists yet (`adr/0006`) — schema changes use `db push`. Needs its own dedicated pass with a staging environment before production schema changes should be considered safe.
- No session revocation list (`adr/0007` step 2) — logout clears the client cookie only; a captured token remains valid until its 30-day expiry.
- ~96% of API routes accept unvalidated request bodies beyond Prisma's own type coercion (`adr/0003` — CRUD-factory validation hooks — is the recommended systemic fix, not yet implemented).
- 2 High findings remain BLOCKED, not open: 11/15 payment gateways are non-functional integration stubs, and 4 "analyzer" features fabricate data — both require real third-party credentials/subscriptions this environment cannot provide, and are product-honesty issues (the UI should not present them as functional) as much as engineering ones.
- CSP allows `script-src 'self' 'unsafe-inline'` — weakens XSS defense-in-depth; no live XSS exists to exploit it today (see `THREAT-MODEL.md` §6), but should move to a nonce/hash-based policy before any feature renders untrusted stored HTML.

Full detail, evidence, and fix status for every item above is in `SECURITY-BASELINE.md` and `KNOWN-ISSUES.md` — this file intentionally stays short and operational; those two are the source of truth.

# AGENT-CONTEXT.md

**Read this file first, before doing anything else in this repository.** Then read, in order: `docs/PRODUCT-BASELINE.md`, `docs/PROJECT-CONTROL.md`, `ARCHITECTURE-TARGET.md`, and whatever `*.md` document covers the specific feature you're about to touch (this project's root has a full audit trail — `PROJECT-INVENTORY.md`, `ARCHITECTURE-CURRENT.md`, `TECH-STACK.md`, `DEPENDENCY-AUDIT.md`, `KNOWN-ISSUES.md`, `TODO-INVENTORY.md`, `DEAD-CODE.md`, `SECURITY-BASELINE.md`, `PRD.md`, `USER-STORIES.md`, `USE-CASES.md`, `BUSINESS-RULES.md`, `ACCEPTANCE-CRITERIA.md`, `REQUIREMENTS-TRACEABILITY.md`, `SYSTEM-DIAGRAM.md`, `MODULE-BOUNDARIES.md`, `DEPENDENCY-RULES.md`, `adr/*`). Do not re-derive any of this from scratch — it's already been extracted from the code, verified against actual runtime behavior, and kept honest about what's real vs. stub vs. broken.

## What this project is

**Expload Marketing** — a multi-tenant B2B marketing SaaS (Next.js 16, Prisma, TypeScript) that is simultaneously a full marketing-automation platform for its direct customers *and* a wholesale/white-label reseller business (distributors buy license packages and resell the platform) *and* an internal-operations tool (payroll, HR, support SLAs) for whoever runs it. Full detail: `docs/PRODUCT-BASELINE.md`.

## What's actually built (verified, not assumed)

76 API domains / 239 routes. 150 Prisma models. 62 dashboard views, all correctly wired (zero orphans, verified by tracing every `page.tsx` switch case against every nav entry and component file). Real, working: CRM, lead gen (with honest mock-fallback), email campaigns, a real multi-provider LLM aggregator, an AI negotiation engine (6-round automatic concession formula, exact numbers in `BUSINESS-RULES.md` §3), an LLM-driven graph/DAG orchestrator, crypto payments, a wholesale license/distributor system, Redis-backed job queue with in-memory fallback, Qdrant vector search with in-DB fallback, 29-language i18n with RTL. Full status per module: `REQUIREMENTS-TRACEABILITY.md`.

## What's broken or fake (do not assume these work just because the UI/schema exist)

- 11 of 15 "configured" payment gateways make zero real API calls (Stripe's `clientSecret` literally contains the string `_mock`) — only NOWPayments crypto is real.
- 4 "analyzer" features (backlink discovery, competitor analysis, social analyzer, SEO crawl) unconditionally return `Math.random()`-fabricated data, persisted as if real.
- WhatsApp and SMS have full CRUD + UI, zero actual send integration.
- Onboarding document upload (`src/lib/onboarding/extractor.ts`) has zero callers — never actually parses anything despite looking finished and having `mammoth`/`pdf-parse` installed.
- Two disconnected AI stacks: `llm/aggregator.ts` (real, portable) vs. `z-ai-web-dev-sdk` (5 call sites, environment-coupled, likely won't work in a fresh self-hosted deployment).
- Two independent, non-communicating "autonomous agent" implementations (`graph/orchestrator.ts` vs. `api/agent/run`).
- Custom role/permission editor in the UI has **zero actual effect** on access control — `roleId` is never populated on the session, so the permission check it's supposed to feed never runs.
- Zero automated tests anywhere. No CI/CD. No APM/observability tooling.

Full, evidence-cited list: `KNOWN-ISSUES.md` (20 items, ranked) and `SECURITY-BASELINE.md` (security-specific, with severity tags). **Update 2026-09-04**: both Critical findings (`/api/seed` credential disclosure, support-plans cross-tenant IDOR) and 4 of 6 High findings (tenant-context spoofing, `/api/tenants` disclosure, marketplace mass-assignment, leads/campaigns ownership) are now fixed and verified live — see `docs/IMPLEMENTATION-PLAN.md`. Still genuinely open: payment-gateway stubs and fabricated analyzer data (both BLOCKED on external resources, not engineering gaps), session revocation (expiry itself is fixed), input validation, CSP hardening.

## Architecture (verified, not designed-on-paper)

Single Next.js deployable, modular monolith (deliberately — see `adr/0001`, do not propose microservices without a real evidenced need). `src/lib/**` module graph is a clean DAG, **zero circular dependencies** (traced 3-5 hops deep). Layer separation (UI → HTTP → Service → Data) is real and consistently upheld almost everywhere — full model in `MODULE-BOUNDARIES.md`. The generic CRUD factory (`src/lib/crud/domain-handler.ts`) powers ~46 of 76 domains and is genuinely, confirmedly generic — never special-case it for one model; extend it via the hook pattern in `adr/0003` instead.

## Database

150 Prisma models, SQLite (dev) / PostgreSQL (prod, documented). **No migration history exists — `prisma/migrations/` is empty/absent.** Never run a destructive schema operation against anything resembling production data without following the DB-safety procedure in `ARCHITECTURE-TARGET.md` (Backup → Migration → Validation → Rollback, every step explicit and written down before you start, per `adr/0006`).

## API

Two coexisting patterns: the generic CRUD factory (list/create via `requireTenantId()`, update/delete via a fetch-then-compare ownership check) and bespoke handlers (auth via `isSuperAdmin()`/`getCurrentUser()`/`requireTenantId()` depending on domain). **The tenant-context resolver `getTenantId()` (`src/lib/tenant.ts`) currently has an unauthenticated header/cookie fallback that is the root cause of this project's most severe security findings — do not add a new route that relies on `requireTenantId()` alone for anything sensitive until `adr/0004` is resolved, and do not extend the fallback pattern anywhere else.**

## What must not change without a documented reason (per this migration's own governing rules)

- Do not rewrite the CRUD factory, the negotiation engine, the LLM aggregator, or any other module confirmed clean/working in this audit trail — extend, don't replace.
- Do not delete a feature because its backing integration is a stub (payment gateways, WhatsApp/SMS) — fix the integration or get an explicit product decision to remove the feature; don't silently drop UI/schema that customers may already be relying on the *appearance* of.
- Do not "clean up" `src/lib/payment/gateway-router.ts` or `src/lib/onboarding/extractor.ts` by deleting them without checking `ARCHITECTURE-TARGET.md` item 9 first — they may be intended to be wired in, not removed.
- Do not reset the database, force-push over the git history, or run `prisma db push --accept-data-loss` against anything that isn't a throwaway dev database.
- Do not treat any prior `worklog.md` "Stage Summary: ... TypeScript clean, ESLint clean, build successful" claim as proof a feature actually works end-to-end — those checks confirm the code compiles, not that the business logic is correct or the integration is real. This audit trail exists specifically because several such claims turned out to describe stub/fake behavior underneath a clean build.

## Current phase / next action

See `docs/PROJECT-CONTROL.md` for the full phase matrix and risk list. **As of 2026-09-04, the P0/P1 security remediation pass is done**: `KNOWN-ISSUES.md` #1-#6 fixed and verified live, `adr/0004` and `adr/0007` (step 1) implemented — phase 05 moved from BROKEN to PARTIALLY COMPLETE. **The next execution point is `adr/0003`** (CRUD factory `validate`/`beforeWrite` hooks) — small, foundational, fully backward-compatible, unblocks the Funnel/Journey and distributor-payout validation gaps in `BUSINESS-RULES.md`. After that, the highest-leverage remaining item is a product decision (not engineering work): what to do about the 2 BLOCKED High findings (payment-gateway stubs, fabricated analyzer data) — both need real external resources this environment doesn't have.

**Before starting any of the above, or any other task in this repo: update `docs/PROJECT-CONTROL.md`'s "Current phase" / "Next action" sections when you finish, so the next agent doesn't have to re-derive where things stand.**

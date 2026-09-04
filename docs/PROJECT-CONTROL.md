# PROJECT-CONTROL.md

**This file is the live control document for this project. Update it whenever a phase status, decision, or risk changes — don't let it go stale.** Last updated: 2026-09-04, after the framework-migration recovery pass.

## Current phase

Per `docs/PROJECT-PHASE-MATRIX.md`: phases 00-03 (Product Discovery, Existing Project Audit, Requirements, Architecture) are **COMPLETE** as of this pass. The project's actual next work is **not** a new greenfield phase — it's closing specific, named gaps inside phases that are already substantially built (05 Security, 04 Database, 10 File/Media, 18 QA foremost). See "Next Action" below for the single resume point.

## Completed phases

- **00 Product Discovery** — `docs/PRODUCT-BASELINE.md`
- **01 Existing Project Audit** — `PROJECT-INVENTORY.md`, `ARCHITECTURE-CURRENT.md`, `DEPENDENCY-AUDIT.md`, `DEAD-CODE.md`, `TODO-INVENTORY.md`
- **02 Requirements** — `PRD.md`, `USER-STORIES.md`, `USE-CASES.md`, `BUSINESS-RULES.md`, `ACCEPTANCE-CRITERIA.md`, `REQUIREMENTS-TRACEABILITY.md`
- **03 Architecture** — `ARCHITECTURE-TARGET.md`, `SYSTEM-DIAGRAM.md`, `MODULE-BOUNDARIES.md`, `DEPENDENCY-RULES.md`, `adr/0001`-`0007`
- **04 Database (audit + P0 fixes)** — `DATABASE-AUDIT.md`, `DATABASE-TARGET.md`, `adr/0010`-`0011`, `scripts/db-integrity-check.ts`. Not fully COMPLETE (see phase matrix) — real migrations (`adr/0006`) still deferred.
- **05 Security (deep audit + Critical/High fixes)** — `THREAT-MODEL.md`, rewritten `SECURITY-BASELINE.md`, new `SECURITY.md`, `scripts/security-checks.ts`. 14 Critical + 9 High findings fixed and live-verified. Not fully COMPLETE (see phase matrix) — 2 BLOCKED findings, session revocation, broad input validation, CSP hardening, and real migrations remain.

*(Also, prior to this documentation-recovery effort, real feature work already shipped and is reflected in the above: role-aware dashboards, a working team-invite flow, custom role UI, real Funnel/Journey builders, a Webhooks manager, an Approval Queue, Push/SMS UI, a job-queue/semantic-search admin panel, an LLM-provider reset action, and a financial-report archive — see git log `63fccd6`..`85f962f` for the exact commits. This work is KEEP, not something this recovery pass second-guesses.)*

## Incomplete / broken phases (evidence-based, from the matrix)

| Phase | Status | Top gap |
|---|---|---|
| 04 Database | Partial (audited 2026-09-04, P0 fixes applied) | No migration history — `db push` only, production-unsafe (`adr/0006`, deferred — needs its own staging pass) |
| 05 Security | Partially Complete | 2 Critical + 4 of 6 High findings fixed 2026-09-04; 2 High (payment/analyzer stubs) BLOCKED on external resources |
| 06 UX | Partial | RTL only on landing/auth, not the ~55 authenticated views |
| 07 Design System | Partial | Duplicate toast systems, 5 dead UI-kit wrappers |
| 08 Backend | Partial | 11/15 payment gateways stub; 4 analyzer endpoints fabricate data; 2 dead lib modules |
| 09 Frontend | Partial | No shared data-fetching hook (55/62 views duplicate the same boilerplate) |
| 10 File/Media | **Broken** | Onboarding document parsing is completely disconnected — never runs |
| 11 AI/ML | Partial | Two disconnected AI stacks |
| 12 Workflow | Partial | Two competing, non-communicating "autonomous agent" implementations |
| 13 Integrations | Partial/Broken in spots | WhatsApp/SMS are send-less; most card gateways are stubs |
| 14 Search/Reports | Partial | 4 report features fabricate data unconditionally |
| 15 Observability | **Not started** | No APM/error-tracking/metrics tooling at all |
| 16 Performance | **Not started** | No load testing, no caching strategy beyond the job queue |
| 17 Reliability | Partial | Good fallback pattern overall; 2 unguarded external-call sites remain |
| 18 QA | **Not started** | Zero automated tests anywhere |
| 19 DevOps | Partial | No CI/CD; deploy scripts have 2 confirmed defects |
| 20 Production Hardening | **Broken** | Directly blocked by phase 05's live Critical findings |

## Known risks (highest severity first — full detail in `SECURITY-BASELINE.md`/`KNOWN-ISSUES.md`)

**Update 2026-09-04**: items 1-4 below (both Criticals, and the tenant-isolation High cluster) are **FIXED and verified live** — see `docs/IMPLEMENTATION-PLAN.md`. Kept in this list, marked, so the fix is traceable against the original risk.

1. ~~**Critical**: `POST /api/seed`...~~ **FIXED**.
2. ~~**Critical**: `support-plans/{tickets,subscriptions}` PATCH...~~ **FIXED**.
3. ~~**High**: `getTenantId()`'s header/cookie fallback...~~ **FIXED** (revised design — cookie override kept but SuperAdmin-only; header removed outright — see `adr/0004`).
4. ~~**High**: `GET /api/tenants`, `marketplace/products/[id]`, `leads/[id]/enrich`, `campaigns/[id]/send`...~~ **FIXED**, all four.
5. **Still open, High**: 11/15 payment gateways are non-functional stubs; 4 analyzer endpoints fabricate data. **BLOCKED** — need real third-party credentials/subscriptions and a business decision on priority, not implementable from this environment (see "Pending decisions" below).
6. ~~**Medium**: unrate-limited public sandbox/demo/pricing-calc endpoints; X-Forwarded-For rate-limit-bypass risk...~~ **FIXED** (2026-09-05) — see item 7 below for the full 2026-09-05 pass.

**Update 2026-09-05 (Phase 05 deep audit)**: a second, much broader security pass found and fixed **14 Critical + 9 High** findings beyond the above — full list in `SECURITY-BASELINE.md`, narrative in `THREAT-MODEL.md`. Headline items: a complete privilege-escalation chain (`team/members`/`team/invite/[token]`) letting any free-signup user take over an arbitrary existing account across tenants; a plaintext payment-gateway-secret leak (`GET /api/payments/gateways`) to any authenticated user; an SSRF in the onboarding website crawler; and direct public exposure of Postgres/Redis/the app itself via `docker-compose.prod.yml` port publishing (which is what made the `X-Forwarded-For` rate-limit bypass in item 6 above actually exploitable — both closed by the same infra fix). All live-verified via `scripts/security-checks.ts` (`bun run security-check`) against a running dev server with real test accounts, not just code review.

7. **Still open, Medium-and-below** (unchanged by the 2026-09-05 pass, tracked not urgent): session revocation list (`adr/0007` step 2), CSP `unsafe-inline`, ~96% of routes unvalidated (`adr/0003`), no `prisma/migrations/` history (`adr/0006`) — see `KNOWN-ISSUES.md` and `SECURITY-BASELINE.md` for the complete, current, prioritized list.

## Architecture decisions (accepted or proposed — see `adr/`)

- **ADR-0001 (Accepted)**: stay a modular monolith, no microservice extraction — the existing module graph is already a clean, low-coupling DAG.
- **ADR-0002 (Proposed)**: consolidate the two AI stacks into `llm/aggregator.ts`.
- **ADR-0003 (Proposed)**: add optional `validate`/`beforeWrite` hooks to the CRUD factory.
- **ADR-0004 (Implemented 2026-09-04)**: harden tenant-context resolution — header fallback removed, cookie fallback kept but gated to SuperAdmin only.
- **ADR-0005 (Proposed)**: consolidate the two autonomous-agent implementations.
- **ADR-0006 (Proposed, confirmed by Phase 04 audit — 3 self-contradicting deploy scripts, not 2)**: adopt real Prisma migration history.
- **ADR-0007 (Step 1 implemented 2026-09-04)**: session expiry enforced server-side; step 2 (revocation list) still Proposed.
- **ADR-0010 (Proposed)**: introduce real Prisma `enum` types for the 226 fields currently documented only via comment.
- **ADR-0011 (Proposed)**: consolidate 9 duplicate/overlapping model clusters (`User.role`/`roleId` highest-risk, audit-log/alert clusters lowest-risk).

## Pending decisions (need the product owner, not an engineering call)

1. Does the internal HR/payroll/support-SLA/internal-portal cluster belong in the same customer-facing product shell, or should it be split into a separate internal tool? (`docs/PRODUCT-BASELINE.md` §"Out of scope")
2. What is the `Cohort` model actually meant to track? (No code references it anywhere — needs a purpose before any implementation.)
3. Is `agent/run` (the rule-based autonomous-agent implementation) still in active use by any real workflow, or is it safe to retire in favor of `graph/orchestrator.ts`? (`adr/0005` migration step 1 — needs someone who can check live usage, not just code.)
4. ~~Does any real external integration depend on the `X-Tenant-ID` header fallback today?~~ **Resolved 2026-09-04**: zero real callers found via repo-wide grep before removal; header fallback removed outright in `adr/0004`'s implementation, cookie fallback kept (SuperAdmin-only) since it's the live tenant-switcher feature.
5. What's the actual investment level wanted for testing/CI/observability (phases 15/16/18/19) — accepted gap for now, or next priority after security? This shapes sequencing more than anything else on this list.
6. Is `User.role` (plain string) or `User.roleId` → `Role` (RBAC) the intended long-term authorization model? (`adr/0011` item #1 — highest-risk consolidation item in that ADR; already confirmed the custom-role UI has zero real effect today, so this isn't just a schema question, it's "which access-control model does this product actually want.")
7. Should the 5 duplicate audit-log models, the 2 anonymous-visitor-tracking systems, and the other `adr/0011` clusters be consolidated now or left as-is until they cause a real bug? Lower urgency than #6 but same underlying question of ownership.

## Technical debt (non-security, catalogued not yet actioned)

Full list in `DEAD-CODE.md` and `MODULE-BOUNDARIES.md`'s violations section. Highlights: 2 fully dead `src/lib/` modules; 8 dead/unused npm dependencies; duplicate toast system; a prompt catalog 15/17 of whose entries are bypassed; business logic embedded directly in 4+ route handlers with no service module; a distributor-payout amount that's caller-supplied with no formula; a license-purchase amount-recording bug that doesn't scale with quantity purchased. **Database-specific technical debt** (full detail in `DATABASE-TARGET.md`'s deferred table): no `$transaction` wrapping on 8 more multi-step writes including 2 genuine TOCTOU races (club points/ad-credits); 45 more models missing a `[tenantId,status]` composite index; 226 string fields with no real enum enforcement; 9 duplicate model clusters; no backup automation.

## Next action

**Update 2026-09-04 (Phase 04 — Database Engineering)**: a full database audit ran this pass (`DATABASE-AUDIT.md`) covering tables/relations/indexes/constraints/transactions/migrations/duplicates/nullability/data-integrity/performance/security. Applied: 28 missing `tenantId` indexes, 6 composite `[tenantId,status]` indexes, a live-verified fix for a real double-payment-record bug in the crypto webhook handler (now transactional), cleanup of 7 confirmed-orphaned dev rows, and a new data-integrity test tool (`scripts/db-integrity-check.ts`, 24 checks, run via `bun run db:integrity-check`) — all documented with Migration/Rollback/Data Migration/Validation in `DATABASE-TARGET.md`. Phase 05 (security) status was also corrected in this pass — the "Incomplete/broken phases" table above still said Security was Broken despite the fixes already being live; that inconsistency is now fixed to match `docs/PROJECT-PHASE-MATRIX.md`.

**Update 2026-09-05 (Phase 05 — Security Engineering)**: full 26-area security audit (`THREAT-MODEL.md`, rewritten `SECURITY-BASELINE.md`, new `SECURITY.md`). Applied and live-verified: 14 Critical + 9 High fixes — a complete privilege-escalation/account-takeover chain (`team/members`, `team/invite/[token]`), a plaintext payment-gateway-credential leak (`GET /api/payments/gateways`), 11 further cross-tenant IDOR findings across the route surface, an SSRF in the onboarding crawler (new reusable `src/lib/security/ssrf-guard.ts`), and an infrastructure-layer fix (`docker-compose.prod.yml`: app/Postgres/Redis no longer publicly exposed) that also closed the login rate-limiter's spoofing bypass. New `scripts/security-checks.ts` (`bun run security-check`) — SSRF-guard unit tests plus live adversarial checks against a running server — is a permanent regression asset, not a one-off.

**Still deferred, ranked**: (1) `DATABASE-TARGET.md` DB-08 — 8 more unwrapped multi-step writes including 2 genuine TOCTOU races (payroll, license purchase, club points/ad-credits) — same severity class and fix pattern as fixes already shipped in phases 04/05, deferred only for scope/time. (2) `adr/0003` (CRUD factory validation hooks) — still not started, still small/foundational/backward-compatible; would also close most of the "~96% of routes unvalidated" gap at once. (3) `adr/0006`/DB-09 (real Prisma migrations) — the longest-standing documented gap, deliberately not attempted since it needs a real staging environment and backup tooling (DB-10) as prerequisites. (4) `adr/0007` step 2 (session revocation list). (5) A product decision is still needed on the 2 blocked High security findings (payment gateways, analyzer data) and on `adr/0011` item #1 (`User.role` vs `roleId`) — see "Pending decisions" above.

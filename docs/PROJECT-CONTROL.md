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
- **06 UX Architecture (sitemap/journeys + highest-priority fixes)** — `SITEMAP.md` (screen map/navigation/IA for all 62 views), `USER-JOURNEYS.md` (6 journeys + full empty/error/loading/destructive-confirm audit). Fixed and live-verified: no-logout-anywhere gap, 14 unconfirmed destructive actions, 2 misgated platform-internal nav items, sandbox demo's dead-route error handling, invite-accept auto-login asymmetry. Not fully COMPLETE (see phase matrix) — systemic 0% error-state coverage, 5 ambiguous nav items, and full viewer-role rollout remain, all documented.
- **07 Design System (token audit + highest-priority fixes)** — `DESIGN-SYSTEM.md` (all 16 requested areas + consistency audit, 20-item prioritized fix list). Fixed and live-verified: removed dead `tailwind.config.ts`, added a `text-2xs` token (closes a 311-usage gap), fixed a genuine WCAG contrast failure in `.text-brand-accent`, fixed 2 real RTL layout bugs (sidebar nav text, auth-modal form icons), added a `QueryClient`-level default that fixes silent-failure feedback for all 171 mutations in one change, created `src/lib/design/status-colors.ts` + `EmptyState` as new shared infrastructure (with proof-of-concept adoption). Not fully COMPLETE (see phase matrix) — the large mechanical consolidations (remaining hex literals/color maps, RTL spacing, label associations, `ui/table.tsx`/`AlertDialog` adoption) are catalogued, not attempted.

*(Also, prior to this documentation-recovery effort, real feature work already shipped and is reflected in the above: role-aware dashboards, a working team-invite flow, custom role UI, real Funnel/Journey builders, a Webhooks manager, an Approval Queue, Push/SMS UI, a job-queue/semantic-search admin panel, an LLM-provider reset action, and a financial-report archive — see git log `63fccd6`..`85f962f` for the exact commits. This work is KEEP, not something this recovery pass second-guesses.)*

## Incomplete / broken phases (evidence-based, from the matrix)

| Phase | Status | Top gap |
|---|---|---|
| 04 Database | Partial (audited 2026-09-04, P0 fixes applied) | No migration history — `db push` only, production-unsafe (`adr/0006`, deferred — needs its own staging pass) |
| 05 Security | Partially Complete | 2 Critical + 4 of 6 High findings fixed 2026-09-04; 2 High (payment/analyzer stubs) BLOCKED on external resources |
| 06 UX | Partial | Systemic 0% query-error-state coverage across 62 views; 5 ambiguous nav items need a product decision |
| 07 Design System | Partial (audited + highest-priority fixes 2026-09-05) | Duplicate toast systems (`ui/toaster.tsx` legacy hook-based, unused, still mounted alongside `sonner`), 5 dead UI-kit wrappers, large mechanical color/RTL/label consolidation deferred — see `DESIGN-SYSTEM.md` |
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
7. Should the 5 duplicate audit-log models, the 2 anonymous-visitor-tracking systems, and the other `adr/0011` clusters be consolidated now or left as-is until they cause a real bug? Lower urgency than #6 but same underlying question of ownership. (The 2 anonymous-visitor-tracking systems are the same underlying gap `USER-JOURNEYS.md` journey 4 found from the frontend side — `sandbox-demo`'s backend is real but unreachable by anonymous visitors, while `LiveDemoSection` is what they actually encounter.)
8. Which of `financial-reports`, `virtual-assistants`, `llm-settings`, `payment-gateways`, `distributors` are meant to be tenant-facing vs platform-staff-only? (`SITEMAP.md` §4.1 — currently shown to every tenant role including `viewer`, ambiguous purpose per each view's own stated copy; `payroll` and `platform` were the two unambiguous cases and are already gated.)

## Technical debt (non-security, catalogued not yet actioned)

Full list in `DEAD-CODE.md` and `MODULE-BOUNDARIES.md`'s violations section. Highlights: 2 fully dead `src/lib/` modules; 8 dead/unused npm dependencies; duplicate toast system; a prompt catalog 15/17 of whose entries are bypassed; business logic embedded directly in 4+ route handlers with no service module; a distributor-payout amount that's caller-supplied with no formula; a license-purchase amount-recording bug that doesn't scale with quantity purchased. **Database-specific technical debt** (full detail in `DATABASE-TARGET.md`'s deferred table): no `$transaction` wrapping on 8 more multi-step writes including 2 genuine TOCTOU races (club points/ad-credits); 45 more models missing a `[tenantId,status]` composite index; 226 string fields with no real enum enforcement; 9 duplicate model clusters; no backup automation.

## Next action

**Update 2026-09-04 (Phase 04 — Database Engineering)**: a full database audit ran this pass (`DATABASE-AUDIT.md`) covering tables/relations/indexes/constraints/transactions/migrations/duplicates/nullability/data-integrity/performance/security. Applied: 28 missing `tenantId` indexes, 6 composite `[tenantId,status]` indexes, a live-verified fix for a real double-payment-record bug in the crypto webhook handler (now transactional), cleanup of 7 confirmed-orphaned dev rows, and a new data-integrity test tool (`scripts/db-integrity-check.ts`, 24 checks, run via `bun run db:integrity-check`) — all documented with Migration/Rollback/Data Migration/Validation in `DATABASE-TARGET.md`. Phase 05 (security) status was also corrected in this pass — the "Incomplete/broken phases" table above still said Security was Broken despite the fixes already being live; that inconsistency is now fixed to match `docs/PROJECT-PHASE-MATRIX.md`.

**Update 2026-09-05 (Phase 05 — Security Engineering)**: full 26-area security audit (`THREAT-MODEL.md`, rewritten `SECURITY-BASELINE.md`, new `SECURITY.md`). Applied and live-verified: 14 Critical + 9 High fixes — a complete privilege-escalation/account-takeover chain (`team/members`, `team/invite/[token]`), a plaintext payment-gateway-credential leak (`GET /api/payments/gateways`), 11 further cross-tenant IDOR findings across the route surface, an SSRF in the onboarding crawler (new reusable `src/lib/security/ssrf-guard.ts`), and an infrastructure-layer fix (`docker-compose.prod.yml`: app/Postgres/Redis no longer publicly exposed) that also closed the login rate-limiter's spoofing bypass. New `scripts/security-checks.ts` (`bun run security-check`) — SSRF-guard unit tests plus live adversarial checks against a running server — is a permanent regression asset, not a one-off.

**Update 2026-09-05 (Phase 06 — UX Architecture)**: full UX-architecture pass — `SITEMAP.md` (sitemap/screen map/navigation model/IA for all 62 views, cross-diffed for consistency — zero orphaned nav bugs found) and `USER-JOURNEYS.md` (6 code-grounded journeys with Entry/Main/Alternate/Error/Empty/Recovery flows, plus a full empty/error/loading-state + destructive-action-confirmation audit of all 62 dashboard views). Applied and live-verified (via a real signup→dashboard→logout cycle against a running dev server): added the app's first-ever logout control (sidebar user menu — `useAuth().logout()` existed but was never wired to any UI before this), added confirmation dialogs to 14 previously-unguarded destructive actions (including a real payout trigger in `payroll-view.tsx` and SuperAdmin tenant-disable/promote actions), gated the `payroll`/`platform` nav items behind platform-staff status (previously shown to every tenant role including `viewer`, with `payroll` already a guaranteed server-side 403 for anyone who clicked it), fixed the sandbox demo's error handling (was referencing a `/signup` route that doesn't exist anywhere in the app), fixed an asymmetry in the invite-accept flow where the existing-account branch didn't reliably log the user in, and added a representative `viewer`-role UI gate to `leads-view.tsx`/`campaigns-view.tsx`.

**Update 2026-09-05 (Phase 07 — UI Design System)**: full design-system audit — `DESIGN-SYSTEM.md` covers all 16 requested areas (Color/Typography/Spacing/Grid/Breakpoints/Components/States/Icons/Forms/Tables/Cards/Dialogs/Navigation/Notifications/Charts/Responsive) plus Dark Mode/RTL/Accessibility and a 20-item prioritized Consistency Audit. Confirmed the existing Tailwind v4 token system (`globals.css`) is genuinely well-designed — the gap was adoption (136+ raw hex literals, 45 scattered color-map constants with real semantic drift between files, 311 uses of an unnamed `text-[10px]` micro-size). Applied and live-verified: removed the dead/conflicting `tailwind.config.ts` (confirmed unloaded by the actual Tailwind v4 pipeline), added a `text-2xs` token, fixed `.text-brand-accent`'s genuine WCAG contrast failure (~2.87:1 → ~5.4:1, reusing the already-vetted `--accent-foreground` value), fixed 2 real RTL bugs (sidebar nav text hardcoded `text-right` regardless of locale — affected the 24/29 LTR locales; auth-modal's 7 form-field icons hardcoded to the wrong side), added a single `QueryClient`-level `onError` default that fixes silent-failure user feedback for all 171 mutation call sites at once (only 61 had their own handler before), created `src/lib/design/status-colors.ts` and `src/components/dashboard/empty-state.tsx` as new shared infrastructure with proof-of-concept adoption, and added `aria-label` to ~18 previously-unlabeled icon-only buttons across the files already touched in Phase 06.

**Still deferred, ranked**: (1) `DATABASE-TARGET.md` DB-08 — 8 more unwrapped multi-step writes including 2 genuine TOCTOU races (payroll, license purchase, club points/ad-credits) — same severity class and fix pattern as fixes already shipped in phases 04/05, deferred only for scope/time. (2) `adr/0003` (CRUD factory validation hooks) — still not started, still small/foundational/backward-compatible; would also close most of the "~96% of routes unvalidated" gap at once. (3) `adr/0006`/DB-09 (real Prisma migrations) — the longest-standing documented gap, deliberately not attempted since it needs a real staging environment and backup tooling (DB-10) as prerequisites. (4) `adr/0007` step 2 (session revocation list). (5) `USER-JOURNEYS.md`'s systemic finding — 0% of dashboard views show a visible error state on a failed data load — remains the single highest-leverage UX/design-system follow-up. (6) `DESIGN-SYSTEM.md`'s large mechanical consolidations — remaining 130+ hex literals, 43 remaining color maps, 111 remaining physical (non-RTL-safe) spacing utilities, `htmlFor`/`id` label association across ~46 files, `ui/table.tsx`/`AlertDialog` adoption — each documented with severity and a defer reason, none silently dropped. (7) A product decision is still needed on the 2 blocked High security findings (payment gateways, analyzer data), on `adr/0011` item #1 (`User.role` vs `roleId`), on the 5 ambiguous platform-vs-tenant nav items and the two disconnected demo systems from `SITEMAP.md`/`USER-JOURNEYS.md`, and on the duplicate-toast-system cleanup (`ui/toaster.tsx` vs `sonner`) from `DEAD-CODE.md` — see "Pending decisions" above.

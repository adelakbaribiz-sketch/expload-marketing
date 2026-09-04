# PROJECT-CONTROL.md

**This file is the live control document for this project. Update it whenever a phase status, decision, or risk changes — don't let it go stale.** Last updated: 2026-09-04, after the framework-migration recovery pass.

## Current phase

Per `docs/PROJECT-PHASE-MATRIX.md`: phases 00-03 (Product Discovery, Existing Project Audit, Requirements, Architecture) are **COMPLETE** as of this pass. The project's actual next work is **not** a new greenfield phase — it's closing specific, named gaps inside phases that are already substantially built (05 Security, 04 Database, 10 File/Media, 18 QA foremost). See "Next Action" below for the single resume point.

## Completed phases

- **00 Product Discovery** — `docs/PRODUCT-BASELINE.md`
- **01 Existing Project Audit** — `PROJECT-INVENTORY.md`, `ARCHITECTURE-CURRENT.md`, `DEPENDENCY-AUDIT.md`, `DEAD-CODE.md`, `TODO-INVENTORY.md`
- **02 Requirements** — `PRD.md`, `USER-STORIES.md`, `USE-CASES.md`, `BUSINESS-RULES.md`, `ACCEPTANCE-CRITERIA.md`, `REQUIREMENTS-TRACEABILITY.md`
- **03 Architecture** — `ARCHITECTURE-TARGET.md`, `SYSTEM-DIAGRAM.md`, `MODULE-BOUNDARIES.md`, `DEPENDENCY-RULES.md`, `adr/0001`-`0007`

*(Also, prior to this documentation-recovery effort, real feature work already shipped and is reflected in the above: role-aware dashboards, a working team-invite flow, custom role UI, real Funnel/Journey builders, a Webhooks manager, an Approval Queue, Push/SMS UI, a job-queue/semantic-search admin panel, an LLM-provider reset action, and a financial-report archive — see git log `63fccd6`..`85f962f` for the exact commits. This work is KEEP, not something this recovery pass second-guesses.)*

## Incomplete / broken phases (evidence-based, from the matrix)

| Phase | Status | Top gap |
|---|---|---|
| 04 Database | Partial | No migration history — `db push` only, production-unsafe |
| 05 Security | **Broken** | 2 Critical + 6 High findings, some reachable with zero auth |
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

1. **Critical**: `POST /api/seed` is public, unrated-limited, and discloses a real account's plaintext password.
2. **Critical**: `support-plans/{tickets,subscriptions}` PATCH handlers have zero tenant-ownership check — cross-tenant read/write for any signed-up user.
3. **High**: `getTenantId()`'s header/cookie fallback is the architectural root cause enabling further cross-tenant access, affecting ~46 CRUD-factory domains.
4. **High**: `GET /api/tenants`, `marketplace/products/[id]`, `leads/[id]/enrich`, `campaigns/[id]/send` each have their own missing-ownership-check variant of the same problem class.
5. **Medium-and-below**: session non-expiry, CSP `unsafe-inline`, ~96% of routes unvalidated, unrate-limited public endpoints — see `KNOWN-ISSUES.md` for the complete, prioritized list (20 items).

## Architecture decisions (accepted or proposed — see `adr/`)

- **ADR-0001 (Accepted)**: stay a modular monolith, no microservice extraction — the existing module graph is already a clean, low-coupling DAG.
- **ADR-0002 (Proposed)**: consolidate the two AI stacks into `llm/aggregator.ts`.
- **ADR-0003 (Proposed)**: add optional `validate`/`beforeWrite` hooks to the CRUD factory.
- **ADR-0004 (Proposed, highest priority)**: harden tenant-context resolution — remove or credential-gate the header/cookie fallback.
- **ADR-0005 (Proposed)**: consolidate the two autonomous-agent implementations.
- **ADR-0006 (Proposed)**: adopt real Prisma migration history.
- **ADR-0007 (Proposed)**: add session expiry and a minimal revocation path.

## Pending decisions (need the product owner, not an engineering call)

1. Does the internal HR/payroll/support-SLA/internal-portal cluster belong in the same customer-facing product shell, or should it be split into a separate internal tool? (`docs/PRODUCT-BASELINE.md` §"Out of scope")
2. What is the `Cohort` model actually meant to track? (No code references it anywhere — needs a purpose before any implementation.)
3. Is `agent/run` (the rule-based autonomous-agent implementation) still in active use by any real workflow, or is it safe to retire in favor of `graph/orchestrator.ts`? (`adr/0005` migration step 1 — needs someone who can check live usage, not just code.)
4. Does any real external integration depend on the `X-Tenant-ID` header fallback today? (`adr/0004` migration step 1 — same kind of "needs live-traffic knowledge" check.)
5. What's the actual investment level wanted for testing/CI/observability (phases 15/16/18/19) — accepted gap for now, or next priority after security? This shapes sequencing more than anything else on this list.

## Technical debt (non-security, catalogued not yet actioned)

Full list in `DEAD-CODE.md` and `MODULE-BOUNDARIES.md`'s violations section. Highlights: 2 fully dead `src/lib/` modules; 8 dead/unused npm dependencies; duplicate toast system; a prompt catalog 15/17 of whose entries are bypassed; business logic embedded directly in 4+ route handlers with no service module; a distributor-payout amount that's caller-supplied with no formula; a license-purchase amount-recording bug that doesn't scale with quantity purchased.

## Next action

See `docs/AGENT-CONTEXT.md` for the full onboarding context, and the "RESUME POINT" stated at the end of this migration's response — the single next execution point is fixing the two Critical security findings (`KNOWN-ISSUES.md` #1-#2), since they're small, contained, high-leverage, and are what makes phase 20 (Production Hardening) currently BROKEN rather than merely incomplete.

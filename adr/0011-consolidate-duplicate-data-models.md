# ADR-0011: Consolidate duplicate/overlapping data model clusters

**Status**: Proposed
**Date**: 2026-09-04

## Current

The Phase 04 database audit (`DATABASE-AUDIT.md` §5) found 9 clusters of models that independently duplicate the same underlying concept:

1. `User.role` (plain string) vs `User.roleId` → `Role` (full RBAC) — two parallel authorization systems on the same model.
2. `DemoSession` vs `SandboxSession`/`SandboxAction` — two independent anonymous-visitor-tracking systems.
3. `AuditLogEntry`, `InternalEmployeeActivity`, `DistributorAuditLog`, `LlmAuditEvent`, `NegotiationAuditEvent` — five independently-shaped audit logs.
4. `Notification`, `FinancialAlert`, `PushNotification` — three overlapping alert/notification concepts.
5. `InvestorProfile` vs `CofounderProfile` — near-identical "matching profile" shapes.
6. `SupportTicketItem` vs `DistributorSupportTicket` — near-identical support-ticket shapes for two actor types.
7. `CompetitorProfile` vs `CompetitorAnalysis` — duplicated SWOT storage across an overview/deep-dive pair that's already linked by `competitorId`.
8. `LlmUsageRecord`/`LlmAuditEvent`'s two competing FK-shaped columns for the same provider-config reference.
9. `PromoLink.createdById` (plain string) vs every other model's properly-related `createdBy` — a naming/enforcement inconsistency for the same concept.

## Problem

Divergence risk (the two sides of each pair can silently drift out of sync — already confirmed for #1: the custom-role UI has zero actual effect on access control because `roleId` is never populated on the session object), double-maintenance cost, and confusion for anyone new to the codebase deciding which of two similar-looking models to use for new work.

## Target

Case-by-case consolidation — this is explicitly **not** a single blanket migration. Each pair/cluster has its own risk profile:

- **#1 (`User.role`/`roleId`)** is the highest-risk item in this ADR — it's already load-bearing (`docs/AGENT-CONTEXT.md` notes real authorization checks depend on the current, broken state), so "fixing" it incorrectly could either break existing access-control checks or silently change who can do what. This needs its own dedicated security-reviewed pass, not a drive-by — likely resolved together with whatever eventually wires `roleId` onto the session object (a prerequisite fix noted in the prior security-remediation phase but not yet scheduled).
- **#3 (five audit logs)** and **#4 (three alert types)** are the lowest-risk to consolidate — none of them currently gate access control, so a wrong migration degrades reporting/notification completeness rather than causing a security or financial bug. Reasonable candidates for an earlier pass than the rest.
- **#2, #5, #6, #7, #8, #9** are each medium risk, self-contained to their own domain, and can be tackled independently in any order once someone owns the specific consolidation decision (which side is canonical, what happens to the losing side's existing rows).

## Migration strategy (generic template — apply per cluster)

1. Decide which side is canonical (usually: whichever has real, live-verified data and active call sites — confirm via grep, don't assume from naming or recency).
2. Add whatever fields the canonical model is missing to represent the other side's data (e.g., a `profileType` discriminator for #5, a `ticketOrigin` discriminator for #6).
3. Backfill: copy every row from the non-canonical model into the canonical one, mapping fields explicitly (never assume identical field names mean identical semantics without checking).
4. Update every call site that reads/writes the non-canonical model to use the canonical one instead — this is the highest-effort step and the one most likely to reveal that the two models weren't as identical as they looked from the schema alone.
5. Once every call site is migrated and live-tested, deprecate (don't immediately drop) the non-canonical model for one release cycle, then remove it in a separate, later migration.

## Rollback

Per cluster: since step 5 explicitly keeps the old model around during a deprecation window, rollback during that window is just reverting the call-site changes back to the old model — the data is still there. Rollback gets harder only after the old model is actually dropped, which is why step 5 is a separate, later, deliberate migration rather than bundled into the consolidation itself.

## Data Migration

Per cluster, as described in step 3 above — always additive-then-verify, never drop-and-recreate. Row-count parity (old model's row count == number of rows successfully backfilled into the canonical model) is the minimum bar before touching any call site.

## Validation

Per cluster: full regression test (manual, given no automated test suite exists yet — see phase 18 QA status) of every code path that reads or writes either side of the merge, before and after, using the same live-adversarial-testing methodology already established in this project's prior security-remediation pass (real accounts, real API calls, not just code review).

# DATABASE-AUDIT.md

**Phase 04 — Database Engineering.** Generated 2026-09-04. Scope: the full Prisma schema (`prisma/schema.prisma`, 150 models, 4,382 lines at audit time) plus real database *usage* across `src/` (transactions, migrations, raw SQL, connection handling, N+1 patterns, backup, seed hygiene). Methodology: full line-by-line schema read cross-referenced with systematic grep/awk over relation/index/nullability declarations, plus a full-codebase sweep for `$transaction`/`$queryRaw`/migration tooling/N+1 patterns. Every finding below is evidence-cited (file + line), not inferred. This document is read-only reporting — see `DATABASE-TARGET.md` for the prioritized fix plan and which items were actually applied this pass.

---

## 1. Tables

150 models across ~50 domains (CRM, campaigns, billing, wholesale distribution, HR/payroll, support, marketplace, negotiation engine, AI/agent stacks, auth/tenant, loyalty club, investor/cofounder matching, etc.) — full grouping in the Phase-04 research notes. Four models are vestigial or duplicated (see §5 Duplicates):

- **`Cohort`** — leaf table with no relation to `AttributionEvent`/`FraudRule` and nothing in the schema showing how rows get populated. Already flagged in `docs/PROJECT-CONTROL.md` "Pending decisions" #2 — needs a product decision, not an engineering fix.
- **`MarketingFunnel`**, **`CustomerJourney`** — standalone JSON-blob counters with no child/detail tables (`JourneyStep`, `FunnelStageEvent`, etc.) recording actual per-user progress. Matches the Phase-1 finding that nothing in the codebase currently creates step-level data for these.
- **`DemoSession`** vs **`SandboxSession`**/`SandboxAction` — two independently-built anonymous-visitor-tracking systems (see §5).
- **`GlobalEvent`** — nothing has a real relation to it; `CampaignScheduleSuggestion.linkedEventIds` only soft-links via a JSON string of IDs.

## 2. Relations

170 FK-owning relation fields. **164/170 (96%) have an explicit `onDelete`** (129 Cascade, 34 SetNull, 1 Restrict) — good baseline discipline. `onUpdate` is specified exactly once in the whole schema (`ResellerCustomer.customerTenant`, line ~2437) — every other relation relies on the default, which is a non-issue in practice since primary keys here are never updated.

**6 relations have no explicit `onDelete`** (defaults to a restrict-like behavior on both SQLite and Postgres): `ClubMembership.tier`, `FinancialReport.tenant`, `LlmUsageRecord.tenant`, `LlmUsageRecord.llmProviderConfig`, `LlmAuditEvent.llmProviderConfig`, `SandboxSession.tenant` — all in the newer sections of the schema, suggesting review discipline slipped as it grew.

### Cascade-delete risk (financial/audit data reachable from `Tenant` deletion)
- The entire **`Distributor` cascade tree** (`Distributor` → `DistributorContract` → `LicensePackage` → `LicenseAllocation` → `TerritoryExclusivity` → `DistributorPayout` → `DistributorSupportTicket` → **`DistributorAuditLog`**) is all `onDelete: Cascade` off `Distributor.tenant`. An audit log that cascade-deletes when an unrelated parent tenant is removed defeats its own purpose, and the chain also wipes signed contracts and payout/financial history.
- **Inconsistent financial-record retention**: `Payment.tenant`, `Invoice.tenant`, `PaymentMethod.tenant` are all `Cascade` (hard-deleted with the tenant), while `CryptoPayment.tenant` and `AuditLogEntry.tenant` deliberately use `SetNull` to survive tenant deletion. Accounting/tax retention normally wants Invoice/Payment to behave like the latter, not the former.
- **Asymmetric referral cascade**: `Referral.referrerTenantId` is `Cascade`, `Referral.refereeTenantId` is `SetNull` — deleting the referrer's tenant destroys the whole referral record including the referee's reward-paid history; deleting the referee's tenant merely nulls a field.
- **Cross-boundary cascade via `User`**: `User.tenant` is `Cascade`, and `SuperAdmin.user`/`InternalEmployee.user` are *also* `Cascade` — deleting a `Tenant` deletes its `User` rows, which, if any happen to also be platform staff, cascades into platform-global staff/admin records.
- Loyalty (`ClubMembership`→`ClubPoint`/`ClubAdvertisement`) and most support/assistant history also cascade-delete with the tenant, though `AssistantTimesheet`/`AssistantPerformance` use `SetNull` — a more defensive pattern that the rest of the schema doesn't consistently follow.

### Self-referential / circular
`InternalDepartment.parent/children` and `InternalEmployee.manager/directReports` are self-referential (both `SetNull` on delete, correct). `ResellerCustomer` and `Referral` both let one `Tenant` point at another `Tenant` — a genuine tenant-to-tenant cycle at the data level (a tenant can simultaneously be reseller-of and customer-of other tenants).

### Many-to-many pattern inconsistency
Two explicit join tables done correctly (`RolePermission`, `ProjectMember`, both with `@@unique` on the pair). Two *implicit* Prisma many-to-many relations with no join model and therefore no way to record extra attributes: `ApiKey.products <-> ApiProduct.keys`, and `ClubReward.memberships <-> ClubMembership.rewards` (the schema's own comment flags this: `// many-to-many through a join (simplified)`) — `ClubReward.redeemedCount` tries to track aggregate redemptions with no row-level ledger to back it.

## 3. Indexes

283 `@@index` declarations, 10 composite `@@unique`, ~33-45 field-level `@unique`.

- **20 models have zero index or unique constraint of any kind**, including the core CRM tables **`Lead`, `Contact`, `Company`, `Project`, `User`** — every lookup on these was a full table scan before this pass.
- **`tenantId` indexing** (the highest-impact category, since almost every query in this codebase filters by tenant): 98/150 models carry a `tenantId` field. Before this pass, **28 of those 98 (≈29%) had no index covering it** — split into 9 models where `tenantId` isn't even wired into the Prisma relation graph (`Activity`, `ContentCalendar`, `SocialPost`, `AdCampaign`, `AiTask`, `AiRecommendation`, `WorkflowRun`, `BacklinkOutreach`, `Review`) and 19 more where a proper `@relation` exists but Prisma doesn't auto-index relation scalars on SQLite/Postgres (`User`, `Project`, `Company`, `Lead`, `Contact`, `EmailTemplate`, `EmailCampaign`, `Pipeline`, `SeoProject`, `ContentIdea`, `ContentPiece`, `SocialAccount`, `AdAccount`, `AnalyticsReport`, `AiAgent`, `Workflow`, `PricingCalculation`, `SandboxSession`, `ProjectMember`). **All 28 are fixed in this pass** — see `DATABASE-TARGET.md` item DB-01.
- **Zero composite `[tenantId, status]` indexes existed anywhere.** 49 models have both fields — the single most common query shape in a multi-tenant SaaS ("this tenant's active/pending/failed X"). 6 of the highest-value financial/support ones (`Payment`, `Invoice`, `CryptoPayment`, `SupportTicketItem`) got the composite this pass; the remaining ~45 are documented as DB-02 (P1, deferred).
- **Lookup fields lacking a unique/index**: `LandingPage.slug` (should be `@@unique([tenantId, slug])` — currently only indexed on `tenantId`/`status`), `SeoProject.domain`, `SocialAccount.handle`, `CompetitorProfile.domain`, `ReviewMonitor.placeId` (a natural Google-Place dedup key). Several email fields used for dedup are indexed (`Referral.refereeEmail`, `TeamInvitation.email`) while structurally identical ones aren't (`Lead.email`, `Contact.email`, `OnboardingSession.customerEmail`, `NegotiationSession.customerEmail`, `InvestorProfile.email`, `CofounderProfile.email`, `BacklinkOpportunity.contactEmail`, `ChatbotConversation.visitorEmail`). `Lead.email`/`Contact.email` are fixed this pass; the rest are DB-03 (deferred, lower traffic).

## 4. Constraints

- **Nullability**: 15 models make `tenantId` optional (`String?`). Several are deliberately platform-wide-or-tenant with an accompanying boolean discriminator (`Role.isSystem`, `FinancialAlert.isPlatformAlert`) — fine. Others (`InvestorProfile`, `CofounderProfile`, `PartnershipOpportunity`, `ProfitEstimate`, `PricingCalculation`) have no such flag, so "is this row global or tenant-owned" is inferred purely from `tenantId == null` — fragile, flagged as DB-07 (deferred, needs a product decision on whether these are ever meant to be platform-global).
- **`User.email` is globally unique across the entire platform**, not scoped per tenant (`@unique`, not `@@unique([tenantId, email])`). In a B2B SaaS this means the same email can't sign up under two different tenant organizations — worth an explicit product confirmation (`docs/PROJECT-CONTROL.md` pending-decisions candidate) since most multi-tenant B2B products scope this per-org; not changed this pass since it's a behavior change, not a bug fix.
- **`@default` usage** is consistent for IDs/timestamps/currency. **Zero `enum` types exist in the schema** (`grep -c "^enum " → 0`) and **226 fields** carry a `// value1 | value2 | value3` documentation comment while being typed as plain `String` — the single largest "should be an enum" finding, applying uniformly across the schema (`Tenant.plan`, `User.role`, `Lead.status`, `Deal.stage`, `Task.priority`, `Distributor.tier`, `NegotiationSession.currentState`, etc.). Tracked as `adr/0010` (deferred — Prisma enums on SQLite work but the project's own comments say Postgres is the intended production target, and enum migrations need real data validation per value before converting).
- Fixed this pass (cosmetic, zero risk): `CustomerJourney.id` had a redundant `@id @unique` — the `@unique` was a no-op.

## 5. Duplicates

1. **Two parallel role/permission systems on `User`** — `User.role` (plain string) and `User.roleId` → `Role` (a full RBAC system) coexist; the schema's own comment admits it. Already a known, tracked issue: `docs/AGENT-CONTEXT.md`/prior security pass confirmed the custom-role UI has **zero actual effect** on access control because `roleId` is never populated on the session object.
2. **`DemoSession` vs `SandboxSession`/`SandboxAction`** — both independently model "anonymous visitor exploring the product, with conversion tracking," built ~2,600 lines apart with no shared model or migration path.
3. **Five independently-shaped audit/activity logs**: `AuditLogEntry`, `InternalEmployeeActivity`, `DistributorAuditLog`, `LlmAuditEvent`, `NegotiationAuditEvent` — all overlapping shapes with no common base.
4. **Three overlapping alert/notification concepts**: `Notification`, `FinancialAlert`, `PushNotification`.
5. **`InvestorProfile` vs `CofounderProfile`** — near-identical field sets, differentiated only by a few domain-specific fields; plausibly one `MatchProfile` with a `profileType` discriminator.
6. **`SupportTicketItem` vs `DistributorSupportTicket`** — near-identical shapes for two different actor types instead of one polymorphic ticket table.
7. **SWOT data duplicated** between `CompetitorProfile` (overview) and `CompetitorAnalysis` (deep-dive), despite `CompetitorAnalysis.competitorId` already linking them.
8. **`LlmUsageRecord`/`LlmAuditEvent` each carry two competing FK-shaped columns** for the same concept: a required, indexed, **non-relational** `providerConfigId`, and a separate optional field that **does** have the real `@relation` (`llmProviderConfigId`). The enforced one is the one nobody's required to populate.
9. **Inconsistent "created by" naming**: most models use a real `createdBy` relation to `User`; `PromoLink.createdById` uses a different name for the same concept with no relation at all (a plain unenforced string — see §6).

None of these are fixed this pass — consolidating any of them is a real product/architecture decision (which system is authoritative, what happens to existing rows) requiring its own migration plan, not a schema tweak. Tracked as `adr/0011` (deferred, P2).

## 6. Data Integrity — soft/unenforced foreign keys

This is the most consequential category and the one with a genuinely new, working verification tool behind it (see §9 and `scripts/db-integrity-check.ts`). The schema has 250 fields ending in `Id`; cross-referencing every one against its own model's `@relation` declarations surfaces real "soft FK" columns — plain `String`/`String?` fields meant to reference another model, enforced by nothing at the schema level:

- `Task.assigneeId` (→ User), `Task.leadId` (→ Lead), `Task.dealId` (→ Deal)
- `Deal.ownerId` (→ User)
- `OnboardingSession.negotiationId` ↔ `NegotiationSession.onboardingId` — **bidirectional** soft-link between two core business-critical models (the entire onboarding→negotiation handoff), enforced on neither side
- `NegotiationSession.acceptedProposalId` → its own child table `NegotiationProposal`, unlinked
- `Payment.invoiceId`, `Payment.paymentMethodId`
- `CryptoPayment.invoiceId`, `CryptoPayment.paymentId`
- `Distributor.contractId` (`@unique`, unenforced) ↔ `DistributorContract.distributorId` (the real, correctly-related reverse pointer)
- `Commission.customerTenantId`, `LicenseAllocation.customerTenantId` (→ Tenant)
- `SandboxSession.convertedUserId` (→ User)
- `PromoLink.createdById` (→ User — contrast with every other model's properly-related `createdBy`)
- The 9 tenantId-with-no-relation models from §3

Deliberately polymorphic fields (`AuditLogEntry.entityId`/`entityType`, `ApprovalRequest.itemId`/`itemData`, `ClubPoint.entityId`/`entityType`, `VectorIndex.sourceId`/`sourceType`, `AiDecision.linkedEntityId`/`linkedEntityType`, etc.) are **not** flagged — a plain string paired with a type discriminator is the correct and only option for polymorphic references in Prisma. External-system IDs (Stripe IDs, `gatewayPaymentId`, `placeId`, `asin`, etc.) are also correctly plain, since they reference systems outside this database.

**Live verification (2026-09-04)**: `scripts/db-integrity-check.ts` (new this pass — see §9) was run against the real dev database and initially found **7 real orphaned rows** — `Activity` rows whose `tenantId` pointed at tenants that no longer exist (all traced to test-tenant cleanup from earlier phases of this same audit — `IDOR Test Tenant`, `Sara Test Co`, `Phase2 Test Co`, `Phase4 Test Co`, `Sec Test Co`, `Victim Co`). This is a direct, live demonstration of the exact risk this section describes: because `Activity.tenantId` has no schema-level relation, deleting a `Tenant` silently orphans its activity log instead of cascading or blocking. The 7 orphaned rows were removed (confirmed zero real data loss — the referenced tenants were already gone); the tool now reports a clean pass. The underlying gap (no relation on `Activity.tenantId` and 8 sibling models) is tracked as DB-04 (P1, deferred — adding the relation now requires deciding an `onDelete` behavior and would need a broader backfill-validation pass across all 9 models, not something to do as a drive-by).

## 7. Performance

- **`CompetitorAnalysis`** has 59 scalar fields — by far the widest table (10 sections of a competitor deep-dive). A real candidate for splitting into sub-tables in a future pass; not attempted here (no evidence yet of an actual query-latency problem, only a schema-hygiene one).
- **Composite `[tenantId, status]` indexes**: see §3 — 6 of 49 candidate models fixed this pass (the financial/support ones most likely to run under load); 43 remain, catalogued as DB-02.
- The 20 zero-index and 28 un-indexed-tenantId models compounded this — e.g., `Lead` had literally no index at all, so a `tenantId + status` query was a full scan regardless of any composite. Fixing the base tenantId index (DB-01, done) is the prerequisite for the composite work to matter at all on the remaining models.

## 8. Security

98/150 models carry `tenantId`; 52 don't. Of those 52: ~24 are correctly platform-global by design (`Tenant`, `SuperAdmin`, `InternalEmployee`, `ApiProduct`, `PaymentGatewayConfig`, `LlmProviderConfig`, catalog/program tables, public blog content, etc.). The remainder are **child tables that inherit tenant scoping only through a parent join** — a real risk if any route ever queries them directly without joining back to the tenant-scoped parent:

- `SeoCrawl`/`SeoPage`/`SeoIssue`/`SeoKeyword`/`SeoBacklink` (via `SeoProject`)
- `EmailLog` (via `EmailCampaign`) — **directly inconsistent** with `WhatsAppMessage`/`SmsMessage`, which model the same "outbound message log" concept but *do* carry their own direct `tenantId`. Any engineer copying one pattern onto the other risks a missing tenant filter.
- `ChatbotMessage`, `NegotiationProposal`/`NegotiationAuditEvent`, `OnboardingDocument`, `PromoLinkClick`, `SandboxAction` (all via their respective parent session/conversation)
- The entire `DistributorContract`/`LicensePackage`/`LicenseAllocation`/`TerritoryExclusivity`/`DistributorPayout`/`DistributorSupportTicket`/`DistributorAuditLog` cluster — all two hops from `Distributor.tenantId`. A route querying any of these seven without joining back through `Distributor` risks leaking one distributor's contracts/payouts/support history to another.
- `ResellerCustomer`/`Referral`/`Commission` carry real tenant references but under non-standard names (`resellerTenantId`/`customerTenantId`, etc.) — a generic "does this row belong to tenant X" utility written against the `tenantId` convention used by the other 98 models would silently miss these three.

This is a schema-level finding about *risk surface*, not a confirmed live vulnerability — it complements, and is a different layer from, the route-level tenant-isolation fixes already shipped in `adr/0004`/`docs/IMPLEMENTATION-PLAN.md` (which fixed how routes *resolve* the caller's tenant; this section is about which child tables would still need an explicit join even after that fix, if a new route queried them directly). Tracked as DB-05 (P1, deferred — needs a route-by-route audit of which of these child tables have any direct-query call sites today, not just a schema observation).

## 9. Transactions

**`db.$transaction` was used exactly zero times anywhere in `src/` before this pass.** Every multi-step write sequence ran as N unguarded sequential `await`s. Ranked by real severity:

1. **`src/lib/payment/crypto.ts` `updateCryptoPaymentStatus`** — the NOWPayments IPN webhook handler did `db.payment.create(...)` then a separate `db.cryptoPayment.update(...)`. NOWPayments retries webhooks on any non-200/timeout; a crash or slow response between the two calls left `completedAt` unset, so a retry passed the `!payment.completedAt` guard again and created a **second** `Payment` row for the same crypto payment — real double-booked revenue. **Fixed this pass** — see `DATABASE-TARGET.md` DB-06, live-verified with a concurrent-retry simulation (see §11).
2. `src/app/api/payroll/run/route.ts` — creates one `PayrollPeriod` then loops creating a `SalaryPayment` per employee, fully sequential, no transaction. A crash mid-loop leaves some employees paid and others silently not, with no way to tell which without re-diffing the `distributions` JSON. **Not fixed this pass** — flagged DB-08 (P1, deferred; needs its own test plan given real payroll amounts).
3. `src/app/api/distributors/licenses/route.ts` (license purchase) — four independent writes (`licenseAllocation.createMany`, `distributor.update`, `licensePackage.update`, `distributorAuditLog.create`) recording one purchase; a failure after step 1 issues licenses the revenue counters never reflect. DB-08.
4. `src/app/api/club/rewards/[id]/redeem/route.ts` and `src/app/api/club/membership/route.ts` (`create_ad` action) — genuine **TOCTOU races**: balance checked, then decremented, as separate steps; two concurrent redemptions/ad-creates can both pass the check before either write lands. DB-08.
5. `src/lib/negotiation/engine.ts` — up to 4 sequential writes per proposal/response cycle; lower severity (no direct money field mutated here, but the audit trail can desync from actual session state on partial failure). DB-08.
6. Tenant + linked-record creation, repeated in 3 places (`distributors/route.ts`, `white-label/customers/route.ts`, and — safely, since it's `findFirst`-guarded — `seed/route.ts`): `tenant.create` then a second `create` linking to it, unguarded. A failure after tenant-creation orphans a `Tenant` row. DB-08.
7. `team/invite/route.ts` — `teamInvitation.create` then `auditLogEntry.create`, unguarded. Low severity (audit-trail-only), DB-08.

## 10. Migrations

Confirmed: **no `prisma/migrations/` directory exists.** Dev workflow is `db push` only (`scripts/dev-setup.sh` runs `bun run db:push`). Production tooling is self-contradicting across **three** different scripts, not two as `adr/0006` originally documented: `scripts/deploy.sh` runs `prisma migrate deploy` (a no-op against a fresh DB with no migrations to apply), `scripts/deploy-vps.sh` runs `migrate deploy` with a `db push` fallback on failure, and `scripts/migrate-prod.sh` branches on `DATABASE_URL` (Postgres → `migrate deploy`, SQLite → `db push`) independently of the other two. `adr/0006-adopt-prisma-migrations.md` already documents the right 5-step remediation (baseline migration → verify parity → fix docs/scripts → `prisma migrate resolve --applied`); this audit adds the third-script correction and confirms nothing in code contradicts the ADR otherwise. Status: still Proposed, not implemented this pass (adopting real migrations is a bigger, higher-risk change than anything else in this document and deserves its own dedicated pass with a real staging environment — see `DATABASE-TARGET.md` DB-09).

## 11. Raw SQL / injection risk

**Clean result.** Only one raw-SQL call site in all of `src/`: `src/app/api/health/route.ts` — `db.$queryRaw\`SELECT 1\``, a hardcoded tagged-template literal with zero interpolated values. No `$queryRawUnsafe`/`$executeRawUnsafe` anywhere. No injection risk found.

## 12. Connection handling

`src/lib/db.ts` correctly follows the standard Next.js `globalThis` singleton pattern for `PrismaClient` — no duplicate-client risk under dev hot-reload, and production correctly gets one client per process lifetime. No connection-pool tuning exists (`connection_limit`/`pool_timeout` on `DATABASE_URL`), which is moot for SQLite but will need explicit sizing when/if the commented-out Postgres provider block in `schema.prisma` is activated for production.

## 13. N+1 / performance patterns

Sampled 20+ route files across payments, payroll, distributors, negotiation, club, billing, marketplace, team, reseller, white-label, CRM, and the generic CRUD factory. Most routes are well-written — consistent `Promise.all`, `include`, `_count`, `groupBy`/`aggregate` usage; the CRUD factory itself (powering ~46/76 domains) does a single `findMany` with no per-row loop.

Two real N+1 instances found, neither fixed this pass (both are route-level code changes, not schema changes, and neither is in the money-correctness-critical path that got priority this phase):
- `src/app/api/payroll/run/route.ts` — `db.virtualAssistant.findUnique(...)` called once per employee inside a loop instead of one batched `findMany({ where: { employeeId: { in: [...] } } })`.
- `src/app/api/leads/search/route.ts` — per-scraped-result sequential `db.lead.create` + `db.activity.create` instead of `createMany`. Same shape in `src/app/api/club/membership/route.ts`.

## 14. Backup / recovery

**No backup automation exists anywhere in code.** `DEPLOY.md` documents a manual `pg_dump`/`psql` restore procedure; `README-DEPLOY.md` has two explicitly unchecked pre-launch checklist items ("Configure backup for database", "Regular database backups are scheduled"). No cron, no CI job, no `scripts/backup*.sh`. `ARCHITECTURE-TARGET.md`'s DB-safety procedure assumes a "full database dump taken immediately before any migration" exists as tooling — today that step is a hand-run command in a markdown file, not automation. This is a prerequisite gap for DB-09 (adopting real migrations), not something fixed by this audit pass alone — flagged as DB-10 (P1, deferred).

## 15. Seed / test data hygiene

`src/app/api/seed/route.ts` is correctly idempotent (`findFirst`-guarded on every insert) and now requires auth (fixed in the prior security-remediation pass, `KNOWN-ISSUES.md #1`). It hardcodes a plaintext demo password (`'demo12345'`, hashed before storage but visible in source) that doesn't match what `README-DEPLOY.md` documents (`admin123`) — a pre-existing, already-tracked doc/code drift (`KNOWN-ISSUES.md #16(c)`), not new. `scripts/seed-distributor.ts` is upsert-based (safe to re-run) and runs in the **production** deploy path (`scripts/deploy.sh:91`) — but it hardcodes `isSandbox: true` on the payment-gateway configs it seeds, meaning a real production deploy silently starts every gateway in sandbox mode until someone manually flips that. Flagged as DB-11 (P1, deferred — deploy-script fix, not a schema/data-model change).

---

## Summary table — audit category → status this pass

| Category | Real issues found | Fixed this pass | Deferred (see DATABASE-TARGET.md) |
|---|---|---|---|
| Tables | 4 vestigial/duplicate models | 0 | Product decision needed (`Cohort`, `MarketingFunnel`/`CustomerJourney`, `DemoSession`/`SandboxSession`) |
| Relations | 6 missing `onDelete`, several cascade-risk inconsistencies | 0 | DB-12 |
| Indexes | 28 un-indexed tenantId, 49 missing `[tenantId,status]`, several lookup fields | 28 tenantId indexes + 6 composites | DB-02, DB-03 |
| Constraints | Zero enums (226 candidate fields), fragile nullable-tenantId pattern | 1 cosmetic redundancy | adr/0010, DB-07 |
| Duplicates | 9 duplicate/overlapping model clusters | 0 | adr/0011 |
| Data Integrity | 21 soft-FK columns, 7 live orphaned rows found | 7 orphaned rows cleaned + `scripts/db-integrity-check.ts` created | DB-04, DB-05 |
| Performance | 1 wide table, missing composites | Covered by Indexes fixes | DB-13 |
| Security | 7 two-hop-from-tenant model clusters | 0 (schema-risk finding, not a route bug) | DB-05 |
| Transactions | 0 `$transaction` calls anywhere, 1 confirmed live double-booking bug | Crypto-payment webhook fixed + live-verified | DB-08 |
| Migrations | No `prisma/migrations/`, 3 self-contradicting deploy scripts | 0 | DB-09 (adr/0006, already Proposed) |
| Raw SQL | — | Clean, no action needed | — |
| Backup | No automation exists | 0 | DB-10 |
| Seed hygiene | Sandbox-mode gateway seed in prod path | 0 | DB-11 |

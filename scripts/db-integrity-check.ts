/**
 * Data Integrity Test — Phase 04 (Database Engineering).
 *
 * Read-only. Checks the live database for the specific "soft foreign key"
 * and cross-tenant-leak risks catalogued in DATABASE-AUDIT.md: fields typed
 * as plain String that are meant to reference another model but carry no
 * Prisma `@relation`, so nothing at the schema level stops them pointing at
 * a row that doesn't exist (or belongs to a different tenant). Each check
 * reports its own violation count; the process exits non-zero if any check
 * finds violations, so this can be wired into CI once phase 18 (QA) starts.
 *
 * Run with: bun run scripts/db-integrity-check.ts
 */

import { db } from '../src/lib/db'

type CheckResult = {
  name: string
  description: string
  violations: Array<Record<string, unknown>>
}

const results: CheckResult[] = []

async function check(name: string, description: string, run: () => Promise<Array<Record<string, unknown>>>) {
  const violations = await run()
  results.push({ name, description, violations })
}

async function main() {
  // ---- Soft-FK checks: internal xId columns with no @relation ----

  await check(
    'Task.assigneeId -> User',
    'Task.assigneeId is a bare string; every non-null value must match an existing User.id',
    async () => {
      const tasks = await db.task.findMany({ where: { assigneeId: { not: null } }, select: { id: true, assigneeId: true } })
      const ids = [...new Set(tasks.map((t) => t.assigneeId!))]
      const found = new Set((await db.user.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((u) => u.id))
      return tasks.filter((t) => !found.has(t.assigneeId!)).map((t) => ({ taskId: t.id, assigneeId: t.assigneeId }))
    },
  )

  await check(
    'Task.leadId -> Lead',
    'Task.leadId is a bare string; every non-null value must match an existing Lead.id',
    async () => {
      const tasks = await db.task.findMany({ where: { leadId: { not: null } }, select: { id: true, leadId: true } })
      const ids = [...new Set(tasks.map((t) => t.leadId!))]
      const found = new Set((await db.lead.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((l) => l.id))
      return tasks.filter((t) => !found.has(t.leadId!)).map((t) => ({ taskId: t.id, leadId: t.leadId }))
    },
  )

  await check(
    'Task.dealId -> Deal',
    'Task.dealId is a bare string; every non-null value must match an existing Deal.id',
    async () => {
      const tasks = await db.task.findMany({ where: { dealId: { not: null } }, select: { id: true, dealId: true } })
      const ids = [...new Set(tasks.map((t) => t.dealId!))]
      const found = new Set((await db.deal.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((d) => d.id))
      return tasks.filter((t) => !found.has(t.dealId!)).map((t) => ({ taskId: t.id, dealId: t.dealId }))
    },
  )

  await check(
    'Deal.ownerId -> User',
    'Deal.ownerId is a bare string; every non-null value must match an existing User.id',
    async () => {
      const deals = await db.deal.findMany({ where: { ownerId: { not: null } }, select: { id: true, ownerId: true } })
      const ids = [...new Set(deals.map((d) => d.ownerId!))]
      const found = new Set((await db.user.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((u) => u.id))
      return deals.filter((d) => !found.has(d.ownerId!)).map((d) => ({ dealId: d.id, ownerId: d.ownerId }))
    },
  )

  await check(
    'OnboardingSession.negotiationId <-> NegotiationSession.onboardingId',
    'These two models reference each other by bare string ID with no @relation on either side; every non-null pointer must resolve to a real, matching row',
    async () => {
      const violations: Array<Record<string, unknown>> = []
      const sessions = await db.onboardingSession.findMany({ where: { negotiationId: { not: null } }, select: { id: true, negotiationId: true } })
      const negotiationIds = [...new Set(sessions.map((s) => s.negotiationId!))]
      const negotiations = await db.negotiationSession.findMany({ where: { id: { in: negotiationIds } }, select: { id: true, onboardingId: true } })
      const negotiationById = new Map(negotiations.map((n) => [n.id, n]))
      for (const s of sessions) {
        const n = negotiationById.get(s.negotiationId!)
        if (!n) violations.push({ onboardingSessionId: s.id, negotiationId: s.negotiationId, issue: 'negotiationId does not resolve to any NegotiationSession' })
        else if (n.onboardingId !== s.id) violations.push({ onboardingSessionId: s.id, negotiationId: s.negotiationId, issue: `back-reference mismatch: NegotiationSession.onboardingId is ${n.onboardingId ?? 'null'}` })
      }
      return violations
    },
  )

  await check(
    'NegotiationSession.acceptedProposalId -> NegotiationProposal (same session)',
    'acceptedProposalId is a bare string with no @relation; it must point to a NegotiationProposal that belongs to the same session',
    async () => {
      const sessions = await db.negotiationSession.findMany({ where: { acceptedProposalId: { not: null } }, select: { id: true, acceptedProposalId: true } })
      const proposalIds = [...new Set(sessions.map((s) => s.acceptedProposalId!))]
      const proposals = await db.negotiationProposal.findMany({ where: { id: { in: proposalIds } }, select: { id: true, sessionId: true } })
      const proposalById = new Map(proposals.map((p) => [p.id, p]))
      return sessions
        .filter((s) => {
          const p = proposalById.get(s.acceptedProposalId!)
          return !p || p.sessionId !== s.id
        })
        .map((s) => ({ negotiationSessionId: s.id, acceptedProposalId: s.acceptedProposalId }))
    },
  )

  await check(
    'Payment.invoiceId -> Invoice',
    'Payment.invoiceId is a bare string; every non-null value must match an existing Invoice.id',
    async () => {
      const payments = await db.payment.findMany({ where: { invoiceId: { not: null } }, select: { id: true, invoiceId: true } })
      const ids = [...new Set(payments.map((p) => p.invoiceId!))]
      const found = new Set((await db.invoice.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((i) => i.id))
      return payments.filter((p) => !found.has(p.invoiceId!)).map((p) => ({ paymentId: p.id, invoiceId: p.invoiceId }))
    },
  )

  await check(
    'Payment.paymentMethodId -> PaymentMethod',
    'Payment.paymentMethodId is a bare string; every non-null value must match an existing PaymentMethod.id',
    async () => {
      const payments = await db.payment.findMany({ where: { paymentMethodId: { not: null } }, select: { id: true, paymentMethodId: true } })
      const ids = [...new Set(payments.map((p) => p.paymentMethodId!))]
      const found = new Set((await db.paymentMethod.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((m) => m.id))
      return payments.filter((p) => !found.has(p.paymentMethodId!)).map((p) => ({ paymentId: p.id, paymentMethodId: p.paymentMethodId }))
    },
  )

  await check(
    'CryptoPayment.invoiceId -> Invoice',
    'CryptoPayment.invoiceId is a bare string; every non-null value must match an existing Invoice.id',
    async () => {
      const rows = await db.cryptoPayment.findMany({ where: { invoiceId: { not: null } }, select: { id: true, invoiceId: true } })
      const ids = [...new Set(rows.map((r) => r.invoiceId!))]
      const found = new Set((await db.invoice.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((i) => i.id))
      return rows.filter((r) => !found.has(r.invoiceId!)).map((r) => ({ cryptoPaymentId: r.id, invoiceId: r.invoiceId }))
    },
  )

  await check(
    'CryptoPayment.paymentId -> Payment',
    'CryptoPayment.paymentId is a bare string; every non-null value must match an existing Payment.id',
    async () => {
      const rows = await db.cryptoPayment.findMany({ where: { paymentId: { not: null } }, select: { id: true, paymentId: true } })
      const ids = [...new Set(rows.map((r) => r.paymentId!))]
      const found = new Set((await db.payment.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((p) => p.id))
      return rows.filter((r) => !found.has(r.paymentId!)).map((r) => ({ cryptoPaymentId: r.id, paymentId: r.paymentId }))
    },
  )

  await check(
    'Distributor.contractId -> DistributorContract (mutual)',
    'Distributor.contractId is a bare unique string with no @relation; must point to a DistributorContract belonging to that same distributor',
    async () => {
      const distributors = await db.distributor.findMany({ where: { contractId: { not: null } }, select: { id: true, contractId: true } })
      const contractIds = [...new Set(distributors.map((d) => d.contractId!))]
      const contracts = await db.distributorContract.findMany({ where: { id: { in: contractIds } }, select: { id: true, distributorId: true } })
      const contractById = new Map(contracts.map((c) => [c.id, c]))
      return distributors
        .filter((d) => {
          const c = contractById.get(d.contractId!)
          return !c || c.distributorId !== d.id
        })
        .map((d) => ({ distributorId: d.id, contractId: d.contractId }))
    },
  )

  await check(
    'Commission.customerTenantId -> Tenant',
    'Commission.customerTenantId is a bare string; every non-null value must match an existing Tenant.id',
    async () => {
      const rows = await db.commission.findMany({ where: { customerTenantId: { not: null } }, select: { id: true, customerTenantId: true } })
      const ids = [...new Set(rows.map((r) => r.customerTenantId!))]
      const found = new Set((await db.tenant.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((t) => t.id))
      return rows.filter((r) => !found.has(r.customerTenantId!)).map((r) => ({ commissionId: r.id, customerTenantId: r.customerTenantId }))
    },
  )

  await check(
    'LicenseAllocation.customerTenantId -> Tenant',
    'LicenseAllocation.customerTenantId is a bare string; every non-null value must match an existing Tenant.id',
    async () => {
      const rows = await db.licenseAllocation.findMany({ where: { customerTenantId: { not: null } }, select: { id: true, customerTenantId: true } })
      const ids = [...new Set(rows.map((r) => r.customerTenantId!))]
      const found = new Set((await db.tenant.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((t) => t.id))
      return rows.filter((r) => !found.has(r.customerTenantId!)).map((r) => ({ licenseAllocationId: r.id, customerTenantId: r.customerTenantId }))
    },
  )

  await check(
    'SandboxSession.convertedUserId -> User',
    'SandboxSession.convertedUserId is a bare string; every non-null value must match an existing User.id',
    async () => {
      const rows = await db.sandboxSession.findMany({ where: { convertedUserId: { not: null } }, select: { id: true, convertedUserId: true } })
      const ids = [...new Set(rows.map((r) => r.convertedUserId!))]
      const found = new Set((await db.user.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((u) => u.id))
      return rows.filter((r) => !found.has(r.convertedUserId!)).map((r) => ({ sandboxSessionId: r.id, convertedUserId: r.convertedUserId }))
    },
  )

  await check(
    'PromoLink.createdById -> User',
    'PromoLink.createdById is a bare string; every non-null value must match an existing User.id',
    async () => {
      const rows = await db.promoLink.findMany({ where: { createdById: { not: null } }, select: { id: true, createdById: true } })
      const ids = [...new Set(rows.map((r) => r.createdById!))]
      const found = new Set((await db.user.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((u) => u.id))
      return rows.filter((r) => !found.has(r.createdById!)).map((r) => ({ promoLinkId: r.id, createdById: r.createdById }))
    },
  )

  // ---- Cross-tenant leak checks: tenantId columns with no @relation at write time ----
  // (Activity/ContentCalendar/SocialPost/AdCampaign/AiTask/AiRecommendation/WorkflowRun/
  // BacklinkOutreach/Review all store a denormalized tenantId with no schema-level FK —
  // see DATABASE-AUDIT.md "Data Integrity". Confirm every stored value still resolves to
  // a real Tenant; a mismatch here would mean a row is either orphaned or was written
  // with a spoofed/garbage tenantId that no query-time filter would have rejected.)

  const orphanTenantChecks: Array<[string, () => Promise<Array<{ id: string; tenantId: string | null }>>]> = [
    ['Activity.tenantId -> Tenant', () => db.activity.findMany({ where: { tenantId: { not: null } }, select: { id: true, tenantId: true } })],
    ['ContentCalendar.tenantId -> Tenant', () => db.contentCalendar.findMany({ select: { id: true, tenantId: true } })],
    ['SocialPost.tenantId -> Tenant', () => db.socialPost.findMany({ select: { id: true, tenantId: true } })],
    ['AdCampaign.tenantId -> Tenant', () => db.adCampaign.findMany({ select: { id: true, tenantId: true } })],
    ['AiTask.tenantId -> Tenant', () => db.aiTask.findMany({ select: { id: true, tenantId: true } })],
    ['AiRecommendation.tenantId -> Tenant', () => db.aiRecommendation.findMany({ select: { id: true, tenantId: true } })],
    ['WorkflowRun.tenantId -> Tenant', () => db.workflowRun.findMany({ select: { id: true, tenantId: true } })],
    ['BacklinkOutreach.tenantId -> Tenant', () => db.backlinkOutreach.findMany({ select: { id: true, tenantId: true } })],
    ['Review.tenantId -> Tenant', () => db.review.findMany({ select: { id: true, tenantId: true } })],
  ]

  for (const [name, fetchRows] of orphanTenantChecks) {
    await check(
      name,
      `${name.split(' ->')[0]} has no @relation to Tenant in the schema; every stored value must still resolve to a real Tenant.id`,
      async () => {
        const rows = await fetchRows()
        const ids = [...new Set(rows.map((r) => r.tenantId).filter((x): x is string => !!x))]
        const found = new Set((await db.tenant.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((t) => t.id))
        return rows.filter((r) => r.tenantId && !found.has(r.tenantId)).map((r) => ({ id: r.id, tenantId: r.tenantId }))
      },
    )
  }

  // ---- Report ----
  let totalViolations = 0
  console.log('\n=== Data Integrity Check — expload-marketing ===\n')
  for (const r of results) {
    const status = r.violations.length === 0 ? 'PASS' : `FAIL (${r.violations.length})`
    console.log(`[${status}] ${r.name}`)
    console.log(`  ${r.description}`)
    if (r.violations.length > 0) {
      totalViolations += r.violations.length
      for (const v of r.violations.slice(0, 10)) console.log(`    - ${JSON.stringify(v)}`)
      if (r.violations.length > 10) console.log(`    ... and ${r.violations.length - 10} more`)
    }
  }
  console.log(`\n${results.length} checks run, ${results.filter((r) => r.violations.length > 0).length} failed, ${totalViolations} total violations found.\n`)

  process.exit(totalViolations > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Data integrity check crashed:', err)
  process.exit(1)
})

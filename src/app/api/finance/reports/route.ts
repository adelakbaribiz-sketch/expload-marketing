import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') ?? 'platform' // platform | distributor | tenant | department
  const scopeId = url.searchParams.get('scopeId')
  const periodType = url.searchParams.get('periodType') // daily | weekly | monthly | quarterly | annual
  const type = url.searchParams.get('type') // revenue_summary | commission_summary | ...

  // If not super_admin, restrict to own scope
  let effectiveScope = scope
  let effectiveScopeId = scopeId
  if (!superAdmin) {
    const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
    if (dist) {
      effectiveScope = 'distributor'
      effectiveScopeId = dist.id
    } else {
      effectiveScope = 'tenant'
      effectiveScopeId = user.tenantId
    }
  }

  if (req.method === 'GET') {
    const where: any = { scope: effectiveScope }
    if (effectiveScopeId) where.scopeId = effectiveScopeId
    if (periodType) where.periodType = periodType
    if (type) where.type = type

    const reports = await db.financialReport.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
    })
    return NextResponse.json({ reports })
  }

  if (req.method === 'POST') {
    // Generate a report
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const periodStart = new Date(body.periodStart)
    const periodEnd = new Date(body.periodEnd)

    const metrics: any = {}
    const breakdown: any = {}

    if (body.type === 'revenue_summary') {
      const payments = await db.payment.findMany({
        where: { status: 'completed', completedAt: { gte: periodStart, lte: periodEnd } },
      })
      metrics.totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
      metrics.totalFees = payments.reduce((s, p) => s + p.processingFee, 0)
      metrics.netRevenue = metrics.totalRevenue - metrics.totalFees
      metrics.count = payments.length
      breakdown.byMethod = payments.reduce((acc, p) => {
        const m = p.paymentMethod ?? 'unknown'
        acc[m] = (acc[m] ?? 0) + p.amount
        return acc
      }, {} as Record<string, number>)
    } else if (body.type === 'commission_summary') {
      const commissions = await db.commission.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
      })
      metrics.totalCommission = commissions.reduce((s, c) => s + c.amount, 0)
      metrics.pendingCommission = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0)
      metrics.paidCommission = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0)
    } else if (body.type === 'payout_summary') {
      const payouts = await db.distributorPayout.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
      })
      metrics.totalPayouts = payouts.reduce((s, p) => s + p.distributorShare, 0)
      metrics.pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.distributorShare, 0)
      metrics.paidPayouts = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.distributorShare, 0)
    } else if (body.type === 'license_usage') {
      const allocations = await db.licenseAllocation.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
      })
      metrics.totalAllocations = allocations.length
      metrics.activated = allocations.filter(a => a.status === 'activated').length
      metrics.expired = allocations.filter(a => a.status === 'expired').length
      metrics.revoked = allocations.filter(a => a.status === 'revoked').length
    }

    const report = await db.financialReport.create({
      data: {
        scope: body.scope ?? 'platform',
        scopeId: body.scopeId,
        periodType: body.periodType ?? 'monthly',
        periodStart, periodEnd,
        type: body.type,
        metrics: JSON.stringify(metrics),
        breakdown: JSON.stringify(breakdown),
        generatedById: user.id,
        generatedByName: user.email,
        generationMethod: 'manual',
        status: 'generated',
      },
    })
    return NextResponse.json({ report, metrics, breakdown }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

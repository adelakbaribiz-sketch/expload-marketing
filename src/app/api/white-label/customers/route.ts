import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

export async function GET() {
  const tenantId = await requireTenantId()
  const customers = await db.resellerCustomer.findMany({
    where: { resellerTenantId: tenantId },
    include: { customerTenant: { select: { id: true, name: true, domain: true, plan: true, isActive: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const commissions = await db.commission.findMany({
    where: { resellerTenantId: tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const totalCommission = await db.commission.aggregate({
    where: { resellerTenantId: tenantId },
    _sum: { amount: true },
  })
  const pendingCommission = await db.commission.aggregate({
    where: { resellerTenantId: tenantId, status: 'pending' },
    _sum: { amount: true },
  })
  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0)
  return NextResponse.json({
    customers,
    commissions,
    stats: {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.status === 'active').length,
      totalRevenue,
      totalCommission: totalCommission._sum.amount || 0,
      pendingCommission: pendingCommission._sum.amount || 0,
    },
  })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  if (!body.customerName) return NextResponse.json({ error: 'customerName required' }, { status: 400 })

  // Sub-tenant + resellerCustomer record must land together — same
  // orphaned-tenant risk as distributors/route.ts POST. See
  // BACKEND-ARCHITECTURE.md "Transactions".
  const { customer, tenant } = await db.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: {
        name: body.customerName,
        domain: body.customerDomain || `${Date.now()}.reseller.expload.io`,
        plan: body.plan || 'starter',
      },
    })
    const customer = await tx.resellerCustomer.create({
      data: {
        resellerTenantId: tenantId,
        customerTenantId: newTenant.id,
        monthlyFee: Number(body.monthlyFee || 49),
        commissionRate: Number(body.commissionRate || 20),
        status: body.status || 'trial',
        trialEndsAt: body.trialDays ? new Date(Date.now() + Number(body.trialDays) * 86400000) : null,
      },
    })
    return { customer, tenant: newTenant }
  })
  return NextResponse.json({ customer, tenant }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

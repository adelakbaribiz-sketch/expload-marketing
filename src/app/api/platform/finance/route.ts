import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [mrr, lastMrr, totalRevenue, totalPayments, failedPayments, activeTenants, activeSubs, trialUsers, churnedThisMonth, newThisMonth] = await Promise.all([
    db.payment.aggregate({ where: { status: 'completed', type: 'subscription', completedAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: 'completed', type: 'subscription', completedAt: { gte: lastMonthStart, lt: monthStart } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: 'completed' }, _sum: { amount: true } }),
    db.payment.count({ where: { status: 'completed' } }),
    db.payment.count({ where: { status: 'failed' } }),
    db.tenant.count({ where: { isActive: true } }),
    db.subscription.count({ where: { status: 'active' } }),
    db.subscription.count({ where: { status: 'trialing' } }),
    db.tenant.count({ where: { isActive: false, updatedAt: { gte: monthStart } } }),
    db.tenant.count({ where: { createdAt: { gte: monthStart } } }),
  ])

  // Monthly revenue trend (12 months)
  const monthlyTrend: any[] = []
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const data = await db.payment.aggregate({
      where: { status: 'completed', completedAt: { gte: start, lt: end } },
      _sum: { amount: true },
    })
    monthlyTrend.push({
      month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
      revenue: data._sum.amount || 0,
    })
  }

  const currentMrr = mrr._sum.amount || 0
  const previousMrr = lastMrr._sum.amount || 0
  const growthRate = previousMrr > 0 ? ((currentMrr - previousMrr) / previousMrr) * 100 : 0
  const churnRate = activeTenants > 0 ? (churnedThisMonth / activeTenants) * 100 : 0

  return NextResponse.json({
    mrr: currentMrr,
    arr: currentMrr * 12,
    mrrGrowth: Math.round(growthRate * 10) / 10,
    totalRevenue: totalRevenue._sum.amount || 0,
    totalPayments,
    failedPayments,
    activeTenants,
    activeSubs,
    trialUsers,
    newThisMonth,
    churnedThisMonth,
    churnRate: Math.round(churnRate * 10) / 10,
    monthlyTrend,
    // CAC estimate (marketing spend / new customers)
    cacEstimate: newThisMonth > 0 ? Math.round(5000 / newThisMonth) : 0,
    // LTV estimate (ARPU / churn rate)
    ltvEstimate: churnRate > 0 ? Math.round(currentMrr / (churnRate / 100)) : 0,
  })
}

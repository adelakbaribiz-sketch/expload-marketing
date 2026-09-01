import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function GET() {
  const tenantId = await requireTenantId()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const [monthly, lastMonthly, yearly, allPayments, failedPayments] = await Promise.all([
    db.payment.aggregate({ where: { tenantId, status: 'completed', completedAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    db.payment.aggregate({ where: { tenantId, status: 'completed', completedAt: { gte: lastMonthStart, lt: monthStart } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { tenantId, status: 'completed', completedAt: { gte: yearStart } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { tenantId, status: 'completed' }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { tenantId, status: 'failed' }, _count: true }),
  ])

  const mrr = monthly._sum.amount || 0
  const lastMrr = lastMonthly._sum.amount || 0
  const growth = lastMrr > 0 ? ((mrr - lastMrr) / lastMrr) * 100 : 0

  // Monthly revenue trend (last 6 months)
  const monthlyTrend: any[] = []
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthData = await db.payment.aggregate({
      where: { tenantId, status: 'completed', completedAt: { gte: start, lt: end } },
      _sum: { amount: true },
    })
    monthlyTrend.push({
      month: start.toLocaleString('default', { month: 'short' }),
      revenue: monthData._sum.amount || 0,
    })
  }

  return NextResponse.json({
    mrr,
    arr: mrr * 12,
    lastMrr,
    growth: Math.round(growth * 10) / 10,
    ytdRevenue: yearly._sum.amount || 0,
    totalRevenue: allPayments._sum.amount || 0,
    failedPayments: failedPayments._count,
    monthlyTrend,
    paymentCount: monthly._count,
  })
}

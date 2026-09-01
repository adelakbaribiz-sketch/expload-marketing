import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const tenantId = await requireTenantId()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const limit = Math.min(Number(searchParams.get('limit') || 50), 200)

  const payments = await db.payment.findMany({
    where: { tenantId, ...(status ? { status } : {}), ...(type ? { type } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  const totalPaid = await db.payment.aggregate({ where: { tenantId, status: 'completed' }, _sum: { amount: true } })
  const totalPending = await db.payment.aggregate({ where: { tenantId, status: 'pending' }, _sum: { amount: true } })
  const totalFailed = await db.payment.aggregate({ where: { tenantId, status: 'failed' }, _sum: { amount: true } })

  return NextResponse.json({
    payments,
    stats: {
      totalPaid: totalPaid._sum.amount || 0,
      totalPending: totalPending._sum.amount || 0,
      totalFailed: totalFailed._sum.amount || 0,
    },
  })
}

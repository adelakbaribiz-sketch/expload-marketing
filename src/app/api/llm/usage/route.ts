import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const provider = url.searchParams.get('provider')
  const period = url.searchParams.get('period') ?? 'today' // today | month | all

  const now = new Date()
  let since: Date
  switch (period) {
    case 'today':
      since = new Date(); since.setHours(0, 0, 0, 0); break
    case 'week':
      since = new Date(); since.setDate(since.getDate() - 7); break
    case 'month':
      since = new Date(); since.setMonth(since.getMonth() - 1); break
    case 'all':
      since = new Date(0); break
    default:
      since = new Date(); since.setHours(0, 0, 0, 0)
  }

  const where: any = { createdAt: { gte: since }, tenantId: user.tenantId }
  if (provider) where.provider = provider

  const records = await db.llmUsageRecord.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 100,
  })

  // Aggregations
  const byProvider = await db.llmUsageRecord.groupBy({
    by: ['provider'],
    where: { createdAt: { gte: since }, tenantId: user.tenantId },
    _sum: { totalTokens: true, costUsd: true },
    _count: true,
  })

  const totals = await db.llmUsageRecord.aggregate({
    where: { createdAt: { gte: since }, tenantId: user.tenantId },
    _sum: { inputTokens: true, outputTokens: true, totalTokens: true, costUsd: true },
    _count: true,
  })

  return NextResponse.json({
    period,
    since,
    records,
    byProvider,
    totals: {
      inputTokens: totals._sum.inputTokens ?? 0,
      outputTokens: totals._sum.outputTokens ?? 0,
      totalTokens: totals._sum.totalTokens ?? 0,
      costUsd: totals._sum.costUsd ?? 0,
      requests: totals._count,
    },
  })
}

export const GET = withProtection(handler, { rateLimit: 'read' })

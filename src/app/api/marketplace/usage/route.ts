import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function GET() {
  const tenantId = await requireTenantId()
  const keys = await db.apiKey.findMany({
    where: { tenantId },
    include: {
      usage: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { product: { select: { name: true, endpoint: true } } },
      },
    },
  })

  const totalCalls = keys.reduce((s, k) => s + k.totalCalls, 0)
  const totalCost = keys.reduce((s, k) => s + k.totalCost, 0)
  const recentUsage = keys.flatMap(k => k.usage).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20)

  return NextResponse.json({
    totalCalls,
    totalCost,
    activeKeys: keys.filter(k => k.isActive).length,
    recentUsage,
    keys: keys.map(k => ({
      id: k.id, name: k.name, isActive: k.isActive,
      totalCalls: k.totalCalls, totalCost: k.totalCost,
      balance: k.balance, billingCycle: k.billingCycle,
      lastUsedAt: k.lastUsedAt,
    })),
  })
}

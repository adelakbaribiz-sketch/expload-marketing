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
  const distributorId = url.searchParams.get('distributorId')
  const action = url.searchParams.get('action')

  if (!superAdmin && !distributorId) {
    const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
    if (!dist) return NextResponse.json({ logs: [] })
    return NextResponse.json({
      logs: await db.distributorAuditLog.findMany({
        where: { distributorId: dist.id, ...(action ? { action } : {}) },
        orderBy: { createdAt: 'desc' }, take: 200,
      }),
    })
  }

  const where: any = {}
  if (distributorId) where.distributorId = distributorId
  if (action) where.action = action
  const logs = await db.distributorAuditLog.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 200,
  })
  return NextResponse.json({ logs })
}

export const GET = withProtection(handler, { rateLimit: 'read' })

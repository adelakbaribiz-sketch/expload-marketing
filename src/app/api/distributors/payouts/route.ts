import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'
import { DISTRIBUTOR_PAYOUT_MACHINE, type DistributorPayoutStatus } from '@/lib/workflow/definitions'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const distributorId = url.searchParams.get('distributorId')
    const status = url.searchParams.get('status')
    const where: any = {}
    if (distributorId) where.distributorId = distributorId
    if (status) where.status = status
    if (!superAdmin) {
      const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
      if (!dist) return NextResponse.json({ payouts: [] })
      where.distributorId = dist.id
    }
    const payouts = await db.distributorPayout.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
    })
    return NextResponse.json({ payouts })
  }

  if (req.method === 'POST') {
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const payout = await db.distributorPayout.create({ data: body })
    await db.distributorAuditLog.create({
      data: {
        distributorId: body.distributorId,
        action: 'payout_requested',
        entityType: 'payout',
        entityId: payout.id,
        description: `Payout of ${body.distributorShare} ${body.currency} for period ${body.periodStart} → ${body.periodEnd}`,
        actorType: 'platform_admin', actorId: user.id, actorName: user.email,
      },
    })
    return NextResponse.json({ payout }, { status: 201 })
  }

  if (req.method === 'PATCH') {
    // Approve / mark paid
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const existing = await db.distributorPayout.findUnique({ where: { id: body.id } })
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (body.status) {
      const nextStatus = String(body.status) as DistributorPayoutStatus
      if (!DISTRIBUTOR_PAYOUT_MACHINE.states.includes(nextStatus)) {
        return NextResponse.json({ error: `Invalid status "${nextStatus}"` }, { status: 400 })
      }
      if (!DISTRIBUTOR_PAYOUT_MACHINE.canTransition(existing.status as DistributorPayoutStatus, nextStatus)) {
        return NextResponse.json({ error: `Cannot move a payout from "${existing.status}" to "${nextStatus}"` }, { status: 409 })
      }
    }
    const update: any = { status: body.status }
    if (body.status === 'approved') {
      update.approvedBy = user.id
      update.approvedAt = new Date()
    }
    if (body.status === 'paid') {
      update.paidAt = new Date()
      update.reference = body.reference
    }
    const payout = await db.distributorPayout.update({ where: { id: body.id }, data: update })
    return NextResponse.json({ payout })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const distributorId = url.searchParams.get('distributorId')
    const status = url.searchParams.get('status')
    const tier = url.searchParams.get('tier')
    const where: any = {}
    if (distributorId) where.distributorId = distributorId
    if (status) where.status = status
    if (tier) where.tier = tier
    if (!superAdmin) {
      const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
      if (!dist) return NextResponse.json({ tickets: [] })
      where.distributorId = dist.id
    }
    const tickets = await db.distributorSupportTicket.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
    })
    return NextResponse.json({ tickets })
  }

  if (req.method === 'POST') {
    // Create a new ticket (escalated to platform by distributor)
    const body = await req.json()
    let distributorId = body.distributorId
    if (!superAdmin) {
      const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
      if (!dist) return NextResponse.json({ error: 'not_a_distributor' }, { status: 403 })
      distributorId = dist.id
    }
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`
    const ticket = await db.distributorSupportTicket.create({
      data: {
        distributorId, ticketNumber,
        subject: body.subject,
        description: body.description,
        category: body.category ?? 'other',
        priority: body.priority ?? 'normal',
        tier: body.tier ?? 'tier3',
        escalatedByDistributor: true,
        attachments: body.attachments ? JSON.stringify(body.attachments) : null,
      },
    })
    return NextResponse.json({ ticket }, { status: 201 })
  }

  if (req.method === 'PATCH') {
    // Update ticket status / assignment
    const body = await req.json()
    if (!superAdmin) {
      // Distributor can only close their own tickets
      const existing = await db.distributorSupportTicket.findUnique({ where: { id: body.id } })
      const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
      if (!existing || !dist || existing.distributorId !== dist.id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
    }
    const update: any = {}
    if (body.status) update.status = body.status
    if (body.assignedToId) update.assignedToId = body.assignedToId
    if (body.resolution) {
      update.resolution = body.resolution
      update.resolvedAt = new Date()
      update.resolvedBy = user.id
    }
    const ticket = await db.distributorSupportTicket.update({ where: { id: body.id }, data: update })
    return NextResponse.json({ ticket })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

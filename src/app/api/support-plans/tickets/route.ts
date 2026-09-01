import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const where: any = { tenantId: user.tenantId }
    if (status) where.status = status
    const tickets = await db.supportTicketItem.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
    })
    return NextResponse.json({ tickets })
  }

  if (req.method === 'POST') {
    // Create support ticket
    const body = await req.json()
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`

    // Get active subscription for SLA
    const sub = await db.supportSubscription.findFirst({
      where: { tenantId: user.tenantId, status: 'active' },
      include: { plan: true },
    })

    const now = new Date()
    const responseTimeHours = sub?.plan?.responseTimeHours ?? 48
    const resolutionTimeHours = sub?.plan?.resolutionTimeHours
    const slaResponseDue = new Date(now.getTime() + responseTimeHours * 3600 * 1000)
    const slaResolutionDue = resolutionTimeHours
      ? new Date(now.getTime() + resolutionTimeHours * 3600 * 1000)
      : null

    const ticket = await db.supportTicketItem.create({
      data: {
        ticketNumber,
        subscriptionId: sub?.id,
        tenantId: user.tenantId,
        subject: body.subject,
        description: body.description,
        category: body.category ?? 'other',
        priority: body.priority ?? 'normal',
        slaResponseDue,
        slaResolutionDue,
        messages: JSON.stringify([{ from: 'customer', message: body.description, timestamp: now.toISOString() }]),
        status: 'open',
      },
    })

    // Update usage counter
    if (sub) {
      await db.supportSubscription.update({
        where: { id: sub.id },
        data: { ticketsUsedThisCycle: { increment: 1 } },
      })
    }

    return NextResponse.json({ ticket }, { status: 201 })
  }

  if (req.method === 'PATCH') {
    // Update ticket (assign, respond, resolve)
    const body = await req.json()
    const update: any = {}
    if (body.status) update.status = body.status
    if (body.assignedToId) update.assignedToId = body.assignedToId
    if (body.resolution) {
      update.resolution = body.resolution
      update.resolvedAt = new Date()
      update.status = 'resolved'
    }
    if (body.customerRating) update.customerRating = body.customerRating
    // Append message
    if (body.newMessage) {
      const existing = await db.supportTicketItem.findUnique({ where: { id: body.id } })
      const msgs = existing?.messages ? JSON.parse(existing.messages) : []
      msgs.push({ from: body.messageFrom ?? 'customer', message: body.newMessage, timestamp: new Date().toISOString() })
      update.messages = JSON.stringify(msgs)
      if (body.messageFrom === 'agent' && !existing?.firstRespondedAt) {
        update.firstRespondedAt = new Date()
      }
    }
    const ticket = await db.supportTicketItem.update({ where: { id: body.id }, data: update })
    return NextResponse.json({ ticket })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

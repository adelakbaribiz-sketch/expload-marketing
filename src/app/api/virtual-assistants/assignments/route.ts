import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { emitNotificationEvent } from '@/lib/notifications/emitter'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const assistantId = url.searchParams.get('assistantId')
    const where: any = {}
    if (status) where.status = status
    if (assistantId) where.assistantId = assistantId
    // Non-admin users see only their tenant's assignments
    if (user.role !== 'owner' && user.role !== 'admin') {
      where.tenantId = user.tenantId
    }
    const assignments = await db.assistantAssignment.findMany({
      where,
      include: {
        assistant: { select: { name: true, avatar: true, primarySkill: true, rating: true } },
        service: { select: { name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ assignments })
  }

  if (req.method === 'POST') {
    // Hire an assistant — creates a new assignment
    const body = await req.json()
    const assignment = await db.assistantAssignment.create({
      data: {
        assistantId: body.assistantId,
        serviceId: body.serviceId,
        tenantId: user.tenantId,
        projectName: body.projectName,
        projectDescription: body.projectDescription ?? '',
        pricingType: body.pricingType ?? 'hourly',
        agreedRate: body.agreedRate,
        currency: body.currency ?? 'USD',
        totalBudget: body.totalBudget,
        hoursBudget: body.hoursBudget,
        expectedEndDate: body.expectedEndDate ? new Date(body.expectedEndDate) : null,
        status: 'active',
      },
    })
    // Update assistant stats
    await db.virtualAssistant.update({
      where: { id: body.assistantId },
      data: { totalProjects: { increment: 1 } },
    })
    // Notify
    await emitNotificationEvent({
      type: 'assistant_hired',
      title: 'Virtual assistant hired',
      message: `${body.assistantName ?? 'Assistant'} assigned to "${body.projectName}"`,
      severity: 'success',
      tenantId: user.tenantId,
      category: 'assistant',
      actionUrl: '/virtual-assistants',
    })
    return NextResponse.json({ assignment }, { status: 201 })
  }

  if (req.method === 'PATCH') {
    const body = await req.json()
    const update: any = {}
    for (const f of ['status', 'hoursLogged', 'tasksTotal', 'tasksCompleted', 'customerRating', 'customerFeedback', 'actualEndDate']) {
      if (f in body) update[f] = body[f]
    }
    if (body.deliverables) update.deliverables = JSON.stringify(body.deliverables)
    const assignment = await db.assistantAssignment.update({ where: { id: body.id }, data: update })
    return NextResponse.json({ assignment })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

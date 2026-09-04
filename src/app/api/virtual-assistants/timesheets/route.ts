import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const assistantId = url.searchParams.get('assistantId')
    const assignmentId = url.searchParams.get('assignmentId')
    const status = url.searchParams.get('status')
    const where: any = {}
    if (assistantId) where.assistantId = assistantId
    if (assignmentId) where.assignmentId = assignmentId
    if (status) where.status = status
    // AssistantTimesheet has no direct tenantId — it's only reachable via
    // its (optional) assignment, so tenant-scoping must go through that join.
    if (!(await isSuperAdmin())) {
      where.assignment = { tenantId: user.tenantId }
    }
    const timesheets = await db.assistantTimesheet.findMany({
      where, orderBy: { date: 'desc' }, take: 200,
    })
    return NextResponse.json({ timesheets })
  }

  if (req.method === 'POST') {
    // Log time entry (assistant or admin)
    const body = await req.json()
    if (body.assignmentId) {
      const assignment = await db.assistantAssignment.findUnique({ where: { id: body.assignmentId } })
      if (!assignment || (assignment.tenantId !== user.tenantId && !(await isSuperAdmin()))) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
    }
    const ts = await db.assistantTimesheet.create({
      data: {
        assistantId: body.assistantId,
        assignmentId: body.assignmentId,
        date: new Date(body.date),
        hoursWorked: body.hoursWorked,
        taskDescription: body.taskDescription,
        activityType: body.activityType ?? 'manual',
        keystrokesCount: body.keystrokesCount ?? 0,
        mouseMovements: body.mouseMovements ?? 0,
        appsUsed: body.appsUsed ? JSON.stringify(body.appsUsed) : null,
        productivityScore: body.productivityScore ?? 0,
        status: 'pending',
      },
    })
    // Update assignment hours
    if (body.assignmentId) {
      await db.assistantAssignment.update({
        where: { id: body.assignmentId },
        data: { hoursLogged: { increment: body.hoursWorked } },
      })
    }
    return NextResponse.json({ timesheet: ts }, { status: 201 })
  }

  if (req.method === 'PATCH') {
    // Approve / reject timesheet
    const body = await req.json()
    const existing = await db.assistantTimesheet.findUnique({ where: { id: body.id }, include: { assignment: true } })
    if (!existing || (existing.assignment?.tenantId !== user.tenantId && !(await isSuperAdmin()))) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const update: any = { status: body.status }
    if (body.status === 'approved') {
      update.approvedBy = user.id
      update.approvedAt = new Date()
    }
    const ts = await db.assistantTimesheet.update({ where: { id: body.id }, data: update })
    return NextResponse.json({ timesheet: ts })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

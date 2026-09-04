import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isPlatformStaffAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!(await isPlatformStaffAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const where: any = {}
    if (status) where.status = status
    const periods = await db.payrollPeriod.findMany({
      where, orderBy: { periodStart: 'desc' }, take: 50,
      include: { _count: { select: { payments: true } } },
    })
    return NextResponse.json({ periods })
  }

  if (req.method === 'PATCH') {
    // Approve a period & mark all payments as paid
    const body = await req.json()
    if (body.action === 'approve') {
      await db.payrollPeriod.update({
        where: { id: body.periodId },
        data: {
          status: 'approved',
          approvedBy: user.id,
          approvedAt: new Date(),
        },
      })
      // Mark all salary payments as paid
      await db.salaryPayment.updateMany({
        where: { periodId: body.periodId, status: 'pending' },
        data: { status: 'paid', paidAt: new Date() },
      })
      await db.payrollPeriod.update({
        where: { id: body.periodId },
        data: { status: 'paid', paidAt: new Date() },
      })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

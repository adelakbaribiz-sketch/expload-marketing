import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()
  if (!superAdmin) {
    const emp = await db.internalEmployee.findUnique({ where: { userId: user.id } })
    if (!emp || (emp.platformRole !== 'admin' && emp.platformRole !== 'super_admin' && emp.id !== id)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }
  const employee = await db.internalEmployee.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      department: true,
      manager: { select: { id: true, user: { select: { name: true, email: true } } } },
      directReports: { include: { user: { select: { name: true, email: true } } } },
    },
  })
  if (!employee) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ employee })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()
  if (!superAdmin) {
    const emp = await db.internalEmployee.findUnique({ where: { userId: user.id } })
    if (!emp || (emp.platformRole !== 'admin' && emp.platformRole !== 'super_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }
  const body = await req.json()
  if (body.platformRole === 'super_admin' && !superAdmin) {
    return NextResponse.json({ error: 'Only a super admin can grant the super_admin platform role' }, { status: 403 })
  }
  const allowed = [
    'departmentId', 'employeeRole', 'platformRole', 'permissions',
    'jobTitle', 'employmentType', 'managerId', 'assignedRegion',
    'status', 'salary', 'salaryCurrency', 'bonusEligible',
    'workPhone', 'workEmail', 'location', 'avatar',
    'assignedDistributorIds',
  ]
  const data: any = {}
  for (const f of allowed) {
    if (f in body) {
      data[f] = f === 'permissions' || f === 'assignedDistributorIds'
        ? JSON.stringify(body[f]) : body[f]
    }
  }
  const updated = await db.internalEmployee.update({ where: { id }, data })
  return NextResponse.json({ employee: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()
  if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  // Soft-delete via status
  await db.internalEmployee.update({
    where: { id },
    data: { status: 'terminated', endDate: new Date() },
  })
  return NextResponse.json({ ok: true })
}

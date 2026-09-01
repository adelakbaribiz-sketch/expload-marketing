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
  const employeeId = url.searchParams.get('employeeId')
  const action = url.searchParams.get('action')
  const where: any = {}
  if (employeeId) where.employeeId = employeeId
  if (action) where.action = action

  // If not super_admin, restrict to own activities or activities of reports
  if (!superAdmin) {
    const emp = await db.internalEmployee.findUnique({ where: { userId: user.id } })
    if (!emp) return NextResponse.json({ activities: [] })
    // Admin can see department activities, employee sees own only
    if (emp.platformRole === 'admin') {
      where.employee = { departmentId: emp.departmentId }
    } else {
      where.employeeId = emp.id
    }
  }

  const activities = await db.internalEmployeeActivity.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 200,
  })
  return NextResponse.json({ activities })
}

export const GET = withProtection(handler, { rateLimit: 'read' })

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()

  // Only super_admin or admin-level internal employees can manage
  if (!superAdmin) {
    const emp = await db.internalEmployee.findUnique({ where: { userId: user.id } })
    if (!emp || (emp.platformRole !== 'admin' && emp.platformRole !== 'super_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const departmentId = url.searchParams.get('departmentId')
    const platformRole = url.searchParams.get('platformRole')
    const where: any = {}
    if (departmentId) where.departmentId = departmentId
    if (platformRole) where.platformRole = platformRole

    const employees = await db.internalEmployee.findMany({
      where,
      include: {
        user: { select: { email: true, name: true } },
        department: { select: { name: true, displayName: true } },
        manager: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ employees })
  }

  if (req.method === 'POST') {
    // Create new internal employee (expandable by admin/super_admin)
    const body = await req.json()

    if (!body.email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    // Only an existing super_admin may grant super_admin platformRole — an
    // admin-level internal employee could otherwise mint themselves/others
    // a super_admin account.
    if (body.platformRole === 'super_admin' && !superAdmin) {
      return NextResponse.json({ error: 'Only a super admin can grant the super_admin platform role' }, { status: 403 })
    }

    // Up to 3 sequential writes (tenant + user, employee, activity log) must
    // land together — a failure partway through used to leave a linked user
    // with no employee record, or an employee with no activity trail. See
    // BACKEND-ARCHITECTURE.md "Transactions".
    const employee = await db.$transaction(async (tx) => {
      const email = body.email.toLowerCase()
      let linkedUser = await tx.user.findUnique({ where: { email } })
      if (!linkedUser) {
        // Provisional user — must be onboarded via existing signup flow
        let tenant = await tx.tenant.findUnique({ where: { domain: 'platform.internal' } })
        if (!tenant) {
          tenant = await tx.tenant.create({
            data: { name: 'Platform Internal', domain: 'platform.internal', plan: 'enterprise' },
          })
        }
        linkedUser = await tx.user.create({
          data: { email, name: body.name, tenantId: tenant.id, role: 'admin' },
        })
      }

      const employee = await tx.internalEmployee.create({
        data: {
          userId: linkedUser.id,
          departmentId: body.departmentId,
          employeeRole: body.employeeRole ?? 'staff',
          platformRole: body.platformRole ?? 'employee',
          permissions: JSON.stringify(body.permissions ?? []),
          jobTitle: body.jobTitle,
          employmentType: body.employmentType ?? 'full_time',
          managerId: body.managerId,
          assignedRegion: body.assignedRegion,
          salary: body.salary,
          salaryCurrency: body.salaryCurrency ?? 'USD',
          bonusEligible: body.bonusEligible ?? false,
          workPhone: body.workPhone,
          workEmail: body.workEmail ?? email,
          location: body.location,
        },
      })

      await tx.internalEmployeeActivity.create({
        data: {
          employeeId: employee.id,
          action: 'employee_created',
          entityType: 'internal_employee',
          entityId: employee.id,
          description: `Employee ${linkedUser.email} created as ${employee.employeeRole}`,
          metadata: JSON.stringify({ createdBy: user.id }),
        },
      })

      return employee
    })

    return NextResponse.json({ employee }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

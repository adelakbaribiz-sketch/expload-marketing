import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()
  if (!superAdmin) {
    const emp = await db.internalEmployee.findUnique({ where: { userId: user.id } })
    if (!emp || (emp.platformRole !== 'admin' && emp.platformRole !== 'super_admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  if (req.method === 'GET') {
    const departments = await db.internalDepartment.findMany({
      include: {
        parent: { select: { name: true, displayName: true } },
        _count: { select: { employees: true, children: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ departments })
  }

  if (req.method === 'POST') {
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const dept = await db.internalDepartment.create({
      data: {
        name: body.name,
        displayName: body.displayName ?? body.name,
        description: body.description,
        parentId: body.parentId,
        headEmployeeId: body.headEmployeeId,
        accessScope: body.accessScope ?? 'limited',
        budget: body.budget,
        costCenter: body.costCenter,
      },
    })
    return NextResponse.json({ department: dept }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

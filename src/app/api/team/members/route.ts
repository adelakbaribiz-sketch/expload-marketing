import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { getAuthUserId } from '@/lib/auth/simple-session'
import { hasPermission } from '@/lib/auth/rbac'

export async function GET() {
  const tenantId = await requireTenantId()
  const users = await db.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, name: true, role: true, isActive: true, roleId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  // Get roles
  const roles = await db.role.findMany({ where: { OR: [{ tenantId }, { tenantId: null, isSystem: true }] } })
  const roleMap = new Map(roles.map(r => [r.id, r]))
  const members = users.map(u => ({ ...u, roleName: u.roleId ? roleMap.get(u.roleId)?.displayName : u.role }))
  return NextResponse.json({ members, roles })
}

export async function POST(req: NextRequest) {
  const tenantId = await requireTenantId()
  const check = await hasPermission('team.manage')
  if (!check.allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const currentUserId = await getAuthUserId()
  const body = await req.json().catch(() => ({}))

  // Update user role
  if (body.userId && body.roleId) {
    const target = await db.user.findUnique({ where: { id: body.userId } })
    if (!target || target.tenantId !== tenantId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const updated = await db.user.update({
      where: { id: body.userId },
      data: { roleId: body.roleId, role: body.roleName || 'member' },
      select: { id: true, email: true, name: true, role: true, roleId: true, isActive: true, tenantId: true },
    })
    // Log to audit
    await db.auditLogEntry.create({
      data: {
        userId: currentUserId ?? undefined,
        action: 'role_change',
        entityType: 'user',
        entityId: body.userId,
        description: `Changed user role to ${body.roleName}`,
        tenantId,
      },
    })
    return NextResponse.json({ user: updated })
  }

  return NextResponse.json({ error: 'Missing userId or roleId' }, { status: 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { hasPermission } from '@/lib/auth/rbac'

export async function GET() {
  const tenantId = await requireTenantId()
  const roles = await db.role.findMany({
    where: { OR: [{ tenantId }, { tenantId: null, isSystem: true }] },
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true, members: true } } },
    orderBy: { level: 'desc' },
  })
  const allPermissions = await db.permission.findMany({ orderBy: { category: 'asc' } })
  return NextResponse.json({ roles, allPermissions })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const check = await hasPermission('team.manage')
  if (!check.allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const role = await db.role.create({
    data: {
      name: body.name,
      displayName: body.displayName || body.name,
      description: body.description || null,
      level: Number(body.level || 0),
      scope: body.scope || 'tenant',
      color: body.color || '#0A2A3A',
      icon: body.icon || '👤',
      tenantId,
      permissions: body.permissionIds ? {
        create: body.permissionIds.map((pid: string) => ({ permissionId: pid }))
      } : undefined,
    },
  })
  return NextResponse.json({ role }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

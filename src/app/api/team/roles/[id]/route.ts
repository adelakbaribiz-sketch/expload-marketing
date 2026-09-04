import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { hasPermission } from '@/lib/auth/rbac'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const check = await hasPermission('team.manage')
  if (!check.allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params
  // Only this tenant's own custom roles are editable here — a shared
  // isSystem role must never be mutated by one tenant's request, since that
  // would silently change every other tenant using that same system role.
  const existing = await db.role.findFirst({ where: { id, tenantId, isSystem: false } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))

  // Update role permissions if provided
  if (body.permissionIds !== undefined) {
    await db.rolePermission.deleteMany({ where: { roleId: id } })
    if (body.permissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: body.permissionIds.map((pid: string) => ({ roleId: id, permissionId: pid })),
      })
    }
  }

  const updated = await db.role.update({
    where: { id },
    data: {
      ...(body.displayName ? { displayName: String(body.displayName) } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.color ? { color: String(body.color) } : {}),
      ...(body.level !== undefined ? { level: Number(body.level) } : {}),
    },
  })
  return NextResponse.json({ role: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const check = await hasPermission('team.manage')
  if (!check.allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const role = await db.role.findFirst({ where: { id, OR: [{ tenantId }, { isSystem: true }] } })
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role.isSystem) return NextResponse.json({ error: 'Cannot delete system role' }, { status: 400 })
  await db.role.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

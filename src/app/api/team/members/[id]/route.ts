import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { hasPermission } from '@/lib/auth/rbac'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const tenantId = await requireTenantId()
  const check = await hasPermission('team.manage')
  if (!check.allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const existing = await db.user.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(body.roleId !== undefined ? { roleId: body.roleId || null } : {}),
      ...(body.role ? { role: String(body.role) } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    },
    select: { id: true, email: true, name: true, role: true, roleId: true, isActive: true, tenantId: true },
  })
  return NextResponse.json({ user: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const tenantId = await requireTenantId()
  const check = await hasPermission('team.manage')
  if (!check.allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const existing = await db.user.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.user.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.projectMember.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const updated = await db.projectMember.update({
    where: { id },
    data: {
      ...(body.roleId !== undefined ? { roleId: body.roleId || null } : {}),
      ...(body.status ? { status: String(body.status) } : {}),
      ...(body.customPermissions !== undefined ? { customPermissions: JSON.stringify(body.customPermissions) } : {}),
    },
  })
  return NextResponse.json({ member: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.projectMember.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.projectMember.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

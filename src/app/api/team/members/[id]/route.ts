import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(body.roleId !== undefined ? { roleId: body.roleId || null } : {}),
      ...(body.role ? { role: String(body.role) } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    },
  })
  return NextResponse.json({ user: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.user.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
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
  const { id } = await ctx.params
  const role = await db.role.findUnique({ where: { id } })
  if (role?.isSystem) return NextResponse.json({ error: 'Cannot delete system role' }, { status: 400 })
  await db.role.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

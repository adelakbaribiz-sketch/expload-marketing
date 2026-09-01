import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
  const body = await req.json().catch(() => ({}))

  // Promote/demote to super admin
  if (body.makeSuperAdmin !== undefined) {
    if (body.makeSuperAdmin) {
      await db.superAdmin.upsert({
        where: { userId: id },
        create: { userId: id, level: 1, assignedBy: 'admin' },
        update: { isActive: true },
      })
    } else {
      await db.superAdmin.updateMany({ where: { userId: id }, data: { isActive: false } })
    }
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(body.role ? { role: String(body.role) } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    },
  })
  return NextResponse.json({ user: updated })
}

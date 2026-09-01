import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const updated = await db.tenant.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name).slice(0, 200) } : {}),
      ...(body.plan ? { plan: String(body.plan) } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    },
  })
  return NextResponse.json({ tenant: updated })
}

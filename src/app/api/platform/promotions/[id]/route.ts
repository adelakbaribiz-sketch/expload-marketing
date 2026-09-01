import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const updated = await db.platformPromotion.update({
    where: { id },
    data: {
      ...(body.status ? { status: String(body.status), launchedAt: body.status === 'active' ? new Date() : undefined } : {}),
      ...(body.title ? { title: String(body.title) } : {}),
      ...(body.content ? { content: JSON.stringify(body.content) } : {}),
    },
  })
  return NextResponse.json({ promotion: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
  await db.platformPromotion.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

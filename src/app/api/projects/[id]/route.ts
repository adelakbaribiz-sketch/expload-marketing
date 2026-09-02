import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.project.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const updated = await db.project.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name) } : {}),
      ...(typeof body.description === 'string' ? { description: body.description } : {}),
      ...(body.status ? { status: String(body.status) } : {}),
    },
  })
  return NextResponse.json({ project: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.project.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

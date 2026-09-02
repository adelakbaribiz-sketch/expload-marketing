import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.resellerApplication.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const updated = await db.resellerApplication.update({
    where: { id },
    data: {
      ...(body.status ? { status: String(body.status), reviewedAt: new Date() } : {}),
      ...(body.reviewNotes ? { reviewNotes: String(body.reviewNotes).slice(0, 1000) } : {}),
      ...(body.contractStart ? { contractStart: new Date(body.contractStart) } : {}),
      ...(body.contractEnd ? { contractEnd: new Date(body.contractEnd) } : {}),
    },
  })
  return NextResponse.json({ application: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.resellerApplication.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.resellerApplication.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

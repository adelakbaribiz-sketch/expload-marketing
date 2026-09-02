import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.clubAdvertisement.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const updated = await db.clubAdvertisement.update({
    where: { id },
    data: {
      ...(body.status ? { status: String(body.status), reviewedAt: new Date() } : {}),
      ...(body.title ? { title: String(body.title).slice(0, 200) } : {}),
      ...(typeof body.description === 'string' ? { description: String(body.description).slice(0, 1000) } : {}),
    },
  })
  return NextResponse.json({ ad: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.clubAdvertisement.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.clubAdvertisement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

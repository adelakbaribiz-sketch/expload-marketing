import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const link = await db.promoLink.findFirst({
    where: { id, tenantId },
    include: {
      clicks: { orderBy: { clickedAt: 'desc' }, take: 50 },
      _count: { select: { clicks: true } },
    },
  })
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ link })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.promoLink.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const updated = await db.promoLink.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name).slice(0, 200) } : {}),
      ...(body.description !== undefined ? { description: String(body.description).slice(0, 500) } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.category ? { category: String(body.category) } : {}),
    },
  })
  return NextResponse.json({ link: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.promoLink.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.promoLink.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

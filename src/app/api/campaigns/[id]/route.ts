import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const campaign = await db.emailCampaign.findUnique({
    where: { id },
    include: {
      template: true,
      creator: { select: { id: true, name: true, email: true } },
      logs: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ campaign })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const updated = await db.emailCampaign.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name).slice(0, 200) } : {}),
      ...(body.subject ? { subject: String(body.subject).slice(0, 500) } : {}),
      ...(typeof body.body === 'string' ? { body: String(body.body).slice(0, 10000) } : {}),
      ...(body.status ? { status: String(body.status) } : {}),
    },
  })
  return NextResponse.json({ campaign: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.emailCampaign.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

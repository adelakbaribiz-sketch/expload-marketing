import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      project: true,
      company: true,
      activities: { orderBy: { createdAt: 'desc' }, take: 30 },
    },
  })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ lead })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const services = Array.isArray(body.services) ? JSON.stringify(body.services) : undefined
  const updated = await db.lead.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name) } : {}),
      ...(typeof body.email === 'string' ? { email: body.email || null } : {}),
      ...(typeof body.phone === 'string' ? { phone: body.phone || null } : {}),
      ...(typeof body.website === 'string' ? { website: body.website || null } : {}),
      ...(typeof body.address === 'string' ? { address: body.address || null } : {}),
      ...(typeof body.industry === 'string' ? { industry: body.industry || null } : {}),
      ...(typeof body.description === 'string' ? { description: body.description || null } : {}),
      ...(services !== undefined ? { services } : {}),
      ...(typeof body.score === 'number' ? { score: body.score } : {}),
      ...(body.status ? { status: String(body.status) } : {}),
      ...(body.projectId !== undefined ? { projectId: body.projectId || null } : {}),
    },
  })
  await db.activity.create({
    data: {
      type: 'updated',
      message: `Lead «${updated.name}» updated`,
      leadId: updated.id,
      tenantId: updated.tenantId,
    },
  })
  return NextResponse.json({ lead: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.lead.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

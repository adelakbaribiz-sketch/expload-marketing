import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const template = await db.emailTemplate.findUnique({ where: { id } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ template })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const updated = await db.emailTemplate.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name).slice(0, 200) } : {}),
      ...(body.subject ? { subject: String(body.subject).slice(0, 500) } : {}),
      ...(typeof body.body === 'string' ? { body: String(body.body).slice(0, 10000) } : {}),
      ...(body.category ? { category: String(body.category) } : {}),
    },
  })
  return NextResponse.json({ template: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.emailTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

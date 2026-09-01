import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
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
  const { id } = await ctx.params
  await db.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

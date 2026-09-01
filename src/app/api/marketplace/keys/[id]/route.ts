import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const updated = await db.apiKey.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name).slice(0, 100) } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive, revokedAt: body.isActive ? null : new Date() } : {}),
      ...(body.balance !== undefined ? { balance: Number(body.balance) } : {}),
    },
  })
  return NextResponse.json({ apiKey: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.apiKey.update({ where: { id }, data: { isActive: false, revokedAt: new Date() } })
  return NextResponse.json({ ok: true })
}

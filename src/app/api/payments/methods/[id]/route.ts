import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.paymentMethod.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}

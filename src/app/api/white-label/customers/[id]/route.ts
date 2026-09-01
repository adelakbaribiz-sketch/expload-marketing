import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const updated = await db.resellerCustomer.update({
    where: { id },
    data: {
      ...(body.monthlyFee !== undefined ? { monthlyFee: Number(body.monthlyFee) } : {}),
      ...(body.commissionRate !== undefined ? { commissionRate: Number(body.commissionRate) } : {}),
      ...(body.status ? { status: String(body.status) } : {}),
    },
  })
  return NextResponse.json({ customer: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await db.resellerCustomer.update({ where: { id }, data: { status: 'churned', churnedAt: new Date() } })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  // The reseller (not the customer) owns/manages this record — pricing,
  // commission, and status are reseller-side configuration.
  const existing = await db.resellerCustomer.findFirst({ where: { id, resellerTenantId: tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.resellerCustomer.findFirst({ where: { id, resellerTenantId: tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.resellerCustomer.update({ where: { id }, data: { status: 'churned', churnedAt: new Date() } })
  return NextResponse.json({ ok: true })
}

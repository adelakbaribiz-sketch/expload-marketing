import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.financialAlert.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const updated = await db.financialAlert.update({
    where: { id },
    data: {
      ...(typeof body.isRead === 'boolean' ? { isRead: body.isRead } : {}),
      ...(typeof body.isResolved === 'boolean' ? { isResolved: body.isResolved, resolvedAt: body.isResolved ? new Date() : null } : {}),
    },
  })
  return NextResponse.json({ alert: updated })
}

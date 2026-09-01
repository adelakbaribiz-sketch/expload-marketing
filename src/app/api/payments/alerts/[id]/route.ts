import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
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

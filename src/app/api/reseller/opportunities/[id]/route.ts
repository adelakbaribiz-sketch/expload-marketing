import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const opp = await db.resellerOpportunity.findUnique({ where: { id }, include: { applications: true } })
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.resellerOpportunity.update({ where: { id }, data: { viewCount: { increment: 1 } } })
  return NextResponse.json({ opportunity: opp })
}

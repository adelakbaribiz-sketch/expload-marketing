import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const brief = await db.projectBrief.findUnique({ where: { id } })
  if (!brief || brief.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({
    brief,
    roadmap: brief.roadmap ? JSON.parse(brief.roadmap) : null,
    pricingTiers: brief.pricingTiers ? JSON.parse(brief.pricingTiers) : null,
  })
}

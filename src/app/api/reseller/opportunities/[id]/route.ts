import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  // ResellerOpportunity itself is platform-global marketing content (fine to
  // view publicly, same as /api/public/reseller), but its `applications`
  // relation holds every applicant tenant's PII (email/phone/business name)
  // and internal review notes — that must never be returned to a caller who
  // isn't platform staff reviewing recruitment, regardless of which tenant
  // (or no tenant at all) they are.
  const admin = await isSuperAdmin()
  const opp = await db.resellerOpportunity.findUnique({
    where: { id },
    include: admin ? { applications: true } : undefined,
  })
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.resellerOpportunity.update({ where: { id }, data: { viewCount: { increment: 1 } } })
  return NextResponse.json({ opportunity: opp })
}

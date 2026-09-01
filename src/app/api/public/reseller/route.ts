import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** PUBLIC — list active reseller opportunities for the landing page. */
export async function GET() {
  const opportunities = await db.resellerOpportunity.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: 'desc' }, { applicationCount: 'desc' }],
  })
  return NextResponse.json({ opportunities })
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const tiers = await db.clubTier.findMany({
    where: { isActive: true },
    orderBy: { level: 'asc' },
  })
  return NextResponse.json({ tiers })
}

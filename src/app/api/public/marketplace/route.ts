import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** PUBLIC — list all active API products for the marketplace page. */
export async function GET() {
  const products = await db.apiProduct.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: 'desc' }, { totalCalls: 'desc' }],
    select: {
      id: true, name: true, slug: true, description: true,
      pricePerCall: true, pricePerMonth: true, category: true,
      endpoint: true, method: true, isFeatured: true,
      totalCalls: true, subscriberCount: true, totalRevenue: true,
    },
  })
  return NextResponse.json({ products })
}

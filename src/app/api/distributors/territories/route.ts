import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const distributorId = url.searchParams.get('distributorId')
    const where: any = {}
    if (distributorId) where.distributorId = distributorId
    if (!superAdmin) {
      const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
      if (!dist) return NextResponse.json({ territories: [] })
      where.distributorId = dist.id
    }
    const territories = await db.territoryExclusivity.findMany({
      where, include: { distributor: { select: { companyName: true } } },
      orderBy: { startDate: 'desc' }, take: 200,
    })
    return NextResponse.json({ territories })
  }

  if (req.method === 'POST') {
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    // Check for conflicting exclusivity
    const conflict = await db.territoryExclusivity.findFirst({
      where: {
        country: body.country,
        region: body.region ?? null,
        city: body.city ?? null,
        status: 'active',
        isExclusive: true,
        distributorId: { not: body.distributorId },
      },
    })
    if (conflict && body.isExclusive) {
      return NextResponse.json({ error: 'exclusive_territory_conflict', conflict }, { status: 409 })
    }
    const territory = await db.territoryExclusivity.create({ data: body })
    return NextResponse.json({ territory }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

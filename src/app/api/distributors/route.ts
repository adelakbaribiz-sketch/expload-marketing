import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const superAdmin = await isSuperAdmin()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const tier = url.searchParams.get('tier')

  if (req.method === 'GET') {
    // Distributors list — super_admin sees all, distributor sees own
    const where: any = {}
    if (status) where.status = status
    if (tier) where.tier = tier
    if (!superAdmin) where.tenantId = user.tenantId

    const distributors = await db.distributor.findMany({
      where,
      include: {
        tenant: { select: { name: true, domain: true } },
        _count: { select: { allocations: true, contracts: true, territories: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ distributors })
  }

  if (req.method === 'POST') {
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    // Create distributor tenant + record
    const newTenant = await db.tenant.create({
      data: { name: body.companyName, domain: body.domain ?? `dist-${Date.now()}.local`, plan: 'distributor' },
    })
    const distributor = await db.distributor.create({
      data: {
        tenantId: newTenant.id,
        companyName: body.companyName,
        legalName: body.legalName,
        taxId: body.taxId,
        country: body.country,
        region: body.region,
        city: body.city,
        address: body.address,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        tier: body.tier ?? 'standard',
        internalOwnerId: body.internalOwnerId,
        notes: body.notes,
      },
    })
    return NextResponse.json({ distributor }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

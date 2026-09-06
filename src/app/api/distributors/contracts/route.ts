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
      if (!dist) return NextResponse.json({ contracts: [] })
      where.distributorId = dist.id
    }
    const contracts = await db.distributorContract.findMany({
      where, include: { distributor: { select: { companyName: true, country: true } } },
      orderBy: { createdAt: 'desc' }, take: 200,
    })
    return NextResponse.json({ contracts })
  }

  if (req.method === 'POST') {
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const contractNumber = `MDC-${Date.now().toString(36).toUpperCase()}`
    const contract = await db.distributorContract.create({
      data: {
        distributorId: body.distributorId,
        contractNumber,
        type: body.type ?? 'master_distributor',
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        minimumGuarantee: body.minimumGuarantee ?? 0,
        minimumGuaranteePeriod: body.minimumGuaranteePeriod ?? 'annual',
        wholesaleDiscountPercent: body.wholesaleDiscountPercent ?? 40,
        revSharePercent: body.revSharePercent ?? 0,
        paymentTerms: body.paymentTerms ?? 'prepaid',
        currency: body.currency ?? 'USD',
        territoryScope: body.territoryScope ?? null,
        isExclusive: body.isExclusive ?? false,
        autoRenew: body.autoRenew ?? false,
        renewalTermMonths: body.renewalTermMonths ?? 12,
        status: body.status ?? 'draft',
      },
    })
    await db.distributor.update({
      where: { id: body.distributorId },
      data: { contractId: contract.id },
    })
    return NextResponse.json({ contract }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { generateLicenseKey } from '@/lib/payment/crypto'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const distributorId = url.searchParams.get('distributorId')
  const status = url.searchParams.get('status')

  if (req.method === 'GET') {
    const superAdmin = await isSuperAdmin()
    const where: any = {}
    if (distributorId) where.distributorId = distributorId
    if (status) where.status = status
    if (!superAdmin && !distributorId) {
      // Distributor sees own allocations
      const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
      if (!dist) return NextResponse.json({ allocations: [] })
      where.distributorId = dist.id
    }
    const allocations = await db.licenseAllocation.findMany({
      where,
      include: { package: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json({ allocations })
  }

  if (req.method === 'POST') {
    // Issue licenses: distributor buys a package, generate N license keys.
    // SuperAdmin-only — this mints real, immediately-usable inventory
    // (`totalPaidToPlatform`/`totalRevenue` are incremented as if a
    // payment was just collected) with no actual payment verification
    // anywhere in this handler or called from it. Previously any user on
    // the distributor's own tenant could call this directly, letting a
    // legitimate-but-unvetted distributor team member self-issue up to
    // 1000 free license keys per call with no cap on calls — a real
    // revenue-integrity hole, not just a UX gap (found in the Phase 20
    // production-readiness audit). Until a real payment gate exists here
    // (mirroring the crypto-payment webhook-confirm pattern used
    // elsewhere), a platform SuperAdmin must issue licenses manually,
    // the same "fail honestly, require a trusted human" principle already
    // applied to the non-crypto payment gateways (see
    // src/lib/integrations/payment-provider.ts).
    const body = await req.json()
    const superAdmin = await isSuperAdmin()
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const dist = await db.distributor.findUnique({ where: { id: body.distributorId } })
    if (!dist) return NextResponse.json({ error: 'distributor_not_found' }, { status: 404 })

    const pkg = await db.licensePackage.findUnique({ where: { id: body.packageId } })
    if (!pkg || !pkg.isActive) return NextResponse.json({ error: 'invalid_package' }, { status: 400 })

    // Check tier restriction
    if (pkg.tierRestriction && pkg.tierRestriction !== dist.tier) {
      return NextResponse.json({ error: 'tier_not_allowed' }, { status: 403 })
    }

    // Generate license keys — count is client-supplied, so bound it: an
    // unchecked value here let a caller request an arbitrary (or negative)
    // number of rows in the createMany below.
    const rawCount = body.count ?? pkg.licenseCount
    if (!Number.isInteger(rawCount) || rawCount < 1 || rawCount > 1000) {
      return NextResponse.json({ error: 'count must be an integer between 1 and 1000' }, { status: 400 })
    }
    const count = rawCount
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + pkg.validityMonths)

    const allocations: { distributorId: string; packageId: string; licenseKey: string; status: string; expiresAt: Date }[] = []
    for (let i = 0; i < count; i++) {
      allocations.push({
        distributorId: dist.id,
        packageId: pkg.id,
        licenseKey: generateLicenseKey(),
        status: 'in_pool',
        expiresAt,
      })
    }
    // License-key rows, the distributor's/package's running financial
    // totals, and the audit log entry must all land together — a failure
    // partway through used to leave issued keys with no matching revenue
    // record (or vice versa). See BACKEND-ARCHITECTURE.md "Transactions".
    await db.$transaction(async (tx) => {
      await tx.licenseAllocation.createMany({ data: allocations })

      // wholesalePrice is the PER-LICENSE price — incrementing by the bare
      // unit price regardless of `count` under-recorded revenue on every
      // multi-license issuance (e.g. issuing 50 licenses only recorded 1
      // unit's worth of revenue). Found in the Phase 20 audit alongside
      // the missing-payment-gate issue above; both are financial-integrity
      // bugs in the same handler, fixed together.
      const totalPrice = pkg.wholesalePrice * count
      await tx.distributor.update({
        where: { id: dist.id },
        data: {
          totalLicensesPurchased: { increment: count },
          totalPaidToPlatform: { increment: totalPrice },
        },
      })
      await tx.licensePackage.update({
        where: { id: pkg.id },
        data: {
          totalSold: { increment: count },
          totalRevenue: { increment: totalPrice },
        },
      })

      await tx.distributorAuditLog.create({
        data: {
          distributorId: dist.id,
          action: 'license_issued',
          entityType: 'license_package',
          entityId: pkg.id,
          description: `Issued ${count} license keys for package ${pkg.sku}`,
          actorType: superAdmin ? 'platform_admin' : 'distributor_user',
          actorId: user.id,
          actorName: user.email,
        },
      })
    })

    return NextResponse.json({ issued: count }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

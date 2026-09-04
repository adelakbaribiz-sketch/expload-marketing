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
    // Issue licenses: distributor buys a package, generate N license keys
    const body = await req.json()
    const superAdmin = await isSuperAdmin()

    // Verify distributor ownership
    const dist = await db.distributor.findUnique({ where: { id: body.distributorId } })
    if (!dist) return NextResponse.json({ error: 'distributor_not_found' }, { status: 404 })
    if (!superAdmin && dist.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

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

      await tx.distributor.update({
        where: { id: dist.id },
        data: {
          totalLicensesPurchased: { increment: count },
          totalPaidToPlatform: { increment: pkg.wholesalePrice },
        },
      })
      await tx.licensePackage.update({
        where: { id: pkg.id },
        data: {
          totalSold: { increment: count },
          totalRevenue: { increment: pkg.wholesalePrice },
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

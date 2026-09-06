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
  const distributorId = url.searchParams.get('distributorId')

  let distId = distributorId
  if (!superAdmin) {
    const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
    if (!dist) return NextResponse.json({ error: 'not_a_distributor' }, { status: 403 })
    distId = dist.id
  } else if (!distId) {
    return NextResponse.json({ error: 'missing_distributorId' }, { status: 400 })
  }

  // Aggregate financial summary
  const [distributor, allocations, payouts, cryptoPayments] = await Promise.all([
    db.distributor.findUnique({ where: { id: distId } }),
    db.licenseAllocation.findMany({ where: { distributorId: distId }, orderBy: { createdAt: 'desc' }, take: 500 }),
    db.distributorPayout.findMany({ where: { distributorId: distId }, orderBy: { createdAt: 'desc' }, take: 500 }),
    db.cryptoPayment.findMany({ where: { distributorId: distId }, orderBy: { createdAt: 'desc' }, take: 500 }),
  ])

  const activeLicenses = allocations.filter(a => a.status === 'activated' || a.status === 'allocated').length
  const expiredLicenses = allocations.filter(a => a.status === 'expired').length
  const revokedLicenses = allocations.filter(a => a.status === 'revoked').length
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.distributorShare, 0)
  const paidPayouts = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.distributorShare, 0)
  const cryptoRevenue = cryptoPayments.filter(c => c.status === 'completed').reduce((s, c) => s + c.amount, 0)

  return NextResponse.json({
    distributor,
    summary: {
      totalRevenue: distributor?.totalRevenue ?? 0,
      totalPaidToPlatform: distributor?.totalPaidToPlatform ?? 0,
      netEarnings: (distributor?.totalRevenue ?? 0) - (distributor?.totalPaidToPlatform ?? 0),
      commissionEarned: distributor?.totalCommissionEarned ?? 0,
      pendingPayouts,
      paidPayouts,
      cryptoRevenue,
      activeLicenses,
      expiredLicenses,
      revokedLicenses,
      utilizationRate: distributor?.totalLicensesPurchased
        ? activeLicenses / distributor.totalLicensesPurchased
        : 0,
    },
    recentPayouts: payouts.slice(0, 10),
    recentCryptoPayments: cryptoPayments.slice(0, 10),
  })
}

export const GET = withProtection(handler, { rateLimit: 'read' })

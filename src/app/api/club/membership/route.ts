import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

export async function GET() {
  const tenantId = await requireTenantId()

  let membership = await db.clubMembership.findUnique({
    where: { tenantId },
    include: {
      tier: true,
      pointsHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
      advertisements: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  // Auto-create membership if doesn't exist
  if (!membership) {
    const bronzeTier = await db.clubTier.findFirst({ where: { level: 1 } })
    if (!bronzeTier) {
      // Create default tiers if they don't exist
      await createDefaultTiers()
      const bronze = await db.clubTier.findFirst({ where: { level: 1 } })
      if (bronze) {
        membership = await db.clubMembership.create({
          data: {
            tenantId,
            tierId: bronze.id,
            availablePoints: 100, // signup bonus
            totalPoints: 100,
            lifetimePoints: 100,
          },
          include: { tier: true, pointsHistory: true, advertisements: true },
        })
        await db.clubPoint.create({
          data: {
            membershipId: membership.id,
            points: 100,
            reason: 'signup_bonus',
            description: 'Welcome bonus for joining the club',
          },
        })
      }
    } else {
      membership = await db.clubMembership.create({
        data: {
          tenantId,
          tierId: bronzeTier.id,
          availablePoints: 100,
          totalPoints: 100,
          lifetimePoints: 100,
        },
        include: { tier: true, pointsHistory: true, advertisements: true },
      })
      await db.clubPoint.create({
        data: {
          membershipId: membership.id,
          points: 100,
          reason: 'signup_bonus',
          description: 'Welcome bonus for joining the club',
        },
      })
    }
  }

  // Check for tier upgrade
  if (membership) {
    const allTiers = await db.clubTier.findMany({ where: { isActive: true }, orderBy: { level: 'asc' } })
    for (const tier of allTiers.reverse()) {
      if (membership.totalSpend >= tier.minSpend && membership.monthsActive >= tier.minMonths && tier.level > membership.tier.level) {
        membership = await db.clubMembership.update({
          where: { id: membership.id },
          data: { tierId: tier.id, lastTierUp: new Date() },
          include: { tier: true, pointsHistory: { orderBy: { createdAt: 'desc' }, take: 20 }, advertisements: { orderBy: { createdAt: 'desc' }, take: 10 } },
        })
        break
      }
    }
  }

  // Get available rewards
  const rewards = await db.clubReward.findMany({
    where: { isActive: true, minTierLevel: { lte: membership?.tier.level ?? 1 } },
  })

  return NextResponse.json({ membership, rewards })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))

  // Earn points (e.g., after purchase)
  if (body.action === 'earn_points') {
    let membership = await db.clubMembership.findUnique({ where: { tenantId } })
    if (!membership) return NextResponse.json({ error: 'No membership' }, { status: 404 })

    const points = Number(body.points || 0)
    membership = await db.clubMembership.update({
      where: { id: membership.id },
      data: {
        totalPoints: { increment: points },
        availablePoints: { increment: points },
        lifetimePoints: { increment: points },
        totalSpend: { increment: Number(body.spendAmount || 0) },
      },
    })
    await db.clubPoint.create({
      data: {
        membershipId: membership.id,
        points,
        reason: body.reason || 'purchase',
        description: body.description || 'Points earned',
        entityType: body.entityType || null,
        entityId: body.entityId || null,
      },
    })
    return NextResponse.json({ membership, pointsEarned: points })
  }

  // Create advertisement (uses ad credits)
  if (body.action === 'create_ad') {
    let membership = await db.clubMembership.findUnique({ where: { tenantId } })
    if (!membership) return NextResponse.json({ error: 'No membership' }, { status: 404 })
    if (membership.adCreditsBalance < 1) {
      return NextResponse.json({ error: 'Insufficient ad credits. Earn more by upgrading your tier.' }, { status: 400 })
    }

    const ad = await db.clubAdvertisement.create({
      data: {
        membershipId: membership.id,
        tenantId,
        title: String(body.title || '').slice(0, 200),
        description: String(body.description || '').slice(0, 1000),
        imageUrl: body.imageUrl || null,
        targetUrl: body.targetUrl || '',
        placement: body.placement || 'dashboard_sidebar',
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: 'pending',
        creditsUsed: 1,
      },
    })

    await db.clubMembership.update({
      where: { id: membership.id },
      data: {
        adCreditsBalance: { decrement: 1 },
        adCreditsUsed: { increment: 1 },
      },
    })

    return NextResponse.json({ ad }, { status: 201 })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

/** Create default club tiers. */
async function createDefaultTiers() {
  const tiers = [
    { name: 'Bronze', level: 1, minSpend: 0, minMonths: 0, discountPct: 0, freeAdCredits: 1, apiCallBonus: 0, prioritySupport: false, earlyAccess: false, color: '#CD7F32', icon: '🥉', description: 'Welcome to the club! Basic benefits.' },
    { name: 'Silver', level: 2, minSpend: 500, minMonths: 3, discountPct: 10, freeAdCredits: 3, apiCallBonus: 500, prioritySupport: false, earlyAccess: false, color: '#C0C0C0', icon: '🥈', description: '10% discount on all services + 3 free ad credits/month.' },
    { name: 'Gold', level: 3, minSpend: 2000, minMonths: 6, discountPct: 20, freeAdCredits: 10, apiCallBonus: 2000, prioritySupport: true, earlyAccess: true, color: '#FFD700', icon: '🥇', description: '20% discount + priority support + early access to features.' },
    { name: 'Platinum', level: 4, minSpend: 5000, minMonths: 12, discountPct: 30, freeAdCredits: 25, apiCallBonus: 5000, prioritySupport: true, earlyAccess: true, color: '#E5E4E2', icon: '💎', description: 'Maximum benefits: 30% discount, unlimited priority support, exclusive features.' },
  ]

  for (const tier of tiers) {
    await db.clubTier.create({ data: tier })
  }

  // Create default rewards
  const rewards = [
    { name: '5% Discount Coupon', description: 'Get 5% off your next month', pointsCost: 200, type: 'discount', value: 5, minTierLevel: 1, icon: '🏷️' },
    { name: '10 Free Ad Credits', description: 'Get 10 additional ad credits', pointsCost: 500, type: 'ad_credits', value: 10, minTierLevel: 1, icon: '📢' },
    { name: '1,000 API Call Credits', description: 'Get 1,000 bonus API calls', pointsCost: 300, type: 'api_credits', value: 1000, minTierLevel: 2, icon: '🔑' },
    { name: 'Free Month', description: 'Get one month of your plan for free', pointsCost: 2000, type: 'free_month', value: 1, minTierLevel: 3, icon: '🎁' },
    { name: '20% Discount Coupon', description: 'Get 20% off your next 3 months', pointsCost: 1500, type: 'discount', value: 20, minTierLevel: 3, icon: '💰' },
  ]

  for (const reward of rewards) {
    await db.clubReward.create({ data: reward })
  }
}

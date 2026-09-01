import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const tenantId = await requireTenantId()

  const membership = await db.clubMembership.findUnique({ where: { tenantId }, include: { tier: true } })
  if (!membership) return NextResponse.json({ error: 'No membership' }, { status: 404 })

  const reward = await db.clubReward.findUnique({ where: { id } })
  if (!reward || !reward.isActive) return NextResponse.json({ error: 'Reward not found' }, { status: 404 })

  if (membership.tier.level < reward.minTierLevel) {
    return NextResponse.json({ error: `Requires ${reward.minTierLevel >= 4 ? 'Platinum' : reward.minTierLevel === 3 ? 'Gold' : reward.minTierLevel === 2 ? 'Silver' : 'Bronze'} tier` }, { status: 403 })
  }

  if (membership.availablePoints < reward.pointsCost) {
    return NextResponse.json({ error: `Insufficient points. Need ${reward.pointsCost}, have ${membership.availablePoints}` }, { status: 400 })
  }

  // Deduct points
  const updated = await db.clubMembership.update({
    where: { id: membership.id },
    data: { availablePoints: { decrement: reward.pointsCost } },
  })

  // Record point transaction
  await db.clubPoint.create({
    data: {
      membershipId: membership.id,
      points: -reward.pointsCost,
      reason: 'reward_redemption',
      description: `Redeemed: ${reward.name}`,
      entityType: 'reward',
      entityId: reward.id,
    },
  })

  // Update reward stats
  await db.clubReward.update({
    where: { id: reward.id },
    data: { redeemedCount: { increment: 1 } },
  })

  // Apply reward effect
  let effect = ''
  if (reward.type === 'ad_credits') {
    await db.clubMembership.update({
      where: { id: membership.id },
      data: { adCreditsBalance: { increment: reward.value } },
    })
    effect = `${reward.value} ad credits added to your account`
  } else if (reward.type === 'discount') {
    effect = `${reward.value}% discount coupon activated for your next billing cycle`
  } else if (reward.type === 'free_month') {
    effect = 'One free month activated — your next billing cycle is free'
  } else if (reward.type === 'api_credits') {
    effect = `${reward.value.toLocaleString()} bonus API calls added`
  }

  return NextResponse.json({ success: true, reward, effect, remainingPoints: updated.availablePoints })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

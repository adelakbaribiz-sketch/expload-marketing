import { db } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'

export interface RedeemRewardResult {
  reward: NonNullable<Awaited<ReturnType<typeof db.clubReward.findUnique>>>
  effect: string
  remainingPoints: number
}

/**
 * Redeem a club reward for a tenant's membership, atomically. Extracted out
 * of the route handler so the concurrency-safe redemption logic (the `gte`
 * guard closing the check-then-act race between the points-balance read and
 * the decrement) is unit/integration-testable without a Next.js request
 * context. See BACKEND-ARCHITECTURE.md "Business Logic placement".
 */
export async function redeemReward(tenantId: string, rewardId: string): Promise<RedeemRewardResult> {
  const membership = await db.clubMembership.findUnique({ where: { tenantId }, include: { tier: true } })
  if (!membership) throw new ApiError(404, 'No membership')

  const reward = await db.clubReward.findUnique({ where: { id: rewardId } })
  if (!reward || !reward.isActive) throw new ApiError(404, 'Reward not found')

  if (membership.tier.level < reward.minTierLevel) {
    const tierName = reward.minTierLevel >= 4 ? 'Platinum' : reward.minTierLevel === 3 ? 'Gold' : reward.minTierLevel === 2 ? 'Silver' : 'Bronze'
    throw new ApiError(403, `Requires ${tierName} tier`)
  }

  if (membership.availablePoints < reward.pointsCost) {
    throw new ApiError(400, `Insufficient points. Need ${reward.pointsCost}, have ${membership.availablePoints}`)
  }

  // The check above and the decrement below are separate reads/writes — two
  // concurrent redemptions could both pass the check and both decrement,
  // taking availablePoints negative. The `gte` guard on the updateMany
  // re-checks the balance atomically at write time: a concurrent redemption
  // that already consumed the points fails `count === 0` here instead of
  // double-spending.
  const { effect, remainingPoints } = await db.$transaction(async (tx) => {
    const decremented = await tx.clubMembership.updateMany({
      where: { id: membership.id, availablePoints: { gte: reward.pointsCost } },
      data: { availablePoints: { decrement: reward.pointsCost } },
    })
    if (decremented.count === 0) {
      throw new ApiError(409, `Insufficient points. Need ${reward.pointsCost}, have ${membership.availablePoints}`)
    }

    await tx.clubPoint.create({
      data: {
        membershipId: membership.id,
        points: -reward.pointsCost,
        reason: 'reward_redemption',
        description: `Redeemed: ${reward.name}`,
        entityType: 'reward',
        entityId: reward.id,
      },
    })

    await tx.clubReward.update({
      where: { id: reward.id },
      data: { redeemedCount: { increment: 1 } },
    })

    // Apply reward effect
    let effect = ''
    if (reward.type === 'ad_credits') {
      await tx.clubMembership.update({
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

    const updated = await tx.clubMembership.findUniqueOrThrow({ where: { id: membership.id } })
    return { effect, remainingPoints: updated.availablePoints }
  })

  return { reward, effect, remainingPoints }
}

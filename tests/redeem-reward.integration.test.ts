import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { db } from '../src/lib/db'
import { redeemReward } from '../src/lib/club/redeem-reward'
import { ApiError } from '../src/lib/api/errors'

/**
 * Integration test against the real dev database for the club-rewards
 * redeem race-condition fix (see BACKEND-ARCHITECTURE.md "Transactions").
 * All rows are created under a disposable tenant/tier/reward and removed in
 * afterAll — nothing here is left behind in the dev DB.
 */
describe('redeemReward', () => {
  let tenantId: string
  let tierId: string
  let membershipId: string
  let rewardId: string

  beforeAll(async () => {
    const tenant = await db.tenant.create({
      data: { name: '__test_redeem_reward_tenant__', domain: `test-redeem-${Date.now()}.local`, plan: 'free' },
    })
    tenantId = tenant.id

    const tier = await db.clubTier.create({
      data: { name: '__test_tier__', level: 1, minSpend: 0, minMonths: 0 },
    })
    tierId = tier.id

    const membership = await db.clubMembership.create({
      data: { tenantId, tierId, availablePoints: 100, totalPoints: 100, lifetimePoints: 100 },
    })
    membershipId = membership.id

    const reward = await db.clubReward.create({
      data: { name: '__test_reward__', description: 'test', pointsCost: 60, type: 'api_credits', value: 100, minTierLevel: 1 },
    })
    rewardId = reward.id
  })

  afterAll(async () => {
    await db.clubPoint.deleteMany({ where: { membershipId } })
    await db.clubReward.delete({ where: { id: rewardId } }).catch(() => {})
    await db.clubMembership.delete({ where: { id: membershipId } }).catch(() => {})
    await db.clubTier.delete({ where: { id: tierId } }).catch(() => {})
    await db.tenant.delete({ where: { id: tenantId } }).catch(() => {})
  })

  test('a single redemption decrements points and records the transaction', async () => {
    const before = await db.clubMembership.findUniqueOrThrow({ where: { id: membershipId } })
    const result = await redeemReward(tenantId, rewardId)
    expect(result.remainingPoints).toBe(before.availablePoints - 60)

    const after = await db.clubMembership.findUniqueOrThrow({ where: { id: membershipId } })
    expect(after.availablePoints).toBe(before.availablePoints - 60)

    const pointRows = await db.clubPoint.findMany({ where: { membershipId, reason: 'reward_redemption' } })
    expect(pointRows.length).toBe(1)
    expect(pointRows[0].points).toBe(-60)
  })

  test('rejects a redemption once the balance is insufficient (no negative balance)', async () => {
    // Balance is now 40 (100 - 60 from the previous test); this reward costs 60.
    await expect(redeemReward(tenantId, rewardId)).rejects.toBeInstanceOf(ApiError)

    const membership = await db.clubMembership.findUniqueOrThrow({ where: { id: membershipId } })
    expect(membership.availablePoints).toBe(40)
    expect(membership.availablePoints).toBeGreaterThanOrEqual(0)
  })

  test('concurrent redemptions that would jointly overdraw the balance: at most one succeeds and the balance never goes negative', async () => {
    // Reset to 100 points so two concurrent 60-point redemptions cannot both succeed.
    await db.clubMembership.update({ where: { id: membershipId }, data: { availablePoints: 100 } })

    const settled = await Promise.allSettled([
      redeemReward(tenantId, rewardId),
      redeemReward(tenantId, rewardId),
    ])

    const fulfilled = settled.filter(r => r.status === 'fulfilled')
    const rejected = settled.filter(r => r.status === 'rejected')
    expect(fulfilled.length).toBe(1)
    expect(rejected.length).toBe(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ApiError)

    const membership = await db.clubMembership.findUniqueOrThrow({ where: { id: membershipId } })
    expect(membership.availablePoints).toBe(40)
    expect(membership.availablePoints).toBeGreaterThanOrEqual(0)
  })
})

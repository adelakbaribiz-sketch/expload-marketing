import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { db } from '../src/lib/db'

/**
 * Regression test for a real, live data-integrity bug found in Phase 18
 * (QA) via `scripts/db-integrity-check.ts`: `Activity.tenantId` had no
 * `@relation` to `Tenant` — unlike ~75 sibling models, and unlike this
 * same row's own `userId`/`leadId` fields — so deleting a tenant (`DELETE
 * /api/tenants/[id]`) left its Activity rows behind with a dangling
 * `tenantId`. 50 such orphaned rows existed in the live dev DB at the
 * time this was found (cleaned up separately; this test only proves the
 * fix, not the cleanup).
 *
 * Real DB, not mocked — same convention as
 * tests/redeem-reward.integration.test.ts: a disposable tenant, deleted
 * in afterAll, nothing left behind either way.
 */

const runId = `__test_activity_cascade_${Date.now()}__`
let tenantId: string

beforeAll(async () => {
  const tenant = await db.tenant.create({
    data: { name: runId, domain: `${runId}.example.com` },
  })
  tenantId = tenant.id
})

afterAll(async () => {
  // If the cascade under test is broken, this cleanup is also the
  // fallback that stops a failed test run from leaving debris behind.
  await db.activity.deleteMany({ where: { tenantId } }).catch(() => {})
  await db.tenant.delete({ where: { id: tenantId } }).catch(() => {})
})

describe('Activity cascade-deletes with its Tenant', () => {
  test('deleting a tenant removes its Activity rows instead of orphaning them', async () => {
    await db.activity.create({
      data: { type: 'created', message: 'test activity', tenantId },
    })
    const before = await db.activity.count({ where: { tenantId } })
    expect(before).toBe(1)

    await db.tenant.delete({ where: { id: tenantId } })

    const after = await db.activity.count({ where: { tenantId } })
    expect(after).toBe(0)
  })
})

/**
 * Regression test for a second, subtler bug found the same way (running
 * scripts/db-integrity-check.ts against real data this phase's own
 * checkWebhookIdempotency() integration check produced): CryptoPayment
 * deliberately survives tenant deletion (`onDelete: SetNull` — it's a
 * financial/audit record, not deleted like Activity above), but its
 * `paymentId` cross-reference to the separately cascade-deleted `Payment`
 * row had no `@relation` at all, so a completed CryptoPayment survived
 * with `tenantId: null` while `paymentId` still pointed at a Payment row
 * that no longer existed — a real dangling reference. Fixed by giving
 * `CryptoPayment.paymentId` its own `@relation(onDelete: SetNull)`.
 */
describe('CryptoPayment.paymentId nulls out instead of dangling when its Payment is cascade-deleted', () => {
  test('deleting the tenant deletes the Payment but preserves CryptoPayment with paymentId nulled', async () => {
    const tenant = await db.tenant.create({
      data: { name: `${runId}_crypto`, domain: `${runId}-crypto.example.com` },
    })
    const payment = await db.payment.create({
      data: { tenantId: tenant.id, amount: 100, type: 'subscription', status: 'completed' },
    })
    const cryptoPayment = await db.cryptoPayment.create({
      data: {
        tenantId: tenant.id, amount: 100, fiatCurrency: 'USD', cryptoCurrency: 'BTC',
        chain: 'bitcoin', gateway: 'nowpayments', status: 'completed', paymentId: payment.id,
      },
    })

    await db.tenant.delete({ where: { id: tenant.id } })

    const survivingPayment = await db.payment.findUnique({ where: { id: payment.id } })
    expect(survivingPayment).toBeNull() // cascade-deleted with the tenant

    const survivingCryptoPayment = await db.cryptoPayment.findUnique({ where: { id: cryptoPayment.id } })
    expect(survivingCryptoPayment).not.toBeNull() // preserved (financial record)
    expect(survivingCryptoPayment?.tenantId).toBeNull() // nulled, not dangling
    expect(survivingCryptoPayment?.paymentId).toBeNull() // nulled, not dangling — this was the bug

    // Cleanup — the CryptoPayment row itself has no cascade path left to
    // clean it up automatically (its tenant is already gone).
    await db.cryptoPayment.delete({ where: { id: cryptoPayment.id } }).catch(() => {})
  })
})

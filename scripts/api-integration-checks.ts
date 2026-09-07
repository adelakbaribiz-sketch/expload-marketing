/**
 * Live API integration checks for critical paths — same shape/conventions
 * as scripts/security-checks.ts and scripts/db-integrity-check.ts (real
 * HTTP calls against a running server, real signup/login/cleanup, proper
 * exit codes so this is CI-gate-capable). Skips gracefully (not fail) if
 * no server is reachable, so it stays usable as a fast local check too.
 *
 * Covers flows with real, previously-live bugs and zero prior automated
 * regression coverage (see QA-AUDIT.md): team invite/accept (a documented
 * past privilege-escalation site), custom-role read-only enforcement (a
 * confirmed-and-fixed bug this same phase), crypto webhook duplicate-
 * delivery idempotency (Phase 04/17), and campaign send via the queue.
 *
 * Also a lightweight "contract" check: this app has no external API
 * consumer (the frontend is the only caller), so full schema-registry-
 * style contract testing would be manufactured, not real. What IS real:
 * a few critical endpoints' response shape silently changing would break
 * the frontend with no compiler error, since API responses aren't typed
 * end-to-end. checkResponseContracts() asserts the exact key sets of the
 * handful of responses most things depend on (auth/me, login).
 */

import crypto from 'node:crypto'
import { db } from '../src/lib/db'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`)
    passed++
  } else {
    console.log(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/health/live`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

interface Session {
  cookie: string
  userId: string
  tenantId: string
  email: string
}

// This script's own signup/login/invite-accept calls all share the same
// 'auth' rate-limit bucket (5/min, src/lib/security/rate-limit.ts) as a
// single real client would — running every check in one process from one
// IP can legitimately exceed it (confirmed live: the 3rd/4th real-account
// cycle in a single run got 429'd). A real client facing that would
// retry after Retry-After, not fail — so does this script, rather than
// asking the rate limiter to be looser just to make automated testing
// convenient.
async function fetchWithRateLimitRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, init)
    if (res.status !== 429) return res
    const retryAfterHeader = res.headers.get('retry-after')
    const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 61_000
    console.log(`  (rate-limited, waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/3)`)
    await new Promise((r) => setTimeout(r, waitMs))
  }
  return fetch(url, init)
}

async function signupAndLogin(label: string): Promise<Session> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  const password = 'test-password-123'
  const domain = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.example.com`

  const signupRes = await fetchWithRateLimitRetry(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: label, email, password, tenantName: label, tenantDomain: domain }),
  })
  const signupBody = await signupRes.json()
  if (signupRes.status !== 201) throw new Error(`signup failed for ${label}: ${JSON.stringify(signupBody)}`)

  const loginRes = await fetchWithRateLimitRetry(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const cookie = loginRes.headers.get('set-cookie')?.split(';')[0]
  if (!cookie) throw new Error(`login failed for ${label}: status ${loginRes.status}`)

  return { cookie, userId: signupBody.user.id, tenantId: signupBody.tenant.id, email }
}

async function cleanupTenant(tenantId: string) {
  // Cascades handle almost everything now (Activity included, per this
  // same phase's fix) — Tenant.delete() alone is sufficient.
  await db.tenant.delete({ where: { id: tenantId } }).catch(() => {})
}

// ---------------------------------------------------------------------------
// 1. Team invite -> accept
// ---------------------------------------------------------------------------

async function checkTeamInvite() {
  const owner = await signupAndLogin('invite-owner')
  try {
    const inviteRes = await fetch(`${BASE_URL}/api/team/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
      body: JSON.stringify({ email: `invitee-${Date.now()}@example.com`, name: 'Invitee', roleName: 'member' }),
    })
    const inviteBody = await inviteRes.json()
    check('team invite: owner can create an invitation', inviteRes.status === 201, JSON.stringify(inviteBody))
    const token = inviteBody.invitation?.token
    if (!token) return

    // A brand-new invitee accepts with a new password.
    const acceptRes = await fetchWithRateLimitRetry(`${BASE_URL}/api/team/invite/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', name: 'Invitee Real Name', password: 'invitee-password-123' }),
    })
    const acceptBody = await acceptRes.json()
    check('team invite: new invitee can accept and lands in the inviter\'s tenant', acceptRes.status === 200 && acceptBody.tenantId === owner.tenantId, JSON.stringify(acceptBody))

    // Re-accepting the same (now-consumed) token must be rejected, not
    // silently re-processed.
    const replayRes = await fetchWithRateLimitRetry(`${BASE_URL}/api/team/invite/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', name: 'Invitee Real Name', password: 'invitee-password-123' }),
    })
    check('team invite: a consumed token cannot be replayed', replayRes.status === 400)
  } finally {
    await cleanupTenant(owner.tenantId)
  }
}

// ---------------------------------------------------------------------------
// 2. Custom role read-only enforcement (fixed this phase — see QA-AUDIT.md)
// ---------------------------------------------------------------------------

async function checkCustomRoleReadOnly() {
  const owner = await signupAndLogin('rbac-owner')
  try {
    // A role with zero granted permissions — the unambiguous "read-only"
    // case (see requireNonViewer()'s own comment).
    const roleRes = await fetch(`${BASE_URL}/api/team/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
      body: JSON.stringify({ name: 'read-only-analyst', displayName: 'Read-Only Analyst' }),
    })
    const roleBody = await roleRes.json()
    const roleId = roleBody.role?.id
    check('rbac: owner can create a custom role', roleRes.status === 201 && !!roleId, JSON.stringify(roleBody))
    if (!roleId) return

    const member = await signupAndLogin('rbac-member')
    try {
      // Move the member into the owner's tenant with the read-only role —
      // directly via the DB (there's no cross-tenant "add existing user"
      // API surface, and that's not what this check is testing).
      await db.user.update({ where: { id: member.userId }, data: { tenantId: owner.tenantId, roleId } })

      const writeRes = await fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: member.cookie },
        body: JSON.stringify({ name: 'Should Not Be Created' }),
      })
      check(
        'rbac: a user with a zero-permission custom role cannot write leads',
        writeRes.status === 403,
        `got ${writeRes.status}: ${JSON.stringify(await writeRes.json().catch(() => null))}`,
      )
    } finally {
      // member.tenantId was reassigned above — clean up via the current DB state.
      await db.user.deleteMany({ where: { id: member.userId } })
      await cleanupTenant(member.tenantId).catch(() => {})
    }
  } finally {
    await cleanupTenant(owner.tenantId)
  }
}

// ---------------------------------------------------------------------------
// 3. Crypto webhook duplicate-delivery idempotency (Phase 04/17 fix)
// ---------------------------------------------------------------------------

async function checkWebhookIdempotency() {
  const webhookSecret = process.env.NOWPAYMENTS_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.log('[SKIPPED] webhook idempotency check — NOWPAYMENTS_WEBHOOK_SECRET not set')
    return
  }

  const tenant = await db.tenant.create({
    data: { name: 'webhook-idem-test', domain: `webhook-idem-${Date.now()}.example.com` },
  })
  const gatewayPaymentId = `ci-test-${Date.now()}`
  await db.cryptoPayment.create({
    data: {
      tenantId: tenant.id, amount: 50, fiatCurrency: 'USD', cryptoCurrency: 'BTC',
      chain: 'bitcoin', gateway: 'nowpayments', gatewayPaymentId, status: 'pending',
    },
  })

  function sign(payload: string) {
    return crypto.createHmac('sha512', webhookSecret!).update(payload).digest('hex')
  }
  async function send(payload: string) {
    return fetch(`${BASE_URL}/api/webhooks/crypto/nowpayments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-nowpayments-sig': sign(payload) },
      body: payload,
    })
  }

  try {
    await send(JSON.stringify({ id: gatewayPaymentId, payment_status: 'confirming' }))
    const finished = JSON.stringify({ id: gatewayPaymentId, payment_status: 'finished', actually_paid: 50 })
    await send(finished)
    await send(finished) // duplicate delivery #1
    await send(finished) // duplicate delivery #2

    const payments = await db.payment.findMany({ where: { tenantId: tenant.id } })
    check('webhook: 3 duplicate "finished" deliveries create exactly one Payment row', payments.length === 1, `found ${payments.length}`)
  } finally {
    await cleanupTenant(tenant.id)
  }
}

// ---------------------------------------------------------------------------
// 4. Campaign send via queue
// ---------------------------------------------------------------------------

async function checkCampaignSend() {
  const owner = await signupAndLogin('campaign-owner')
  try {
    const campaignRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
      body: JSON.stringify({ name: 'CI Test Campaign', subject: 'Hi', body: 'Hello' }),
    })
    const campaignBody = await campaignRes.json()
    const campaignId = campaignBody.campaign?.id
    check('campaign send: campaign can be created', campaignRes.status === 201 && !!campaignId, JSON.stringify(campaignBody))
    if (!campaignId) return

    const sendRes = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/send`, {
      method: 'POST',
      headers: { Cookie: owner.cookie },
    })
    const sendBody = await sendRes.json().catch(() => null)
    if (process.env.REDIS_URL) {
      // REDIS_URL configured — either a real reachable Redis (expect
      // success) or, as in this project's own dev environment, one
      // that's unreachable (expect the Phase 17 graceful-degradation
      // 503, not a raw 500). Either is a legitimately correct outcome
      // depending on real Redis reachability, which this script doesn't
      // control — so accept both, but reject a raw crash.
      check(
        'campaign send: either succeeds or degrades gracefully (never a raw 500) when REDIS_URL is configured',
        sendRes.status === 200 || (sendRes.status === 503 && sendBody?.error === 'queue_unavailable'),
        `got ${sendRes.status}: ${JSON.stringify(sendBody)}`,
      )
    } else {
      // No REDIS_URL — enqueue() uses the in-memory adapter and must succeed.
      check('campaign send: succeeds via the in-memory queue when REDIS_URL is unset', sendRes.status === 200, `got ${sendRes.status}: ${JSON.stringify(sendBody)}`)
    }
  } finally {
    await cleanupTenant(owner.tenantId)
  }
}

// ---------------------------------------------------------------------------
// 5. Payment-integrity gates (Phase 20 production-readiness audit) — a
// real, free-signup-reachable revenue-fraud hole this phase found and
// fixed: POST /api/support-plans/subscriptions used to activate
// immediately with no payment collected anywhere, and POST
// /api/distributors/licenses let any distributor-tenant member mint free
// license inventory. Both now require a SuperAdmin to manually confirm
// payment before anything real happens. See DEVOPS-DEPLOYMENT.md/
// PRODUCTION-READINESS.md for the full writeup.
// ---------------------------------------------------------------------------

async function makeSuperAdmin(userId: string) {
  await db.superAdmin.create({ data: { userId, level: 1, assignedBy: 'api-integration-checks' } })
}

async function checkSupportSubscriptionPaymentGate() {
  const owner = await signupAndLogin('subplan-owner')
  try {
    const plan = await db.supportPlan.create({
      data: {
        name: 'CI Test Plan', description: 'test', monthlyPrice: 99, features: '[]',
        responseTimeHours: 24, channels: '["email"]',
      },
    })
    try {
      const subRes = await fetch(`${BASE_URL}/api/support-plans/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
        body: JSON.stringify({ planId: plan.id, billingCycle: 'monthly' }),
      })
      const subBody = await subRes.json()
      const subId = subBody.subscription?.id
      check(
        'payment gate: a new support subscription starts pending_payment, not active',
        subRes.status === 201 && subBody.subscription?.status === 'pending_payment',
        JSON.stringify(subBody),
      )
      if (!subId) return

      const planAfterCreate = await db.supportPlan.findUnique({ where: { id: plan.id } })
      check(
        'payment gate: creating a pending subscription does not increment plan revenue',
        planAfterCreate?.monthlyRevenue === 0 && planAfterCreate?.totalSubscribers === 0,
        JSON.stringify(planAfterCreate),
      )

      const confirmAsOwnerRes = await fetch(`${BASE_URL}/api/support-plans/subscriptions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
        body: JSON.stringify({ id: subId, action: 'confirm_payment' }),
      })
      check(
        'payment gate: a non-SuperAdmin cannot confirm their own subscription payment',
        confirmAsOwnerRes.status === 403,
        `got ${confirmAsOwnerRes.status}`,
      )

      await makeSuperAdmin(owner.userId)
      const confirmAsAdminRes = await fetch(`${BASE_URL}/api/support-plans/subscriptions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
        body: JSON.stringify({ id: subId, action: 'confirm_payment' }),
      })
      const confirmBody = await confirmAsAdminRes.json()
      check(
        'payment gate: a SuperAdmin can confirm payment, activating the subscription',
        confirmAsAdminRes.status === 200 && confirmBody.subscription?.status === 'active',
        JSON.stringify(confirmBody),
      )

      const planAfterConfirm = await db.supportPlan.findUnique({ where: { id: plan.id } })
      check(
        'payment gate: confirming payment correctly records the revenue exactly once',
        planAfterConfirm?.monthlyRevenue === 99 && planAfterConfirm?.totalSubscribers === 1,
        JSON.stringify(planAfterConfirm),
      )
    } finally {
      await db.supportSubscription.deleteMany({ where: { planId: plan.id } })
      await db.supportPlan.delete({ where: { id: plan.id } }).catch(() => {})
    }
  } finally {
    await db.superAdmin.deleteMany({ where: { userId: owner.userId } })
    await cleanupTenant(owner.tenantId)
  }
}

async function checkLicenseIssuancePaymentGate() {
  const owner = await signupAndLogin('license-owner')
  try {
    const distributor = await db.distributor.create({
      data: {
        tenantId: owner.tenantId, companyName: 'CI Test Distributor', country: 'US',
        contactName: 'CI Test', contactEmail: owner.email,
      },
    })
    const pkg = await db.licensePackage.create({
      data: {
        sku: `CI-TEST-${Date.now()}`, name: 'CI Test Package', licenseCount: 10,
        wholesalePrice: 5, retailPriceSuggestion: 10,
      },
    })
    try {
      const issueAsOwnerRes = await fetch(`${BASE_URL}/api/distributors/licenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
        body: JSON.stringify({ distributorId: distributor.id, packageId: pkg.id, count: 50 }),
      })
      check(
        'payment gate: a non-SuperAdmin distributor-tenant member cannot self-issue licenses',
        issueAsOwnerRes.status === 403,
        `got ${issueAsOwnerRes.status}`,
      )

      await makeSuperAdmin(owner.userId)
      const issueAsAdminRes = await fetch(`${BASE_URL}/api/distributors/licenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
        body: JSON.stringify({ distributorId: distributor.id, packageId: pkg.id, count: 50 }),
      })
      const issueBody = await issueAsAdminRes.json()
      check(
        'payment gate: a SuperAdmin can issue licenses',
        issueAsAdminRes.status === 201 && issueBody.issued === 50,
        JSON.stringify(issueBody),
      )

      const distAfter = await db.distributor.findUnique({ where: { id: distributor.id } })
      check(
        'payment gate: issuing 50 licenses at $5 each records $250 in revenue, not $5 (the pre-fix accounting bug)',
        distAfter?.totalPaidToPlatform === 250 && distAfter?.totalLicensesPurchased === 50,
        JSON.stringify(distAfter),
      )
    } finally {
      await db.licenseAllocation.deleteMany({ where: { packageId: pkg.id } })
      await db.licensePackage.delete({ where: { id: pkg.id } }).catch(() => {})
      await db.distributor.delete({ where: { id: distributor.id } }).catch(() => {})
    }
  } finally {
    await db.superAdmin.deleteMany({ where: { userId: owner.userId } })
    await cleanupTenant(owner.tenantId)
  }
}

async function checkTenantDeletionPurgesPii() {
  const owner = await signupAndLogin('pii-purge-owner')
  const auditLog = await db.auditLogEntry.create({
    data: {
      tenantId: owner.tenantId, action: 'test.action', entityType: 'test', description: 'CI test entry',
      userName: 'Real Person Name', ipAddress: '203.0.113.5', userAgent: 'CI-Test-Agent/1.0', entityName: 'Some Real Entity',
    },
  })
  const pricingCalc = await db.pricingCalculation.create({
    data: {
      tenantId: owner.tenantId, monthlyBudget: 1000, productPrice: 50, reviewCount: 10, reviewPlatforms: 2,
      funnelLeads: 100, funnelQualified: 20, funnelDeals: 5,
      customerName: 'Real Customer Name', customerEmail: 'realcustomer@example.com',
    },
  })
  await makeSuperAdmin(owner.userId)
  try {
    const deleteRes = await fetch(`${BASE_URL}/api/tenants/${owner.tenantId}`, { method: 'DELETE', headers: { Cookie: owner.cookie } })
    check('PII purge: SuperAdmin can delete a tenant', deleteRes.status === 200, `got ${deleteRes.status}`)

    const auditAfter = await db.auditLogEntry.findUnique({ where: { id: auditLog.id } })
    check(
      'PII purge: AuditLogEntry survives tenant deletion but its PII fields are cleared',
      auditAfter !== null && auditAfter.userName === null && auditAfter.ipAddress === null && auditAfter.userAgent === null && auditAfter.entityName === null,
      JSON.stringify(auditAfter),
    )

    const pricingAfter = await db.pricingCalculation.findUnique({ where: { id: pricingCalc.id } })
    check(
      'PII purge: PricingCalculation survives tenant deletion but customer name/email are cleared',
      pricingAfter !== null && pricingAfter.customerName === null && pricingAfter.customerEmail === null,
      JSON.stringify(pricingAfter),
    )
  } finally {
    await db.auditLogEntry.deleteMany({ where: { id: auditLog.id } })
    await db.pricingCalculation.deleteMany({ where: { id: pricingCalc.id } })
    await db.superAdmin.deleteMany({ where: { userId: owner.userId } })
    // The tenant itself should already be gone via the DELETE call above —
    // this is just a safety net if that assertion failed partway through.
    await cleanupTenant(owner.tenantId)
  }
}

// ---------------------------------------------------------------------------
// 6. Response-shape contract checks
// ---------------------------------------------------------------------------

function hasExactKeys(obj: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(obj).sort()
  return JSON.stringify(actual) === JSON.stringify([...expected].sort())
}

async function checkResponseContracts() {
  const session = await signupAndLogin('contract')
  try {
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: session.cookie } })
    const meBody = await meRes.json()
    check(
      'contract: GET /api/auth/me returns exactly the expected user shape',
      meBody.user && hasExactKeys(meBody.user, ['id', 'email', 'name', 'role', 'roleId', 'tenantId', 'isSuperAdmin', 'internalPlatformRole']),
      JSON.stringify(meBody),
    )

    const loginRes = await fetchWithRateLimitRetry(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: session.email, password: 'test-password-123' }),
    })
    const loginBody = await loginRes.json()
    check(
      'contract: POST /api/auth/login returns exactly the expected user shape',
      loginBody.user && hasExactKeys(loginBody.user, ['id', 'email', 'name', 'role', 'roleId', 'tenantId', 'isSuperAdmin', 'internalPlatformRole']),
      JSON.stringify(loginBody),
    )
  } finally {
    await cleanupTenant(session.tenantId)
  }
}

async function main() {
  const up = await isServerUp()
  if (!up) {
    console.log(`[SKIPPED] No server reachable at ${BASE_URL} — run against a live server (dev or CI) to exercise these checks.`)
    process.exit(0)
  }

  await checkTeamInvite()
  await checkCustomRoleReadOnly()
  await checkWebhookIdempotency()
  await checkCampaignSend()
  await checkSupportSubscriptionPaymentGate()
  await checkLicenseIssuancePaymentGate()
  await checkTenantDeletionPurgesPii()
  await checkResponseContracts()

  console.log(`\n${passed + failed} checks run, ${failed} failed.`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('API integration checks crashed:', err)
  process.exit(1)
})

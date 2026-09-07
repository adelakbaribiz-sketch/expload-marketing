import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'
import { getPlanFeatures, PLAN_PRICES } from '@/lib/billing/pricing-engine'

export async function GET() {
  const tenantId = await requireTenantId()
  const sub = await db.subscription.findUnique({ where: { tenantId }, include: { invoices: true } })
  return NextResponse.json({ subscription: sub })
}

async function postHandler(req: NextRequest) {
  // Request a plan change — does NOT grant it. Every plan in this product
  // is paid (there's no free tier — see PLAN_PRICES), and no real payment
  // gateway is wired to this route anywhere in the codebase, so writing
  // the requested plan's real limits (maxLeads/maxUsers/aiCredits/etc.)
  // here let any authenticated tenant member self-upgrade straight to
  // Enterprise ($499/mo) with zero payment collected — the same bug class
  // as the support-plan-subscribe and license-issuance fixes elsewhere in
  // this Phase 20 audit, found by re-checking this route specifically
  // because it's the product's own core paid-plan entitlement, not a
  // secondary feature. `status: 'pending_payment'` is recorded and the
  // request is visible on GET, but the actual maxLeads/maxCampaigns/
  // maxUsers/maxSeoProjects/maxSocialAccounts/maxWorkflows/aiCredits
  // fields are left untouched until a SuperAdmin confirms payment (PATCH
  // action=confirm_payment) — matching the "fail honestly, require a
  // trusted human until a real gateway exists" principle already applied
  // to the non-crypto payment gateways (payment-provider.ts).
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const plan = body.plan || 'starter'
  const billingCycle = body.billingCycle || 'monthly'

  const planPrice = PLAN_PRICES[plan as keyof typeof PLAN_PRICES] ?? PLAN_PRICES.starter
  const amount = billingCycle === 'yearly' ? planPrice * 10 : planPrice // 2 months free on yearly

  const sub = await db.subscription.upsert({
    where: { tenantId },
    create: {
      tenantId, plan, billingCycle, amount,
      status: 'pending_payment',
    },
    update: {
      plan, billingCycle, amount,
      status: 'pending_payment',
    },
  })

  return NextResponse.json({ subscription: sub })
}

async function patchHandler(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body.action !== 'confirm_payment') {
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }
  const superAdmin = await isSuperAdmin()
  if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const tenantId = await requireTenantId()
  const existing = await db.subscription.findUnique({ where: { tenantId } })
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (existing.status !== 'pending_payment') {
    return NextResponse.json({ error: 'not_pending_payment' }, { status: 400 })
  }

  const planConfig = getPlanFeatures(existing.plan)
  const sub = await db.subscription.update({
    where: { tenantId },
    data: {
      status: 'active',
      maxLeads: planConfig.maxLeads, maxCampaigns: planConfig.maxCampaigns,
      maxUsers: planConfig.maxUsers, maxSeoProjects: planConfig.maxSeoProjects,
      maxSocialAccounts: planConfig.maxSocialAccounts, maxWorkflows: planConfig.maxWorkflows,
      aiCredits: planConfig.aiCredits,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (existing.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
    },
  })

  return NextResponse.json({ subscription: sub })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })
export const PATCH = withProtection(patchHandler, { rateLimit: 'write' })

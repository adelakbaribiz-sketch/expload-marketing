import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { getPlanFeatures, PLAN_PRICES } from '@/lib/billing/pricing-engine'

export async function GET() {
  const tenantId = await requireTenantId()
  const sub = await db.subscription.findUnique({ where: { tenantId }, include: { invoices: true } })
  return NextResponse.json({ subscription: sub })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const plan = body.plan || 'starter'
  const billingCycle = body.billingCycle || 'monthly'

  const planConfig = getPlanFeatures(plan)
  const planPrice = PLAN_PRICES[plan as keyof typeof PLAN_PRICES] ?? PLAN_PRICES.starter
  const amount = billingCycle === 'yearly' ? planPrice * 10 : planPrice // 2 months free on yearly

  const sub = await db.subscription.upsert({
    where: { tenantId },
    create: {
      tenantId, plan, billingCycle, amount,
      maxLeads: planConfig.maxLeads, maxCampaigns: planConfig.maxCampaigns,
      maxUsers: planConfig.maxUsers, maxSeoProjects: planConfig.maxSeoProjects,
      maxSocialAccounts: planConfig.maxSocialAccounts, maxWorkflows: planConfig.maxWorkflows,
      aiCredits: planConfig.aiCredits,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
    },
    update: {
      plan, billingCycle, amount,
      maxLeads: planConfig.maxLeads, maxCampaigns: planConfig.maxCampaigns,
      maxUsers: planConfig.maxUsers, maxSeoProjects: planConfig.maxSeoProjects,
      maxSocialAccounts: planConfig.maxSocialAccounts, maxWorkflows: planConfig.maxWorkflows,
      aiCredits: planConfig.aiCredits,
    },
  })

  return NextResponse.json({ subscription: sub })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

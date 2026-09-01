import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

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

  // Plan definitions
  const PLANS: Record<string, any> = {
    starter: { price: 49, maxLeads: 100, maxCampaigns: 5, maxUsers: 3, maxSeoProjects: 1, maxSocialAccounts: 3, maxWorkflows: 2, aiCredits: 100 },
    growth: { price: 199, maxLeads: 1000, maxCampaigns: 50, maxUsers: 10, maxSeoProjects: 5, maxSocialAccounts: 15, maxWorkflows: 20, aiCredits: 1000 },
    enterprise: { price: 499, maxLeads: 10000, maxCampaigns: 999, maxUsers: 999, maxSeoProjects: 50, maxSocialAccounts: 999, maxWorkflows: 999, aiCredits: 10000 },
  }
  const planConfig = PLANS[plan] ?? PLANS.starter
  const amount = billingCycle === 'yearly' ? planConfig.price * 10 : planConfig.price // 2 months free on yearly

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

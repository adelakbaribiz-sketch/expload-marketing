import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withProtection } from '@/lib/security/with-protection'

/**
 * PUBLIC Pricing Calculator endpoint — no authentication required.
 *
 * Allows potential customers to get a plan recommendation before
 * signing up. Saves the calculation anonymously for analytics.
 */
async function handler(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const monthlyBudget = Number(body.monthlyBudget || 0)
  const productPrice = Number(body.productPrice || 0)
  const reviewCount = Number(body.reviewCount || 0)
  const reviewPlatforms = Number(body.reviewPlatforms || 0)
  const funnelLeads = Number(body.funnelLeads || 0)
  const funnelQualified = Number(body.funnelQualified || 0)
  const funnelDeals = Number(body.funnelDeals || 0)

  // --- Plan Recommendation Algorithm ---

  let starterScore = 0
  let growthScore = 0
  let enterpriseScore = 0

  // Budget factor (40% weight)
  if (monthlyBudget <= 200) starterScore += 40
  else if (monthlyBudget <= 1000) growthScore += 40
  else enterpriseScore += 40

  // Review/social presence factor (20% weight)
  const socialScore = reviewCount + (reviewPlatforms * 50)
  if (socialScore <= 100) starterScore += 20
  else if (socialScore <= 500) growthScore += 20
  else enterpriseScore += 20

  // Funnel scale factor (25% weight)
  if (funnelLeads <= 100) starterScore += 25
  else if (funnelLeads <= 1000) growthScore += 25
  else enterpriseScore += 25

  // Product price factor (15% weight)
  if (productPrice <= 50) starterScore += 15
  else if (productPrice <= 500) growthScore += 15
  else enterpriseScore += 15

  // Determine recommended plan
  let recommendedPlan = 'starter'
  let estimatedMonthlyCost = 49
  if (growthScore >= starterScore && growthScore >= enterpriseScore) {
    recommendedPlan = 'growth'
    estimatedMonthlyCost = 199
  }
  if (enterpriseScore >= starterScore && enterpriseScore >= growthScore) {
    recommendedPlan = 'enterprise'
    estimatedMonthlyCost = 499
  }

  // --- ROI Estimation ---
  const leadMultiplier = recommendedPlan === 'enterprise' ? 8 : recommendedPlan === 'growth' ? 4 : 1.5
  const estimatedLeadsPerMonth = Math.round(monthlyBudget * leadMultiplier / 10)
  const qualifiedLeads = Math.round(estimatedLeadsPerMonth * (funnelQualified / 100))
  const estimatedDeals = Math.round(qualifiedLeads * (funnelDeals / 100))
  const estimatedRevenuePerMonth = estimatedDeals * productPrice
  const estimatedROI = estimatedMonthlyCost > 0
    ? Math.round(((estimatedRevenuePerMonth - estimatedMonthlyCost) / estimatedMonthlyCost) * 100)
    : 0

  // Funnel friction analysis
  const frictionPoints: any[] = []
  if (funnelQualified < 30) frictionPoints.push({ stage: 'Lead → Qualified', rate: funnelQualified, severity: 'high', suggestion: 'Improve lead scoring and qualification criteria' })
  if (funnelDeals < 10) frictionPoints.push({ stage: 'Qualified → Deal', rate: funnelDeals, severity: 'high', suggestion: 'Strengthen sales follow-up process and offer demos' })
  if (reviewCount < 10) frictionPoints.push({ stage: 'Social Proof', rate: reviewCount, severity: 'medium', suggestion: 'Encourage satisfied customers to leave reviews' })
  if (reviewPlatforms < 2) frictionPoints.push({ stage: 'Platform Coverage', rate: reviewPlatforms, severity: 'low', suggestion: 'Expand to more review platforms (Google, Yelp, Trustpilot)' })

  // Save calculation (anonymous, no tenantId)
  let calcId: string | null = null
  try {
    const calc = await db.pricingCalculation.create({
      data: {
        monthlyBudget, productPrice, reviewCount, reviewPlatforms,
        funnelLeads, funnelQualified, funnelDeals,
        recommendedPlan, estimatedMonthlyCost,
        estimatedROI,
        estimatedLeadsPerMonth,
        estimatedRevenuePerMonth,
        customerEmail: body.customerEmail || null,
        customerName: body.customerName || null,
      },
    })
    calcId = calc.id
  } catch {
    // DB might not be available in all environments — don't fail the request
  }

  return NextResponse.json({
    calculationId: calcId,
    recommendation: {
      plan: recommendedPlan,
      monthlyCost: estimatedMonthlyCost,
      yearlyCost: estimatedMonthlyCost * 10,
      features: getPlanFeatures(recommendedPlan),
    },
    estimates: {
      leadsPerMonth: estimatedLeadsPerMonth,
      qualifiedLeads,
      deals: estimatedDeals,
      revenue: estimatedRevenuePerMonth,
      roi: estimatedROI,
    },
    funnelAnalysis: {
      leadToQualified: funnelQualified,
      qualifiedToDeal: funnelDeals,
      overallConversion: Math.round((funnelQualified / 100) * (funnelDeals / 100) * 100 * 100) / 100,
      frictionPoints,
    },
    planComparison: [
      { plan: 'starter', price: 49, yearlyPrice: 490, score: starterScore, ...getPlanFeatures('starter') },
      { plan: 'growth', price: 199, yearlyPrice: 1990, score: growthScore, ...getPlanFeatures('growth') },
      { plan: 'enterprise', price: 499, yearlyPrice: 4990, score: enterpriseScore, ...getPlanFeatures('enterprise') },
    ],
  })
}

export const POST = withProtection(handler, { rateLimit: 'public' })

function getPlanFeatures(plan: string) {
  const features: Record<string, any> = {
    starter: { maxLeads: 100, maxCampaigns: 5, maxUsers: 3, maxSeoProjects: 1, maxSocialAccounts: 3, maxWorkflows: 2, aiCredits: 100, label: 'Starter', tagline: 'For solo marketers & small businesses' },
    growth: { maxLeads: 1000, maxCampaigns: 50, maxUsers: 10, maxSeoProjects: 5, maxSocialAccounts: 15, maxWorkflows: 20, aiCredits: 1000, label: 'Growth', tagline: 'For growing teams scaling their marketing' },
    enterprise: { maxLeads: 10000, maxCampaigns: 999, maxUsers: 999, maxSeoProjects: 50, maxSocialAccounts: 999, maxWorkflows: 999, aiCredits: 10000, label: 'Enterprise', tagline: 'For large organizations with full automation' },
  }
  return features[plan] ?? features.starter
}

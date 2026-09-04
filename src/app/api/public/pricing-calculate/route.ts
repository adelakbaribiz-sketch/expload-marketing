import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withProtection } from '@/lib/security/with-protection'
import { calculatePricingRecommendation, getPlanFeatures, PLAN_PRICES, type PricingInputs } from '@/lib/billing/pricing-engine'

/**
 * PUBLIC Pricing Calculator endpoint — no authentication required.
 *
 * Allows potential customers to get a plan recommendation before
 * signing up. Saves the calculation anonymously for analytics.
 */
async function handler(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const inputs: PricingInputs = {
    monthlyBudget: Number(body.monthlyBudget || 0),
    productPrice: Number(body.productPrice || 0),
    reviewCount: Number(body.reviewCount || 0),
    reviewPlatforms: Number(body.reviewPlatforms || 0),
    funnelLeads: Number(body.funnelLeads || 0),
    funnelQualified: Number(body.funnelQualified || 0),
    funnelDeals: Number(body.funnelDeals || 0),
  }

  const result = calculatePricingRecommendation(inputs)

  // Save calculation (anonymous, no tenantId)
  let calcId: string | null = null
  try {
    const calc = await db.pricingCalculation.create({
      data: {
        ...inputs,
        recommendedPlan: result.recommendedPlan,
        estimatedMonthlyCost: result.estimatedMonthlyCost,
        estimatedROI: result.estimates.roi,
        estimatedLeadsPerMonth: result.estimates.leadsPerMonth,
        estimatedRevenuePerMonth: result.estimates.revenue,
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
      plan: result.recommendedPlan,
      monthlyCost: result.estimatedMonthlyCost,
      yearlyCost: result.estimatedMonthlyCost * 10,
      features: getPlanFeatures(result.recommendedPlan),
    },
    estimates: result.estimates,
    funnelAnalysis: {
      leadToQualified: inputs.funnelQualified,
      qualifiedToDeal: inputs.funnelDeals,
      overallConversion: Math.round((inputs.funnelQualified / 100) * (inputs.funnelDeals / 100) * 100 * 100) / 100,
      frictionPoints: result.frictionPoints,
    },
    planComparison: [
      { plan: 'starter', price: PLAN_PRICES.starter, yearlyPrice: PLAN_PRICES.starter * 10, score: result.scores.starter, ...getPlanFeatures('starter') },
      { plan: 'growth', price: PLAN_PRICES.growth, yearlyPrice: PLAN_PRICES.growth * 10, score: result.scores.growth, ...getPlanFeatures('growth') },
      { plan: 'enterprise', price: PLAN_PRICES.enterprise, yearlyPrice: PLAN_PRICES.enterprise * 10, score: result.scores.enterprise, ...getPlanFeatures('enterprise') },
    ],
  })
}

export const POST = withProtection(handler, { rateLimit: 'public' })

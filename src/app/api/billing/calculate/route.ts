import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withProtection } from '@/lib/security/with-protection'
import { calculatePricingRecommendation, getPlanFeatures, PLAN_PRICES, type PricingInputs } from '@/lib/billing/pricing-engine'

/**
 * Smart Pricing Calculator.
 *
 * Recommends a plan based on:
 *   - Monthly marketing budget
 *   - Average product/service price
 *   - Current social media review count + platforms
 *   - Sales funnel friction (leads → qualified → deals)
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

  const calculation = await db.pricingCalculation.create({
    data: {
      ...inputs,
      recommendedPlan: result.recommendedPlan,
      estimatedMonthlyCost: result.estimatedMonthlyCost,
      estimatedROI: result.estimates.roi,
      estimatedLeadsPerMonth: result.estimates.leadsPerMonth,
      estimatedRevenuePerMonth: result.estimates.revenue,
      customerEmail: body.customerEmail || null,
      customerName: body.customerName || null,
      tenantId: body.tenantId || null,
    },
  })

  return NextResponse.json({
    calculation,
    recommendation: {
      plan: result.recommendedPlan,
      monthlyCost: result.estimatedMonthlyCost,
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
      { plan: 'starter', price: PLAN_PRICES.starter, score: result.scores.starter, ...getPlanFeatures('starter') },
      { plan: 'growth', price: PLAN_PRICES.growth, score: result.scores.growth, ...getPlanFeatures('growth') },
      { plan: 'enterprise', price: PLAN_PRICES.enterprise, score: result.scores.enterprise, ...getPlanFeatures('enterprise') },
    ],
  })
}

export const POST = withProtection(handler, { rateLimit: 'read' })

/**
 * Shared plan-recommendation / ROI-estimation engine.
 *
 * Previously reimplemented byte-for-byte in both `billing/calculate` (authed)
 * and `public/pricing-calculate` (anonymous), with a third independent copy
 * of the plan/feature-limits table in `billing/subscription`. All three now
 * import from here so the scoring algorithm and plan definitions can't drift
 * apart between the authenticated and public entry points.
 */

export type PlanId = 'starter' | 'growth' | 'enterprise'

export interface PlanFeatures {
  maxLeads: number
  maxCampaigns: number
  maxUsers: number
  maxSeoProjects: number
  maxSocialAccounts: number
  maxWorkflows: number
  aiCredits: number
  label: string
  tagline: string
}

export const PLAN_PRICES: Record<PlanId, number> = {
  starter: 49,
  growth: 199,
  enterprise: 499,
}

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  starter: {
    maxLeads: 100, maxCampaigns: 5, maxUsers: 3, maxSeoProjects: 1, maxSocialAccounts: 3, maxWorkflows: 2, aiCredits: 100,
    label: 'Starter', tagline: 'For solo marketers & small businesses',
  },
  growth: {
    maxLeads: 1000, maxCampaigns: 50, maxUsers: 10, maxSeoProjects: 5, maxSocialAccounts: 15, maxWorkflows: 20, aiCredits: 1000,
    label: 'Growth', tagline: 'For growing teams scaling their marketing',
  },
  enterprise: {
    maxLeads: 10000, maxCampaigns: 999, maxUsers: 999, maxSeoProjects: 50, maxSocialAccounts: 999, maxWorkflows: 999, aiCredits: 10000,
    label: 'Enterprise', tagline: 'For large organizations with full automation',
  },
}

export function getPlanFeatures(plan: string): PlanFeatures {
  return PLAN_FEATURES[plan as PlanId] ?? PLAN_FEATURES.starter
}

export interface PricingInputs {
  monthlyBudget: number
  productPrice: number
  reviewCount: number
  reviewPlatforms: number
  funnelLeads: number
  /** Percentage, 0-100 */
  funnelQualified: number
  /** Percentage, 0-100 */
  funnelDeals: number
}

export interface FrictionPoint {
  stage: string
  rate: number
  severity: 'high' | 'medium' | 'low'
  suggestion: string
}

export interface PricingResult {
  recommendedPlan: PlanId
  estimatedMonthlyCost: number
  scores: Record<PlanId, number>
  estimates: {
    leadsPerMonth: number
    qualifiedLeads: number
    deals: number
    revenue: number
    roi: number
  }
  frictionPoints: FrictionPoint[]
}

/**
 * Scores each plan against budget / social-proof / funnel-scale / product-price
 * signals, picks the highest-scoring plan, then estimates monthly leads/deals/
 * revenue/ROI for that plan given the funnel's own conversion rates.
 */
export function calculatePricingRecommendation(inputs: PricingInputs): PricingResult {
  const { monthlyBudget, productPrice, reviewCount, reviewPlatforms, funnelLeads, funnelQualified, funnelDeals } = inputs

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

  let recommendedPlan: PlanId = 'starter'
  if (growthScore >= starterScore && growthScore >= enterpriseScore) recommendedPlan = 'growth'
  if (enterpriseScore >= starterScore && enterpriseScore >= growthScore) recommendedPlan = 'enterprise'
  const estimatedMonthlyCost = PLAN_PRICES[recommendedPlan]

  // ROI estimation
  const leadMultiplier = recommendedPlan === 'enterprise' ? 8 : recommendedPlan === 'growth' ? 4 : 1.5
  const estimatedLeadsPerMonth = Math.round(monthlyBudget * leadMultiplier / 10)
  const qualifiedLeads = Math.round(estimatedLeadsPerMonth * (funnelQualified / 100))
  const estimatedDeals = Math.round(qualifiedLeads * (funnelDeals / 100))
  const estimatedRevenuePerMonth = estimatedDeals * productPrice
  const estimatedROI = estimatedMonthlyCost > 0
    ? Math.round(((estimatedRevenuePerMonth - estimatedMonthlyCost) / estimatedMonthlyCost) * 100)
    : 0

  const frictionPoints: FrictionPoint[] = []
  if (funnelQualified < 30) frictionPoints.push({ stage: 'Lead → Qualified', rate: funnelQualified, severity: 'high', suggestion: 'Improve lead scoring and qualification criteria' })
  if (funnelDeals < 10) frictionPoints.push({ stage: 'Qualified → Deal', rate: funnelDeals, severity: 'high', suggestion: 'Strengthen sales follow-up process and offer demos' })
  if (reviewCount < 10) frictionPoints.push({ stage: 'Social Proof', rate: reviewCount, severity: 'medium', suggestion: 'Encourage satisfied customers to leave reviews' })
  if (reviewPlatforms < 2) frictionPoints.push({ stage: 'Platform Coverage', rate: reviewPlatforms, severity: 'low', suggestion: 'Expand to more review platforms (Google, Yelp, Trustpilot)' })

  return {
    recommendedPlan,
    estimatedMonthlyCost,
    scores: { starter: starterScore, growth: growthScore, enterprise: enterpriseScore },
    estimates: {
      leadsPerMonth: estimatedLeadsPerMonth,
      qualifiedLeads,
      deals: estimatedDeals,
      revenue: estimatedRevenuePerMonth,
      roi: estimatedROI,
    },
    frictionPoints,
  }
}

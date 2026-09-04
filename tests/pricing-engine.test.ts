import { describe, expect, test } from 'bun:test'
import { calculatePricingRecommendation, getPlanFeatures, PLAN_PRICES } from '../src/lib/billing/pricing-engine'

describe('calculatePricingRecommendation', () => {
  test('recommends starter for a small budget and small funnel', () => {
    const result = calculatePricingRecommendation({
      monthlyBudget: 100,
      productPrice: 30,
      reviewCount: 5,
      reviewPlatforms: 1,
      funnelLeads: 20,
      funnelQualified: 20,
      funnelDeals: 5,
    })
    expect(result.recommendedPlan).toBe('starter')
    expect(result.estimatedMonthlyCost).toBe(PLAN_PRICES.starter)
  })

  test('recommends enterprise for a large budget, large funnel, and strong social proof', () => {
    const result = calculatePricingRecommendation({
      monthlyBudget: 5000,
      productPrice: 800,
      reviewCount: 600,
      reviewPlatforms: 5,
      funnelLeads: 5000,
      funnelQualified: 50,
      funnelDeals: 20,
    })
    expect(result.recommendedPlan).toBe('enterprise')
    expect(result.estimatedMonthlyCost).toBe(PLAN_PRICES.enterprise)
  })

  test('computes ROI from the estimated revenue and plan cost', () => {
    const result = calculatePricingRecommendation({
      monthlyBudget: 100,
      productPrice: 100,
      reviewCount: 0,
      reviewPlatforms: 0,
      funnelLeads: 10,
      funnelQualified: 100,
      funnelDeals: 100,
    })
    // leadMultiplier for 'starter' is 1.5 => leadsPerMonth = round(100*1.5/10) = 15
    // qualifiedLeads = 15, deals = 15, revenue = 15*100 = 1500
    const expectedRevenue = result.estimates.leadsPerMonth * 100
    expect(result.estimates.revenue).toBe(expectedRevenue)
    const expectedRoi = Math.round(((expectedRevenue - result.estimatedMonthlyCost) / result.estimatedMonthlyCost) * 100)
    expect(result.estimates.roi).toBe(expectedRoi)
  })

  test('flags friction points below the configured thresholds, and omits ones above them', () => {
    const result = calculatePricingRecommendation({
      monthlyBudget: 100,
      productPrice: 50,
      reviewCount: 2,
      reviewPlatforms: 1,
      funnelLeads: 50,
      funnelQualified: 10,
      funnelDeals: 5,
    })
    const stages = result.frictionPoints.map(f => f.stage)
    expect(stages).toContain('Lead → Qualified')
    expect(stages).toContain('Qualified → Deal')
    expect(stages).toContain('Social Proof')

    const clean = calculatePricingRecommendation({
      monthlyBudget: 100,
      productPrice: 50,
      reviewCount: 50,
      reviewPlatforms: 5,
      funnelLeads: 50,
      funnelQualified: 80,
      funnelDeals: 50,
    })
    expect(clean.frictionPoints.length).toBe(0)
  })
})

describe('getPlanFeatures', () => {
  test('returns the matching plan features', () => {
    expect(getPlanFeatures('growth').maxUsers).toBe(10)
    expect(getPlanFeatures('enterprise').label).toBe('Enterprise')
  })

  test('falls back to starter for an unknown plan id', () => {
    expect(getPlanFeatures('nonexistent-plan')).toEqual(getPlanFeatures('starter'))
  })
})

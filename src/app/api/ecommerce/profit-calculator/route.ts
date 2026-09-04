import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

const PLATFORM_FEES: Record<string, { referralPct: number; fbaFee: number }> = {
  amazon: { referralPct: 0.15, fbaFee: 3.5 },
  aliexpress: { referralPct: 0.08, fbaFee: 0 },
  alibaba: { referralPct: 0.05, fbaFee: 0 },
  ebay: { referralPct: 0.10, fbaFee: 0 },
  shopify: { referralPct: 0.02, fbaFee: 0 },
  etsy: { referralPct: 0.065, fbaFee: 0 },
}

async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))

  const productPrice = Number(body.productPrice || 0)
  const productCost = Number(body.productCost || 0)
  const platform = String(body.platform || 'amazon').toLowerCase()
  const monthlyVolume = Number(body.monthlyVolume || 100)
  const shippingCost = Number(body.shippingCost || 2)
  const advertisingCost = Number(body.advertisingCost || 100)
  const otherCosts = Number(body.otherCosts || 50)
  const initialInvestment = Number(body.initialInvestment || 500)
  const competitionLevel = body.competitionLevel ? String(body.competitionLevel) : null

  const feeConfig = PLATFORM_FEES[platform] ?? PLATFORM_FEES.amazon
  const platformFee = Math.round(productPrice * feeConfig.referralPct * 100) / 100
  const fbaFee = feeConfig.fbaFee
  const totalPerUnitCost = productCost + platformFee + fbaFee + shippingCost
  const profitPerUnit = Math.round((productPrice - totalPerUnitCost) * 100) / 100
  const monthlyRevenue = Math.round(productPrice * monthlyVolume * 100) / 100
  const monthlyProfit = Math.round((profitPerUnit * monthlyVolume - advertisingCost - otherCosts) * 100) / 100
  const margin = productPrice > 0 ? Math.round((profitPerUnit / productPrice) * 10000) / 100 : 0
  const roi = productCost > 0 ? Math.round((profitPerUnit / productCost) * 10000) / 100 : 0
  const breakEvenUnits = profitPerUnit > 0 ? Math.ceil(initialInvestment / profitPerUnit) : 0
  const breakEvenMonths = monthlyProfit > 0 ? Math.round((initialInvestment / monthlyProfit) * 10) / 10 : 0

  // Risk assessment
  let riskLevel = 'low'
  let riskScore = 20
  if (margin < 15) { riskLevel = 'high'; riskScore = 70 }
  else if (margin < 25) { riskLevel = 'medium'; riskScore = 45 }
  if (breakEvenMonths > 12) { riskLevel = 'very_high'; riskScore = 85 }

  // Recommendations
  const recommendations: string[] = []
  if (margin < 20) recommendations.push('Margin is below 20% — consider increasing price or reducing sourcing cost')
  if (advertisingCost > monthlyProfit * 0.3) recommendations.push('Advertising cost is high — optimize PPC campaigns')
  if (breakEvenMonths > 6) recommendations.push(`Break-even takes ${breakEvenMonths} months — ensure you have sufficient runway`)
  if (competitionLevel) recommendations.push(`Competition is ${competitionLevel} — differentiate your product`)
  if (recommendations.length === 0) recommendations.push('This looks like a profitable opportunity! Consider proceeding.')

  const estimate = await db.profitEstimate.create({
    data: {
      productPrice, productCost, platform, monthlyVolume,
      platformFee, fbaFee, shippingCost, advertisingCost, otherCosts,
      profitPerUnit, monthlyProfit, monthlyRevenue, margin, roi,
      breakEvenUnits, breakEvenMonths,
      tenantId,
    },
  })

  return NextResponse.json({
    estimate,
    analysis: {
      riskLevel,
      riskScore,
      recommendations,
      summary: monthlyProfit > 0
        ? `Estimated ${monthlyProfit > 0 ? '+' : ''}$${monthlyProfit}/month profit with ${margin}% margin and ${breakEvenMonths}-month break-even`
        : 'This product may not be profitable at current pricing. Adjust your costs or price.',
    },
  })
}

export const POST = withProtection(handler, { rateLimit: 'read' })

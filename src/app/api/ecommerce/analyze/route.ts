import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText } from '@/lib/security/sanitize'

const PLATFORM_FEES: Record<string, { referralPct: number, fbaFee: number }> = {
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
  const platform = sanitizeText(String(body.platform || 'amazon').toLowerCase(), 20)
  const keyword = sanitizeText(String(body.keyword || ''), 200)
  const asin = body.asin ? sanitizeText(String(body.asin), 20) : null

  if (!keyword && !asin) {
    return NextResponse.json({ error: 'keyword or asin is required' }, { status: 400 })
  }

  // Generate realistic product analysis (in production, would use Keepa/JungleScout/Helium10 APIs)
  const feeConfig = PLATFORM_FEES[platform] ?? PLATFORM_FEES.amazon
  const products: any[] = []

  const productNames = keyword
    ? [`${keyword} Pro`, `${keyword} Premium`, `${keyword} Deluxe`, `${keyword} Mini`, `${keyword} Max`, `${keyword} Lite`]
    : [`${platform} Product`, `${platform} Item`, `${platform} Special`]

  for (let i = 0; i < Math.min(productNames.length, 6); i++) {
    const price = Math.round((15 + Math.random() * 85) * 100) / 100
    const costEstimate = Math.round(price * (0.2 + Math.random() * 0.3) * 100) / 100
    const referralFee = Math.round(price * feeConfig.referralPct * 100) / 100
    const fbaFee = feeConfig.fbaFee
    const totalFees = Math.round((referralFee + fbaFee) * 100) / 100
    const profit = Math.round((price - costEstimate - totalFees) * 100) / 100
    const margin = Math.round((profit / price) * 10000) / 100
    const roi = costEstimate > 0 ? Math.round((profit / costEstimate) * 10000) / 100 : 0
    const salesPerMonth = Math.floor(50 + Math.random() * 2000)
    const competition = Math.random()

    const product = await db.ecommerceProduct.create({
      data: {
        platform,
        asin: asin && i === 0 ? asin : null,
        title: productNames[i],
        price,
        currency: 'USD',
        costEstimate,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        reviewCount: Math.floor(10 + Math.random() * 5000),
        salesPerMonth,
        revenuePerMonth: Math.round(salesPerMonth * price),
        bsrRank: platform === 'amazon' ? Math.floor(100 + Math.random() * 100000) : null,
        fbaFee,
        referralFee,
        totalFees,
        estimatedProfit: profit,
        estimatedMargin: margin,
        estimatedROI: roi,
        competitionLevel: competition < 0.25 ? 'low' : competition < 0.5 ? 'medium' : competition < 0.75 ? 'high' : 'very_high',
        sellerCount: Math.floor(1 + Math.random() * 500),
        trendDirection: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)],
        trendScore: Math.floor(30 + Math.random() * 60),
        category: body.category || 'general',
        keywords: keyword ? JSON.stringify([keyword]) : null,
        lastChecked: new Date(),
        tenantId,
      },
    })
    products.push(product)
  }

  return NextResponse.json({ platform, keyword, products, analyzed: products.length })
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

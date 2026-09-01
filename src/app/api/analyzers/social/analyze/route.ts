import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText } from '@/lib/security/sanitize'

const PLATFORM_CONFIG: Record<string, { name: string; maxFollowers: number; color: string }> = {
  youtube: { name: 'YouTube', maxFollowers: 10000000, color: '#ff0000' },
  instagram: { name: 'Instagram', maxFollowers: 5000000, color: '#e4405f' },
  tiktok: { name: 'TikTok', maxFollowers: 8000000, color: '#000000' },
  twitter: { name: 'Twitter / X', maxFollowers: 3000000, color: '#1da1f2' },
  facebook: { name: 'Facebook', maxFollowers: 5000000, color: '#1877f2' },
  linkedin: { name: 'LinkedIn', maxFollowers: 2000000, color: '#0a66c2' },
}

/**
 * Social Media Analyzer endpoint.
 *
 * Analyzes a social media account across multiple metrics: engagement,
 * growth, content quality, authenticity, and competitive positioning.
 * In production, this would use platform APIs (YouTube Data API,
 * Instagram Graph API, etc.). In sandbox, generates realistic analysis.
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const platform = sanitizeText(String(body.platform || '').toLowerCase(), 20)
  const handle = sanitizeText(String(body.handle || '').replace('@', ''), 100)

  if (!platform || !handle) {
    return NextResponse.json({ error: 'platform and handle are required' }, { status: 400 })
  }

  if (!PLATFORM_CONFIG[platform]) {
    return NextResponse.json({ error: `Unsupported platform. Supported: ${Object.keys(PLATFORM_CONFIG).join(', ')}` }, { status: 400 })
  }

  // Check for existing analysis (avoid duplicate)
  const existing = await db.socialAnalysis.findUnique({
    where: { platform_handle_tenantId: { platform, handle, tenantId } },
  })

  if (existing && body.refresh !== true) {
    return NextResponse.json({ analysis: existing, cached: true })
  }

  // Generate realistic analysis
  const config = PLATFORM_CONFIG[platform]
  const followerCount = Math.floor(1000 + Math.random() * config.maxFollowers)
  const followingCount = Math.floor(100 + Math.random() * 5000)
  const postCount = Math.floor(50 + Math.random() * 3000)
  const avgLikes = Math.floor(followerCount * (0.01 + Math.random() * 0.05))
  const avgComments = Math.floor(avgLikes * (0.05 + Math.random() * 0.15))
  const avgShares = Math.floor(avgLikes * (0.02 + Math.random() * 0.1))
  const engagementRate = Number(((avgLikes + avgComments + avgShares) / followerCount * 100).toFixed(2))
  const followerGrowth = Number((Math.random() * 20 - 5).toFixed(2))
  const postingFrequency = Number((1 + Math.random() * 14).toFixed(1))

  const hashtagPool = ['#marketing', '#business', '#growth', '#startup', '#tech', '#AI', '#success', '#entrepreneur', '#digital', '#strategy', '#content', '#branding']
  const topHashtags = Array.from({ length: 5 }, () => hashtagPool[Math.floor(Math.random() * hashtagPool.length)])
  const bestDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][Math.floor(Math.random() * 7)]
  const bestHour = 6 + Math.floor(Math.random() * 16)
  const categories = ['Educational', 'Promotional', 'Behind the scenes', 'User-generated', 'Industry news'].slice(0, 2 + Math.floor(Math.random() * 3))

  const influenceScore = 30 + Math.floor(Math.random() * 65)
  const authenticityScore = 50 + Math.floor(Math.random() * 45) // higher = more real
  const brandFitScore = 40 + Math.floor(Math.random() * 55)
  const competitorRank = 1 + Math.floor(Math.random() * 50)
  const marketShare = Number((Math.random() * 15).toFixed(2))

  const analysisData = {
    platform,
    handle,
    displayName: handle.charAt(0).toUpperCase() + handle.slice(1),
    followerCount,
    followingCount,
    postCount,
    avgLikes,
    avgComments,
    avgShares,
    engagementRate,
    followerGrowth,
    postingFrequency,
    topHashtags: JSON.stringify([...new Set(topHashtags)]),
    bestPostingTime: JSON.stringify({ day: bestDay, hour: bestHour }),
    contentCategories: JSON.stringify(categories),
    influenceScore,
    authenticityScore,
    brandFitScore,
    competitorRank,
    marketShare,
    rawData: JSON.stringify({ analyzedAt: new Date().toISOString(), source: 'simulated' }),
    analysisDate: new Date(),
    tenantId,
  }

  // Upsert: update if exists, create if not
  const analysis = existing
    ? await db.socialAnalysis.update({ where: { id: existing.id }, data: analysisData })
    : await db.socialAnalysis.create({ data: analysisData })

  return NextResponse.json({
    analysis,
    cached: false,
    insights: {
      engagementLevel: engagementRate > 3 ? 'high' : engagementRate > 1 ? 'medium' : 'low',
      growthTrend: followerGrowth > 0 ? 'growing' : 'declining',
      authenticityWarning: authenticityScore < 60 ? 'Potential fake followers detected' : 'Authentic audience',
      recommendedAction: influenceScore > 70 ? 'Partner for influencer campaign' : influenceScore > 40 ? 'Monitor for growth' : 'Low influence — skip',
    },
  })
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

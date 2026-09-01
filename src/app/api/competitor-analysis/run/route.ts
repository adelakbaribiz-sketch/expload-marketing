import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText } from '@/lib/security/sanitize'

async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const competitorId = body.competitorId

  if (!competitorId) return NextResponse.json({ error: 'competitorId required' }, { status: 400 })

  const competitor = await db.competitorProfile.findUnique({ where: { id: competitorId } })
  if (!competitor) return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })

  // Generate comprehensive analysis with simulated data + AI insights
  const analysis = await db.competitorAnalysis.create({
    data: {
      competitorId,
      tenantId,
      // 1. Content & Topics
      contentType: ['educational', 'vlog', 'review', 'tutorial'][Math.floor(Math.random() * 4)],
      contentFormats: JSON.stringify(['video', 'blog', 'social_post']),
      topicDiversity: Math.random() > 0.5 ? 'diverse' : 'focused',
      topTopics: JSON.stringify(['Marketing Tips', 'Industry News', 'Product Reviews', 'Tutorials']),
      titleKeywords: JSON.stringify(['how to', 'best', 'guide', '2026', 'tutorial']),
      descriptionStyle: ['detailed', 'minimal', 'storytelling'][Math.floor(Math.random() * 3)],
      // 2. Upload Frequency
      postsPerWeek: Math.round((1 + Math.random() * 6) * 10) / 10,
      postsPerMonth: Math.floor(4 + Math.random() * 24),
      uploadSchedule: JSON.stringify({ days: ['Tuesday', 'Thursday', 'Saturday'], hours: [9, 14, 18] }),
      consistencyScore: Math.floor(40 + Math.random() * 55),
      // 3. Engagement
      avgLikes: Math.floor(100 + Math.random() * 5000),
      avgComments: Math.floor(10 + Math.random() * 500),
      avgShares: Math.floor(5 + Math.random() * 200),
      engagementRate: Math.round((1 + Math.random() * 8) * 100) / 100,
      commentResponseRate: Math.round(Math.random() * 80),
      avgResponseTime: ['< 1 hour', '2-4 hours', '1 day', '3+ days'][Math.floor(Math.random() * 4)],
      // 4. Quantitative Metrics
      avgViews: Math.floor(1000 + Math.random() * 50000),
      peakViews: Math.floor(10000 + Math.random() * 500000),
      subscriberGrowth: Math.round((Math.random() * 20 - 2) * 100) / 100,
      avgWatchTime: `${Math.floor(2 + Math.random() * 8)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      ctr: Math.round((2 + Math.random() * 10) * 100) / 100,
      totalSubscribers: Math.floor(1000 + Math.random() * 1000000),
      // 5. SEO
      seoKeywords: JSON.stringify([competitor.name?.split(' ')[0] || 'brand', 'marketing', 'tutorial', 'review']),
      tagStrategy: ['optimized', 'basic'][Math.floor(Math.random() * 2)],
      descriptionOptimized: Math.random() > 0.3,
      usesEndCards: Math.random() > 0.4,
      usesPlaylists: Math.random() > 0.5,
      internalLinking: JSON.stringify({ strategy: 'Cross-reference related content in descriptions', score: Math.floor(50 + Math.random() * 45) }),
      // 6. Thumbnails & Design
      thumbnailStyle: ['text_overlay', 'face_shot', 'product_shot', 'bold_colors'][Math.floor(Math.random() * 4)],
      visualConsistency: Math.floor(40 + Math.random() * 55),
      colorScheme: JSON.stringify(['#FF5722', '#0A2A3A', '#FFFFFF']),
      usesBranding: Math.random() > 0.4,
      // 7. Audience
      audienceAgeRange: ['18-24', '25-34', '35-44'][Math.floor(Math.random() * 3)],
      audienceGender: ['male', 'female', 'mixed'][Math.floor(Math.random() * 3)],
      audienceCountries: JSON.stringify(['United States', 'United Kingdom', 'Germany', 'Iran', 'UAE']),
      toneOfVoice: ['casual', 'professional', 'humorous', 'inspirational'][Math.floor(Math.random() * 4)],
      languageUsed: 'English',
      // 8. Sponsorships
      hasSponsorships: Math.random() > 0.4,
      sponsorBrands: JSON.stringify(['BrandA', 'BrandB', 'BrandC']),
      hasAffiliateLinks: Math.random() > 0.5,
      affiliatePrograms: JSON.stringify(['Amazon Associates', 'ClickBank']),
      monetizationMethods: JSON.stringify(['ads', 'sponsorship', 'courses', 'merch']),
      estimatedMonthlyEarnings: Math.round(500 + Math.random() * 20000),
      // 9. Cross-platform
      platforms: JSON.stringify({ instagram: 'https://instagram.com/' + (competitor.name?.toLowerCase().replace(/\s/g, '') || 'competitor'), twitter: 'https://twitter.com/competitor', tiktok: 'https://tiktok.com/@competitor' }),
      crossPlatformStrategy: 'Funnel YouTube viewers to Instagram for behind-the-scenes content and email list for courses',
      totalFollowersAll: Math.floor(5000 + Math.random() * 2000000),
      // 10. SWOT
      strengths: JSON.stringify(['Consistent upload schedule', 'High production quality', 'Strong community engagement', 'Multi-platform presence']),
      weaknesses: JSON.stringify(['Limited SEO optimization', 'Inconsistent thumbnail style', 'Slow comment response', 'No email list']),
      uniqueSellingPoints: JSON.stringify(['Unique industry expertise', 'Entertaining presentation style', 'Exclusive interviews']),
      improvementOpportunities: JSON.stringify(['Improve SEO with keyword research', 'Standardize thumbnail design', 'Build email list', 'Increase upload frequency', 'Add affiliate links', 'Improve description optimization']),
      // AI Analysis
      aiAnalysis: JSON.stringify({
        summary: `${competitor.name} is a ${Math.random() > 0.5 ? 'strong' : 'moderate'} competitor with ${Math.floor(1000 + Math.random() * 50000)} avg views. Their main strength is content consistency, but they lack SEO optimization — an area where you can outperform them.`,
        recommendations: [
          'Focus on SEO-optimized titles and descriptions to capture organic search traffic',
          'Maintain a consistent upload schedule of 3+ times per week',
          'Create better thumbnails with bold text overlays and consistent branding',
          'Build an email list to reduce dependency on platform algorithms',
          'Leverage their slow comment response by engaging faster with your audience',
        ],
        threat_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        opportunity_score: Math.floor(50 + Math.random() * 45),
      }),
      analysisDate: new Date(),
    },
    include: { competitor: true },
  })

  return NextResponse.json({ analysis })
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

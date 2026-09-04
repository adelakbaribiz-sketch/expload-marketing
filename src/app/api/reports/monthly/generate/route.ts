import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { audit } from '@/lib/security/audit'
import { parseJsonResponse } from '@/lib/llm/parse-json'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * Monthly Report Generator.
 *
 * Aggregates all marketing data for the specified month and uses AI
 * to generate a comprehensive, multilingual monthly report.
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const month = body.month || new Date().toISOString().slice(0, 7) // "2026-07"
  const language = body.language || 'en'

  // Gather all data for the month
  const monthStart = new Date(`${month}-01T00:00:00Z`)
  const monthEnd = new Date(monthStart)
  monthEnd.setMonth(monthEnd.getMonth() + 1)

  const [
    leadsCount, dealsCount, wonDeals, campaignsCount, emailsSent,
    contentPieces, seoProjects, adCampaigns, socialPosts,
    backlinksAcquired, aiRecommendations,
  ] = await Promise.all([
    db.lead.count({ where: { tenantId, createdAt: { gte: monthStart, lt: monthEnd } } }),
    db.deal.count({ where: { tenantId, createdAt: { gte: monthStart, lt: monthEnd } } }),
    db.deal.aggregate({ where: { tenantId, stage: 'won', closedAt: { gte: monthStart, lt: monthEnd } }, _sum: { value: true } }),
    db.emailCampaign.count({ where: { tenantId, createdAt: { gte: monthStart, lt: monthEnd } } }),
    db.emailLog.count({ where: { campaign: { tenantId }, sentAt: { gte: monthStart, lt: monthEnd } } }),
    db.contentPiece.count({ where: { tenantId, createdAt: { gte: monthStart, lt: monthEnd } } }),
    db.seoProject.count({ where: { tenantId } }),
    db.adCampaign.count({ where: { tenantId, createdAt: { gte: monthStart, lt: monthEnd } } }),
    db.socialPost.count({ where: { tenantId, createdAt: { gte: monthStart, lt: monthEnd } } }),
    db.backlinkOpportunity.count({ where: { tenantId, status: 'acquired', acquiredAt: { gte: monthStart, lt: monthEnd } } }),
    db.aiRecommendation.count({ where: { tenantId, createdAt: { gte: monthStart, lt: monthEnd } } }),
  ])

  const metrics = {
    leads: leadsCount,
    deals: dealsCount,
    revenue: wonDeals._sum.value || 0,
    campaigns: campaignsCount,
    emailsSent,
    contentPieces,
    seoProjects,
    adCampaigns,
    socialPosts,
    backlinksAcquired,
    aiRecommendations,
  }

  // Generate AI report
  let aiAnalysis: Record<string, any> | null = null
  let executiveSummary = `Monthly report for ${month}. Generated ${leadsCount} leads, ${dealsCount} deals, and $${(wonDeals._sum.value || 0).toLocaleString()} in revenue.`

  try {
    const zai = await ZAI.create()
    const langName = language === 'fa' ? 'Persian' : language === 'ar' ? 'Arabic' : 'English'

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a marketing analyst. Generate a monthly marketing report in ${langName}. Return JSON with: { executiveSummary, achievements: [], challenges: [], recommendations: [], nextMonthPlan: [] }. Be specific and data-driven.`,
        },
        {
          role: 'user',
          content: `Generate a monthly report for ${month} with these metrics:\n${JSON.stringify(metrics, null, 2)}`,
        },
      ],
      temperature: 0.5,
    })

    const content = completion.choices?.[0]?.message?.content ?? ''
    try {
      aiAnalysis = parseJsonResponse<Record<string, any>>(content)
      if (aiAnalysis?.executiveSummary) executiveSummary = String(aiAnalysis.executiveSummary)
    } catch {
      // keep default summary
    }
  } catch (err) {
    console.error('[reports] AI generation failed:', err)
  }

  // Create the report
  const report = await db.monthlyReport.create({
    data: {
      title: `Marketing Report — ${month}`,
      month,
      language,
      executiveSummary,
      achievements: aiAnalysis?.achievements ? JSON.stringify(aiAnalysis.achievements) : JSON.stringify([`Generated ${leadsCount} new leads`, `Closed ${dealsCount} deals`]),
      challenges: aiAnalysis?.challenges ? JSON.stringify(aiAnalysis.challenges) : JSON.stringify(['Need more content output', 'Improve email open rates']),
      metrics: JSON.stringify(metrics),
      recommendations: aiAnalysis?.recommendations ? JSON.stringify(aiAnalysis.recommendations) : JSON.stringify(['Increase lead generation budget', 'Launch retargeting campaign']),
      nextMonthPlan: aiAnalysis?.nextMonthPlan ? JSON.stringify(aiAnalysis.nextMonthPlan) : JSON.stringify(['Generate 50 more leads', 'Publish 10 content pieces']),
      aiAnalysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
      status: 'generated',
      tenantId,
    },
  })

  await audit({
    type: 'created',
    message: `Monthly report generated for ${month}`,
    tenantId,
  })

  return NextResponse.json({ report, metrics, aiAnalysis })
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

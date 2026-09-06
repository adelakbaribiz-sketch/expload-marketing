import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { audit } from '@/lib/security/audit'
import { parseJsonResponse } from '@/lib/llm/parse-json'
import { llmAggregator } from '@/lib/llm/aggregator'

/**
 * Business Diagnostics endpoint.
 *
 * Runs a comprehensive diagnostic of the tenant's business across
 * marketing, sales, digital presence, customer satisfaction, and
 * operations. Uses AI to detect issues and opportunities.
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const businessName = body.businessName || 'Your Business'
  const website = body.website
  const industry = body.industry

  // Gather tenant data for diagnosis
  const [
    leadsCount, dealsCount, wonRevenue, campaignsCount, emailsSent,
    contentPieces, seoProjects, seoIssues, socialAccounts, adCampaigns,
    backlinksAcquired, totalBacklinks, aiRecs,
  ] = await Promise.all([
    db.lead.count({ where: { tenantId } }),
    db.deal.count({ where: { tenantId } }),
    db.deal.aggregate({ where: { tenantId, stage: 'won' }, _sum: { value: true } }),
    db.emailCampaign.count({ where: { tenantId } }),
    db.emailLog.count({ where: { campaign: { tenantId } } }),
    db.contentPiece.count({ where: { tenantId } }),
    db.seoProject.count({ where: { tenantId } }),
    db.seoIssue.count({ where: { seoProject: { tenantId }, resolved: false } }),
    db.socialAccount.count({ where: { tenantId } }),
    db.adCampaign.count({ where: { tenantId } }),
    db.backlinkOpportunity.count({ where: { tenantId, status: 'acquired' } }),
    db.backlinkOpportunity.count({ where: { tenantId } }),
    db.aiRecommendation.count({ where: { tenantId } }),
  ])

  // Calculate diagnostic scores (0-100)
  const marketingScore = Math.min(
    (leadsCount * 2) + (campaignsCount * 5) + (contentPieces * 3) + (socialAccounts * 10) + (adCampaigns * 5),
    100,
  )
  const salesScore = Math.min(
    (dealsCount * 5) + ((wonRevenue._sum.value || 0) / 100) + 30,
    100,
  )
  const digitalPresenceScore = Math.min(
    (seoProjects * 15) + (totalBacklinks * 2) + (backlinksAcquired * 5) + 20,
    100,
  )
  const customerSatisfactionScore = Math.min(
    (emailsSent > 0 ? 40 : 0) + (aiRecs * 3) + 30,
    100,
  )
  const operationalScore = Math.min(
    (campaignsCount > 0 ? 30 : 0) + (seoProjects > 0 ? 25 : 0) + (socialAccounts > 0 ? 20 : 0) + 25,
    100,
  )
  const overallScore = Math.round(
    (marketingScore + salesScore + digitalPresenceScore + customerSatisfactionScore + operationalScore) / 5,
  )

  // Detect issues
  const issues: any[] = []
  if (leadsCount === 0) issues.push({ area: 'Lead Generation', severity: 'critical', description: 'No leads generated yet', recommendation: 'Run the Lead Generator to find potential customers' })
  if (leadsCount > 0 && dealsCount === 0) issues.push({ area: 'Sales', severity: 'high', description: `${leadsCount} leads but no deals in pipeline`, recommendation: 'Focus on qualifying and converting leads' })
  if (campaignsCount === 0 && leadsCount > 5) issues.push({ area: 'Email Marketing', severity: 'medium', description: 'No email campaigns despite having leads', recommendation: 'Launch a welcome email campaign' })
  if (seoProjects === 0) issues.push({ area: 'SEO', severity: 'medium', description: 'No SEO monitoring set up', recommendation: 'Add your website as an SEO project' })
  if (contentPieces === 0) issues.push({ area: 'Content', severity: 'medium', description: 'No content published', recommendation: 'Generate content ideas and publish articles' })
  if (seoIssues > 10) issues.push({ area: 'SEO', severity: 'high', description: `${seoIssues} unresolved SEO issues`, recommendation: 'Fix critical SEO issues immediately' })
  if (socialAccounts === 0) issues.push({ area: 'Social Media', severity: 'low', description: 'No social accounts connected', recommendation: 'Connect your social media accounts' })

  // Detect opportunities
  const opportunities: any[] = []
  if (wonRevenue._sum.value && wonRevenue._sum.value > 0 && adCampaigns === 0) {
    opportunities.push({ area: 'Advertising', potential: 'high', description: 'Revenue is coming in but no paid ads', action: 'Reinvest revenue into Google/Meta ads' })
  }
  if (leadsCount > 20 && campaignsCount < 2) {
    opportunities.push({ area: 'Email Marketing', potential: 'high', description: 'Large lead base but few campaigns', action: 'Segment leads and launch targeted campaigns' })
  }
  if (contentPieces > 0 && socialAccounts === 0) {
    opportunities.push({ area: 'Social Media', potential: 'medium', description: 'Content exists but not distributed on social', action: 'Connect social accounts and schedule posts' })
  }
  if (backlinksAcquired === 0 && totalBacklinks > 0) {
    opportunities.push({ area: 'Backlinks', potential: 'medium', description: 'Backlink opportunities discovered but none acquired', action: 'Start outreach to high-DA sites' })
  }

  // AI analysis
  let aiAnalysis = null
  try {
    const completion = await llmAggregator.complete({
      messages: [
        {
          role: 'system',
          content: 'You are a business diagnostician. Analyze the business data and return JSON: { root_causes: [], priority_actions: [{ action, timeline, impact }], timeline: "3-6 months" }',
        },
        {
          role: 'user',
          content: `Business: ${businessName}\nIndustry: ${industry || 'Unknown'}\n\nScores (0-100): Marketing=${marketingScore}, Sales=${salesScore}, Digital=${digitalPresenceScore}, Satisfaction=${customerSatisfactionScore}, Operations=${operationalScore}\n\nIssues: ${JSON.stringify(issues)}\nOpportunities: ${JSON.stringify(opportunities)}`,
        },
      ],
      temperature: 0.5,
      tenantId,
      sessionType: 'diagnostics',
    })

    aiAnalysis = parseJsonResponse(completion.text)
  } catch (err) {
    console.error('[diagnostics] AI failed:', err)
  }

  // SWOT
  const strengths = issues.length < 3 ? ['Strong marketing foundation', 'Diversified channels'] : ['Active lead generation']
  const weaknesses = issues.filter((i) => i.severity === 'critical' || i.severity === 'high').map((i) => i.description)
  const opportunitiesSwot = opportunities.map((o) => o.description)
  const threats = ['Competitor activity', 'Market changes']

  // Create diagnostic
  const diagnostic = await db.businessDiagnostic.create({
    data: {
      businessName,
      website,
      industry,
      marketingScore: Math.round(marketingScore),
      salesScore: Math.round(salesScore),
      digitalPresenceScore: Math.round(digitalPresenceScore),
      customerSatisfactionScore: Math.round(customerSatisfactionScore),
      operationalScore: Math.round(operationalScore),
      overallScore,
      strengths: JSON.stringify(strengths),
      weaknesses: JSON.stringify(weaknesses),
      opportunities: JSON.stringify(opportunitiesSwot),
      threats: JSON.stringify(threats),
      detectedIssues: JSON.stringify(issues),
      detectedOpportunities: JSON.stringify(opportunities),
      aiAnalysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
      summary: `Overall business health: ${overallScore}/100. ${issues.length} issues detected, ${opportunities.length} opportunities identified.`,
      actionPlan: JSON.stringify([
        { phase: 'Immediate (1-2 weeks)', tasks: issues.filter((i) => i.severity === 'critical').map((i) => i.recommendation), timeline: '2 weeks', budget: '$0' },
        { phase: 'Short-term (1 month)', tasks: issues.filter((i) => i.severity === 'high').map((i) => i.recommendation), timeline: '1 month', budget: '$500-1000' },
        { phase: 'Medium-term (3 months)', tasks: opportunities.map((o) => o.action), timeline: '3 months', budget: '$2000-5000' },
      ]),
      status: 'completed',
      tenantId,
    },
  })

  await audit({
    type: 'created',
    message: `Business diagnostic completed for ${businessName} (score: ${overallScore}/100)`,
    tenantId,
  })

  return NextResponse.json({ diagnostic, scores: { marketingScore, salesScore, digitalPresenceScore, customerSatisfactionScore, operationalScore, overallScore }, issues, opportunities, aiAnalysis })
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

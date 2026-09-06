import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { withTtlCache } from '@/lib/cache/ttl-cache'

// Measured live (PERFORMANCE-AUDIT.md): this endpoint issues 37 parallel
// count/aggregate queries per request — each is cheap individually, but
// the sheer query count made this the slowest read endpoint measured this
// phase (~100-180ms steady-state, vs ~50-70ms for a typical single-query
// list endpoint). Also had no withProtection at all, so it was invisible
// to rate limiting and to the metrics this phase relies on for
// measurement. A dashboard KPI summary tolerates a few seconds of
// staleness with no correctness impact, so a short TTL cache removes the
// repeat-query cost on every dashboard view/refresh without touching the
// 37-query shape itself.
const CACHE_TTL_MS = 30_000

/**
 * Unified Dashboard API.
 *
 * Aggregates KPIs from ALL phases into a single response so the
 * dashboard can render a comprehensive cross-phase overview.
 */
async function handler() {
  const tenantId = await requireTenantId()
  const data = await withTtlCache(`dashboard-unified:${tenantId}`, CACHE_TTL_MS, () => computeDashboard(tenantId))
  return NextResponse.json(data)
}

export const GET = withProtection(handler, { rateLimit: 'read' })

async function computeDashboard(tenantId: string) {
  const [
    totalLeads, newLeads, qualifiedLeads, wonLeads, avgLeadScore,
    totalDeals, pipelineValue, wonRevenue, totalCampaigns, emailsSent, emailOpenRate,
    totalContentIdeas, totalContentPieces, publishedContent,
    totalSeoProjects, totalSeoIssues, avgSeoScore, totalKeywords, totalBacklinks,
    totalAdCampaigns, totalAdSpend, totalConversions, avgRoas,
    totalSocialAccounts, totalSocialPosts, totalSocialFollowers, totalEngagement,
    totalBacklinkOpps, acquiredBacklinks, avgBacklinkDA,
    totalSocialAnalyses, totalCompetitors, totalExportMarkets, totalExportProducts,
    totalAiRecommendations, pendingAiRecs,
    totalWorkflows, activeWorkflows,
  ] = await Promise.all([
    db.lead.count({ where: { tenantId } }),
    db.lead.count({ where: { tenantId, status: 'new' } }),
    db.lead.count({ where: { tenantId, status: 'qualified' } }),
    db.lead.count({ where: { tenantId, status: 'won' } }),
    db.lead.aggregate({ where: { tenantId }, _avg: { score: true } }),
    db.deal.count({ where: { tenantId } }),
    db.deal.aggregate({ where: { tenantId, stage: { not: 'lost' } }, _sum: { value: true } }),
    db.deal.aggregate({ where: { tenantId, stage: 'won' }, _sum: { value: true } }),
    db.emailCampaign.count({ where: { tenantId } }),
    db.emailLog.count({ where: { campaign: { tenantId } } }),
    db.emailLog.count({ where: { campaign: { tenantId }, status: 'opened' } }),
    db.contentIdea.count({ where: { tenantId } }),
    db.contentPiece.count({ where: { tenantId } }),
    db.contentPiece.count({ where: { tenantId, status: 'published' } }),
    db.seoProject.count({ where: { tenantId } }),
    db.seoIssue.count({ where: { seoProject: { tenantId }, resolved: false } }),
    db.seoPage.aggregate({ where: { seoProject: { tenantId } }, _avg: { score: true } }),
    db.seoKeyword.count({ where: { seoProject: { tenantId } } }),
    db.seoBacklink.count({ where: { seoProject: { tenantId } } }),
    db.adCampaign.count({ where: { tenantId } }),
    db.adCampaign.aggregate({ where: { tenantId }, _sum: { spend: true } }),
    db.adCampaign.aggregate({ where: { tenantId }, _sum: { conversions: true } }),
    db.adCampaign.aggregate({ where: { tenantId }, _avg: { roas: true } }),
    db.socialAccount.count({ where: { tenantId } }),
    db.socialPost.count({ where: { tenantId } }),
    db.socialAccount.aggregate({ where: { tenantId }, _sum: { followerCount: true } }),
    db.socialPost.aggregate({ where: { tenantId }, _sum: { likes: true } }),
    db.backlinkOpportunity.count({ where: { tenantId } }),
    db.backlinkOpportunity.count({ where: { tenantId, status: 'acquired' } }),
    db.backlinkOpportunity.aggregate({ where: { tenantId }, _avg: { domainAuthority: true } }),
    db.socialAnalysis.count({ where: { tenantId } }),
    db.competitorProfile.count({ where: { tenantId } }),
    db.exportMarket.count({ where: { tenantId } }),
    db.exportProduct.count({ where: { tenantId } }),
    db.aiRecommendation.count({ where: { tenantId } }),
    db.aiRecommendation.count({ where: { tenantId, status: 'pending' } }),
    db.workflow.count({ where: { tenantId } }),
    db.workflow.count({ where: { tenantId, isActive: true } }),
  ])

  const phases = [
    { phase: 'P1 Leads', score: Math.min(totalLeads * 5, 100), value: totalLeads },
    { phase: 'P2 CRM', score: Math.min(totalDeals * 10 + (wonRevenue._sum.value || 0) / 100, 100), value: totalDeals },
    { phase: 'P3 Content', score: Math.min((totalContentIdeas + totalContentPieces) * 5, 100), value: totalContentIdeas + totalContentPieces },
    { phase: 'P4 SEO', score: Math.min(totalSeoProjects * 20 + (avgSeoScore._avg.score || 0) / 2, 100), value: totalSeoProjects },
    { phase: 'P5 Ads', score: Math.min(totalAdCampaigns * 15 + (avgRoas._avg.roas || 0) * 10, 100), value: totalAdCampaigns },
    { phase: 'P6 Social', score: Math.min(totalSocialPosts * 5 + (totalSocialFollowers._sum.followerCount || 0) / 1000, 100), value: totalSocialPosts },
    { phase: 'P7 Backlinks', score: Math.min(totalBacklinkOpps * 5 + acquiredBacklinks * 10, 100), value: totalBacklinkOpps },
    { phase: 'P8 Analyzers', score: Math.min((totalSocialAnalyses + totalCompetitors + totalExportMarkets) * 10, 100), value: totalSocialAnalyses + totalCompetitors + totalExportMarkets },
    { phase: 'P9 AI', score: Math.min(totalAiRecommendations * 8, 100), value: totalAiRecommendations },
    { phase: 'P10 Workflow', score: Math.min(totalWorkflows * 20, 100), value: totalWorkflows },
  ]

  const funnel = [
    { stage: 'Leads', count: totalLeads, color: '#3b82f6' },
    { stage: 'Qualified', count: qualifiedLeads, color: '#a855f7' },
    { stage: 'Deals', count: totalDeals, color: '#f59e0b' },
    { stage: 'Won', count: wonLeads, color: '#22c55e' },
  ]

  return {
    leads: { total: totalLeads, new: newLeads, qualified: qualifiedLeads, won: wonLeads, avgScore: Math.round(avgLeadScore._avg.score || 0) },
    crm: { deals: totalDeals, pipelineValue: pipelineValue._sum.value || 0, wonRevenue: wonRevenue._sum.value || 0 },
    email: { campaigns: totalCampaigns, sent: emailsSent, openRate: emailsSent > 0 ? Math.round((emailOpenRate / emailsSent) * 100) : 0 },
    content: { ideas: totalContentIdeas, pieces: totalContentPieces, published: publishedContent },
    seo: { projects: totalSeoProjects, issues: totalSeoIssues, avgScore: Math.round(avgSeoScore._avg.score || 0), keywords: totalKeywords, backlinks: totalBacklinks },
    ads: { campaigns: totalAdCampaigns, spend: totalAdSpend._sum.spend || 0, conversions: totalConversions._sum.conversions || 0, roas: Math.round((avgRoas._avg.roas || 0) * 10) / 10 },
    social: { accounts: totalSocialAccounts, posts: totalSocialPosts, followers: totalSocialFollowers._sum.followerCount || 0, engagement: totalEngagement._sum.likes || 0 },
    backlinks: { opportunities: totalBacklinkOpps, acquired: acquiredBacklinks, avgDA: Math.round(avgBacklinkDA._avg.domainAuthority || 0) },
    analyzers: { socialAnalyses: totalSocialAnalyses, competitors: totalCompetitors, exportMarkets: totalExportMarkets, exportProducts: totalExportProducts },
    ai: { recommendations: totalAiRecommendations, pending: pendingAiRecs },
    workflow: { total: totalWorkflows, active: activeWorkflows },
    phases,
    funnel,
    healthScore: Math.round(phases.reduce((sum, p) => sum + p.score, 0) / phases.length),
  }
}

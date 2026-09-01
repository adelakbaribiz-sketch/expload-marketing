import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

/**
 * Analytics endpoint — returns aggregated metrics for the tenant.
 */
export async function GET() {
  const tenantId = await requireTenantId()

  const [
    totalLeads,
    totalDeals,
    wonDeals,
    totalRevenue,
    totalCampaigns,
    sentEmails,
    totalSeoProjects,
    totalContent,
    totalSocialPosts,
    totalAdCampaigns,
    recentEvents,
  ] = await Promise.all([
    db.lead.count({ where: { tenantId } }),
    db.deal.count({ where: { tenantId } }),
    db.deal.count({ where: { tenantId, stage: 'won' } }),
    db.deal.aggregate({ where: { tenantId, stage: 'won' }, _sum: { value: true } }),
    db.emailCampaign.count({ where: { tenantId } }),
    db.emailLog.count({ where: { campaign: { tenantId } } }),
    db.seoProject.count({ where: { tenantId } }),
    db.contentPiece.count({ where: { tenantId } }),
    db.socialPost.count({ where: { tenantId } }),
    db.adCampaign.count({ where: { tenantId } }),
    db.analyticsEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, eventType: true, eventName: true, createdAt: true, pageUrl: true },
    }),
  ])

  return NextResponse.json({
    leads: totalLeads,
    deals: totalDeals,
    wonDeals,
    pipelineValue: totalRevenue._sum.value ?? 0,
    campaigns: totalCampaigns,
    emailsSent: sentEmails,
    seoProjects: totalSeoProjects,
    contentPieces: totalContent,
    socialPosts: totalSocialPosts,
    adCampaigns: totalAdCampaigns,
    recentEvents,
  })
}

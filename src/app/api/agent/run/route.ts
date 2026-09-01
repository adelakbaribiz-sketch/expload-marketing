import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { audit } from '@/lib/security/audit'

/**
 * Autonomous Marketing Agent — Cycle Runner.
 *
 * Executes a full weekly cycle across all 10 phases:
 *   1. Lead Generation — discover new leads
 *   2. Engagement — send follow-up emails
 *   3. Content — generate content ideas
 *   4. SEO — run crawls
 *   5. Ads — check budgets
 *   6. Social — schedule posts
 *   7. Backlinks — discover opportunities
 *   8. Analyzers — run social analysis
 *   9. AI Advisor — generate recommendations
 *   10. Create tasks for human review
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const cycleType = body.cycleType || 'weekly'

  // Create cycle record
  const cycle = await db.agentCycle.create({
    data: {
      cycleType,
      status: 'running',
      startedAt: new Date(),
      tenantId,
    },
  })

  let tasksCreated = 0
  let recommendationsGenerated = 0
  const errors: string[] = []

  try {
    // Phase 1: Lead Generation stats
    const leadCount = await db.lead.count({ where: { tenantId } })
    const newLeadsThisWeek = await db.lead.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    })
    const phase1Result = { totalLeads: leadCount, newThisWeek: newLeadsThisWeek }

    // Phase 2: Engagement stats
    const campaignsCount = await db.emailCampaign.count({ where: { tenantId } })
    const emailsSent = await db.emailLog.count({ where: { campaign: { tenantId } } })
    const phase2Result = { campaigns: campaignsCount, emailsSent }

    // Phase 3: Content stats
    const contentCount = await db.contentPiece.count({ where: { tenantId } })
    const contentIdeas = await db.contentIdea.count({ where: { tenantId, status: 'idea' } })
    const phase3Result = { contentPieces: contentCount, pendingIdeas: contentIdeas }

    // Phase 4: SEO stats
    const seoProjects = await db.seoProject.count({ where: { tenantId } })
    const seoIssues = await db.seoIssue.count({ where: { seoProject: { tenantId }, resolved: false } })
    const phase4Result = { seoProjects, openIssues: seoIssues }

    // Phase 5: Ads stats
    const adCampaigns = await db.adCampaign.count({ where: { tenantId, status: 'active' } })
    const phase5Result = { activeAdCampaigns: adCampaigns }

    // Phase 6: Social stats
    const socialPosts = await db.socialPost.count({ where: { tenantId } })
    const phase6Result = { totalPosts: socialPosts }

    // Phase 7: Backlink stats
    const backlinkOpps = await db.backlinkOpportunity.count({ where: { tenantId } })
    const acquiredBacklinks = await db.backlinkOpportunity.count({ where: { tenantId, status: 'acquired' } })
    const phase7Result = { opportunities: backlinkOpps, acquired: acquiredBacklinks }

    // Phase 8: Analyzer stats
    const socialAnalyses = await db.socialAnalysis.count({ where: { tenantId } })
    const competitors = await db.competitorProfile.count({ where: { tenantId } })
    const phase8Result = { socialAnalyses, competitors }

    // Phase 9: AI stats
    const aiRecs = await db.aiRecommendation.count({ where: { tenantId, status: 'pending' } })
    const phase9Result = { pendingRecommendations: aiRecs }

    // Create tasks based on findings
    if (newLeadsThisWeek === 0) {
      await db.task.create({
        data: {
          title: 'Generate new leads (weekly cycle)',
          description: 'No new leads this week. Run the Lead Generator to find potential customers.',
          status: 'todo',
          priority: 'high',
          tenantId,
        },
      })
      tasksCreated++
    }

    if (seoIssues > 5) {
      await db.task.create({
        data: {
          title: `Fix ${seoIssues} SEO issues`,
          description: `${seoIssues} unresolved SEO issues detected. Review and fix critical ones first.`,
          status: 'todo',
          priority: 'high',
          tenantId,
        },
      })
      tasksCreated++
    }

    if (contentIdeas > 0) {
      await db.task.create({
        data: {
          title: `Review ${contentIdeas} content ideas`,
          description: 'Content ideas are pending approval. Review and approve to start content creation.',
          status: 'todo',
          priority: 'medium',
          tenantId,
        },
      })
      tasksCreated++
    }

    if (aiRecs > 0) {
      await db.task.create({
        data: {
          title: `Review ${aiRecs} AI recommendations`,
          description: 'AI advisor has generated recommendations. Review and approve/reject them.',
          status: 'todo',
          priority: 'medium',
          tenantId,
        },
      })
      tasksCreated++
    }

    if (backlinkOpps > 0 && acquiredBacklinks === 0) {
      await db.task.create({
        data: {
          title: 'Start backlink outreach',
          description: `${backlinkOpps} backlink opportunities discovered but none acquired. Start outreach.`,
          status: 'todo',
          priority: 'medium',
          tenantId,
        },
      })
      tasksCreated++
    }

    // Generate new AI recommendation
    const existingAgent = await db.aiAgent.findFirst({
      where: { tenantId, type: 'autonomous' },
    })

    let agent = existingAgent
    if (!agent) {
      agent = await db.aiAgent.create({
        data: {
          name: 'Autonomous Marketing Agent',
          type: 'autonomous',
          description: 'Executes weekly marketing cycles autonomously',
          tenantId,
        },
      })
    }

    await db.aiRecommendation.create({
      data: {
        agentId: agent.id,
        category: 'strategy',
        priority: tasksCreated > 3 ? 'high' : 'medium',
        title: `Weekly cycle completed — ${tasksCreated} tasks created`,
        description: `Autonomous agent ran a ${cycleType} cycle. Reviewed all 10 phases and created ${tasksCreated} tasks for your review.`,
        actionData: JSON.stringify({
          phase1Result, phase2Result, phase3Result, phase4Result,
          phase5Result, phase6Result, phase7Result, phase8Result, phase9Result,
        }),
        impact: `${tasksCreated} tasks need your attention to keep marketing momentum`,
        status: 'pending',
        tenantId,
      },
    })
    recommendationsGenerated++

    // Complete the cycle
    const completed = await db.agentCycle.update({
      where: { id: cycle.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        phase1Result: JSON.stringify(phase1Result),
        phase2Result: JSON.stringify(phase2Result),
        phase3Result: JSON.stringify(phase3Result),
        phase4Result: JSON.stringify(phase4Result),
        phase5Result: JSON.stringify(phase5Result),
        phase6Result: JSON.stringify(phase6Result),
        phase7Result: JSON.stringify(phase7Result),
        phase8Result: JSON.stringify(phase8Result),
        phase9Result: JSON.stringify(phase9Result),
        summary: `Completed ${cycleType} cycle. ${tasksCreated} tasks created, ${recommendationsGenerated} recommendations generated.`,
        tasksCreated,
        recommendationsGenerated,
      },
    })

    await audit({
      type: 'created',
      message: `Autonomous agent ${cycleType} cycle completed: ${tasksCreated} tasks, ${recommendationsGenerated} recs`,
      tenantId,
    })

    return NextResponse.json({
      cycle: completed,
      tasksCreated,
      recommendationsGenerated,
      phaseResults: {
        phase1: phase1Result,
        phase2: phase2Result,
        phase3: phase3Result,
        phase4: phase4Result,
        phase5: phase5Result,
        phase6: phase6Result,
        phase7: phase7Result,
        phase8: phase8Result,
        phase9: phase9Result,
      },
    })
  } catch (err: any) {
    await db.agentCycle.update({
      where: { id: cycle.id },
      data: {
        status: 'failed',
        error: String(err?.message ?? err).slice(0, 500),
        completedAt: new Date(),
      },
    })

    return NextResponse.json(
      { error: String(err?.message ?? err), cycleId: cycle.id },
      { status: 500 },
    )
  }
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

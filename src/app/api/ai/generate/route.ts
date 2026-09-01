import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { audit } from '@/lib/security/audit'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * AI Strategy/Advisor endpoint.
 *
 * Analyzes the tenant's marketing data and generates AI-powered
 * recommendations across all domains (SEO, content, ads, email, social).
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const analysisType = body.type || 'strategy' // strategy | advisor | content_ideas

  // Gather tenant data for analysis
  const [leads, deals, campaigns, seoProjects, contentPieces, socialPosts, adCampaigns] = await Promise.all([
    db.lead.count({ where: { tenantId } }),
    db.deal.count({ where: { tenantId } }),
    db.emailCampaign.count({ where: { tenantId } }),
    db.seoProject.count({ where: { tenantId } }),
    db.contentPiece.count({ where: { tenantId } }),
    db.socialPost.count({ where: { tenantId } }),
    db.adCampaign.count({ where: { tenantId } }),
  ])

  const wonDeals = await db.deal.aggregate({
    where: { tenantId, stage: 'won' },
    _sum: { value: true },
  })

  const tenantData = {
    leads,
    deals,
    wonDeals: wonDeals._sum.value ?? 0,
    campaigns,
    seoProjects,
    contentPieces,
    socialPosts,
    adCampaigns,
  }

  // Find or create the strategy agent
  let agent = await db.aiAgent.findFirst({
    where: { tenantId, type: analysisType },
  })

  if (!agent) {
    agent = await db.aiAgent.create({
      data: {
        name: analysisType === 'strategy' ? 'Strategy Agent' : 'Advisor Agent',
        type: analysisType,
        description: `AI agent for ${analysisType} analysis`,
        tenantId,
      },
    })
  }

  // Create a task
  const task = await db.aiTask.create({
    data: {
      agentId: agent.id,
      tenantId,
      type: 'recommend',
      input: JSON.stringify(tenantData),
      status: 'running',
      startedAt: new Date(),
    },
  })

  let recommendations: any[] = []

  try {
    // Call the LLM
    const zai = await ZAI.create()
    const systemPrompt = buildSystemPrompt(analysisType)
    const userPrompt = `Analyze this marketing data and provide 3-5 actionable recommendations:\n\n${JSON.stringify(tenantData, null, 2)}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    })

    const content = completion.choices?.[0]?.message?.content ?? ''

    // Parse recommendations (simple parsing)
    recommendations = parseRecommendations(content)

    // Persist recommendations
    for (const rec of recommendations) {
      await db.aiRecommendation.create({
        data: {
          agentId: agent.id,
          tenantId,
          category: rec.category || 'strategy',
          priority: rec.priority || 'medium',
          title: rec.title,
          description: rec.description,
          actionData: rec.actions ? JSON.stringify(rec.actions) : null,
          impact: rec.impact,
          status: 'pending',
        },
      })
    }

    // Complete task
    await db.aiTask.update({
      where: { id: task.id },
      data: {
        status: 'completed',
        output: JSON.stringify({ recommendations }),
        completedAt: new Date(),
      },
    })
  } catch (err: any) {
    await db.aiTask.update({
      where: { id: task.id },
      data: {
        status: 'failed',
        error: String(err?.message ?? err).slice(0, 500),
        completedAt: new Date(),
      },
    })

    // Fallback: generate rule-based recommendations
    recommendations = generateFallbackRecommendations(tenantData)
  }

  await audit({
    type: 'created',
    message: `AI ${analysisType} analysis completed: ${recommendations.length} recommendations`,
    tenantId,
  })

  return NextResponse.json({
    task: { id: task.id, status: task.status },
    recommendations,
    dataAnalyzed: tenantData,
  })
}

function buildSystemPrompt(type: string): string {
  if (type === 'content_ideas') {
    return `You are a marketing content strategist. Generate 5 content ideas based on the tenant's data.
Return JSON array: [{ "title": "...", "description": "...", "contentType": "blog|social|video", "keywords": [...], "aiScore": 0-100 }]`
  }
  return `You are an AI marketing advisor for a B2B SaaS platform. Analyze the tenant's marketing data and provide actionable recommendations.

Return a JSON array of recommendations:
[
  {
    "category": "seo|content|ads|social|email|strategy",
    "priority": "low|medium|high|critical",
    "title": "Short recommendation title",
    "description": "Detailed explanation",
    "actions": ["Step 1", "Step 2"],
    "impact": "Expected impact description"
  }
]

Focus on practical, data-driven suggestions. Consider the tenant's current metrics.`
}

function parseRecommendations(content: string): any[] {
  try {
    // Try to extract JSON array from the response
    const start = content.indexOf('[')
    const end = content.lastIndexOf(']')
    if (start >= 0 && end > start) {
      return JSON.parse(content.slice(start, end + 1))
    }
  } catch {
    // ignore
  }
  return []
}

function generateFallbackRecommendations(data: any): any[] {
  const recs: any[] = []

  if (data.leads > 0 && data.deals === 0) {
    recs.push({
      category: 'strategy',
      priority: 'high',
      title: 'Convert leads to deals',
      description: `You have ${data.leads} leads but no deals in the pipeline. Focus on qualifying and converting your best leads.`,
      actions: ['Review top-scored leads', 'Create follow-up email campaign', 'Assign sales tasks'],
      impact: 'Start generating revenue from existing lead base',
    })
  }

  if (data.campaigns === 0 && data.leads > 5) {
    recs.push({
      category: 'email',
      priority: 'medium',
      title: 'Launch your first email campaign',
      description: 'With leads in the system, an email campaign can nurture them toward conversion.',
      actions: ['Create a welcome email template', 'Segment leads by industry', 'Schedule campaign'],
      impact: 'Increase engagement and move leads through the funnel',
    })
  }

  if (data.seoProjects === 0) {
    recs.push({
      category: 'seo',
      priority: 'medium',
      title: 'Set up SEO monitoring',
      description: 'Track your website\'s SEO health to improve organic search visibility.',
      actions: ['Add your domain as an SEO project', 'Run an initial crawl', 'Fix critical issues'],
      impact: 'Improve organic search rankings over time',
    })
  }

  if (data.contentPieces === 0) {
    recs.push({
      category: 'content',
      priority: 'medium',
      title: 'Create content for lead nurturing',
      description: 'Content marketing helps establish authority and nurture leads.',
      actions: ['Generate content ideas with AI', 'Create a blog post', 'Schedule social media posts'],
      impact: 'Build trust and improve conversion rates',
    })
  }

  if (data.adCampaigns === 0 && data.wonDeals > 0) {
    recs.push({
      category: 'ads',
      priority: 'low',
      title: 'Consider paid advertising',
      description: 'With revenue coming in, paid ads can accelerate growth.',
      actions: ['Connect Google Ads account', 'Set a test budget', 'Create first ad campaign'],
      impact: 'Expand reach and acquire new customers faster',
    })
  }

  return recs.length > 0 ? recs : [{
    category: 'strategy',
    priority: 'low',
    title: 'Continue building your marketing pipeline',
    description: 'Your marketing foundation is taking shape. Keep generating leads and engaging with them.',
    actions: ['Generate more leads', 'Create email campaigns', 'Monitor performance'],
    impact: 'Steady growth of your marketing funnel',
  }]
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

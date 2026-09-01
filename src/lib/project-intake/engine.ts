/**
 * Project Brief Intake → AI Roadmap → 3-Tier Pricing → Payment
 *
 * Flow:
 *  1. User describes business + goals
 *  2. AI analyzes + generates textual roadmap (phased milestones)
 *  3. AI generates 3 pricing tiers: Essential / Growth / Premium
 *  4. User sees roadmap + 3 cards with prices
 *  5. Two payment options:
 *     - "Pay in full" (one-click, discount)
 *     - "Pay phased" (deposit + milestones)
 *  6. On payment, project activates and is ready for execution
 */

import 'server-only'
import { db } from '@/lib/db'
import { llmAggregator } from '@/lib/llm/aggregator'
import { emitNotificationEvent } from '@/lib/notifications/emitter'

const ROADMAP_PROMPT = `You are a **Senior Marketing Strategist** at a top-tier digital agency. Given a business description and goals, generate a comprehensive marketing roadmap.

## Output Format (STRICT JSON)
{
  "executive_summary": "2-3 sentences summarizing the opportunity",
  "swot": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."]
  },
  "roadmap": [
    {
      "phase": 1,
      "name": "Foundation (Week 1-2)",
      "duration_weeks": 2,
      "milestones": ["Setup analytics", "Brand audit", "Competitor research"],
      "deliverables": ["Brand guidelines", "Analytics dashboard"],
      "estimated_hours": 40
    }
  ],
  "recommended_channels": ["SEO", "Email", "Social"],
  "kpi_targets": [
    { "metric": "Website traffic", "baseline": "current", "target": "+50% in 3 months" }
  ],
  "risk_factors": ["..."],
  "total_estimated_weeks": N,
  "total_estimated_hours": N
}

## Rules
- 3-5 phases maximum, each with clear milestones and deliverables
- Be specific — name actual tools, channels, metrics
- Estimate hours based on $80-120/hr blended rate
- Total project should be realistic for the stated budget`

const PRICING_PROMPT = `You are a **Pricing Strategist**. Based on the marketing roadmap, generate 3 pricing tiers.

## Output Format (STRICT JSON)
{
  "tiers": [
    {
      "name": "Essential",
      "tagline": "Get started with core marketing",
      "price": 2999,
      "currency": "USD",
      "delivery_weeks": 4,
      "features": ["Feature 1", "Feature 2", "..."],
      "excluded": ["What's NOT included"],
      "payment_options": {
        "full_payment": { "price": 2699, "discount_percent": 10 },
        "phased": [
          { "milestone": "Deposit", "amount": 1000, "due": "on signing" },
          { "milestone": "Mid-point", "amount": 1000, "due": "Week 2" },
          { "milestone": "Final", "amount": 999, "due": "on delivery" }
        ]
      },
      "value_anchor": "Estimated ROI: $X over 12 months",
      "best_for": "Small businesses testing digital marketing"
    },
    {
      "name": "Growth",
      "tagline": "Scale your marketing with full funnel",
      "price": 7999,
      ...
      "is_recommended": true
    },
    {
      "name": "Premium",
      "tagline": "Enterprise-grade with dedicated team",
      "price": 19999,
      ...
    }
  ],
  "recommended_tier": "growth",
  "recommendation_reason": "Why this tier fits the customer's budget and goals"
}

## Pricing Psychology
- Essential: covers cost + small margin (entry-level)
- Growth: full value, 2-3x Essential price, MOST POPULAR
- Premium: premium positioning, 2-3x Growth price, for serious players
- Full payment: 10% discount to incentivize upfront cash
- Phased: aligns payments with milestones, reduces customer risk

## Rules
- Prices must be realistic for the industry and budget
- Each tier must clearly differentiate (no overlapping features)
- The "recommended" tier should match customer's stated budget`

export interface ProjectBriefInput {
  tenantId: string
  businessName: string
  industry?: string
  website?: string
  description: string
  targetMarket?: string
  budget?: number
  currency?: string
  timeline?: string
  goals?: string[]
}

export async function createProjectBrief(input: ProjectBriefInput) {
  const brief = await db.projectBrief.create({
    data: {
      tenantId: input.tenantId,
      businessName: input.businessName,
      industry: input.industry,
      website: input.website,
      description: input.description,
      targetMarket: input.targetMarket,
      budget: input.budget,
      currency: input.currency ?? 'USD',
      timeline: input.timeline,
      goals: input.goals ? JSON.stringify(input.goals) : null,
      status: 'draft',
    },
  })
  return brief
}

export async function analyzeBrief(briefId: string) {
  const brief = await db.projectBrief.findUnique({ where: { id: briefId } })
  if (!brief) throw new Error('Brief not found')

  // Mark as analyzing
  await db.projectBrief.update({ where: { id: briefId }, data: { status: 'analyzed' } })

  // Generate roadmap
  const roadmapResponse = await llmAggregator.complete({
    messages: [
      { role: 'system', content: ROADMAP_PROMPT },
      { role: 'user', content: `# Business: ${brief.businessName}\n## Industry: ${brief.industry ?? 'n/a'}\n## Website: ${brief.website ?? 'n/a'}\n## Description: ${brief.description}\n## Target Market: ${brief.targetMarket ?? 'global'}\n## Budget: ${brief.currency} ${brief.budget ?? 'flexible'}\n## Timeline: ${brief.timeline ?? 'flexible'}\n## Goals: ${brief.goals ?? 'general growth'}` },
    ],
    sessionType: 'project_brief_analysis',
    sessionId: briefId,
    tenantId: brief.tenantId,
    temperature: 0.4,
    maxTokens: 2500,
  })

  let roadmap: any
  try {
    let text = roadmapResponse.text.trim()
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) text = jsonMatch[1].trim()
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) text = text.slice(start, end + 1)
    roadmap = JSON.parse(text)
  } catch (err) {
    throw new Error(`Failed to parse roadmap: ${err}`)
  }

  // Generate 3-tier pricing
  const pricingResponse = await llmAggregator.complete({
    messages: [
      { role: 'system', content: PRICING_PROMPT },
      { role: 'user', content: `# Roadmap\n${JSON.stringify(roadmap, null, 2)}\n\n# Customer Budget\n${brief.currency} ${brief.budget ?? 'flexible'}\n\n# Timeline\n${brief.timeline ?? 'flexible'}\n\nGenerate 3 pricing tiers (Essential / Growth / Premium) with full and phased payment options.` },
    ],
    sessionType: 'project_pricing',
    sessionId: briefId,
    tenantId: brief.tenantId,
    temperature: 0.3,
    maxTokens: 2000,
  })

  let pricing: any
  try {
    let text = pricingResponse.text.trim()
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) text = jsonMatch[1].trim()
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) text = text.slice(start, end + 1)
    pricing = JSON.parse(text)
  } catch (err) {
    throw new Error(`Failed to parse pricing: ${err}`)
  }

  // Update brief
  const updated = await db.projectBrief.update({
    where: { id: briefId },
    data: {
      roadmap: JSON.stringify(roadmap),
      pricingTiers: JSON.stringify(pricing),
      recommendedTier: pricing.recommended_tier ?? 'growth',
      analysisSummary: roadmap.executive_summary,
      aiInsights: JSON.stringify({
        roadmap_tokens: roadmapResponse.totalTokens,
        pricing_tokens: pricingResponse.totalTokens,
        provider: roadmapResponse.provider,
      }),
      status: 'priced',
    },
  })

  // Notify
  await emitNotificationEvent({
    type: 'project_brief_analyzed',
    title: 'Project brief analyzed',
    message: `Roadmap + 3-tier pricing generated for "${brief.businessName}". Recommended: ${pricing.recommended_tier}.`,
    severity: 'success',
    tenantId: brief.tenantId,
    category: 'project_intake',
    metadata: { briefId, recommendedTier: pricing.recommended_tier },
  })

  return { brief: updated, roadmap, pricing }
}

export async function recordPayment(briefId: string, params: {
  paymentOption: 'full' | 'phased'
  amount: number
  tier: string
}) {
  const brief = await db.projectBrief.findUnique({ where: { id: briefId } })
  if (!brief) throw new Error('Brief not found')

  const newAmountPaid = brief.amountPaid + params.amount
  const pricing = brief.pricingTiers ? JSON.parse(brief.pricingTiers) : null
  const tier = pricing?.tiers?.find((t: any) => t.name.toLowerCase() === params.tier.toLowerCase())
  const totalDue = params.paymentOption === 'full' ? tier?.payment_options?.full_payment?.price : tier?.price

  const paymentStatus = newAmountPaid >= (totalDue ?? 0) ? 'paid' : 'partial'

  const updated = await db.projectBrief.update({
    where: { id: briefId },
    data: {
      paymentOption: params.paymentOption,
      amountPaid: newAmountPaid,
      paymentStatus,
      status: paymentStatus === 'paid' ? 'active' : 'payment_pending',
    },
  })

  await emitNotificationEvent({
    type: 'project_payment_received',
    title: paymentStatus === 'paid' ? 'Project fully paid 🎉' : 'Partial payment received',
    message: `$${params.amount} received for "${brief.businessName}". Total paid: $${newAmountPaid} / $${totalDue}.`,
    severity: 'success',
    tenantId: brief.tenantId,
    category: 'project_intake',
    metadata: { briefId, tier: params.tier, paymentOption: params.paymentOption },
  })

  return updated
}

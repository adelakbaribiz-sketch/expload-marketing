/**
 * Smart Campaign Scheduler
 *
 * Suggests optimal campaign start dates based on:
 *  - Deposit received (when can we start work?)
 *  - Global events (align launch with high-relevance moments)
 *  - Industry (some industries have seasonal peaks)
 *  - Budget (bigger budget = longer runway possible)
 *  - Campaign type (some need lead time)
 *
 * Uses LLM to generate date suggestions with reasoning.
 */

import 'server-only'
import { db } from '@/lib/db'
import { llmAggregator } from '@/lib/llm/aggregator'
import { parseJsonResponse } from '@/lib/llm/parse-json'
import { findBestEventForCampaign, getEventsInRange } from '@/lib/events-calendar'
import { emitNotificationEvent } from '@/lib/notifications/emitter'
import { recordDecision } from '@/lib/decision-engine'

const SCHEDULER_PROMPT = `You are a **Marketing Campaign Scheduler** specializing in timing optimization.

Given:
- Customer's deposit amount and total budget
- Desired campaign type
- Industry
- Upcoming global events (with marketing relevance scores)
- Current date

Generate 3 optimal start-date suggestions with reasoning.

## Output Format (STRICT JSON)
{
  "suggestions": [
    {
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "duration_days": N,
      "confidence": "high" | "medium" | "low",
      "reasoning": "2-3 sentences explaining why this date is optimal",
      "aligned_event": "Event name" | null,
      "preparation_days_needed": N,
      "expected_impact_multiplier": 1.0-2.0,
      "risks": ["Risk 1", "Risk 2"]
    }
  ],
  "recommended_option": 0,
  "minimum_preparation_days": N,
  "deposit_coverage_days": N
}

## Scheduling Logic
1. **Deposit-based start**: Campaign can only start after deposit covers preparation phase (typically 3-7 days)
2. **Event alignment**: If a high-relevance event is within 2-4 weeks, suggest aligning launch to it (impact multiplier 1.2-1.5x)
3. **Buffer time**: Leave 3-5 days between deposit and start for asset preparation
4. **Duration**: Based on budget — $1K = 7 days, $5K = 21 days, $10K+ = 30-45 days
5. **Avoid weekends** for B2B; weekends OK for B2C

Generate 3 options:
- Option 0 (Recommended): Best balance of deposit coverage + event alignment
- Option 1: Earliest possible start (aggressive)
- Option 2: Best event alignment (may require waiting)`

export interface ScheduleRequest {
  tenantId: string
  briefId?: string
  campaignName: string
  campaignType: string  // 'email' | 'social' | 'ads' | 'content' | 'multi_channel'
  totalBudget: number
  depositReceived: number
  currency?: string
  industry?: string
  countries?: string[]
}

export async function suggestCampaignDates(req: ScheduleRequest) {
  const currency = req.currency ?? 'USD'
  const now = new Date()

  // 1. Find upcoming events in next 90 days
  const eventsEnd = new Date()
  eventsEnd.setDate(eventsEnd.getDate() + 90)
  const upcomingEvents = await getEventsInRange({
    startDate: now,
    endDate: eventsEnd,
    countries: req.countries,
    limit: 20,
  })

  // 2. Find best event for this industry
  const bestEvent = await findBestEventForCampaign({
    industry: req.industry,
    countries: req.countries,
    startDate: now,
    endDate: eventsEnd,
    campaignType: req.campaignType,
  })

  // 3. Generate suggestions via LLM
  const userPrompt = `# Campaign Brief
- Name: ${req.campaignName}
- Type: ${req.campaignType}
- Industry: ${req.industry ?? 'general'}
- Total Budget: ${currency} ${req.totalBudget}
- Deposit Received: ${currency} ${req.depositReceived}
- Today's Date: ${now.toISOString().slice(0, 10)}

# Upcoming Events (next 90 days)
${upcomingEvents.length > 0 ? JSON.stringify(upcomingEvents.map(e => ({
  name: e.name,
  date: e.startDate.toISOString().slice(0, 10),
  relevance: e.marketingRelevance,
  category: e.category,
})), null, 2) : 'No major events in the next 90 days.'}

# Best Aligned Event
${bestEvent ? `${bestEvent.name} on ${bestEvent.startDate.toISOString().slice(0, 10)} (relevance: ${bestEvent.marketingRelevance})` : 'None identified'}

# Task
Generate 3 optimal start-date suggestions based on the deposit received and upcoming events.`

  const response = await llmAggregator.complete({
    messages: [
      { role: 'system', content: SCHEDULER_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    sessionType: 'campaign_scheduling',
    tenantId: req.tenantId,
    temperature: 0.4,
    maxTokens: 1500,
  })

  let suggestions: any
  let usedFallback = false
  try {
    suggestions = parseJsonResponse(response.text)
  } catch (err) {
    // Fallback: rule-based suggestions
    suggestions = generateRuleBasedSuggestions(req, upcomingEvents, bestEvent)
    usedFallback = true
  }

  // 4. Persist suggestion
  const record = await db.campaignScheduleSuggestion.create({
    data: {
      tenantId: req.tenantId,
      briefId: req.briefId,
      campaignName: req.campaignName,
      campaignType: req.campaignType,
      totalBudget: req.totalBudget,
      depositReceived: req.depositReceived,
      currency,
      suggestedStartDates: JSON.stringify(suggestions.suggestions ?? []),
      suggestedEndDates: JSON.stringify((suggestions.suggestions ?? []).map((s: any) => s.end_date)),
      recommendedDuration: suggestions.suggestions?.[suggestions.recommended_option]?.duration_days,
      linkedEventIds: JSON.stringify(bestEvent ? [bestEvent.id] : []),
      status: 'suggested',
    },
  })

  // 4b. Decision-engine memory: why this timing, vs. the other options considered
  const optionList: any[] = Array.isArray(suggestions.suggestions) ? suggestions.suggestions : []
  const recommendedIdx = Number.isInteger(suggestions.recommended_option) ? suggestions.recommended_option : 0
  const recommended = optionList[recommendedIdx]
  const confidenceMap: Record<string, number> = { high: 85, medium: 55, low: 25 }
  if (recommended) {
    const evidence: string[] = [
      `Deposit received: ${currency} ${req.depositReceived} of ${currency} ${req.totalBudget} total budget.`,
      `Preparation window needed: ${recommended.preparation_days_needed ?? suggestions.minimum_preparation_days ?? 'unknown'} days.`,
    ]
    if (bestEvent) {
      evidence.push(`Best aligned event: ${bestEvent.name} (${bestEvent.marketingRelevance} relevance) on ${new Date(bestEvent.startDate).toISOString().slice(0, 10)}.`)
    }
    const alternatives = optionList
      .filter((_, i) => i !== recommendedIdx)
      .map((opt) => ({
        option: `Start ${opt.start_date} (${opt.duration_days} days${opt.aligned_event ? `, aligned with ${opt.aligned_event}` : ''})`,
        whyNotChosen: Array.isArray(opt.risks) && opt.risks.length > 0 ? opt.risks[0] : 'Lower expected impact than the recommended option.',
      }))

    await recordDecision({
      tenantId: req.tenantId,
      domain: 'campaign_scheduling',
      goal: `When should "${req.campaignName}" (${req.campaignType}) launch?`,
      parsed: {
        recommendation: `Start ${recommended.start_date}, run ${recommended.duration_days} days`,
        reasoning: recommended.reasoning ?? '',
        confidence: typeof recommended.confidence === 'string' ? confidenceMap[recommended.confidence] ?? 50 : recommended.confidence,
        evidence,
        alternatives,
        expectedOutcome: recommended.expected_impact_multiplier
          ? `Expected impact multiplier ${recommended.expected_impact_multiplier}x vs. an unaligned launch.`
          : '',
        risks: recommended.risks ?? [],
      },
      context: { campaignType: req.campaignType, industry: req.industry, totalBudget: req.totalBudget, depositReceived: req.depositReceived, usedFallback },
      llmProvider: usedFallback ? undefined : response.provider,
      llmModel: usedFallback ? undefined : response.model,
      linkedEntityType: 'CampaignScheduleSuggestion',
      linkedEntityId: record.id,
    })
  }

  // 5. Notify
  await emitNotificationEvent({
    type: 'campaign_dates_suggested',
    title: 'Campaign dates suggested',
    message: `${req.campaignName}: ${suggestions.suggestions?.length ?? 0} date options generated. Deposit $${req.depositReceived} covers ${suggestions.deposit_coverage_days ?? 0} days of preparation.`,
    severity: 'info',
    tenantId: req.tenantId,
    category: 'campaign_scheduler',
    metadata: { suggestionId: record.id, briefId: req.briefId },
  })

  return { record, suggestions, bestEvent, upcomingEvents }
}

/** Fallback rule-based suggestions (no LLM needed). */
function generateRuleBasedSuggestions(req: ScheduleRequest, events: any[], bestEvent: any): any {
  const now = new Date()
  const depositCoverageDays = Math.max(3, Math.floor(req.depositReceived / (req.totalBudget / 30)))

  const earliestStart = new Date(now)
  earliestStart.setDate(earliestStart.getDate() + depositCoverageDays)

  const duration = req.totalBudget >= 10000 ? 30 : req.totalBudget >= 5000 ? 21 : 7

  const suggestions = [
    {
      start_date: earliestStart.toISOString().slice(0, 10),
      end_date: new Date(earliestStart.getTime() + duration * 86400000).toISOString().slice(0, 10),
      duration_days: duration,
      confidence: 'medium',
      reasoning: `Earliest start based on deposit coverage of ${depositCoverageDays} days preparation.`,
      aligned_event: null,
      preparation_days_needed: depositCoverageDays,
      expected_impact_multiplier: 1.0,
      risks: ['No event alignment — standard launch window'],
    },
  ]

  if (bestEvent) {
    const eventStart = new Date(bestEvent.startDate)
    const prepDays = 5
    const alignedStart = new Date(eventStart.getTime() - prepDays * 86400000)
    if (alignedStart > now) {
      suggestions.push({
        start_date: alignedStart.toISOString().slice(0, 10),
        end_date: new Date(eventStart.getTime() + duration * 86400000).toISOString().slice(0, 10),
        duration_days: duration + prepDays,
        confidence: 'high',
        reasoning: `Aligned with ${bestEvent.name} (${bestEvent.marketingRelevance} marketing relevance). Launching ${prepDays} days before to build momentum.`,
        aligned_event: bestEvent.name,
        preparation_days_needed: prepDays,
        expected_impact_multiplier: 1.3,
        risks: ['Requires waiting until aligned date'],
      })
    }
  }

  return {
    suggestions,
    recommended_option: suggestions.length > 1 ? 1 : 0,
    minimum_preparation_days: depositCoverageDays,
    deposit_coverage_days: depositCoverageDays,
  }
}

/** Approve a suggested date range. */
export async function approveSchedule(suggestionId: string, startDate: string, endDate: string) {
  const suggestion = await db.campaignScheduleSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: 'approved',
      approvedStartDate: new Date(startDate),
      approvedEndDate: new Date(endDate),
    },
  })

  await emitNotificationEvent({
    type: 'campaign_scheduled',
    title: 'Campaign scheduled',
    message: `${suggestion.campaignName} scheduled for ${new Date(startDate).toLocaleDateString()} → ${new Date(endDate).toLocaleDateString()}`,
    severity: 'success',
    tenantId: suggestion.tenantId,
    category: 'campaign_scheduler',
  })

  return suggestion
}

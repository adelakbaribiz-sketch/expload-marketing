/**
 * Global Events Calendar
 *
 * Tracks world holidays, cultural events, sports tournaments, tech conferences,
 * trending moments, and seasonal peaks relevant to marketing.
 *
 * Used by:
 *  - Campaign Scheduler (suggest dates that align with events)
 *  - Content Generator (theme content around events)
 *  - Notification system (remind users of upcoming high-relevance events)
 *
 * Data sources:
 *  - Seeded built-in database of major global events (200+ entries)
 *  - User-submitted custom events
 *  - Future: integrate with external APIs (Google Calendar, TimeAPI)
 */

import 'server-only'
import { db } from '@/lib/db'

/** Find events in a date range, optionally filtered by country/region/category. */
export async function getEventsInRange(params: {
  startDate: Date
  endDate: Date
  countries?: string[]
  regions?: string[]
  categories?: string[]
  limit?: number
}) {
  const events = await db.globalEvent.findMany({
    where: {
      isActive: true,
      OR: [
        // One-time events in range
        { startDate: { gte: params.startDate, lte: params.endDate }, isRecurring: false },
        // Recurring events (we'll filter by month/day in JS)
        { isRecurring: true },
      ],
    },
    orderBy: { startDate: 'asc' },
    take: params.limit ?? 100,
  })

  // Filter recurring events to those that fall in range
  const filtered = events.filter(e => {
    if (!e.isRecurring) return true
    // For recurring events, check if any occurrence falls in range
    return eventOccursInRange(e, params.startDate, params.endDate)
  })

  // Apply country/region/category filters
  return filtered.filter(e => {
    if (params.countries && params.countries.length > 0) {
      const countries = e.countries ? JSON.parse(e.countries) : []
      if (countries.length > 0 && !params.countries.some(c => countries.includes(c))) return false
    }
    if (params.regions && params.regions.length > 0) {
      const regions = e.regions ? JSON.parse(e.regions) : []
      if (regions.length > 0 && !params.regions.some(r => regions.includes(r))) return false
    }
    if (params.categories && params.categories.length > 0) {
      if (!params.categories.includes(e.category)) return false
    }
    return true
  })
}

/** Check if a recurring event has an occurrence in the date range. */
function eventOccursInRange(event: any, start: Date, end: Date): boolean {
  const eventMonth = event.startDate.getMonth()
  const eventDay = event.startDate.getDate()
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (event.recurrencePattern === 'annual' && d.getMonth() === eventMonth && d.getDate() === eventDay) return true
    if (event.recurrencePattern === 'monthly' && d.getDate() === eventDay) return true
    if (event.recurrencePattern === 'weekly' && d.getDay() === event.startDate.getDay()) return true
  }
  return false
}

/** Find the best upcoming event to align a campaign with. */
export async function findBestEventForCampaign(params: {
  industry?: string
  countries?: string[]
  startDate: Date
  endDate: Date
  campaignType?: string
}): Promise<any | null> {
  const events = await getEventsInRange({
    startDate: params.startDate,
    endDate: params.endDate,
    countries: params.countries,
    limit: 50,
  })

  // Score each event
  const scored = events.map(e => {
    let score = 0
    if (e.marketingRelevance === 'high') score += 30
    else if (e.marketingRelevance === 'medium') score += 15
    // Industry match
    if (params.industry && e.recommendedIndustries) {
      const industries = JSON.parse(e.recommendedIndustries)
      if (industries.includes(params.industry.toLowerCase())) score += 25
    }
    // Campaign type match
    if (params.campaignType && e.suggestedCampaignTypes) {
      const types = JSON.parse(e.suggestedCampaignTypes)
      if (types.includes(params.campaignType)) score += 20
    }
    // Sooner = better
    const daysUntil = Math.ceil((e.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    score += Math.max(0, 20 - daysUntil) // up to 20 points for near-term
    return { event: e, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.event ?? null
}

/** Get upcoming high-relevance events for notifications. */
export async function getUpcomingHighRelevanceEvents(daysAhead: number = 30) {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + daysAhead)
  return getEventsInRange({
    startDate: start,
    endDate: end,
    categories: ['holiday', 'cultural', 'trending', 'sports'],
    limit: 20,
  })
}

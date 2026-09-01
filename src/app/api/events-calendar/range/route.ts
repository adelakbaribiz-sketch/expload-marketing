import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { getEventsInRange, getUpcomingHighRelevanceEvents } from '@/lib/events-calendar'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const daysAhead = parseInt(url.searchParams.get('days') ?? '30')
  const countries = url.searchParams.get('countries')?.split(',')
  const regions = url.searchParams.get('regions')?.split(',')
  const categories = url.searchParams.get('categories')?.split(',')

  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + daysAhead)

  const events = await getEventsInRange({
    startDate, endDate, countries, regions, categories, limit: 50,
  })

  return NextResponse.json({
    period: { start: startDate, end: endDate },
    count: events.length,
    events: events.map(e => ({
      id: e.id,
      name: e.name,
      startDate: e.startDate,
      endDate: e.endDate,
      category: e.category,
      subcategory: e.subcategory,
      marketingRelevance: e.marketingRelevance,
      countries: e.countries ? JSON.parse(e.countries) : [],
      regions: e.regions ? JSON.parse(e.regions) : [],
      suggestedCampaignTypes: e.suggestedCampaignTypes ? JSON.parse(e.suggestedCampaignTypes) : [],
      recommendedIndustries: e.recommendedIndustries ? JSON.parse(e.recommendedIndustries) : [],
      icon: e.icon,
      color: e.color,
    })),
  })
}

export const GET = withProtection(handler, { rateLimit: 'read' })

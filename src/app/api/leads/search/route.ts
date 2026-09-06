import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { searchBusinesses, type SerperResult } from '@/lib/services/serper'
import { scrapePlaces, type MapsPlace } from '@/lib/services/google-maps-scraper'
import { extractLeadInfo } from '@/lib/ai/lead-extractor'
import { withProtection, getTenantIdFromRequest } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeUrl, sanitizeEmail } from '@/lib/security/sanitize'

/**
 * Lead generation endpoint.
 *
 * Mirrors the original FastAPI `/leads/search` route:
 *   1. Serper organic search for businesses
 *   2. (optional) Google Maps places scrape
 *   3. AI enrichment of each snippet via the portable llmAggregator
 *   4. Persist as Lead rows scoped to the active tenant / project
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))

  // Sanitize inputs
  const query = sanitizeText(String(body.query ?? ''), 200)
  const location = body.location ? sanitizeText(String(body.location), 100) : undefined
  const projectId = body.projectId ? sanitizeText(String(body.projectId), 100) : undefined
  const useMaps = Boolean(body.useMaps ?? true)
  const maxResults = Math.min(Number(body.maxResults ?? 8), 20)
  const enrich = Boolean(body.enrich ?? true)
  const persist = Boolean(body.persist ?? true)

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  // 1. Serper search
  const serper = await searchBusinesses(query, location, maxResults)
  if (serper.error) {
    return NextResponse.json({ error: serper.error }, { status: 502 })
  }

  // 2. Google Maps places (optional)
  let maps: MapsPlace[] = []
  if (useMaps) {
    maps = await scrapePlaces(query, location, maxResults)
  }

  // Merge organic + places into a single work list
  type Work = { title: string; link?: string; snippet: string; place?: MapsPlace }
  const work: Work[] = []
  const seenLinks = new Set<string>()
  for (const r of serper.organic ?? []) {
    if (r.link && seenLinks.has(r.link)) continue
    if (r.link) seenLinks.add(r.link)
    work.push({ title: r.title, link: r.link, snippet: r.snippet })
  }
  for (const p of maps) {
    if (p.website && seenLinks.has(p.website)) continue
    if (p.website) seenLinks.add(p.website)
    work.push({
      title: p.name,
      link: p.website,
      snippet: `${p.category ?? 'Business'} in ${p.address ?? 'unknown location'}. Rating: ${p.rating ?? 'n/a'} (${p.reviewsCount ?? 0} reviews).`,
      place: p,
    })
  }

  const created: any[] = []
  const skipped: any[] = []

  for (const w of work.slice(0, maxResults)) {
    // 3. AI enrichment
    let info: Awaited<ReturnType<typeof extractLeadInfo>> | null = null
    if (enrich) {
      info = await extractLeadInfo(`${w.title}\n${w.snippet}`, tenantId)
    }

    // Sanitize all persisted fields
    const leadData = {
      name: sanitizeText(w.title, 200),
      email: sanitizeEmail(info?.contactEmail) ?? null,
      phone: w.place?.phone ? sanitizeText(w.place.phone, 30) : null,
      website: sanitizeUrl(w.link),
      address: w.place?.address ? sanitizeText(w.place.address, 300) : null,
      industry: sanitizeText(info?.industry ?? w.place?.category ?? '', 80) || null,
      description: sanitizeText(info?.description ?? w.snippet.slice(0, 300), 1000),
      services: info?.services ? JSON.stringify(info.services.slice(0, 10)) : null,
      rating: typeof w.place?.rating === 'number' ? w.place.rating : null,
      reviewsCount: typeof w.place?.reviewsCount === 'number' ? w.place.reviewsCount : null,
      score: typeof info?.score === 'number' ? Math.max(0, Math.min(100, info.score)) : 0,
      status: 'new' as const,
      source: serper.mocked || w.place?.source === 'mock' ? 'mock' : 'serper',
      tenantId,
      projectId: projectId ?? null,
    }

    if (persist) {
      try {
        const lead = await db.lead.create({ data: leadData })
        await db.activity.create({
          data: {
            type: 'created',
            message: `Auto-generated lead «${lead.name}» (score ${lead.score})`,
            leadId: lead.id,
            tenantId,
          },
        })
        created.push(lead)
      } catch (err: any) {
        skipped.push({ title: w.title, error: String(err?.message ?? err) })
      }
    } else {
      created.push({ ...leadData, id: null })
    }
  }

  return NextResponse.json({
    query,
    location: location ?? null,
    serperMocked: Boolean(serper.mocked),
    totalFound: work.length,
    createdCount: created.length,
    skippedCount: skipped.length,
    leads: created,
    skipped,
  })
}

export const POST = withProtection(handler, {
  rateLimit: 'ai',
  audit: {
    type: 'created',
    message: (req) => `Lead generation triggered: ${new URL(req.url).pathname}`,
    tenantId: (req) => getTenantIdFromRequest(req),
  },
})

/**
 * Google Maps scraper.
 *
 * Original spec used Playwright to load Google Maps and extract business
 * cards. This module supports two modes:
 *
 * 1. **Serper Places API** (when SERPER_API_KEY is set) — returns real
 *    business data including ratings and review counts.
 *
 * 2. **Playwright headless browser** (when PLAYWRIGHT_ENABLED=true) —
 *    loads Google Maps directly and extracts reviews. Requires
 *    `bun add playwright && bunx playwright install chromium`.
 *
 * 3. **Mock fallback** (default in sandbox) — generates deterministic
 *    realistic data so the demo is fully functional.
 */

import type { SerperResult } from './serper'

export interface MapsPlace {
  name: string
  address?: string
  phone?: string
  website?: string
  rating?: number
  reviewsCount?: number
  category?: string
  reviews?: PlaceReview[]
  source: 'serper-places' | 'playwright' | 'mock'
}

export interface PlaceReview {
  author: string
  rating: number
  text: string
  date?: string
}

export async function scrapePlaces(
  query: string,
  location?: string,
  maxResults = 10,
): Promise<MapsPlace[]> {
  const apiKey = process.env.SERPER_API_KEY
  const fullQuery = location ? `${query} in ${location}` : query

  // 1. Try Playwright if explicitly enabled
  if (process.env.PLAYWRIGHT_ENABLED === 'true') {
    try {
      const playwrightResults = await scrapeWithPlaywright(fullQuery, maxResults)
      if (playwrightResults.length > 0) return playwrightResults
    } catch (err) {
      console.error('[maps-scraper] Playwright failed, falling back:', err)
    }
  }

  // 2. Try Serper Places API
  if (apiKey) {
    try {
      const res = await fetch('https://google.serper.dev/places', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: fullQuery }),
        cache: 'no-store',
      })
      if (!res.ok) return []
      const data = await res.json()
      const places: MapsPlace[] = (data.places ?? []).slice(0, maxResults).map((p: any) => ({
        name: p.title ?? p.name,
        address: p.address,
        phone: p.phoneNumber,
        website: p.website,
        rating: typeof p.rating === 'number' ? p.rating : undefined,
        reviewsCount: p.ratingCount,
        category: p.category ?? p.type,
        source: 'serper-places',
      }))
      return places
    } catch {
      return []
    }
  }

  // 3. Mock fallback
  return mockPlaces(fullQuery, maxResults)
}

/**
 * Convert generic Serper organic results into MapsPlace-shaped objects.
 */
export function placesFromOrganic(results: SerperResult[]): MapsPlace[] {
  return results.map((r) => ({
    name: r.title.split('—')[0].trim(),
    website: r.link,
    category: r.title.split('—')[1]?.trim(),
    source: 'mock',
  }))
}

/**
 * Playwright-based scraper.
 *
 * Loads Google Maps, searches for the query, and extracts business cards
 * including name, address, phone, website, rating, review count, and
 * top 3 reviews.
 *
 * Requires: `bun add playwright && bunx playwright install chromium`
 * Enable via: PLAYWRIGHT_ENABLED=true
 */
async function scrapeWithPlaywright(query: string, maxResults: number): Promise<MapsPlace[]> {
  // Dynamic import via variable specifier — Playwright is an optional
  // dependency, and this keeps TypeScript from requiring it at build time.
  let chromium: any
  try {
    const moduleName = 'playwright'
    const playwright = await import(moduleName)
    chromium = playwright.chromium
  } catch {
    console.warn('[maps-scraper] Playwright not installed. Run: bun add playwright && bunx playwright install chromium')
    return []
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Wait for results to load
    await page.waitForSelector('[role="article"], [aria-label*="Results"]', { timeout: 15000 })

    // Scroll to load more results
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('End')
      await page.waitForTimeout(1500)
    }

    // Extract business cards
    const places: MapsPlace[] = await page.evaluate((max) => {
      const cards = Array.from(document.querySelectorAll('[role="article"]')).slice(0, max)
      return cards.map((card) => {
        const getText = (sel: string) => card.querySelector(sel)?.textContent?.trim() ?? undefined

        const name = getText('.fontHeadlineLarge') || getText('h3') || 'Unknown'
        const address = card.querySelector('[data-item-id="address"]')?.getAttribute('aria-label') ?? undefined
        const phone = card.querySelector('[data-item-id*="phone"]')?.getAttribute('aria-label') ?? undefined
        const website = card.querySelector('a[data-item-id="authority"]')?.getAttribute('href') ?? undefined
        const ratingText = getText('.MW4etd')
        const rating = ratingText ? parseFloat(ratingText) : undefined
        const reviewsText = getText('.UY7F9')
        const reviewsCount = reviewsText ? parseInt(reviewsText.replace(/[^\d]/g, '')) : undefined
        const category = getText('.W4Efsd span:nth-child(2)')

        return {
          name,
          address,
          phone,
          website,
          rating,
          reviewsCount,
          category,
          source: 'playwright' as const,
        }
      })
    }, maxResults)

    // Optionally extract top reviews for each place (slower)
    if (process.env.PLAYWRIGHT_EXTRACT_REVIEWS === 'true') {
      for (const place of places.slice(0, 3)) {
        try {
          // Click on the place card to open details
          await page.click(`text="${place.name}"`)
          await page.waitForTimeout(2000)

          // Extract reviews
          place.reviews = await page.evaluate(() => {
            const reviewEls = Array.from(document.querySelectorAll('[data-review-id]')).slice(0, 3)
            return reviewEls.map((el) => {
              const author = el.querySelector('.d4r55')?.textContent?.trim() ?? 'Anonymous'
              const ratingText = el.querySelector('.kvMYJc')?.getAttribute('aria-label') ?? ''
              const rating = parseInt(ratingText) || 0
              const text = el.querySelector('.wiI7pd')?.textContent?.trim() ?? ''
              const date = el.querySelector('.rsqaWe')?.textContent?.trim() ?? undefined
              return { author, rating, text, date }
            })
          })

          // Go back to results
          await page.goBack()
          await page.waitForTimeout(1000)
        } catch {
          // Skip review extraction on error
        }
      }
    }

    return places
  } finally {
    await browser.close()
  }
}

// ============================================================================
// Mock data generator
// ============================================================================

function mockPlaces(query: string, max: number): MapsPlace[] {
  const seed = hashStr(query)
  const cats = ['Restaurant', 'Cafe', 'Gym', 'Salon', 'Agency', 'Clinic', 'Store']
  const cities = ['Tehran', 'Dubai', 'Istanbul', 'Berlin', 'Toronto']
  const reviewAuthors = ['John D.', 'Sarah M.', 'Ahmed K.', 'Lisa W.', 'Yuki T.', 'Carlos R.', 'Nina P.', 'Omar F.']
  const reviewTexts = [
    'Great service and friendly staff. Highly recommend!',
    'Good experience overall, will come back again.',
    'Average experience, nothing special but decent value.',
    'Excellent! Exceeded my expectations in every way.',
    'Disappointing visit, slow service and high prices.',
    'Solid choice, reliable quality and good customer care.',
  ]

  const out: MapsPlace[] = []
  const count = Math.min(max, 8)
  for (let i = 0; i < count; i++) {
    const rng = mulberry32(seed + i * 7)
    const cat = cats[Math.floor(rng() * cats.length)]
    const city = cities[Math.floor(rng() * cities.length)]
    const rating = 3.5 + rng() * 1.5
    const reviews = Math.floor(20 + rng() * 480)
    const name = `${cat} ${i + 1} of ${city}`
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    // Generate 2-3 mock reviews
    const reviewCount = 2 + Math.floor(rng() * 2)
    const placeReviews: PlaceReview[] = []
    for (let r = 0; r < reviewCount; r++) {
      const rRng = mulberry32(seed + i * 7 + r * 13)
      placeReviews.push({
        author: reviewAuthors[Math.floor(rRng() * reviewAuthors.length)],
        rating: Math.floor(3 + rRng() * 3),
        text: reviewTexts[Math.floor(rRng() * reviewTexts.length)],
        date: new Date(Date.now() - Math.floor(rRng() * 90) * 86400000).toISOString().slice(0, 10),
      })
    }

    out.push({
      name,
      address: `${100 + i} Sample St, ${city}`,
      phone: `+1-555-01${String(i).padStart(2, '0')}-${String(1000 + i).slice(-4)}`,
      website: `https://${slug}.example.com`,
      rating: Math.round(rating * 10) / 10,
      reviewsCount: reviews,
      category: cat,
      reviews: placeReviews,
      source: 'mock',
    })
  }
  return out
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

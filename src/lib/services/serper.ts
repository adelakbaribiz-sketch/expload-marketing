/**
 * Serper API client.
 * Searches Google via https://serper.dev for business leads.
 *
 * If no API key is configured, falls back to a deterministic mock that
 * returns realistic-looking results so the dashboard remains usable in
 * the sandbox environment.
 */

const SERPER_BASE = 'https://google.serper.dev'

export interface SerperResult {
  title: string
  link: string
  snippet: string
  position?: number
  source?: 'serper' | 'mock'
}

export interface SerperResponse {
  organic?: SerperResult[]
  knowledgeGraph?: {
    title?: string
    website?: string
    description?: string
    attributes?: Record<string, string>
  }
  error?: string
  mocked?: boolean
}

function getApiKey(): string | null {
  return process.env.SERPER_API_KEY ?? null
}

export async function searchBusinesses(
  query: string,
  location?: string,
  num = 10,
): Promise<SerperResponse> {
  const apiKey = getApiKey()
  const fullQuery = location ? `${query} in ${location}` : query

  if (!apiKey) {
    // Mock — keeps the app functional without a paid API key.
    return mockSearch(fullQuery, num)
  }

  try {
    const res = await fetch(`${SERPER_BASE}/search`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: fullQuery, num }),
      cache: 'no-store',
    })
    if (!res.ok) {
      return { error: `Serper responded ${res.status}: ${await res.text()}` }
    }
    const data = await res.json()
    return {
      organic: (data.organic ?? []).map((r: any, i: number) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet ?? '',
        position: r.position ?? i + 1,
        source: 'serper' as const,
      })),
      knowledgeGraph: data.knowledgeGraph,
    }
  } catch (err: any) {
    return { error: String(err?.message ?? err) }
  }
}

/* ------------------------------ mock fallback ------------------------------ */

function mockSearch(query: string, num: number): SerperResponse {
  const seed = hashStr(query)
  const industries = [
    'Software',
    'Restaurant',
    'Retail',
    'Marketing Agency',
    'Real Estate',
    'Fitness',
    'Consulting',
    'E-commerce',
    'Law Firm',
    'Dental Clinic',
    'Auto Repair',
    'Beauty Salon',
  ]
  const cities = ['Tehran', 'Dubai', 'Istanbul', 'Berlin', 'Toronto', 'Singapore']
  const baseNames = [
    'Nexus', 'Apex', 'Lumen', 'Vertex', 'Pulse', 'Quanta', 'Stellar',
    'Helix', 'Cobalt', 'Zenith', 'Orbit', 'Flux', 'Atlas', 'Prism',
  ]
  const suffixes = ['Group', 'Studio', 'Labs', 'Co.', 'Solutions', 'Hub', 'Works']

  const results: SerperResult[] = []
  const count = Math.min(num, 12)
  for (let i = 0; i < count; i++) {
    const rng = mulberry32(seed + i)
    const name = `${baseNames[Math.floor(rng() * baseNames.length)]} ${suffixes[Math.floor(rng() * suffixes.length)]}`
    const industry = industries[Math.floor(rng() * industries.length)]
    const city = cities[Math.floor(rng() * cities.length)]
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '-')
    results.push({
      title: `${name} — ${industry} (${city})`,
      link: `https://${slug}.example.com`,
      snippet: `${name} is a leading ${industry.toLowerCase()} provider based in ${city}. We offer ${industry.toLowerCase()} services, expert consultation, and dedicated customer support. Contact us for a free quote.`,
      position: i + 1,
      source: 'mock',
    })
  }
  return { organic: results, mocked: true }
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

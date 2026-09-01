import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize'

/**
 * Backlink Discovery endpoint.
 *
 * Discovers backlink opportunities for a target domain. In production,
 * this would integrate with Ahrefs/SEMrush/Majestic APIs. In sandbox,
 * it generates realistic mock opportunities.
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const targetDomain = sanitizeText(String(body.domain || ''), 200)
  const maxResults = Math.min(Number(body.maxResults || 10), 30)

  if (!targetDomain) {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 })
  }

  const targetUrl = sanitizeUrl(`https://${targetDomain}`) ?? `https://${targetDomain}`

  // Generate mock backlink opportunities
  const niches = ['marketing', 'business', 'technology', 'finance', 'health', 'education', 'travel', 'food']
  const tlds = ['.com', '.org', '.net', '.io', '.co', '.blog']
  const opportunities: any[] = []

  for (let i = 0; i < maxResults; i++) {
    const rng = Math.random()
    const niche = niches[Math.floor(rng * niches.length)]
    const tld = tlds[Math.floor(rng * tlds.length)]
    const sourceDomain = `${niche}-${String.fromCharCode(97 + i)}guide${tld}`

    const da = 20 + Math.floor(Math.random() * 70)
    const pa = 15 + Math.floor(Math.random() * 65)
    const relevance = 40 + Math.floor(Math.random() * 55)

    const created = await db.backlinkOpportunity.create({
      data: {
        sourceDomain,
        sourceUrl: `https://${sourceDomain}/resources`,
        targetUrl,
        domainAuthority: da,
        pageAuthority: pa,
        relevanceScore: relevance,
        linkType: Math.random() > 0.2 ? 'dofollow' : 'nofollow',
        status: 'discovered',
        contactEmail: `info@${sourceDomain}`,
        tenantId,
      },
    })
    opportunities.push(created)
  }

  return NextResponse.json({
    domain: targetDomain,
    discovered: opportunities.length,
    opportunities,
  })
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { getAuthUserId } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize'

export async function GET() {
  const tenantId = await requireTenantId()
  const links = await db.promoLink.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { clicks: true } } },
    take: 100,
  })
  return NextResponse.json({ links })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const userId = await getAuthUserId()
  const body = await req.json().catch(() => ({}))

  // Generate short code
  const crypto = await import('crypto')
  const shortCode = crypto.randomBytes(4).toString('hex')
  const shortUrl = `${req.headers.get('origin') || 'https://expload.io'}/p/${shortCode}`

  // Build target URL with UTM
  const targetUrl = sanitizeUrl(body.targetUrl) ?? ''
  const utmParams = new URLSearchParams()
  if (body.utmSource) utmParams.set('utm_source', body.utmSource)
  if (body.utmMedium) utmParams.set('utm_medium', body.utmMedium)
  if (body.utmCampaign) utmParams.set('utm_campaign', body.utmCampaign)
  if (body.utmTerm) utmParams.set('utm_term', body.utmTerm)
  if (body.utmContent) utmParams.set('utm_content', body.utmContent)
  const finalUrl = utmParams.toString() ? `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}${utmParams}` : targetUrl

  const link = await db.promoLink.create({
    data: {
      shortCode,
      shortUrl,
      targetUrl: finalUrl,
      utmSource: sanitizeText(body.utmSource, 100) || null,
      utmMedium: sanitizeText(body.utmMedium, 100) || null,
      utmCampaign: sanitizeText(body.utmCampaign, 100) || null,
      utmTerm: sanitizeText(body.utmTerm, 100) || null,
      utmContent: sanitizeText(body.utmContent, 100) || null,
      name: sanitizeText(body.name, 200),
      description: body.description ? sanitizeText(body.description, 500) : null,
      category: body.category || 'general',
      tags: body.tags ? JSON.stringify(body.tags) : null,
      qrCodeColor: body.qrCodeColor || '#0A2A3A',
      qrCodeSize: Number(body.qrCodeSize || 300),
      variantLabel: body.variantLabel || null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      tenantId,
      createdById: userId || null,
    },
  })

  // Generate social share links
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shortUrl)}&text=${encodeURIComponent(body.name || '')}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shortUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent((body.name || '') + ' ' + shortUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shortUrl)}&text=${encodeURIComponent(body.name || '')}`,
    email: `mailto:?subject=${encodeURIComponent(body.name || 'Check this out')}&body=${encodeURIComponent(shortUrl)}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(shortUrl)}&title=${encodeURIComponent(body.name || '')}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shortUrl)}&description=${encodeURIComponent(body.name || '')}`,
  }

  return NextResponse.json({ link, shareLinks, qrCodeData: `https://api.qrserver.com/v1/create-qr-code/?size=${link.qrCodeSize}x${link.qrCodeSize}&color=${link.qrCodeColor.replace('#','')}&data=${encodeURIComponent(shortUrl)}` }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

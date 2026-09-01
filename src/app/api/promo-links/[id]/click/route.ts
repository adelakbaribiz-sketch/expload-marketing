import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** Track a click on a promo link (public, no auth). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const link = await db.promoLink.findUnique({ where: { id } })
  if (!link || !link.isActive) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const ua = req.headers.get('user-agent') || ''
  const referer = req.headers.get('referer') || ''

  // Detect device
  const device = /Mobile|Android|iPhone/.test(ua) ? 'mobile' : /iPad|Tablet/.test(ua) ? 'tablet' : 'desktop'

  // Record click
  await db.promoLinkClick.create({
    data: {
      promoLinkId: id,
      ipAddress: ip.slice(0, 50),
      userAgent: ua.slice(0, 200),
      referer: referer.slice(0, 200),
      device,
    },
  })

  // Update link stats
  await db.promoLink.update({
    where: { id },
    data: { totalClicks: { increment: 1 } },
  })

  return NextResponse.json({ ok: true, targetUrl: link.targetUrl })
}

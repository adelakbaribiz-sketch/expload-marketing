import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { registry } from '@/lib/observability/metrics'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Prometheus scrape endpoint. A scraper (Prometheus itself, not a
 * browser) can't carry the app's session cookie, so this route is public
 * in proxy.ts and does its own bearer-token check instead — the same
 * "public route, self-checked auth" pattern already used for the crypto
 * webhook receiver and NOWPayments signature verification.
 *
 * Security-by-default: with no METRICS_TOKEN configured, this endpoint
 * refuses every request rather than serving metrics with no auth at all.
 */
export async function GET(req: NextRequest) {
  const token = process.env.METRICS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'not_configured', message: 'METRICS_TOKEN is not set' }, { status: 503 })
  }

  const auth = req.headers.get('authorization')
  const provided = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!provided || !safeEqual(provided, token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await registry.metrics()
  return new NextResponse(body, {
    headers: { 'Content-Type': registry.contentType },
  })
}

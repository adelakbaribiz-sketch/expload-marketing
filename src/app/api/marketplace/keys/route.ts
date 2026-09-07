import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText } from '@/lib/security/sanitize'

export async function GET() {
  const tenantId = await requireTenantId()
  const keys = await db.apiKey.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { products: { select: { id: true, name: true } } },
  })
  // Mask the key for security
  const maskedKeys = keys.map(k => ({ ...k, key: k.key.slice(0, 12) + '••••••••' }))
  return NextResponse.json({ keys: maskedKeys })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))

  // Generate a secure API key
  const crypto = await import('crypto')
  const key = `em_${crypto.randomBytes(24).toString('hex')}`

  const apiKey = await db.apiKey.create({
    data: {
      key,
      name: sanitizeText(body.name || 'My API Key', 100),
      tenantId,
      productIds: body.productIds ? JSON.stringify(body.productIds) : null,
      billingCycle: body.billingCycle || 'prepaid',
      // `balance` (documented as "prepaid balance in USD") is deliberately
      // NOT settable by the client — always starts at 0. Found in the
      // Phase 20 audit: this previously let any tenant member mint an
      // arbitrary prepaid balance for themselves with no payment. No
      // metering code currently decrements/consumes this balance anywhere
      // in the codebase, so it wasn't yet exploitable for real spend, but
      // it already misrepresented state on the marketplace usage
      // dashboard and would become a real gap the moment metering is
      // wired up. A real top-up mechanism (SuperAdmin-confirmed, matching
      // the pattern used for support-plan/license/subscription payments
      // elsewhere in this audit) can be added when metering exists.
      customRateLimit: body.customRateLimit || null,
      customDailyLimit: body.customDailyLimit || null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  })

  // Return the full key only once
  return NextResponse.json({ apiKey, keyShownOnce: true }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

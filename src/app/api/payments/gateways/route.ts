import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()
  // PaymentGatewayConfig is platform-global (no tenantId) and stores live
  // payment-provider credentials (apiKey/secretKey/webhookSecret) — this
  // previously had NO role check on GET at all, so any authenticated user
  // of any tenant (self-signup is public) could fetch every configured
  // gateway's real Stripe/PayPal/NOWPayments secrets in plaintext. Gateway
  // config is a platform-operator concern, not tenant-user data.
  if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (req.method === 'GET') {
    return NextResponse.json({
      // The dashboard's admin form only ever WRITES these fields (password
      // inputs, never pre-filled) — nothing reads them back from GET, so
      // they're safely omitted rather than merely masked.
      gateways: await db.paymentGatewayConfig.findMany({
        orderBy: { priority: 'asc' },
        omit: { apiKey: true, secretKey: true, webhookSecret: true },
      }),
    })
  }

  if (req.method === 'POST') {
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const config = await db.paymentGatewayConfig.create({
      data: {
        provider: body.provider,
        displayName: body.displayName,
        apiKey: body.apiKey, // app-layer should encrypt before persisting in production
        secretKey: body.secretKey,
        webhookSecret: body.webhookSecret,
        merchantId: body.merchantId,
        supportedCurrencies: JSON.stringify(body.supportedCurrencies ?? []),
        supportedMethods: JSON.stringify(body.supportedMethods ?? []),
        supportedCountries: JSON.stringify(body.supportedCountries ?? []),
        isActive: body.isActive ?? false,
        isSandbox: body.isSandbox ?? true,
        priority: body.priority ?? 100,
        routeBy: body.routeBy ?? 'currency',
        routeRules: body.routeRules ? JSON.stringify(body.routeRules) : null,
        fees: body.fees ? JSON.stringify(body.fees) : null,
        settlementTime: body.settlementTime,
      },
    })
    return NextResponse.json({ gateway: config }, { status: 201 })
  }

  if (req.method === 'PATCH') {
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const update: any = {}
    for (const f of ['displayName', 'isActive', 'isSandbox', 'priority', 'routeBy', 'settlementTime']) {
      if (f in body) update[f] = body[f]
    }
    if (body.apiKey) update.apiKey = body.apiKey
    if (body.secretKey) update.secretKey = body.secretKey
    if (body.webhookSecret) update.webhookSecret = body.webhookSecret
    if (body.supportedCurrencies) update.supportedCurrencies = JSON.stringify(body.supportedCurrencies)
    if (body.supportedMethods) update.supportedMethods = JSON.stringify(body.supportedMethods)
    if (body.supportedCountries) update.supportedCountries = JSON.stringify(body.supportedCountries)
    const config = await db.paymentGatewayConfig.update({ where: { provider: body.provider }, data: update })
    return NextResponse.json({ gateway: config })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

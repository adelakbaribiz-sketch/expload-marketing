import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { createCryptoPayment, getCryptoRates, PaymentGatewayUnavailableError } from '@/lib/payment/crypto'
import { withProtection } from '@/lib/security/with-protection'
import { withIdempotency } from '@/lib/security/idempotency'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    // Return supported currencies + rates
    const rates = await getCryptoRates()
    return NextResponse.json({
      currencies: Object.keys(rates),
      rates,
      chains: ['bitcoin', 'ethereum', 'tron', 'bsc', 'solana', 'polygon'],
    })
  }

  if (req.method === 'POST') {
    // Opt-in via an `Idempotency-Key` header — a client retrying "the
    // same" checkout request (network blip, double-tapped submit) gets
    // back the exact same payment record instead of creating a second
    // one. The single highest "duplicate request = real money" endpoint
    // in the app; see RELIABILITY-AUDIT.md — no general mechanism existed
    // for this anywhere before this phase.
    return withIdempotency(req, `payments-crypto-create:${user.tenantId}`, async () => {
      const body = await req.json()
      // Previously: a primary-gateway failure with no PLATFORM_WALLET_*
      // configured for the manual fallback threw uncaught past this route
      // (see PaymentGatewayUnavailableError's own comment). Caught here
      // for a clean, honest 503 — "we can't take this payment right now"
      // — instead of an opaque 500.
      let record, response
      try {
        ;({ record, response } = await createCryptoPayment({
          amount: body.amount,
          fiatCurrency: body.fiatCurrency ?? 'USD',
          cryptoCurrency: body.cryptoCurrency,
          chain: body.chain,
          tenantId: user.tenantId,
          distributorId: body.distributorId,
          invoiceId: body.invoiceId,
          description: body.description,
          orderId: body.orderId,
        }))
      } catch (err) {
        if (err instanceof PaymentGatewayUnavailableError) {
          return NextResponse.json(
            { error: 'payment_gateway_unavailable', message: 'Crypto payment is temporarily unavailable. Please try again shortly or use another payment method.' },
            { status: 503 },
          )
        }
        throw err
      }
      return NextResponse.json({ payment: record, checkout: response }, { status: 201 })
    })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

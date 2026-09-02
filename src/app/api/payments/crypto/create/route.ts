import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { createCryptoPayment, getCryptoRates } from '@/lib/payment/crypto'
import { withProtection } from '@/lib/security/with-protection'

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
    const body = await req.json()
    const { record, response } = await createCryptoPayment({
      amount: body.amount,
      fiatCurrency: body.fiatCurrency ?? 'USD',
      cryptoCurrency: body.cryptoCurrency,
      chain: body.chain,
      tenantId: user.tenantId,
      distributorId: body.distributorId,
      invoiceId: body.invoiceId,
      description: body.description,
      orderId: body.orderId,
    })
    return NextResponse.json({ payment: record, checkout: response }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

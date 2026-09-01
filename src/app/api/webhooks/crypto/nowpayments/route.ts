import { NextRequest, NextResponse } from 'next/server'
import { updateCryptoPaymentStatus, verifyNowPaymentsSignature } from '@/lib/payment/crypto'

/**
 * NOWPayments IPN webhook.
 * Verified via HMAC-SHA512 signature in `x-nowpayments-sig` header.
 */
export async function POST(req: NextRequest) {
  const rawPayload = await req.text()
  const signature = req.headers.get('x-nowpayments-sig') ?? ''

  if (!verifyNowPaymentsSignature(rawPayload, signature)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload: any
  try { payload = JSON.parse(rawPayload) } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const { id, payment_status, status, confirmations } = payload
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  await updateCryptoPaymentStatus(
    id.toString(),
    payment_status ?? status ?? 'waiting',
    confirmations ?? 0,
    payload,
  )

  return NextResponse.json({ ok: true })
}

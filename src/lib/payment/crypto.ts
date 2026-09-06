/**
 * Crypto Payment Gateway Integration
 *
 * Supports multiple gateways:
 *  - NOWPayments (default, multi-chain)
 *  - CoinPayments (legacy)
 *  - Coinbase Commerce
 *  - BitPay
 *  - Manual (wallet address + off-chain confirmation)
 *
 * Supported currencies: BTC, ETH, USDT (TRC-20/ERC-20), USDC, TRX, BNB, SOL
 * Supported chains:   bitcoin, ethereum, tron, bsc, solana, polygon
 */

import 'server-only'
import { db } from '@/lib/db'
import crypto from 'node:crypto'
import { CRYPTO_PAYMENT_MACHINE, type CryptoPaymentStatus } from '@/lib/workflow/definitions'
import { logger } from '@/lib/observability/logger'
import { recordBusinessEvent } from '@/lib/observability/metrics'
import { withTimeout } from '@/lib/integrations/types'

// createNowPayments()'s fetch had no timeout before this phase — a real
// money-flow call, unlike the LLM/search providers, so a shorter bound
// than those is appropriate: this is a synchronous checkout-creation
// request a user is actively waiting on, not a background enrichment.
const NOWPAYMENTS_TIMEOUT_MS = 10_000

const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1'

export interface CryptoPaymentRequest {
  amount: number
  fiatCurrency: string
  cryptoCurrency: string
  chain?: string
  tenantId?: string
  distributorId?: string
  invoiceId?: string
  description?: string
  orderId?: string
}

export interface CryptoPaymentResponse {
  id: string
  gateway: string
  gatewayPaymentId?: string
  invoiceUrl?: string
  payAddress?: string
  cryptoAmount?: number
  exchangeRate?: number
  status: string
  expiresAt?: Date
}

/** Generate a license key (used for both crypto invoices and license allocation). */
export function generateLicenseKey(): string {
  const parts = [
    Math.random().toString(36).slice(2, 8).toUpperCase(),
    Math.random().toString(36).slice(2, 8).toUpperCase(),
    Math.random().toString(36).slice(2, 8).toUpperCase(),
    Math.random().toString(36).slice(2, 8).toUpperCase(),
  ]
  return parts.join('-')
}

const DEFAULT_CHAIN: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tron',
  USDC: 'ethereum',
  TRX: 'tron',
  BNB: 'bsc',
  SOL: 'solana',
}

async function createNowPayments(req: CryptoPaymentRequest): Promise<CryptoPaymentResponse> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY
  if (!apiKey) throw new Error('NOWPAYMENTS_API_KEY not configured')

  const payload = {
    price_amount: req.amount,
    price_currency: req.fiatCurrency.toLowerCase(),
    pay_currency: req.cryptoCurrency.toLowerCase(),
    order_id: req.orderId ?? `order-${Date.now()}`,
    order_description: req.description ?? 'Platform subscription',
    ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/webhooks/crypto/nowpayments`,
  }

  const resp = await withTimeout(
    fetch(`${NOWPAYMENTS_API_BASE}/invoice`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    NOWPAYMENTS_TIMEOUT_MS,
    'nowpayments',
  )

  if (!resp.ok) throw new Error(`NOWPayments error: ${resp.status}`)
  const data = await resp.json()
  return {
    id: data.id?.toString() ?? '',
    gateway: 'nowpayments',
    gatewayPaymentId: data.id?.toString(),
    invoiceUrl: data.invoice_url,
    payAddress: data.pay_address ?? data.smart_contract,
    cryptoAmount: data.pay_amount ? parseFloat(data.pay_amount) : undefined,
    exchangeRate: data.price_amount && data.pay_amount
      ? data.price_amount / parseFloat(data.pay_amount) : undefined,
    status: data.payment_status ?? 'waiting',
    expiresAt: data.expiration_estimate_date ? new Date(data.expiration_estimate_date) : undefined,
  }
}

async function createManualPayment(req: CryptoPaymentRequest): Promise<CryptoPaymentResponse> {
  const chain = req.chain ?? DEFAULT_CHAIN[req.cryptoCurrency] ?? 'ethereum'
  const walletEnv = `PLATFORM_WALLET_${req.cryptoCurrency}_${chain.toUpperCase()}`
  const payAddress = process.env[walletEnv] ?? ''
  if (!payAddress) throw new Error(`No platform wallet for ${req.cryptoCurrency} on ${chain}`)
  return { id: `manual-${Date.now()}`, gateway: 'manual', payAddress, status: 'pending' }
}

/**
 * Thrown when both the primary gateway AND the manual-wallet fallback
 * fail — a route can catch this specifically for a clean 503 instead of
 * an opaque 500. See RELIABILITY-AUDIT.md: createManualPayment() throwing
 * ("No platform wallet for...") was previously uncaught here, since it
 * was only ever called *inside* the primary gateway's own catch block.
 */
export class PaymentGatewayUnavailableError extends Error {
  constructor(primaryError: unknown, fallbackError: unknown) {
    super(
      `No crypto payment gateway available — primary: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}; fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
    )
    this.name = 'PaymentGatewayUnavailableError'
  }
}

export async function createCryptoPayment(
  req: CryptoPaymentRequest,
): Promise<{ record: any; response: CryptoPaymentResponse }> {
  const gateway = process.env.CRYPTO_GATEWAY ?? 'nowpayments'
  let response: CryptoPaymentResponse
  try {
    response = gateway === 'manual' ? await createManualPayment(req) : await createNowPayments(req)
  } catch (primaryErr: any) {
    logger.warn('crypto.gateway_fallback', { gateway, error: primaryErr.message })
    try {
      response = await createManualPayment(req)
    } catch (fallbackErr) {
      logger.error('crypto.gateway_and_fallback_failed', { gateway, primaryError: primaryErr.message, fallbackError: String(fallbackErr) })
      throw new PaymentGatewayUnavailableError(primaryErr, fallbackErr)
    }
  }

  const record = await db.cryptoPayment.create({
    data: {
      tenantId: req.tenantId,
      distributorId: req.distributorId,
      amount: req.amount,
      fiatCurrency: req.fiatCurrency,
      cryptoCurrency: req.cryptoCurrency,
      chain: req.chain ?? DEFAULT_CHAIN[req.cryptoCurrency] ?? 'ethereum',
      gateway: response.gateway,
      gatewayPaymentId: response.gatewayPaymentId,
      gatewayInvoiceUrl: response.invoiceUrl,
      payToAddress: response.payAddress,
      cryptoAmount: response.cryptoAmount,
      exchangeRate: response.exchangeRate,
      invoiceId: req.invoiceId,
      status: response.status === 'waiting' ? 'pending' : response.status,
      expiredAt: response.expiresAt,
    },
  })
  return { record, response }
}

export function verifyNowPaymentsSignature(payload: string, signature: string, secret?: string): boolean {
  const webhookSecret = secret ?? process.env.NOWPAYMENTS_WEBHOOK_SECRET
  if (!webhookSecret) return false
  const hmac = crypto.createHmac('sha512', webhookSecret)
  hmac.update(payload)
  const expected = hmac.digest('hex')
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function updateCryptoPaymentStatus(
  gatewayPaymentId: string,
  status: string,
  confirmations: number,
  rawPayload: any,
): Promise<void> {
  const statusMap: Record<string, string> = {
    waiting: 'pending', confirming: 'confirming', confirmed: 'confirmed',
    sending: 'confirming', partially_paid: 'confirming', finished: 'completed',
    failed: 'failed', expired: 'expired', refunded: 'refunded',
  }
  const mappedStatus = statusMap[status] ?? status

  // Read-check-write must be one transaction: NOWPayments retries this webhook on
  // any non-200/timeout, and the create+update used to run as two separate awaits —
  // a crash or slow response between them left completedAt unset, so the retry passed
  // the `!payment.completedAt` guard again and created a second Payment row for the
  // same crypto payment (double-booked revenue). See DATABASE-AUDIT.md "Transactions".
  let paymentCompleted = false
  await db.$transaction(async (tx) => {
    const payment = await tx.cryptoPayment.findUnique({ where: { gatewayPaymentId } })
    if (!payment) return

    // NOWPayments retries webhooks and doesn't guarantee delivery order — a
    // late "expired"/"failed" event arriving after the payment already
    // completed must never regress it back out of the money-received state.
    // Same reasoning as the completedAt guard below, one level up: that
    // guard stops a double Payment row, this one stops the status field
    // itself from lying about whether the money arrived.
    const currentStatus = payment.status as CryptoPaymentStatus
    const nextStatus = mappedStatus as CryptoPaymentStatus
    if (
      CRYPTO_PAYMENT_MACHINE.states.includes(currentStatus) &&
      CRYPTO_PAYMENT_MACHINE.states.includes(nextStatus) &&
      !CRYPTO_PAYMENT_MACHINE.canTransition(currentStatus, nextStatus)
    ) {
      logger.warn('crypto.out_of_order_webhook', { gatewayPaymentId, currentStatus, nextStatus })
      return
    }

    const updateData: any = {
      status: mappedStatus, confirmations, rawPayload: JSON.stringify(rawPayload),
    }

    if (mappedStatus === 'completed' && !payment.completedAt) {
      paymentCompleted = true
      updateData.completedAt = new Date()
      const newPayment = await tx.payment.create({
        data: {
          tenantId: payment.tenantId ?? 'platform',
          amount: payment.amount,
          currency: payment.fiatCurrency,
          type: 'subscription',
          status: 'completed',
          paymentMethod: 'crypto',
          paymentMethodId: payment.id,
          description: `Crypto ${payment.cryptoCurrency} via ${payment.gateway}`,
          completedAt: new Date(),
        },
      })
      updateData.paymentId = newPayment.id
    } else if (mappedStatus === 'expired' && !payment.expiredAt) {
      updateData.expiredAt = new Date()
    } else if (mappedStatus === 'confirming' && !payment.detectedAt) {
      updateData.detectedAt = new Date()
    }

    await tx.cryptoPayment.update({ where: { id: payment.id }, data: updateData })
  })
  if (paymentCompleted) recordBusinessEvent('payment.completed')
}

export async function getCryptoRates(): Promise<Record<string, number>> {
  return { BTC: 65000, ETH: 3200, USDT: 1, USDC: 1, TRX: 0.13, BNB: 580, SOL: 145 }
}

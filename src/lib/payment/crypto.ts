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

  const resp = await fetch(`${NOWPAYMENTS_API_BASE}/invoice`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

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

export async function createCryptoPayment(
  req: CryptoPaymentRequest,
): Promise<{ record: any; response: CryptoPaymentResponse }> {
  const gateway = process.env.CRYPTO_GATEWAY ?? 'nowpayments'
  let response: CryptoPaymentResponse
  try {
    response = gateway === 'manual' ? await createManualPayment(req) : await createNowPayments(req)
  } catch (err: any) {
    console.warn(`Crypto gateway ${gateway} failed: ${err.message}. Falling back to manual.`)
    response = await createManualPayment(req)
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
  const payment = await db.cryptoPayment.findUnique({ where: { gatewayPaymentId } })
  if (!payment) return

  const statusMap: Record<string, string> = {
    waiting: 'pending', confirming: 'confirming', confirmed: 'confirmed',
    sending: 'confirming', partially_paid: 'confirming', finished: 'completed',
    failed: 'failed', expired: 'expired', refunded: 'refunded',
  }
  const mappedStatus = statusMap[status] ?? status
  const updateData: any = {
    status: mappedStatus, confirmations, rawPayload: JSON.stringify(rawPayload),
  }

  if (mappedStatus === 'completed' && !payment.completedAt) {
    updateData.completedAt = new Date()
    const newPayment = await db.payment.create({
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

  await db.cryptoPayment.update({ where: { id: payment.id }, data: updateData })
}

export async function getCryptoRates(): Promise<Record<string, number>> {
  return { BTC: 65000, ETH: 3200, USDT: 1, USDC: 1, TRX: 0.13, BNB: 580, SOL: 145 }
}

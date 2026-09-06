/**
 * International Payment Gateway Router
 *
 * Routes payments to the appropriate gateway based on:
 *  - Customer country (e.g. SA → Moyasar, IN → Razorpay, NG → Paystack)
 *  - Currency (e.g. SAR → Moyasar/Tap, IDR → Midtrans)
 *  - Payment method (crypto → NOWPayments, card → Stripe/PayPal)
 *
 * Only NOWPayments (crypto) has a real SDK integration in this deployment
 * — see `src/lib/integrations/payment-provider.ts`. Every other gateway
 * previously returned a hardcoded-fake checkout URL/clientSecret with no
 * real API call and no indication it wasn't real (see KNOWN-ISSUES.md).
 * `routePayment()` now fails honestly for those instead of fabricating a
 * checkout link a customer could pay into believing it's real.
 */

import 'server-only'
import { db } from '@/lib/db'
import { getPaymentProvider, type PaymentCheckoutData } from '@/lib/integrations/payment-provider'

export interface PaymentIntent {
  amount: number
  currency: string
  country?: string
  method?: 'card' | 'bank_transfer' | 'paypal' | 'crypto' | 'apple_pay' | 'google_pay'
  tenantId?: string
  distributorId?: string
  description?: string
  metadata?: Record<string, any>
}

export type RoutedPayment = PaymentCheckoutData

/** Get active gateways sorted by priority. */
async function getActiveGateways() {
  return db.paymentGatewayConfig.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  })
}

/** Check if a gateway supports this intent. */
function matchesGateway(g: any, intent: PaymentIntent): boolean {
  const currencies: string[] = g.supportedCurrencies ? JSON.parse(g.supportedCurrencies) : []
  const countries: string[] = g.supportedCountries ? JSON.parse(g.supportedCountries) : []
  const methods: string[] = g.supportedMethods ? JSON.parse(g.supportedMethods) : []

  if (currencies.length > 0 && !currencies.includes(intent.currency)) return false
  if (intent.country && countries.length > 0 && !countries.includes(intent.country)) return false
  if (intent.method && methods.length > 0 && !methods.includes(intent.method)) return false
  return true
}

/**
 * Pick the best gateway for a payment intent and create a checkout through
 * it. Returns `null` only when no *configured* gateway matches the intent
 * at all (not when a matching gateway exists but has no real integration —
 * that's a thrown/rejected result from the provider itself, surfaced to
 * the caller as a real failure, not silently swallowed into `null`).
 */
export async function routePayment(intent: PaymentIntent): Promise<RoutedPayment | null> {
  const gateways = await getActiveGateways()
  if (gateways.length === 0) return null

  const candidates = gateways.filter(g => matchesGateway(g, intent))
  if (candidates.length === 0) return null

  const chosen = candidates[0]
  const provider = getPaymentProvider(chosen.provider)
  const result = await provider.createCheckout({
    amount: intent.amount,
    currency: intent.currency,
    description: intent.description,
    metadata: { ...intent.metadata, tenantId: intent.tenantId },
  })

  if (!result.ok || !result.data) {
    throw new Error(result.error ?? `${chosen.provider} checkout failed`)
  }
  return result.data
}

/** List of supported gateways with metadata — for the settings UI to show which are real vs. unconfigured. */
export const SUPPORTED_GATEWAYS = [
  { id: 'stripe', name: 'Stripe', countries: 'Global', methods: ['card', 'apple_pay', 'google_pay'] },
  { id: 'paypal', name: 'PayPal', countries: 'Global', methods: ['paypal'] },
  { id: 'razorpay', name: 'Razorpay', countries: 'IN', methods: ['card', 'bank_transfer', 'upi'] },
  { id: 'moyasar', name: 'Moyasar', countries: 'SA', methods: ['card', 'apple_pay', 'stc_pay'] },
  { id: 'paystack', name: 'Paystack', countries: 'NG, GH, ZA, KE', methods: ['card', 'bank_transfer', 'mobile_money'] },
  { id: 'flutterwave', name: 'Flutterwave', countries: 'Africa', methods: ['card', 'bank_transfer', 'mobile_money'] },
  { id: 'tap', name: 'Tap', countries: 'MENA', methods: ['card', 'knet', 'mada', 'apple_pay'] },
  { id: 'hyperpay', name: 'HyperPay', countries: 'MENA', methods: ['card', 'mada', 'apple_pay'] },
  { id: 'mollie', name: 'Mollie', countries: 'EU', methods: ['card', 'ideal', 'bancontact', 'sofort'] },
  { id: 'midtrans', name: 'Midtrans', countries: 'ID', methods: ['card', 'qris', 'gopay', 'shopeepay'] },
  { id: 'iyzico', name: 'Iyzico', countries: 'TR', methods: ['card', 'bank_transfer'] },
  { id: 'nowpayments', name: 'NOWPayments', countries: 'Global', methods: ['crypto'] },
  { id: 'coinpayments', name: 'CoinPayments', countries: 'Global', methods: ['crypto'] },
  { id: 'coinbase_commerce', name: 'Coinbase Commerce', countries: 'Global', methods: ['crypto'] },
  { id: 'bitpay', name: 'BitPay', countries: 'Global', methods: ['crypto'] },
].map(g => ({ ...g, configured: getPaymentProvider(g.id).configured }))

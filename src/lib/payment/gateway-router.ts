/**
 * International Payment Gateway Router
 *
 * Routes payments to the appropriate gateway based on:
 *  - Customer country (e.g. SA → Moyasar, IN → Razorpay, NG → Paystack)
 *  - Currency (e.g. SAR → Moyasar/Tap, IDR → Midtrans)
 *  - Payment method (crypto → NOWPayments, card → Stripe/PayPal)
 *  - Amount (micro-payments → Paystack, large → wire)
 *
 * Supported gateways:
 *   - Stripe (global cards)
 *   - PayPal (global wallet)
 *   - Razorpay (India)
 *   - Moyasar (Saudi Arabia)
 *   - Paystack (Nigeria, Africa)
 *   - Flutterwave (Africa)
 *   - Tap / HyperPay (MENA)
 *   - Mollie (EU)
 *   - Midtrans (Indonesia)
 *   - Iyzico (Turkey)
 *   - NOWPayments / CoinPayments (crypto)
 */

import 'server-only'
import { db } from '@/lib/db'

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

export interface RoutedPayment {
  gateway: string
  intent: any
  clientSecret?: string
  redirectUrl?: string
  checkoutUrl?: string
  reference: string
}

/** Get active gateways sorted by priority. */
async function getActiveGateways() {
  return db.paymentGatewayConfig.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  })
}

/** Pick the best gateway for a payment intent. */
export async function routePayment(intent: PaymentIntent): Promise<RoutedPayment | null> {
  const gateways = await getActiveGateways()
  if (gateways.length === 0) return null

  const candidates = gateways.filter(g => matchesGateway(g, intent))
  if (candidates.length === 0) return null
  const chosen = candidates[0]
  return dispatchToGateway(chosen, intent)
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

/** Dispatch to the appropriate gateway SDK. */
async function dispatchToGateway(gateway: any, intent: PaymentIntent): Promise<RoutedPayment> {
  const reference = `pay_${gateway.provider}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  switch (gateway.provider) {
    case 'stripe':
      return createStripeIntent(intent, reference)
    case 'paypal':
      return createPayPalOrder(intent, reference)
    case 'razorpay':
      return createRazorpayOrder(intent, reference)
    case 'moyasar':
      return createMoyasarPayment(intent, reference)
    case 'paystack':
      return createPaystackPayment(intent, reference)
    case 'flutterwave':
      return createFlutterwavePayment(intent, reference)
    case 'tap':
    case 'hyperpay':
      return createTapCheckout(intent, reference, gateway.provider)
    case 'mollie':
      return createMolliePayment(intent, reference)
    case 'midtrans':
      return createMidtransTransaction(intent, reference)
    case 'iyzico':
      return createIyzicoPayment(intent, reference)
    case 'nowpayments':
    case 'coinpayments':
    case 'coinbase_commerce':
    case 'bitpay':
      return createCryptoCheckout(intent, reference, gateway.provider)
    default:
      throw new Error(`Unsupported gateway: ${gateway.provider}`)
  }
}

// ============================================================================
// Gateway-specific adapters (stubs — wire to real SDKs in production)
// ============================================================================

async function createStripeIntent(intent: PaymentIntent, reference: string): Promise<RoutedPayment> {
  // Production: use stripe SDK
  // import Stripe from 'stripe'; const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return {
    gateway: 'stripe', intent,
    clientSecret: `pi_${reference}_secret_mock`,
    reference,
  }
}

async function createPayPalOrder(intent: PaymentIntent, reference: string): Promise<RoutedPayment> {
  return { gateway: 'paypal', intent, redirectUrl: `https://paypal.com/checkout?ref=${reference}`, reference }
}

async function createRazorpayOrder(intent: PaymentIntent, reference: string): Promise<RoutedPayment> {
  // India: UPI, cards, netbanking
  return { gateway: 'razorpay', intent, reference, clientSecret: `rzp_${reference}` }
}

async function createMoyasarPayment(intent: PaymentIntent, reference: string): Promise<RoutedPayment> {
  // Saudi Arabia: mada, Apple Pay, STC Pay
  return { gateway: 'moyasar', intent, reference, checkoutUrl: `https://api.moyasar.com/v1/checkout?ref=${reference}` }
}

async function createPaystackPayment(intent: PaymentIntent, reference: string): Promise<RoutedPayment> {
  // Nigeria/Ghana: cards, bank transfer, USSD, mobile money
  return { gateway: 'paystack', intent, reference, checkoutUrl: `https://checkout.paystack.com/${reference}` }
}

async function createFlutterwavePayment(intent: PaymentIntent, reference: string): Promise<RoutedPayment> {
  // Africa-wide
  return { gateway: 'flutterwave', intent, reference, checkoutUrl: `https://checkout.flutterwave.com/v3/hosted/pay/${reference}` }
}

async function createTapCheckout(intent: PaymentIntent, reference: string, provider: string): Promise<RoutedPayment> {
  // MENA: KNET, mada, Apple Pay, cards
  return { gateway: provider, intent, reference, checkoutUrl: `https://checkout.${provider}.com/v1/checkout?ref=${reference}` }
}

async function createMolliePayment(intent: PaymentIntent, reference: string): Promise<RoutedPayment> {
  // EU: iDEAL, Bancontact, SOFORT, cards
  return { gateway: 'mollie', intent, reference, checkoutUrl: `https://mollie.com/checkout/select-method/${reference}` }
}

async function createMidtransTransaction(intent: PaymentIntent, reference: string): Promise<RoutedPayment> {
  // Indonesia: QRIS, GoPay, ShopeePay, bank transfer
  return { gateway: 'midtrans', intent, reference, checkoutUrl: `https://app.midtrans.com/snap/v3/redirection/${reference}` }
}

async function createIyzicoPayment(intent: PaymentIntent, reference: string): Promise<RoutedPayment> {
  // Turkey: cards, bank transfer
  return { gateway: 'iyzico', intent, reference, checkoutUrl: `https://checkout.iyzico.com/checkout/${reference}` }
}

async function createCryptoCheckout(intent: PaymentIntent, reference: string, provider: string): Promise<RoutedPayment> {
  return { gateway: provider, intent, reference, checkoutUrl: `https://${provider}.com/checkout/${reference}` }
}

/** List of supported gateways with metadata. */
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
]

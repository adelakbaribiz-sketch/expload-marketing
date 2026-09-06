import { timed, type IntegrationResult } from './types'

/**
 * Payment provider adapter. Only one gateway has a real SDK/API
 * integration anywhere in this codebase: NOWPayments (crypto), in
 * `src/lib/payment/crypto.ts`. `src/lib/payment/gateway-router.ts`'s other
 * 10 "gateways" (Stripe, PayPal, Razorpay, Moyasar, Paystack, Flutterwave,
 * Tap/HyperPay, Mollie, Midtrans, Iyzico) previously returned a
 * hardcoded-fake checkout URL/clientSecret with no real API call and no
 * indication it wasn't real — see KNOWN-ISSUES.md's "a customer could
 * believe card payments work when they don't." `UnconfiguredPaymentProvider`
 * replaces that: it fails honestly instead of fabricating a checkout link.
 */

export interface PaymentCheckoutIntent {
  amount: number
  currency: string
  description?: string
  metadata?: Record<string, any>
}

export interface PaymentCheckoutData {
  gateway: string
  reference: string
  checkoutUrl?: string
  clientSecret?: string
}

export interface PaymentProvider {
  readonly name: string
  readonly configured: boolean
  createCheckout(intent: PaymentCheckoutIntent): Promise<IntegrationResult<PaymentCheckoutData>>
}

/**
 * Wraps the real, working NOWPayments integration (`src/lib/payment/crypto.ts`)
 * behind the same interface as every other gateway, so a caller doesn't
 * need to special-case "the one that actually works."
 */
export class NowPaymentsProvider implements PaymentProvider {
  readonly name = 'nowpayments'
  get configured(): boolean {
    return Boolean(process.env.NOWPAYMENTS_API_KEY)
  }

  async createCheckout(intent: PaymentCheckoutIntent): Promise<IntegrationResult<PaymentCheckoutData>> {
    return timed(async () => {
      if (!this.configured) throw new Error('NOWPAYMENTS_API_KEY is not configured')
      const { createCryptoPayment } = await import('@/lib/payment/crypto')
      const { response } = await createCryptoPayment({
        amount: intent.amount,
        fiatCurrency: intent.currency,
        cryptoCurrency: intent.metadata?.cryptoCurrency ?? 'USDT',
        description: intent.description,
        tenantId: intent.metadata?.tenantId,
      })
      return {
        gateway: this.name,
        reference: response.gatewayPaymentId ?? response.id,
        checkoutUrl: response.invoiceUrl ?? response.payAddress,
      }
    })
  }
}

/**
 * Every gateway with no real SDK wiring in this deployment. Fails
 * explicitly with `configured: false` rather than returning a fabricated
 * checkout link — a UI or route calling this must show "unavailable," not
 * quietly hand a customer a fake payment link.
 */
export class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly configured = false
  constructor(readonly name: string) {}

  async createCheckout(_intent: PaymentCheckoutIntent): Promise<IntegrationResult<PaymentCheckoutData>> {
    return {
      ok: false,
      error: `${this.name} has no real payment integration configured in this deployment — wire a real SDK before accepting a payment through it`,
      latencyMs: 0,
    }
  }
}

/** For tests: always "succeeds" with an obviously-fake, clearly-labeled reference. */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock'
  readonly configured = true
  checkouts: PaymentCheckoutIntent[] = []
  failNext = 0

  async createCheckout(intent: PaymentCheckoutIntent): Promise<IntegrationResult<PaymentCheckoutData>> {
    if (this.failNext > 0) {
      this.failNext--
      return { ok: false, error: 'MockPaymentProvider: simulated failure', mocked: true, latencyMs: 0 }
    }
    this.checkouts.push(intent)
    const reference = `mock_${this.checkouts.length}`
    return {
      ok: true,
      data: { gateway: 'mock', reference, checkoutUrl: `https://mock.test/checkout/${reference}` },
      mocked: true,
      latencyMs: 0,
    }
  }
}

const KNOWN_GATEWAYS = [
  'stripe', 'paypal', 'razorpay', 'moyasar', 'paystack', 'flutterwave',
  'tap', 'hyperpay', 'mollie', 'midtrans', 'iyzico',
] as const

/** Registry: real provider for the one gateway that has one, honest "unconfigured" for the rest. */
export function getPaymentProvider(gatewayId: string): PaymentProvider {
  if (gatewayId === 'nowpayments' || gatewayId === 'coinpayments' || gatewayId === 'coinbase_commerce' || gatewayId === 'bitpay') {
    return new NowPaymentsProvider()
  }
  return new UnconfiguredPaymentProvider(gatewayId)
}

export { KNOWN_GATEWAYS }

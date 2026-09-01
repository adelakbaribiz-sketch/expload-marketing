/**
 * Seed: Additional world-famous payment gateways.
 *
 * Run: npx tsx scripts/seed-gateways-extra.ts
 *
 * Adds: Square, Adyen, Klarna, Amazon Pay, Apple Pay, Google Pay,
 *       WeChat Pay, Alipay, MercadoPago, bKash, Nagad, Stripe Terminal,
 *       Verifone, 2Checkout, Skrill, Wise, Payoneer, Worldpay
 */

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const NEW_GATEWAYS = [
  // Global / US
  { provider: 'square', displayName: 'Square', priority: 25, currencies: ['USD'], methods: ['card', 'square_pos', 'cash_app'], countries: ['US', 'CA', 'AU', 'JP', 'GB', 'IE', 'FR', 'ES'] },
  { provider: 'adyen', displayName: 'Adyen', priority: 22, currencies: ['USD', 'EUR', 'GBP', 'JPY'], methods: ['card', 'apple_pay', 'google_pay', 'bancontact', 'ideal', 'sofort', 'klarna', 'alipay', 'wechat_pay'], countries: ['US', 'NL', 'GB', 'DE', 'FR', 'AU', 'SG', 'HK'] },
  { provider: 'klarna', displayName: 'Klarna (BNPL)', priority: 28, currencies: ['USD', 'EUR', 'GBP', 'SEK', 'NOK', 'DKK'], methods: ['klarna_pay_now', 'klarna_pay_later', 'klarna_pay_over_time'], countries: ['US', 'GB', 'DE', 'SE', 'NO', 'DK', 'FI', 'AT', 'NL'] },
  { provider: 'amazon_pay', displayName: 'Amazon Pay', priority: 35, currencies: ['USD', 'EUR', 'GBP', 'JPY'], methods: ['amazon_pay'], countries: ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP'] },
  { provider: 'apple_pay', displayName: 'Apple Pay Direct', priority: 15, currencies: ['USD', 'EUR', 'GBP', 'AED', 'SAR'], methods: ['apple_pay'], countries: ['US', 'GB', 'DE', 'FR', 'AE', 'SA'] },
  { provider: 'google_pay', displayName: 'Google Pay Direct', priority: 16, currencies: ['USD', 'EUR', 'GBP', 'INR'], methods: ['google_pay'], countries: ['US', 'GB', 'DE', 'FR', 'IN', 'AU'] },
  { provider: 'stripe_terminal', displayName: 'Stripe Terminal (In-Person)', priority: 26, currencies: ['USD', 'CAD', 'GBP', 'EUR', 'AUD'], methods: ['card_present', 'interac_present'], countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IE', 'NL'] },
  { provider: 'verifone', displayName: 'Verifone', priority: 50, currencies: ['USD', 'EUR'], methods: ['card', 'apple_pay', 'google_pay'], countries: ['US', 'GB', 'DE'] },
  { provider: '2checkout', displayName: '2Checkout (Verifone)', priority: 55, currencies: ['USD', 'EUR', 'GBP'], methods: ['card', 'paypal'], countries: ['US', 'GB', 'DE', 'FR'] },
  { provider: 'skrill', displayName: 'Skrill (Digital Wallet)', priority: 48, currencies: ['USD', 'EUR', 'GBP'], methods: ['skrill_wallet'], countries: ['US', 'GB', 'DE', 'FR', 'AT'] },
  { provider: 'wise', displayName: 'Wise (Multi-Currency)', priority: 60, currencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'SGD', 'NZD'], methods: ['bank_transfer'], countries: ['US', 'GB', 'DE', 'FR', 'AU', 'CA', 'JP', 'SG'] },
  { provider: 'payoneer', displayName: 'Payoneer', priority: 62, currencies: ['USD', 'EUR', 'GBP', 'JPY'], methods: ['bank_transfer', 'payoneer_wallet'], countries: ['US', 'GB', 'DE', 'JP'] },
  { provider: 'worldpay', displayName: 'Worldpay', priority: 23, currencies: ['USD', 'EUR', 'GBP'], methods: ['card', 'apple_pay', 'google_pay'], countries: ['US', 'GB', 'DE', 'FR'] },

  // China / Asia
  { provider: 'wechat_pay', displayName: 'WeChat Pay', priority: 32, currencies: ['CNY', 'USD', 'HKD'], methods: ['wechat_pay'], countries: ['CN', 'HK'] },
  { provider: 'alipay', displayName: 'Alipay', priority: 33, currencies: ['CNY', 'USD', 'HKD'], methods: ['alipay'], countries: ['CN', 'HK'] },
  { provider: 'mercadopago', displayName: 'MercadoPago (LATAM)', priority: 30, currencies: ['BRL', 'ARS', 'MXN', 'CLP', 'COP', 'PEN', 'UYU'], methods: ['card', 'mercado_pago_wallet', 'pix'], countries: ['BR', 'AR', 'MX', 'CL', 'CO', 'PE', 'UY'] },
  { provider: 'bkash', displayName: 'bKash (Bangladesh)', priority: 40, currencies: ['BDT'], methods: ['bkash_wallet'], countries: ['BD'] },
  { provider: 'nagad', displayName: 'Nagad (Bangladesh)', priority: 41, currencies: ['BDT'], methods: ['nagad_wallet'], countries: ['BD'] },
  { provider: 'dana', displayName: 'DANA (Indonesia)', priority: 42, currencies: ['IDR'], methods: ['dana_wallet'], countries: ['ID'] },
  { provider: 'gcash', displayName: 'GCash (Philippines)', priority: 43, currencies: ['PHP'], methods: ['gcash_wallet'], countries: ['PH'] },
  { provider: 'truemoney', displayName: 'TrueMoney (Thailand)', priority: 44, currencies: ['THB'], methods: ['truemoney_wallet'], countries: ['TH'] },
  { provider: 'kakaopay', displayName: 'KakaoPay (Korea)', priority: 45, currencies: ['KRW'], methods: ['kakaopay_wallet'], countries: ['KR'] },
  { provider: 'naverpay', displayName: 'NaverPay (Korea)', priority: 46, currencies: ['KRW'], methods: ['naverpay_wallet'], countries: ['KR'] },

  // Russia / CIS
  { provider: 'yookassa', displayName: 'YooKassa (Russia)', priority: 50, currencies: ['RUB', 'USD'], methods: ['card', 'yoo_money', 'sberbank', 'qiwi'], countries: ['RU'] },

  // Brazil specific
  { provider: 'pix', displayName: 'PIX (Brazil)', priority: 31, currencies: ['BRL'], methods: ['pix'], countries: ['BR'] },
]

async function main() {
  console.log(`Adding ${NEW_GATEWAYS.length} new payment gateways...`)
  let added = 0, skipped = 0
  for (const g of NEW_GATEWAYS) {
    const existing = await db.paymentGatewayConfig.findUnique({ where: { provider: g.provider } })
    if (existing) {
      skipped++
      continue
    }
    await db.paymentGatewayConfig.create({
      data: {
        provider: g.provider,
        displayName: g.displayName,
        supportedCurrencies: JSON.stringify(g.currencies),
        supportedMethods: JSON.stringify(g.methods),
        supportedCountries: JSON.stringify(g.countries),
        isActive: false,
        isSandbox: true,
        priority: g.priority,
        routeBy: 'currency',
        fees: JSON.stringify({ percentage: 2.9, fixed: 0.30, currency: 'USD' }),
        settlementTime: 'T+2',
      },
    })
    console.log(`  ✓ ${g.provider.padEnd(20)} ${g.displayName}`)
    added++
  }
  console.log(`\nDone: ${added} added, ${skipped} already existed.`)
  const total = await db.paymentGatewayConfig.count()
  console.log(`Total gateways now: ${total}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())

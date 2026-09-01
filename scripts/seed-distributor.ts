/**
 * Seed: Wholesale Distribution System + Payment Gateways.
 *
 * Run: npx tsx scripts/seed-distributor.ts
 *
 * Creates:
 *  - Default LicensePackages (100/500/1000 seat bundles)
 *  - Default PaymentGatewayConfig entries for all supported gateways
 *  - Default InternalDepartment entries
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Seeding license packages...')
  const packages = [
    { sku: 'PLT-100', name: 'Starter Pack (100 seats)', licenseCount: 100, wholesalePrice: 990, retailPriceSuggestion: 1990, planTier: 'pro', validityMonths: 12, tierRestriction: 'standard' },
    { sku: 'PLT-500', name: 'Growth Pack (500 seats)', licenseCount: 500, wholesalePrice: 4490, retailPriceSuggestion: 9950, planTier: 'pro', validityMonths: 12, tierRestriction: 'silver' },
    { sku: 'PLT-1000', name: 'Scale Pack (1000 seats)', licenseCount: 1000, wholesalePrice: 7990, retailPriceSuggestion: 19900, planTier: 'enterprise', validityMonths: 12, tierRestriction: 'gold' },
    { sku: 'PLT-5000', name: 'Enterprise Pack (5000 seats)', licenseCount: 5000, wholesalePrice: 34990, retailPriceSuggestion: 99500, planTier: 'enterprise', validityMonths: 12, tierRestriction: 'platinum' },
    { sku: 'PLT-10000', name: 'Master Pack (10000 seats)', licenseCount: 10000, wholesalePrice: 59990, retailPriceSuggestion: 199000, planTier: 'enterprise', validityMonths: 12, tierRestriction: 'master' },
  ]
  for (const p of packages) {
    await db.licensePackage.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    })
    console.log(`  ✓ ${p.sku}`)
  }

  console.log('Seeding payment gateway configs...')
  const gateways = [
    { provider: 'stripe', displayName: 'Stripe', priority: 10, supportedCurrencies: ['USD', 'EUR', 'GBP'], supportedMethods: ['card', 'apple_pay', 'google_pay'], supportedCountries: ['US', 'GB', 'DE', 'FR'] },
    { provider: 'paypal', displayName: 'PayPal', priority: 20, supportedCurrencies: ['USD', 'EUR'], supportedMethods: ['paypal'], supportedCountries: [] },
    { provider: 'razorpay', displayName: 'Razorpay (India)', priority: 30, supportedCurrencies: ['INR', 'USD'], supportedMethods: ['card', 'bank_transfer', 'upi'], supportedCountries: ['IN'] },
    { provider: 'moyasar', displayName: 'Moyasar (Saudi)', priority: 30, supportedCurrencies: ['SAR', 'USD'], supportedMethods: ['card', 'apple_pay', 'stc_pay'], supportedCountries: ['SA'] },
    { provider: 'paystack', displayName: 'Paystack (Africa)', priority: 40, supportedCurrencies: ['NGN', 'GHS', 'ZAR', 'KES', 'USD'], supportedMethods: ['card', 'bank_transfer', 'mobile_money'], supportedCountries: ['NG', 'GH', 'ZA', 'KE'] },
    { provider: 'flutterwave', displayName: 'Flutterwave (Africa)', priority: 45, supportedCurrencies: ['NGN', 'GHS', 'KES', 'USD'], supportedMethods: ['card', 'bank_transfer', 'mobile_money'], supportedCountries: ['NG', 'GH', 'KE', 'TZ'] },
    { provider: 'tap', displayName: 'Tap (MENA)', priority: 35, supportedCurrencies: ['SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'EGP', 'USD'], supportedMethods: ['card', 'knet', 'mada', 'apple_pay'], supportedCountries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG'] },
    { provider: 'hyperpay', displayName: 'HyperPay (MENA)', priority: 36, supportedCurrencies: ['SAR', 'AED', 'USD'], supportedMethods: ['card', 'mada', 'apple_pay'], supportedCountries: ['SA', 'AE', 'JO'] },
    { provider: 'mollie', displayName: 'Mollie (EU)', priority: 50, supportedCurrencies: ['EUR', 'GBP'], supportedMethods: ['card', 'ideal', 'bancontact', 'sofort'], supportedCountries: ['NL', 'BE', 'DE', 'FR'] },
    { provider: 'midtrans', displayName: 'Midtrans (Indonesia)', priority: 30, supportedCurrencies: ['IDR', 'USD'], supportedMethods: ['card', 'qris', 'gopay', 'shopeepay'], supportedCountries: ['ID'] },
    { provider: 'iyzico', displayName: 'Iyzico (Turkey)', priority: 30, supportedCurrencies: ['TRY', 'USD'], supportedMethods: ['card', 'bank_transfer'], supportedCountries: ['TR'] },
    { provider: 'nowpayments', displayName: 'NOWPayments (Crypto)', priority: 60, supportedCurrencies: ['USD', 'EUR'], supportedMethods: ['crypto'], supportedCountries: [] },
    { provider: 'coinpayments', displayName: 'CoinPayments (Crypto)', priority: 65, supportedCurrencies: ['USD'], supportedMethods: ['crypto'], supportedCountries: [] },
    { provider: 'coinbase_commerce', displayName: 'Coinbase Commerce (Crypto)', priority: 65, supportedCurrencies: ['USD'], supportedMethods: ['crypto'], supportedCountries: [] },
    { provider: 'bitpay', displayName: 'BitPay (Crypto)', priority: 65, supportedCurrencies: ['USD', 'EUR'], supportedMethods: ['crypto'], supportedCountries: [] },
  ]
  for (const g of gateways) {
    await db.paymentGatewayConfig.upsert({
      where: { provider: g.provider },
      update: {},
      create: {
        provider: g.provider,
        displayName: g.displayName,
        priority: g.priority,
        supportedCurrencies: JSON.stringify(g.supportedCurrencies),
        supportedMethods: JSON.stringify(g.supportedMethods),
        supportedCountries: JSON.stringify(g.supportedCountries),
        isActive: ['stripe', 'nowpayments'].includes(g.provider), // only Stripe + crypto active by default
        isSandbox: true,
        routeBy: 'currency',
        fees: JSON.stringify({ percentage: 2.9, fixed: 0.30, currency: 'USD' }),
        settlementTime: 'T+2',
      },
    })
    console.log(`  ✓ ${g.provider}`)
  }

  console.log('Seeding internal departments...')
  const departments = [
    { name: 'engineering', displayName: 'Engineering', accessScope: 'engineering_only', costCenter: 'ENG' },
    { name: 'partner_management', displayName: 'Partner Management', accessScope: 'distributors_only', costCenter: 'BD' },
    { name: 'finance', displayName: 'Finance & Accounting', accessScope: 'finance_only', costCenter: 'FIN' },
    { name: 'customer_success', displayName: 'Customer Success', accessScope: 'support_only', costCenter: 'CS' },
    { name: 'sales', displayName: 'Sales', accessScope: 'limited', costCenter: 'SALES' },
    { name: 'marketing', displayName: 'Marketing', accessScope: 'limited', costCenter: 'MKT' },
    { name: 'product', displayName: 'Product', accessScope: 'limited', costCenter: 'PROD' },
    { name: 'legal', displayName: 'Legal & Compliance', accessScope: 'limited', costCenter: 'LEGAL' },
    { name: 'hr', displayName: 'Human Resources', accessScope: 'limited', costCenter: 'HR' },
    { name: 'executive', displayName: 'Executive (C-Suite)', accessScope: 'full_platform', costCenter: 'EXEC' },
  ]
  for (const d of departments) {
    await db.internalDepartment.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    })
    console.log(`  ✓ ${d.name}`)
  }

  console.log('✓ Seed complete.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

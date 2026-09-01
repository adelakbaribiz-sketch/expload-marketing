/**
 * Comprehensive Financial Reports Engine
 *
 * Generates daily / weekly / monthly reports for different audiences:
 *  - Platform Admin (sees everything)
 *  - Distributor (sees own sales, licenses, payouts)
 *  - Affiliate/Reseller (sees own referrals, commissions)
 *  - Internal Employee (sees their assigned accounts)
 */

import 'server-only'
import { db } from '@/lib/db'
import { llmAggregator } from '@/lib/llm/aggregator'
import { emitNotificationEvent } from '@/lib/notifications/emitter'

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
export type ReportAudience = 'admin' | 'distributor' | 'affiliate' | 'employee' | 'platform'

export interface ReportParams {
  audience: ReportAudience
  period: ReportPeriod
  startDate: Date
  endDate: Date
  scopeId?: string
  tenantId?: string
  generateAiInsights?: boolean
}

export async function aggregateRevenue(params: ReportParams) {
  const { startDate, endDate } = params
  const payments = await db.payment.findMany({
    where: {
      status: 'completed',
      completedAt: { gte: startDate, lte: endDate },
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
    },
    select: { amount: true, currency: true, type: true, paymentMethod: true, processingFee: true, netAmount: true, commissionAmount: true, resellerTenantId: true, completedAt: true },
  })

  const cryptoPayments = await db.cryptoPayment.findMany({
    where: { status: 'completed', completedAt: { gte: startDate, lte: endDate }, ...(params.tenantId ? { tenantId: params.tenantId } : {}) },
    select: { amount: true, fiatCurrency: true, cryptoCurrency: true, feeAmount: true, completedAt: true },
  })

  const totalGross = payments.reduce((s, p) => s + p.amount, 0) + cryptoPayments.reduce((s, p) => s + p.amount, 0)
  const totalFees = payments.reduce((s, p) => s + p.processingFee, 0) + cryptoPayments.reduce((s, p) => s + (p.feeAmount ?? 0), 0)
  const totalNet = payments.reduce((s, p) => s + p.netAmount, 0)
  const totalCommission = payments.reduce((s, p) => s + p.commissionAmount, 0)

  const byMethod: Record<string, { count: number; gross: number; fees: number }> = {}
  for (const p of payments) {
    const m = p.paymentMethod ?? 'unknown'
    byMethod[m] = byMethod[m] ?? { count: 0, gross: 0, fees: 0 }
    byMethod[m].count++; byMethod[m].gross += p.amount; byMethod[m].fees += p.processingFee
  }
  for (const c of cryptoPayments) {
    const m = `crypto_${c.cryptoCurrency}`
    byMethod[m] = byMethod[m] ?? { count: 0, gross: 0, fees: 0 }
    byMethod[m].count++; byMethod[m].gross += c.amount; byMethod[m].fees += c.feeAmount ?? 0
  }

  const byCurrency: Record<string, number> = {}
  for (const p of payments) byCurrency[p.currency] = (byCurrency[p.currency] ?? 0) + p.amount
  for (const c of cryptoPayments) byCurrency[c.fiatCurrency] = (byCurrency[c.fiatCurrency] ?? 0) + c.amount

  const byDay: Record<string, number> = {}
  for (const p of payments) {
    const day = p.completedAt!.toISOString().slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + p.amount
  }
  for (const c of cryptoPayments) {
    const day = c.completedAt!.toISOString().slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + c.amount
  }

  // Previous period comparison
  const periodMs = endDate.getTime() - startDate.getTime()
  const prevStart = new Date(startDate.getTime() - periodMs)
  const prevEnd = new Date(startDate.getTime() - 1)
  const prevPayments = await db.payment.findMany({
    where: { status: 'completed', completedAt: { gte: prevStart, lte: prevEnd }, ...(params.tenantId ? { tenantId: params.tenantId } : {}) },
    select: { amount: true },
  })
  const prevTotal = prevPayments.reduce((s, p) => s + p.amount, 0)
  const growthPercent = prevTotal > 0 ? ((totalGross - prevTotal) / prevTotal) * 100 : 0

  return { totalGross, totalFees, totalNet, totalCommission, transactionCount: payments.length + cryptoPayments.length, byMethod, byCurrency, byDay, previousPeriodTotal: prevTotal, growthPercent }
}

export async function aggregateDistributorMetrics(distributorId: string, startDate: Date, endDate: Date) {
  const [distributor, licenses, payouts, tickets] = await Promise.all([
    db.distributor.findUnique({ where: { id: distributorId } }),
    db.licenseAllocation.findMany({ where: { distributorId, createdAt: { gte: startDate, lte: endDate } }, select: { status: true, salePrice: true, createdAt: true } }),
    db.distributorPayout.findMany({ where: { distributorId, createdAt: { gte: startDate, lte: endDate } }, select: { status: true, distributorShare: true, grossSales: true, platformShare: true, createdAt: true } }),
    db.distributorSupportTicket.findMany({ where: { distributorId, createdAt: { gte: startDate, lte: endDate } }, select: { status: true, tier: true, priority: true, createdAt: true } }),
  ])

  const activeLicenses = licenses.filter(l => l.status === 'activated' || l.status === 'allocated').length
  const soldLicenses = licenses.filter(l => l.status === 'activated').length
  const revokedLicenses = licenses.filter(l => l.status === 'revoked').length
  const revenue = licenses.reduce((s, l) => s + (l.salePrice ?? 0), 0)
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.distributorShare, 0)
  const paidPayouts = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.distributorShare, 0)
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length

  return {
    distributor,
    licenseStats: { total: licenses.length, active: activeLicenses, sold: soldLicenses, revoked: revokedLicenses, revenue },
    payoutStats: { total: payouts.length, pending: pendingPayouts, paid: paidPayouts },
    ticketStats: { total: tickets.length, open: openTickets, resolved: resolvedTickets, resolutionRate: tickets.length > 0 ? (resolvedTickets / tickets.length) * 100 : 0 },
  }
}

export async function aggregateAffiliateMetrics(tenantId: string, startDate: Date, endDate: Date) {
  const [commissions, customers, referrals] = await Promise.all([
    db.commission.findMany({ where: { resellerTenantId: tenantId, createdAt: { gte: startDate, lte: endDate } }, select: { amount: true, currency: true, type: true, status: true, createdAt: true } }),
    db.resellerCustomer.findMany({ where: { resellerTenantId: tenantId, createdAt: { gte: startDate, lte: endDate } }, select: { status: true, monthlyFee: true, totalRevenue: true, totalPaid: true, createdAt: true } }),
    db.referral.findMany({ where: { referrerTenantId: tenantId, invitedAt: { gte: startDate, lte: endDate } }, select: { status: true, totalRevenue: true, invitedAt: true } }),
  ])

  const totalCommission = commissions.reduce((s, c) => s + c.amount, 0)
  const pendingCommission = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0)
  const paidCommission = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0)
  const newCustomers = customers.filter(c => c.status === 'active').length
  const churnedCustomers = customers.filter(c => c.status === 'churned').length
  const customerRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0)
  const successfulReferrals = referrals.filter(r => r.status === 'qualified' || r.status === 'rewarded').length

  return {
    commissionStats: { total: totalCommission, pending: pendingCommission, paid: paidCommission, count: commissions.length },
    customerStats: { total: customers.length, new: newCustomers, churned: churnedCustomers, revenue: customerRevenue },
    referralStats: { total: referrals.length, successful: successfulReferrals, conversionRate: referrals.length > 0 ? (successfulReferrals / referrals.length) * 100 : 0 },
  }
}

const FINANCIAL_INSIGHTS_PROMPT = `You are a senior financial analyst at a B2B SaaS company. Analyze the provided financial metrics and generate actionable insights in STRICT JSON format.

Your analysis must cover:
1. **summary**: 2-3 sentence executive summary of the period's performance
2. **key_findings**: Array of 3-5 specific findings (with numbers and percentages)
3. **anomalies**: Array of any anomalies detected (sudden drops, unusual spikes, concerning patterns)
4. **recommendations**: Array of 3-5 prioritized action items (high/medium/low priority)
5. **forecasts**: Next-period prediction with confidence level (low/medium/high)
6. **risk_assessment**: 0-100 risk score with brief explanation

Be specific, quantitative, and actionable. Use the numbers provided — do not invent metrics.
If growth is negative, identify the likely cause and suggest a remedy.
If a single payment method dominates >70% of revenue, flag concentration risk.

Return JSON only. No markdown, no prose.`

export async function generateAiInsights(params: ReportParams, metrics: any): Promise<any> {
  if (!params.generateAiInsights) return null
  try {
    const userPrompt = `# Period: ${params.period.toUpperCase()} (${params.startDate.toISOString().slice(0,10)} → ${params.endDate.toISOString().slice(0,10)})
# Audience: ${params.audience}

## Financial Metrics
${JSON.stringify(metrics, null, 2)}

## Task
Analyze these metrics and generate insights per the system prompt.`

    const response = await llmAggregator.complete({
      messages: [
        { role: 'system', content: FINANCIAL_INSIGHTS_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      sessionType: 'financial_analysis',
      sessionId: params.scopeId,
      tenantId: params.tenantId,
      temperature: 0.3,
      maxTokens: 1500,
    })

    let text = response.text.trim()
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) text = jsonMatch[1].trim()
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) text = text.slice(start, end + 1)

    return JSON.parse(text)
  } catch (err) {
    console.error('AI insights generation failed:', err)
    return { error: 'AI insights unavailable', raw_metrics: metrics }
  }
}

export async function generateFinancialReport(params: ReportParams) {
  const revenue = await aggregateRevenue(params)

  let audienceMetrics: any = {}
  if (params.audience === 'distributor' && params.scopeId) {
    audienceMetrics = await aggregateDistributorMetrics(params.scopeId, params.startDate, params.endDate)
  } else if (params.audience === 'affiliate' && params.scopeId) {
    audienceMetrics = await aggregateAffiliateMetrics(params.scopeId, params.startDate, params.endDate)
  } else if (params.audience === 'admin' || params.audience === 'platform') {
    const [tenants, users, distributors, supportSubs] = await Promise.all([
      db.tenant.count({ where: { isActive: true } }),
      db.user.count({ where: { isActive: true } }),
      db.distributor.count({ where: { status: 'active' } }),
      db.supportSubscription.count({ where: { status: 'active' } }),
    ])
    audienceMetrics = { tenants, users, distributors, supportSubs }
  }

  const aiInsights = await generateAiInsights(params, { revenue, audienceMetrics })

  const report = await db.financialReport.create({
    data: {
      scope: params.audience,
      scopeId: params.scopeId,
      periodType: params.period,
      periodStart: params.startDate,
      periodEnd: params.endDate,
      type: 'revenue_summary',
      metrics: JSON.stringify({ revenue, audienceMetrics }),
      breakdown: JSON.stringify({ byMethod: revenue.byMethod, byCurrency: revenue.byCurrency, byDay: revenue.byDay }),
      generatedByName: 'system',
      generationMethod: 'auto',
      status: 'generated',
    },
  })

  await emitNotificationEvent({
    type: 'financial_report_ready',
    title: `${params.period.charAt(0).toUpperCase() + params.period.slice(1)} report ready`,
    message: `${params.audience} report: $${revenue.totalGross.toFixed(2)} gross, ${revenue.transactionCount} transactions, ${revenue.growthPercent > 0 ? '+' : ''}${revenue.growthPercent.toFixed(1)}% vs previous period.`,
    severity: 'info',
    tenantId: params.tenantId,
    category: 'finance',
    metadata: { reportId: report.id, audience: params.audience, period: params.period },
  })

  return { reportId: report.id, period: params.period, audience: params.audience, startDate: params.startDate, endDate: params.endDate, revenue, audienceMetrics, aiInsights }
}

export function computePeriodDates(period: ReportPeriod, referenceDate: Date = new Date()): { start: Date; end: Date } {
  const end = new Date(referenceDate)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  switch (period) {
    case 'daily': start.setHours(0, 0, 0, 0); break
    case 'weekly': start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0); break
    case 'monthly': start.setMonth(start.getMonth() - 1); start.setHours(0, 0, 0, 0); break
    case 'quarterly': start.setMonth(start.getMonth() - 3); start.setHours(0, 0, 0, 0); break
    case 'annual': start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0); break
  }
  return { start, end }
}

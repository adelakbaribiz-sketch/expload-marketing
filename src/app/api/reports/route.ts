import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'
import { generateFinancialReport, computePeriodDates, ReportPeriod, ReportAudience } from '@/lib/finance/reports'
import { toCsv, csvResponse } from '@/lib/export/csv'
import { buildPdfReport, pdfResponse } from '@/lib/export/pdf'

/**
 * Unified report generator.
 *
 * Query params:
 *   period: daily | weekly | monthly | quarterly | annual  (default: monthly)
 *   audience: admin | distributor | affiliate | employee | platform  (default: based on user role)
 *   scopeId: distributorId / tenantId (for distributor/affiliate)
 *   aiInsights: true | false (default: true)
 *   customStart: ISO date (optional — overrides period)
 *   customEnd: ISO date (optional — overrides period)
 *   format: json (default) | csv | pdf
 */

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const period = (url.searchParams.get('period') ?? 'monthly') as ReportPeriod
  const requestedAudience = url.searchParams.get('audience') as ReportAudience | null
  const scopeId = url.searchParams.get('scopeId') ?? undefined
  const aiInsights = url.searchParams.get('aiInsights') !== 'false'
  const customStart = url.searchParams.get('customStart')
  const customEnd = url.searchParams.get('customEnd')

  // Determine audience based on role. The client's requested audience was
  // previously trusted as-is when present — any authenticated user could
  // pass ?audience=admin (or platform) and receive platform-wide
  // tenant/user/distributor counts from generateFinancialReport's admin
  // branch, which has no authorization check of its own (it just computes
  // whatever scope it's told to). Downgrade an unauthorized admin/platform
  // request instead of honoring it — this is the actual enforcement point.
  const superAdmin = await isSuperAdmin()
  const wantsPlatformScope = requestedAudience === 'admin' || requestedAudience === 'platform'
  let audience: ReportAudience =
    wantsPlatformScope && !superAdmin
      ? 'affiliate'
      : requestedAudience ?? (superAdmin ? 'admin' : 'affiliate')

  // Determine scope. A client-supplied `scopeId` was previously trusted
  // as-is — any tenant user could request another distributor's report by
  // passing ?audience=distributor&scopeId=<someone else's distributorId>.
  // Only a superadmin may specify an arbitrary scopeId; everyone else's
  // resolves to their own, ignoring whatever the query string claims.
  let effectiveScopeId: string | undefined
  if (audience === 'distributor') {
    const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
    if (superAdmin && scopeId) {
      effectiveScopeId = scopeId
    } else {
      if (!dist) return NextResponse.json({ error: 'not_a_distributor' }, { status: 403 })
      effectiveScopeId = dist.id
    }
  } else if (audience === 'affiliate') {
    effectiveScopeId = superAdmin && scopeId ? scopeId : user.tenantId
  } else {
    effectiveScopeId = superAdmin ? scopeId : undefined
  }

  // Compute date range
  let startDate: Date, endDate: Date
  if (customStart && customEnd) {
    startDate = new Date(customStart)
    endDate = new Date(customEnd)
  } else {
    const dates = computePeriodDates(period)
    startDate = dates.start
    endDate = dates.end
  }

  const report = await generateFinancialReport({
    audience,
    period,
    startDate,
    endDate,
    scopeId: effectiveScopeId,
    tenantId: user.tenantId,
    generateAiInsights: aiInsights,
  })

  const format = url.searchParams.get('format') ?? 'json'
  if (format === 'csv' || format === 'pdf') {
    // Daily revenue is the one genuinely tabular breakdown in this report —
    // the natural export shape, same permission scope already computed above.
    const rows = Object.entries(report.revenue.byDay as Record<string, number>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, amount]) => ({ day, amount: amount.toFixed(2) }))
    const filenameBase = `financial-report-${audience}-${period}-${startDate.toISOString().slice(0, 10)}`

    if (format === 'csv') {
      const csv = toCsv(rows, [{ header: 'Date' , value: (r) => r.day }, { header: 'Revenue', value: (r) => r.amount }])
      return csvResponse(`${filenameBase}.csv`, csv)
    }
    const pdf = await buildPdfReport({
      title: `Financial Report — ${audience} (${period})`,
      subtitle: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)} · Total gross: $${report.revenue.totalGross.toFixed(2)} · ${report.revenue.transactionCount} transactions`,
      columns: [
        { header: 'Date', width: 200 },
        { header: 'Revenue (USD)', width: 200, align: 'right' },
      ],
      rows: rows.map((r) => [r.day, r.amount]),
    })
    return pdfResponse(`${filenameBase}.pdf`, pdf)
  }

  return NextResponse.json({ report })
}

export const GET = withProtection(handler, { rateLimit: 'read' })

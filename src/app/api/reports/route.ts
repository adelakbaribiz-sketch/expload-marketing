import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'
import { generateFinancialReport, computePeriodDates, ReportPeriod, ReportAudience } from '@/lib/finance/reports'

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

  // Determine audience based on role
  const superAdmin = await isSuperAdmin()
  let audience: ReportAudience = requestedAudience ?? (superAdmin ? 'admin' : 'affiliate')

  // Determine scope
  let effectiveScopeId = scopeId
  if (audience === 'distributor' && !effectiveScopeId) {
    const dist = await db.distributor.findUnique({ where: { tenantId: user.tenantId } })
    if (!dist) return NextResponse.json({ error: 'not_a_distributor' }, { status: 403 })
    effectiveScopeId = dist.id
  } else if (audience === 'affiliate' && !effectiveScopeId) {
    effectiveScopeId = user.tenantId
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

  return NextResponse.json({ report })
}

import { db } from '@/lib/db'

export const GET = withProtection(handler, { rateLimit: 'read' })

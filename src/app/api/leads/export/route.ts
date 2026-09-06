import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { toCsv, csvResponse } from '@/lib/export/csv'

const MAX_EXPORT_ROWS = 5000

/**
 * CSV export of the caller's own tenant's leads — same filters as GET
 * /api/leads (status/industry/q), capped at MAX_EXPORT_ROWS regardless of
 * how many match, so a broad/no filter export can't pull an unbounded
 * result set into memory to build the file.
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const industry = searchParams.get('industry') ?? undefined
  const q = searchParams.get('q') ?? undefined

  const searchOr = q
    ? [
        { name: { contains: q } },
        { description: { contains: q } },
        { industry: { contains: q } },
        { website: { contains: q } },
      ]
    : undefined

  const leads = await db.lead.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(industry ? { industry } : {}),
      ...(searchOr ? { OR: searchOr } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_EXPORT_ROWS,
  })

  const csv = toCsv(leads, [
    { header: 'Name', value: (l) => l.name },
    { header: 'Email', value: (l) => l.email },
    { header: 'Phone', value: (l) => l.phone },
    { header: 'Website', value: (l) => l.website },
    { header: 'Industry', value: (l) => l.industry },
    { header: 'Status', value: (l) => l.status },
    { header: 'Score', value: (l) => l.score },
    { header: 'Created At', value: (l) => l.createdAt.toISOString() },
  ])

  const res = csvResponse(`leads-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  if (leads.length === MAX_EXPORT_ROWS) res.headers.set('X-Export-Truncated', 'true')
  return res
}

export const GET = withProtection(handler, { rateLimit: 'read' })

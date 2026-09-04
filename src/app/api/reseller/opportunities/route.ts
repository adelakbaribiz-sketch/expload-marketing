import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET() {
  const tenantId = await requireTenantId()
  const [opportunities, myApplications] = await Promise.all([
    db.resellerOpportunity.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { title: 'asc' }],
    }),
    db.resellerApplication.findMany({
      where: { tenantId },
      include: { opportunity: true },
    }),
  ])
  return NextResponse.json({ opportunities, myApplications })
}

export async function POST(req: Request) {
  await requireTenantId()
  // ResellerOpportunity has no tenantId — it's a platform-global public
  // listing (like a job posting), so creating one is a platform-operator
  // action, not something any tenant's authenticated user should be able
  // to do to every tenant's public reseller page.
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const opp = await db.resellerOpportunity.create({ data: body })
  return NextResponse.json({ opportunity: opp }, { status: 201 })
}

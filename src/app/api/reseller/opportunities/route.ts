import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

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
  const body = await req.json().catch(() => ({}))
  const opp = await db.resellerOpportunity.create({ data: body })
  return NextResponse.json({ opportunity: opp }, { status: 201 })
}

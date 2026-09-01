import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const tenantId = await requireTenantId()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const severity = searchParams.get('severity')
  const limit = Math.min(Number(searchParams.get('limit') || 50), 200)

  const logs = await db.auditLogEntry.findMany({
    where: {
      tenantId,
      ...(action ? { action } : {}),
      ...(severity ? { severity } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json({ logs })
}

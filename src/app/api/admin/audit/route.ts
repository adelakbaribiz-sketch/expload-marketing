import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || 100), 500)
  const severity = searchParams.get('severity')

  const logs = await db.auditLogEntry.findMany({
    where: severity ? { severity } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { tenant: { select: { name: true } } },
  })
  return NextResponse.json({ logs })
}

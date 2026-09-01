import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || 50), 200)

  const users = await db.user.findMany({
    include: {
      tenant: { select: { id: true, name: true, domain: true } },
      superAdmin: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json({ users })
}

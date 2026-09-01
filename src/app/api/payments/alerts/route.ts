import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platformOnly = searchParams.get('platform') === 'true'

  if (platformOnly) {
    if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    const alerts = await db.financialAlert.findMany({
      where: { isPlatformAlert: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ alerts })
  }

  const tenantId = await requireTenantId()
  const alerts = await db.financialAlert.findMany({
    where: { tenantId, isPlatformAlert: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ alerts })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

export async function GET(req: NextRequest) {
  const tenantId = await requireTenantId()
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  const notifications = await db.notification.findMany({
    where: { tenantId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ notifications })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const notification = await db.notification.create({
    data: {
      tenantId,
      userId: body.userId || null,
      type: body.type || 'info',
      category: body.category || 'system',
      title: body.title,
      message: body.message,
      actionUrl: body.actionUrl || null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    },
  })
  return NextResponse.json({ notification }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

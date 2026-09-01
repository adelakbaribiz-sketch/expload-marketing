import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { requireTenantId } from '@/lib/tenant'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/notifications/emitter'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get('unread') === 'true'
  const category = url.searchParams.get('category') ?? undefined
  const limit = parseInt(url.searchParams.get('limit') ?? '100')
  const notifications = await getNotifications({ tenantId: user.tenantId, unreadOnly, category, limit })
  return NextResponse.json({ notifications })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  if (body.markAllRead) {
    await markAllNotificationsRead(user.tenantId, body.category)
    return NextResponse.json({ ok: true })
  }
  if (body.id) {
    await markNotificationRead(body.id, user.tenantId)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'id or markAllRead required' }, { status: 400 })
}

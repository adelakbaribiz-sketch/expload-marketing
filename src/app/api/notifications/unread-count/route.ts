import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { getUnreadCount } from '@/lib/notifications/emitter'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const count = await getUnreadCount(user.tenantId)
  return NextResponse.json({ count })
}

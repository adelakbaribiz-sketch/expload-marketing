import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  // Verify ownership
  const notif = await db.notification.findUnique({ where: { id } })
  if (!notif || notif.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  await db.notification.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

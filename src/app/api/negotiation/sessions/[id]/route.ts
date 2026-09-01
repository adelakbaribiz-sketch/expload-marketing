import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const session = await db.negotiationSession.findUnique({
    where: { id },
    include: {
      proposals: { orderBy: { round: 'asc' } },
      auditEvents: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json({ session })
}

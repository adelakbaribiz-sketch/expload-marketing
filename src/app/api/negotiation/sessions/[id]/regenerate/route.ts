import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { generateProposalForSession } from '@/lib/negotiation/engine'

/** Trigger regeneration of the current-round proposal. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const session = await db.negotiationSession.findUnique({ where: { id } })
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.tenantId !== user.tenantId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (session.currentState === 'accepted' || session.currentState === 'rejected_all') {
    return NextResponse.json({ error: 'session_closed' }, { status: 400 })
  }

  try {
    const { proposal } = await generateProposalForSession(id)
    return NextResponse.json({ proposal })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

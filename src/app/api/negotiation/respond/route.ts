import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { respondToProposal } from '@/lib/negotiation/engine'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method !== 'POST') return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })

  const body = await req.json()
  const { proposalId, response, feedback } = body
  if (!proposalId || !response || !['accepted', 'rejected'].includes(response)) {
    return NextResponse.json({ error: 'proposalId and response (accepted|rejected) required' }, { status: 400 })
  }

  // Verify ownership
  const proposal = await db.negotiationProposal.findUnique({
    where: { id: proposalId },
    include: { session: true },
  })
  if (!proposal) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (proposal.session.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const result = await respondToProposal(proposalId, response, feedback)
    return NextResponse.json({ result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

export const POST = withProtection(handler, { rateLimit: 'write' })

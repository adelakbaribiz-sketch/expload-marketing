import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withProtection } from '@/lib/security/with-protection'

/** Log a sandbox action and check if limit reached. */
async function handler(req: NextRequest) {
  const body = await req.json()
  const { sessionId, actionType, module, metadata } = body
  if (!sessionId || !actionType) {
    return NextResponse.json({ error: 'sessionId and actionType required' }, { status: 400 })
  }

  const session = await db.sandboxSession.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'session_inactive' }, { status: 403 })
  if (session.expiresAt < new Date()) {
    await db.sandboxSession.update({ where: { id: sessionId }, data: { status: 'expired' } })
    return NextResponse.json({ error: 'session_expired' }, { status: 403 })
  }
  if (session.actionsUsed >= session.maxActions) {
    return NextResponse.json({ error: 'action_limit_reached', upgradeUrl: '/signup' }, { status: 429 })
  }

  // Log action
  await db.sandboxAction.create({
    data: {
      sessionId,
      actionType,
      module: module ?? 'unknown',
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })

  // Increment counter
  const updated = await db.sandboxSession.update({
    where: { id: sessionId },
    data: { actionsUsed: { increment: 1 } },
  })

  return NextResponse.json({
    ok: true,
    actionsUsed: updated.actionsUsed,
    actionsRemaining: updated.maxActions - updated.actionsUsed,
    showUpgradePrompt: (updated.maxActions - updated.actionsUsed) <= 5,
  })
}

export const POST = withProtection(handler, { rateLimit: 'public' })

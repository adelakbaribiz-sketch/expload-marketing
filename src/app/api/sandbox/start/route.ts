/**
 * Sandbox / Demo Session API
 *
 * Public endpoints (no auth) for visitors to try the platform.
 * Sessions are time-limited (24h) and action-limited (20 actions).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SANDBOX_MAX_ACTIONS = 20
const SANDBOX_DURATION_HOURS = 24

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  // Create a mock tenant for the sandbox session
  const mockTenant = await db.tenant.create({
    data: {
      name: `Sandbox - ${body.visitorName ?? 'Anonymous'}`,
      domain: `sandbox-${Date.now()}.local`,
      plan: 'free',
      isActive: true,
    },
  })

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + SANDBOX_DURATION_HOURS)

  const session = await db.sandboxSession.create({
    data: {
      visitorEmail: body.visitorEmail,
      visitorName: body.visitorName,
      visitorIp: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
      visitorUserAgent: req.headers.get('user-agent'),
      demoType: body.demoType ?? 'marketing_platform',
      industry: body.industry ?? 'general',
      maxActions: SANDBOX_MAX_ACTIONS,
      actionsUsed: 0,
      expiresAt,
      mockTenantId: mockTenant.id,
      status: 'active',
    },
  })

  return NextResponse.json({
    sessionId: session.id,
    mockTenantId: mockTenant.id,
    expiresAt,
    maxActions: SANDBOX_MAX_ACTIONS,
    actionsRemaining: SANDBOX_MAX_ACTIONS,
    demoType: session.demoType,
    industry: session.industry,
  }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const session = await db.sandboxSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { actions: true } } },
  })
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Check expiry
  if (session.expiresAt < new Date() && session.status === 'active') {
    await db.sandboxSession.update({ where: { id: sessionId }, data: { status: 'expired' } })
    return NextResponse.json({ error: 'session_expired', session: { ...session, status: 'expired' } })
  }

  return NextResponse.json({
    ...session,
    actionsRemaining: session.maxActions - session.actionsUsed,
  })
}

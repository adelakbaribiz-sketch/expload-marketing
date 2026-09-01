import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { generateProposalForSession } from '@/lib/negotiation/engine'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const where: any = { tenantId: user.tenantId }
    if (status) where.status = status
    const sessions = await db.negotiationSession.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
      include: { _count: { select: { proposals: true } } },
    })
    return NextResponse.json({ sessions })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    // Create a negotiation session — can be linked to onboarding
    const session = await db.negotiationSession.create({
      data: {
        tenantId: user.tenantId,
        onboardingId: body.onboardingId,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        projectName: body.projectName,
        projectDescription: body.projectDescription,
        contextSummary: body.contextSummary ?? '',
        systemPrompt: body.systemPrompt,
        customerBudget: body.customerBudget,
        customerBudgetCurrency: body.customerBudgetCurrency ?? 'USD',
        customerTimeline: body.customerTimeline,
        customerPriorities: body.customerPriorities ? JSON.stringify(body.customerPriorities) : null,
        currentState: 'initial',
        status: 'active',
      },
    })

    // If linked to onboarding, update back-reference
    if (body.onboardingId) {
      await db.onboardingSession.update({
        where: { id: body.onboardingId },
        data: { negotiationId: session.id, status: 'escalated_to_negotiation' },
      })
    }

    // Auto-generate initial proposal
    try {
      const { proposal } = await generateProposalForSession(session.id)
      return NextResponse.json({ session, initialProposal: proposal }, { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ session, error: 'initial_proposal_failed', message: err.message }, { status: 201 })
    }
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

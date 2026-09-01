import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { createProjectBrief, analyzeBrief } from '@/lib/project-intake/engine'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const briefs = await db.projectBrief.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ briefs })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    // Create + analyze in one go
    const brief = await createProjectBrief({
      tenantId: user.tenantId,
      businessName: body.businessName,
      industry: body.industry,
      website: body.website,
      description: body.description,
      targetMarket: body.targetMarket,
      budget: body.budget,
      currency: body.currency,
      timeline: body.timeline,
      goals: body.goals,
    })

    // Trigger analysis (async — returns brief even if analysis is still running)
    analyzeBrief(brief.id).catch(err => console.error('Brief analysis failed:', err))

    return NextResponse.json({ brief, message: 'Analysis started — you will be notified when roadmap + pricing are ready.' }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

import { db } from '@/lib/db'

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

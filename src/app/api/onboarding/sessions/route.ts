import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const where: any = { tenantId: user.tenantId }
    if (status) where.status = status
    const sessions = await db.onboardingSession.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
      include: { _count: { select: { documents: true } } },
    })
    return NextResponse.json({ sessions })
  }

  if (req.method === 'POST') {
    // Create new onboarding session
    const body = await req.json()
    const session = await db.onboardingSession.create({
      data: {
        tenantId: user.tenantId,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        businessName: body.businessName,
        businessWebsite: body.businessWebsite,
        industry: body.industry,
        customSystemPrompt: body.customSystemPrompt,
        totalSteps: body.totalSteps ?? 6,
        status: 'in_progress',
      },
    })
    return NextResponse.json({ session }, { status: 201 })
  }

  if (req.method === 'PATCH') {
    // Update session (save answers, advance step, etc.)
    const body = await req.json()
    const existing = await db.onboardingSession.findUnique({ where: { id: body.id } })
    if (!existing || existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const update: any = {}
    for (const f of ['customerName', 'customerEmail', 'customerPhone', 'businessName', 'businessWebsite', 'industry', 'currentStep', 'totalSteps', 'answers', 'customSystemPrompt', 'extractedContext', 'aiSummary', 'aiNeedsAnalysis', 'crawlStatus', 'crawlError', 'docsProcessed', 'status', 'negotiationId']) {
      if (f in body) {
        if (f === 'answers' || f === 'aiNeedsAnalysis') update[f] = JSON.stringify(body[f])
        else update[f] = body[f]
      }
    }
    const session = await db.onboardingSession.update({
      where: { id: body.id },
      data: update,
    })
    return NextResponse.json({ session })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

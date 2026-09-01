import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeEmail } from '@/lib/security/sanitize'

async function handler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))

  const opp = await db.resellerOpportunity.findUnique({ where: { id } })
  if (!opp || !opp.isActive) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  // Check if already applied
  const existing = await db.resellerApplication.findFirst({
    where: { opportunityId: id, tenantId, status: { in: ['pending', 'approved', 'active'] } },
  })
  if (existing) {
    return NextResponse.json({ error: 'You already have an active application for this opportunity', application: existing }, { status: 409 })
  }

  const application = await db.resellerApplication.create({
    data: {
      opportunityId: id,
      tenantId,
      applicantName: sanitizeText(body.applicantName, 200),
      applicantEmail: sanitizeEmail(body.applicantEmail) ?? '',
      applicantPhone: body.applicantPhone ? sanitizeText(body.applicantPhone, 30) : null,
      businessName: body.businessName ? sanitizeText(body.businessName, 200) : null,
      plannedInvestment: Number(body.plannedInvestment || 0),
      plannedTimeline: body.plannedTimeline || null,
      experience: body.experience || 'beginner',
      agreedTerms: Boolean(body.agreedTerms),
    },
  })

  await db.resellerOpportunity.update({
    where: { id },
    data: { applicationCount: { increment: 1 } },
  })

  return NextResponse.json({ application }, { status: 201 })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

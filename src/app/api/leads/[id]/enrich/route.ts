import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractLeadInfo } from '@/lib/ai/lead-extractor'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

/**
 * Re-enrich an existing lead with the AI agent.
 * Useful when the lead was created without enrichment or when its
 * snippet has been updated.
 *
 * Requires auth + tenant ownership — previously had no auth check at all,
 * so any signed-up user could trigger enrichment (and burn LLM quota) on
 * any other tenant's lead by id. See KNOWN-ISSUES.md #6.
 */
async function handler(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const lead = await db.lead.findUnique({ where: { id } })
  if (!lead || lead.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const rawText = [lead.name, lead.industry, lead.description, lead.website].filter(Boolean).join('\n')
  const info = await extractLeadInfo(rawText)

  const updated = await db.lead.update({
    where: { id },
    data: {
      industry: info.industry ?? lead.industry,
      description: info.description ?? lead.description,
      email: info.contactEmail ?? lead.email,
      services: info.services.length ? JSON.stringify(info.services) : lead.services,
      score: info.score,
    },
  })
  await db.activity.create({
    data: {
      type: 'enriched',
      message: `Lead enriched by AI (score ${info.score}, industry ${info.industry ?? 'n/a'})`,
      leadId: lead.id,
      tenantId: lead.tenantId,
    },
  })
  return NextResponse.json({ lead: updated, info })
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enqueue } from '@/lib/queue'
import { withProtection, getTenantIdFromRequest } from '@/lib/security/with-protection'

/**
 * Queue a campaign for sending via the background job queue.
 * Returns immediately with the job id — the actual sending happens
 * asynchronously.
 */
async function handler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const campaign = await db.emailCampaign.findUnique({ where: { id } })
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (campaign.status === 'sending' || campaign.status === 'sent') {
    return NextResponse.json(
      { error: `Campaign is already ${campaign.status}` },
      { status: 409 },
    )
  }

  // Enqueue the send job
  const job = await enqueue('email_campaign', { campaignId: id })

  // Update campaign status
  await db.emailCampaign.update({
    where: { id },
    data: { status: 'queued' },
  })

  return NextResponse.json({
    jobId: job.id,
    campaignId: id,
    status: 'queued',
    message: 'Campaign queued for sending',
  })
}

export const POST = withProtection(handler, {
  rateLimit: 'write',
  audit: {
    type: 'email_sent',
    message: (req) => `Campaign send triggered: ${new URL(req.url).pathname}`,
    tenantId: (req) => getTenantIdFromRequest(req),
  },
})

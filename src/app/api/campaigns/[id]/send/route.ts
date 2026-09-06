import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enqueue, QueueUnavailableError } from '@/lib/queue'
import { withProtection } from '@/lib/security/with-protection'
import { getCurrentUser } from '@/lib/auth/simple-session'

/**
 * Queue a campaign for sending via the background job queue.
 * Returns immediately with the job id — the actual sending happens
 * asynchronously.
 *
 * Requires auth + tenant ownership — previously had no auth check at all,
 * so any signed-up user could trigger a send on any other tenant's
 * campaign by id. See KNOWN-ISSUES.md #6.
 */
async function handler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params

  const campaign = await db.emailCampaign.findUnique({ where: { id } })
  if (!campaign || campaign.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (campaign.status === 'sending' || campaign.status === 'sent') {
    return NextResponse.json(
      { error: `Campaign is already ${campaign.status}` },
      { status: 409 },
    )
  }

  // Enqueue the send job — previously an unguarded call: a Redis outage
  // (REDIS_URL configured but unreachable) threw a raw ioredis error here,
  // caught only by withProtection's generic handler as an opaque 500. See
  // RELIABILITY-AUDIT.md.
  let job
  try {
    job = await enqueue('email_campaign', { campaignId: id })
  } catch (err) {
    if (err instanceof QueueUnavailableError) {
      return NextResponse.json(
        { error: 'queue_unavailable', message: 'Campaign sending is temporarily unavailable. Please try again shortly.' },
        { status: 503 },
      )
    }
    throw err
  }

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
  },
})

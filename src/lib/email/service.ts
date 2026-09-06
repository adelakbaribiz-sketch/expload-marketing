/**
 * Email service.
 *
 * Sends transactional + marketing emails. In production, configure
 * SMTP via environment variables. In development (no SMTP configured),
 * emails are "sent" to the console + persisted as EmailLog entries
 * with status "sent" so the campaign flow can be tested end-to-end.
 *
 * The actual "hand this to a vendor" call goes through
 * `src/lib/integrations/email-provider.ts` (timeout + retry there) — this
 * file owns the business logic: template interpolation, EmailLog
 * persistence, batching, and campaign-level idempotency.
 */

import { db } from '@/lib/db'
import { SmtpEmailProvider, ConsoleEmailProvider, type EmailProvider } from '@/lib/integrations/email-provider'

export interface SendEmailParams {
  to: string
  subject: string
  body: string
  campaignId?: string
  leadId?: string
  variables?: Record<string, string>
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  status: 'sent' | 'failed' | 'bounced'
}

let provider: EmailProvider | null = null

function getProvider(): EmailProvider {
  if (provider) return provider
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  provider = host && user && pass ? new SmtpEmailProvider({ host, port, user, pass }) : new ConsoleEmailProvider()
  return provider
}

/** Test-only hook — swap in a MockEmailProvider without touching env vars. */
export function _setProviderForTesting(p: EmailProvider | null) {
  provider = p
}

/** Replace {{variables}} in a string. */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string> = {},
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`)
}

/**
 * Send a single email. Persists an EmailLog entry with the result.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, body, campaignId, leadId, variables } = params

  // Create a pending log entry
  const log = await db.emailLog.create({
    data: {
      campaignId: campaignId ?? '',
      leadId: leadId ?? null,
      to,
      status: 'pending',
    },
  })

  // If no campaignId, use a placeholder (shouldn't happen in normal flow)
  if (!campaignId) {
    await db.emailLog.update({ where: { id: log.id }, data: { status: 'failed', error: 'No campaignId' } })
    return { success: false, error: 'No campaignId', status: 'failed' }
  }

  const finalSubject = interpolateTemplate(subject, variables)
  const finalBody = interpolateTemplate(body, variables)

  const result = await getProvider().send({
    to,
    from: process.env.SMTP_FROM || '"Expload Marketing" <noreply@expload.io>',
    subject: finalSubject,
    text: finalBody,
    html: finalBody.replace(/\n/g, '<br>'),
  })

  if (result.ok) {
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: 'sent', sentAt: new Date(), deliveredAt: new Date() },
    })
    return { success: true, messageId: result.data?.messageId, status: 'sent' }
  }

  const errorMsg = result.error ?? 'unknown error'
  // Detect bounce vs. failure
  const isBounce = /bounce|reject|invalid|does not exist/i.test(errorMsg)
  const status = isBounce ? 'bounced' : 'failed'

  await db.emailLog.update({
    where: { id: log.id },
    data: { status, error: errorMsg.slice(0, 500) },
  })

  return { success: false, error: errorMsg, status }
}

/**
 * Send a campaign to all matching recipients.
 * Processes in batches to avoid overwhelming the SMTP server.
 *
 * Idempotent per (campaignId, lead email): a recipient who already has a
 * non-failed EmailLog for this campaign is skipped. Without this, a second
 * call to sendCampaign for the same campaign — a retry after a partial
 * failure, a double-click, a queue redelivery — resent to everyone,
 * including people who'd already received it.
 */
export async function sendCampaign(
  campaignId: string,
  batchSize = 10,
): Promise<{ sent: number; failed: number; bounced: number; skipped: number; total: number }> {
  const campaign = await db.emailCampaign.findUnique({ where: { id: campaignId } })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  // Update campaign status
  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { status: 'sending' },
  })

  // Get recipients based on filter
  const filter = campaign.recipientFilter ? JSON.parse(campaign.recipientFilter) : {}
  const recipients = await db.lead.findMany({
    where: {
      tenantId: campaign.tenantId,
      email: { not: null },
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.industry ? { industry: filter.industry } : {}),
      ...(filter.minScore ? { score: { gte: Number(filter.minScore) } } : {}),
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
    },
    select: { id: true, name: true, email: true, industry: true, company: true },
  })

  // Already-sent (or in-flight) recipients for this campaign — the
  // idempotency check.
  const alreadyHandled = await db.emailLog.findMany({
    where: { campaignId, status: { in: ['sent', 'pending', 'bounced'] } },
    select: { leadId: true },
  })
  const handledLeadIds = new Set(alreadyHandled.map((l) => l.leadId).filter(Boolean))
  const pending = recipients.filter((r) => !handledLeadIds.has(r.id))
  const skipped = recipients.length - pending.length

  // Update recipient count
  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { recipientCount: recipients.length },
  })

  let sent = 0
  let failed = 0
  let bounced = 0

  // Process in batches
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (recipient) => {
        if (!recipient.email) return

        const variables: Record<string, string> = {
          name: recipient.name,
          email: recipient.email,
          industry: recipient.industry ?? '',
          company: recipient.company?.name ?? recipient.name,
        }

        const result = await sendEmail({
          to: recipient.email,
          subject: campaign.subject,
          body: campaign.body,
          campaignId,
          leadId: recipient.id,
          variables,
        })

        if (result.success) sent++
        else if (result.status === 'bounced') bounced++
        else failed++
      }),
    )

    // Small delay between batches
    await new Promise((r) => setTimeout(r, 100))
  }

  // Update campaign stats
  await db.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'sent',
      sentAt: new Date(),
      sentCount: sent,
      bounceCount: bounced,
    },
  })

  return { sent, failed, bounced, skipped, total: recipients.length }
}

/** Check if SMTP is configured. */
export function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

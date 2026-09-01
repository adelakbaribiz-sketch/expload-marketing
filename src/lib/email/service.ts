/**
 * Email service.
 *
 * Sends transactional + marketing emails. In production, configure
 * SMTP via environment variables. In development (no SMTP configured),
 * emails are "sent" to the console + persisted as EmailLog entries
 * with status "sent" so the campaign flow can be tested end-to-end.
 */

import { db } from '@/lib/db'

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

let transporter: any = null

async function getTransporter(): Promise<any | null> {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null // Dev mode — no SMTP configured
  }

  // Lazy import to avoid loading nodemailer in dev mode
  const nodemailer = await import('nodemailer')
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return transporter
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

  const transport = await getTransporter()

  // Dev mode: simulate sending
  if (!transport) {
    console.log('\n========== EMAIL (DEV MODE) ==========')
    console.log(`To: ${to}`)
    console.log(`Subject: ${finalSubject}`)
    console.log(`Body:\n${finalBody.slice(0, 500)}${finalBody.length > 500 ? '...' : ''}`)
    console.log('=======================================\n')

    await db.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    })

    return { success: true, messageId: `dev-${log.id}`, status: 'sent' }
  }

  // Production: send via SMTP
  try {
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || '"Expload Marketing" <noreply@expload.io>',
      to,
      subject: finalSubject,
      text: finalBody,
      html: finalBody.replace(/\n/g, '<br>'),
    })

    await db.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    })

    return { success: true, messageId: info.messageId, status: 'sent' }
  } catch (err: any) {
    const errorMsg = String(err?.message ?? err)

    // Detect bounce vs. failure
    const isBounce = /bounce|reject|invalid|does not exist/i.test(errorMsg)
    const status = isBounce ? 'bounced' : 'failed'

    await db.emailLog.update({
      where: { id: log.id },
      data: { status, error: errorMsg.slice(0, 500) },
    })

    return { success: false, error: errorMsg, status }
  }
}

/**
 * Send a campaign to all matching recipients.
 * Processes in batches to avoid overwhelming the SMTP server.
 */
export async function sendCampaign(
  campaignId: string,
  batchSize = 10,
): Promise<{ sent: number; failed: number; bounced: number; total: number }> {
  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { logs: { where: { status: 'pending' } } },
  })

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

  // Update recipient count
  await db.emailCampaign.update({
    where: { id: campaignId },
    data: { recipientCount: recipients.length },
  })

  let sent = 0
  let failed = 0
  let bounced = 0

  // Process in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

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

  return { sent, failed, bounced, total: recipients.length }
}

/** Check if SMTP is configured. */
export function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

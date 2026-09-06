import { withTimeout, withRetry, timed, type IntegrationResult } from './types'

/**
 * Email provider adapter. `src/lib/email/service.ts` (campaign send,
 * EmailLog persistence, template interpolation) is the caller — this file
 * is only the "actually hand the message to a vendor" seam, kept separate
 * so a real transactional-email API (Postmark/SES/Sendgrid) can be added
 * later as a second `EmailProvider` implementation without touching the
 * campaign logic at all.
 */

export interface EmailMessage {
  to: string
  from: string
  subject: string
  text: string
  html: string
}

export interface EmailSendData {
  messageId: string
}

export interface EmailProvider {
  readonly name: string
  send(msg: EmailMessage): Promise<IntegrationResult<EmailSendData>>
}

const SEND_TIMEOUT_MS = 10_000
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 500

/** Real SMTP provider via nodemailer. Retries transient connection errors (ECONNRESET, ETIMEDOUT) but not auth/rejection failures, which will never succeed on retry. */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp'
  private transporter: any = null

  constructor(private config: { host: string; port: number; user: string; pass: string }) {}

  private async getTransporter(): Promise<any> {
    if (this.transporter) return this.transporter
    const nodemailer = await import('nodemailer')
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.port === 465,
      auth: { user: this.config.user, pass: this.config.pass },
    })
    return this.transporter
  }

  async send(msg: EmailMessage): Promise<IntegrationResult<EmailSendData>> {
    return timed(() =>
      withRetry(
        async () => {
          const transport = await this.getTransporter()
          const info = await withTimeout<any>(
            transport.sendMail({ from: msg.from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
            SEND_TIMEOUT_MS,
            'smtp',
          )
          return { messageId: info.messageId as string }
        },
        {
          attempts: RETRY_ATTEMPTS,
          delayMs: RETRY_DELAY_MS,
          shouldRetry: (err) => /ECONNRESET|ETIMEDOUT|ECONNREFUSED|timed out/i.test(String((err as Error)?.message ?? err)),
        },
      ),
    )
  }
}

/** Dev-mode fallback when no SMTP is configured — logs to console, never claims a real send happened (see `mocked: true`). */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console'

  async send(msg: EmailMessage): Promise<IntegrationResult<EmailSendData>> {
    console.log('\n========== EMAIL (DEV MODE) ==========')
    console.log(`To: ${msg.to}`)
    console.log(`Subject: ${msg.subject}`)
    console.log(`Body:\n${msg.text.slice(0, 500)}${msg.text.length > 500 ? '...' : ''}`)
    console.log('=======================================\n')
    return { ok: true, data: { messageId: `console-${Date.now()}` }, mocked: true, latencyMs: 0 }
  }
}

/** In-memory provider for tests — records every message instead of doing any I/O. */
export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock'
  sent: EmailMessage[] = []
  /** Set to force the next N sends to fail, for testing retry/error paths. */
  failNext = 0

  async send(msg: EmailMessage): Promise<IntegrationResult<EmailSendData>> {
    if (this.failNext > 0) {
      this.failNext--
      return { ok: false, error: 'MockEmailProvider: simulated failure', mocked: true, latencyMs: 0 }
    }
    this.sent.push(msg)
    return { ok: true, data: { messageId: `mock-${this.sent.length}` }, mocked: true, latencyMs: 0 }
  }
}

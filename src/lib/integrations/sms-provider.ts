import { withTimeout, withRetry, timed, type IntegrationResult } from './types'
import { logger } from '@/lib/observability/logger'

/**
 * SMS provider adapter. Previously `POST /api/messaging/sms` was a bare
 * CRUD-factory route — a client could create a row with
 * `status: 'delivered'` directly with no SMS ever actually sent (see
 * INTEGRATION-ARCHITECTURE.md). This gives the send path a real seam: no
 * vendor credentials (e.g. Kavenegar, the schema's default `provider`
 * value) are configured in this environment, so `ConsoleSmsProvider` is the
 * honest current default — it never claims delivery happened, unlike the
 * old CRUD-only path did by construction.
 */

export interface SmsMessage {
  to: string
  body: string
}

export interface SmsSendData {
  messageId: string
  cost: number
}

export interface SmsProvider {
  readonly name: string
  send(msg: SmsMessage): Promise<IntegrationResult<SmsSendData>>
}

const SEND_TIMEOUT_MS = 8_000
const RETRY_ATTEMPTS = 2
const RETRY_DELAY_MS = 300

/**
 * Kavenegar (or any REST SMS gateway that accepts `{to, body}` and a bearer
 * key) — wired but inert without `SMS_API_KEY`/`SMS_API_URL`; see
 * `getSmsProvider()` below, which only constructs this when both are set.
 */
export class HttpSmsProvider implements SmsProvider {
  readonly name = 'http'

  constructor(private config: { apiUrl: string; apiKey: string }) {}

  async send(msg: SmsMessage): Promise<IntegrationResult<SmsSendData>> {
    return timed(() =>
      withRetry(
        async () => {
          const res = await withTimeout(
            fetch(this.config.apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.apiKey}` },
              body: JSON.stringify({ receptor: msg.to, message: msg.body }),
            }),
            SEND_TIMEOUT_MS,
            'sms',
          )
          if (!res.ok) throw new Error(`SMS gateway responded ${res.status}: ${await res.text()}`)
          const data = await res.json()
          return { messageId: data.messageId ?? data.id ?? `sms-${Date.now()}`, cost: data.cost ?? 0 }
        },
        {
          attempts: RETRY_ATTEMPTS,
          delayMs: RETRY_DELAY_MS,
          shouldRetry: (err) => !/responded 4\d\d/.test(String((err as Error)?.message ?? err)), // don't retry 4xx (bad number, bad auth)
        },
      ),
    )
  }
}

/** Dev/no-credentials fallback — logs instead of sending, never claims delivery. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console'

  async send(msg: SmsMessage): Promise<IntegrationResult<SmsSendData>> {
    if (process.env.NODE_ENV === 'production') {
      // No SMS gateway configured in production — same reasoning as
      // ConsoleEmailProvider: diagnose the misconfiguration, don't leak
      // the recipient phone number + message body to stdout.
      logger.warn('sms.console_fallback_in_production', { bodyLength: msg.body.length })
    } else {
      console.log(`\n[SMS - DEV MODE] To: ${msg.to} | Body: ${msg.body.slice(0, 160)}\n`)
    }
    return { ok: true, data: { messageId: `console-${Date.now()}`, cost: 0 }, mocked: true, latencyMs: 0 }
  }
}

/** In-memory provider for tests. */
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock'
  sent: SmsMessage[] = []
  failNext = 0

  async send(msg: SmsMessage): Promise<IntegrationResult<SmsSendData>> {
    if (this.failNext > 0) {
      this.failNext--
      return { ok: false, error: 'MockSmsProvider: simulated failure', mocked: true, latencyMs: 0 }
    }
    this.sent.push(msg)
    return { ok: true, data: { messageId: `mock-${this.sent.length}`, cost: 0.01 }, mocked: true, latencyMs: 0 }
  }
}

let provider: SmsProvider | null = null

export function getSmsProvider(): SmsProvider {
  if (provider) return provider
  const apiUrl = process.env.SMS_API_URL
  const apiKey = process.env.SMS_API_KEY
  provider = apiUrl && apiKey ? new HttpSmsProvider({ apiUrl, apiKey }) : new ConsoleSmsProvider()
  return provider
}

export function _setSmsProviderForTesting(p: SmsProvider | null) {
  provider = p
}

export function isSmsConfigured(): boolean {
  return !!(process.env.SMS_API_URL && process.env.SMS_API_KEY)
}

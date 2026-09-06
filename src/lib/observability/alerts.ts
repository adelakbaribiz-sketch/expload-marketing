/**
 * Critical-error alerting.
 *
 * Always logs locally regardless of configuration. Additionally forwards
 * to `ALERT_WEBHOOK_URL` (a generic JSON POST — Slack incoming-webhook
 * compatible via the `text` field, but works with any endpoint that
 * accepts a JSON body) when that env var is set. Same fail-soft,
 * unconfigured-by-default pattern as `SIEM_WEBHOOK_URL` in
 * `src/lib/security/audit.ts` — no real alerting *service* (PagerDuty,
 * Opsgenie, a Slack workspace) is available in this environment, so this
 * builds the mechanism honestly rather than faking a working integration.
 */

import { logger } from '@/lib/observability/logger'

export interface CriticalAlert {
  title: string
  detail: string
  source: string
  metadata?: Record<string, unknown>
}

// Per-source cooldown so a hot failure loop (e.g. a downed dependency
// causing every request to 500) sends one alert, not one per request.
const COOLDOWN_MS = 5 * 60 * 1000
const lastSentAt = new Map<string, number>()

function shouldSend(source: string): boolean {
  const now = Date.now()
  const last = lastSentAt.get(source)
  if (last && now - last < COOLDOWN_MS) return false
  lastSentAt.set(source, now)
  return true
}

export async function alertCritical(alert: CriticalAlert): Promise<void> {
  logger.error('alert.critical', { title: alert.title, detail: alert.detail, source: alert.source, ...alert.metadata })

  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return
  if (!shouldSend(alert.source)) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 ${alert.title}\n${alert.detail}`,
        title: alert.title,
        detail: alert.detail,
        source: alert.source,
        metadata: alert.metadata ?? null,
        timestamp: new Date().toISOString(),
      }),
      cache: 'no-store',
    })
  } catch (err) {
    logger.error('alert.webhook_failed', { source: alert.source, error: String(err) })
  }
}

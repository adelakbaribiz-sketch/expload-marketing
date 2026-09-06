/**
 * Audit logging service.
 *
 * Records security-relevant operations (create/update/delete/auth) to
 * the Activity table with a structured `message` and `type`. The
 * frontend renders these in the Activity timeline.
 *
 * In a production deployment, you'd also forward these to a SIEM
 * (Splunk, Datadog, ELK) — see `forwardToSIEM` stub at the bottom.
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/observability/logger'

export interface AuditEntry {
  type: 'created' | 'updated' | 'deleted' | 'enriched' | 'auth' | 'security' | 'email_sent'
  message: string
  tenantId?: string
  userId?: string
  leadId?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

/** Write an audit entry to the database. */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    // We piggyback on the Activity table; if no leadId, store as a
    // tenant-scoped activity with a synthetic leadId=null.
    await db.activity.create({
      data: {
        type: entry.type,
        message: entry.message,
        tenantId: entry.tenantId ?? null,
        userId: entry.userId ?? null,
        leadId: entry.leadId ?? null,
      },
    })
  } catch (err) {
    // Audit failures must not break the request — log and continue.
    logger.error('audit.persist_failed', { error: String(err) })
  }

  // Always log to stdout for server-side log aggregation — routed through
  // the structured logger so it picks up request/correlation id and the
  // shared field-redaction (a caller's free-form `metadata` isn't
  // allowlisted, so this is the backstop against accidentally logging
  // something sensitive through it).
  logger.info('audit.entry', {
    type: entry.type,
    message: entry.message,
    tenantId: entry.tenantId ?? null,
    userId: entry.userId ?? null,
    ip: entry.ip ?? null,
    ua: entry.userAgent?.slice(0, 120) ?? null,
    ...(entry.metadata ?? {}),
  })

  // Forward to SIEM if configured (no-op stub)
  forwardToSIEM(entry).catch(() => {})
}

/** Stub for SIEM forwarding. Implement with Splunk/Datadog HTTP API in prod. */
async function forwardToSIEM(entry: AuditEntry): Promise<void> {
  const endpoint = process.env.SIEM_WEBHOOK_URL
  if (!endpoint) return
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'audit',
        ...entry,
        timestamp: new Date().toISOString(),
      }),
      cache: 'no-store',
    })
  } catch (err) {
    logger.error('audit.siem_forward_failed', { error: String(err) })
  }
}

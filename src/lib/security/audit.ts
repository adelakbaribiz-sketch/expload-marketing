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
    console.error('[audit] failed to persist:', err)
  }

  // Always log to stdout for server-side log aggregation
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      type: entry.type,
      message: entry.message,
      tenantId: entry.tenantId ?? null,
      userId: entry.userId ?? null,
      ip: entry.ip ?? null,
      ua: entry.userAgent?.slice(0, 120) ?? null,
      meta: entry.metadata ?? null,
    }),
  )

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
    console.error('[audit] SIEM forward failed:', err)
  }
}

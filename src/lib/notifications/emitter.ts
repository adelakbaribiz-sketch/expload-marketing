/**
 * Notification Event Emitter.
 *
 * Event-driven notification system. Any module can emit events; this module
 * persists to DB (Notification model) for the Notification Center, and
 * triggers in-app toast via the SSE/queue (if connected).
 *
 * Categories:
 *  - llm: provider switched, quota warning, errors
 *  - onboarding: file processed, crawl completed
 *  - negotiation: proposal ready, accepted, rejected
 *  - system: generic
 *
 * Severity: info | warning | critical | success
 */

import 'server-only'
import { db } from '@/lib/db'

export interface NotificationEvent {
  type: string
  title: string
  message: string
  severity?: 'info' | 'warning' | 'critical' | 'success'
  tenantId?: string
  userId?: string
  category?: string // llm | onboarding | negotiation | system | billing | distributor
  actionUrl?: string
  metadata?: Record<string, any>
}

/** Emit a notification event. Persists to DB; subscribers will pick it up. */
export async function emitNotificationEvent(event: NotificationEvent): Promise<void> {
  try {
    // Resolve tenantId from env if not provided (platform-level alerts)
    const tenantId = event.tenantId ?? (await getFirstActiveTenantId())
    if (!tenantId) {
      // No tenant — log to console, can't persist
      console.warn('[notification] no tenant available:', event.title)
      return
    }

    await db.notification.create({
      data: {
        tenantId,
        userId: event.userId,
        type: event.severity ?? 'info',
        category: event.category ?? 'system',
        title: event.title,
        message: event.message,
        actionUrl: event.actionUrl,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      },
    })

    // Optionally trigger real-time push (SSE / WebSocket) — placeholder for future
    // In Next.js this can be done via Server-Sent Events on /api/notifications/stream
  } catch (err) {
    console.error('[notification] emit failed:', err)
  }
}

/** Helper — get any active tenant (used for platform-level alerts). */
async function getFirstActiveTenantId(): Promise<string | null> {
  const tenant = await db.tenant.findFirst({ where: { isActive: true }, select: { id: true } })
  return tenant?.id ?? null
}

/** Get notifications for a tenant with optional filters. */
export async function getNotifications(opts: {
  tenantId: string
  unreadOnly?: boolean
  category?: string
  limit?: number
}) {
  const where: any = { tenantId: opts.tenantId }
  if (opts.unreadOnly) where.isRead = false
  if (opts.category) where.category = opts.category
  return db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: opts.limit ?? 50,
  })
}

/** Mark notification as read. */
export async function markNotificationRead(id: string, tenantId: string) {
  return db.notification.updateMany({
    where: { id, tenantId },
    data: { isRead: true },
  })
}

/** Mark all unread notifications as read for a tenant. */
export async function markAllNotificationsRead(tenantId: string, category?: string) {
  return db.notification.updateMany({
    where: { tenantId, isRead: false, ...(category ? { category } : {}) },
    data: { isRead: true },
  })
}

/** Get unread count for a tenant (for badge display). */
export async function getUnreadCount(tenantId: string): Promise<number> {
  return db.notification.count({ where: { tenantId, isRead: false } })
}

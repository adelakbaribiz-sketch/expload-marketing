/**
 * Wraps an API route handler with rate limiting + audit logging + security headers.
 *
 * Usage:
 *   export const POST = withProtection(
 *     async (req, ctx) => { ... },
 *     { rateLimit: 'write', audit: { type: 'created', message: (req) => 'Lead created' } }
 *   )
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { rateLimit, getClientId, RATE_LIMITS } from '@/lib/security/rate-limit'
import { applySecurityHeaders } from '@/lib/security/headers'
import { audit } from '@/lib/security/audit'
import { ApiError } from '@/lib/api/errors'
import { runWithLogContext, logger } from '@/lib/observability/logger'
import { httpRequestsTotal, httpRequestDuration, errorsTotal, normalizeRoute } from '@/lib/observability/metrics'
import { alertCritical } from '@/lib/observability/alerts'

type Handler<Ctx = any> = (req: NextRequest, ctx: Ctx) => Promise<NextResponse | Response>

interface ProtectionOptions {
  /** Rate limit preset. Defaults to 'read'. */
  rateLimit?: keyof typeof RATE_LIMITS
  /** Audit config. Skip if not provided. */
  audit?: {
    type: 'created' | 'updated' | 'deleted' | 'enriched' | 'auth' | 'security' | 'email_sent'
    /** Build the audit message from the request. Defaults to a generic message. */
    message?: (req: NextRequest) => string
    /** Extract tenantId from request — defaults to reading the cookie. */
    tenantId?: (req: NextRequest) => string | undefined
  }
}

/** Wrap a handler with security protections. */
export function withProtection<Ctx = any>(
  handler: Handler<Ctx>,
  options: ProtectionOptions = {},
): Handler<Ctx> {
  const preset = options.rateLimit ? RATE_LIMITS[options.rateLimit] : RATE_LIMITS.read
  const namespace = options.rateLimit ?? 'read'

  return async (req, ctx) => {
    // Request/correlation id set by proxy.ts (the global entry point);
    // fall back to generating one here for anything that reaches a
    // handler outside that path (e.g. a direct unit-test call).
    const requestId = req.headers.get('x-request-id') || randomUUID()
    const correlationId = req.headers.get('x-correlation-id') || requestId

    return runWithLogContext({ requestId, correlationId }, async () => {
      const route = normalizeRoute(new URL(req.url).pathname)
      const timerEnd = httpRequestDuration.startTimer({ method: req.method, route })

      // 1. Rate limit check
      const clientId = getClientId(req)
      const rl = rateLimit({
        key: clientId,
        limit: preset.limit,
        windowMs: preset.windowMs,
        namespace,
      })
      if (!rl.allowed) {
        const res = NextResponse.json(
          { error: 'rate_limited', message: 'Too many requests. Please try again later.' },
          { status: 429 },
        )
        // Attach rate limit headers
        for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v)
        applySecurityHeaders(res)
        res.headers.set('X-Request-Id', requestId)
        httpRequestsTotal.labels(req.method, route, '429').inc()
        timerEnd({ status: '429' })
        return res
      }

      // 2. Run the actual handler — no route relied on an uncaught exception
      // reaching Next.js's default handler on purpose; catching here gives
      // every protected route the same fallback: a logged error and a
      // consistent { error } JSON shape instead of an unstyled 500 with no
      // security headers, no rate-limit headers, and (for GET-only routes)
      // previously no protection layer at all to even reach this catch.
      let result: NextResponse | Response
      try {
        result = await handler(req, ctx)
      } catch (err) {
        logger.error('api.unhandled_error', { route, method: req.method, error: String(err) })
        errorsTotal.labels('unhandled_exception', route).inc()
        const status = err instanceof ApiError ? err.status : 500
        const message = err instanceof ApiError ? err.message : 'internal_error'
        result = NextResponse.json({ error: message }, { status })
        if (status >= 500) {
          alertCritical({
            title: 'Unhandled API error',
            detail: `${req.method} ${route}: ${String(err)}`,
            source: `api.${route}`,
          }).catch(() => {})
        }
      }

      // 3. Apply security headers to the response
      if (result instanceof NextResponse) {
        applySecurityHeaders(result)
        // Attach rate limit headers
        for (const [k, v] of Object.entries(rl.headers)) result.headers.set(k, v)
        result.headers.set('X-Request-Id', requestId)
      }

      const status = result instanceof NextResponse ? result.status : (result as Response).status
      httpRequestsTotal.labels(req.method, route, String(status)).inc()
      if (status >= 500) errorsTotal.labels('error_response', route).inc()
      timerEnd({ status: String(status) })

      // 4. Audit log (only on success)
      if (options.audit && result instanceof NextResponse && result.status < 400) {
        try {
          await audit({
            type: options.audit.type,
            message: options.audit.message
              ? options.audit.message(req)
              : `${options.audit.type} operation`,
            tenantId: options.audit.tenantId?.(req),
            ip: clientId,
            userAgent: req.headers.get('user-agent') ?? undefined,
          })
        } catch {
          // never let audit failure break the response
        }
      }

      return result
    })
  }
}

/** Helper for handlers that need the tenant id from cookie. */
export function getTenantIdFromRequest(req: NextRequest): string | undefined {
  // Check header first
  const headerVal = req.headers.get('x-tenant-id')
  if (headerVal) return headerVal
  // Then cookie
  const match = req.cookies.get('tenant-id')?.value
  return match
}

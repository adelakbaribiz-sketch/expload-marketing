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
import { rateLimit, getClientId, RATE_LIMITS } from '@/lib/security/rate-limit'
import { applySecurityHeaders } from '@/lib/security/headers'
import { audit } from '@/lib/security/audit'

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
      return res
    }

    // 2. Run the actual handler
    const result = await handler(req, ctx)

    // 3. Apply security headers to the response
    if (result instanceof NextResponse) {
      applySecurityHeaders(result)
      // Attach rate limit headers
      for (const [k, v] of Object.entries(rl.headers)) result.headers.set(k, v)
    }

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

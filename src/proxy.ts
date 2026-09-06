import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Global proxy (formerly middleware in Next.js 15 and earlier).
 *
 * Responsibilities:
 *  1. Apply security headers (CSP, HSTS, X-Frame-Options, etc.) to every response.
 *  2. Enforce *authentication* on /api/* and dashboard pages (session cookie check).
 *  3. Reject malicious paths (path traversal, null bytes, control chars).
 *
 * Per-route authorization (RBAC, tenant scoping) still happens in each handler.
 * This proxy only enforces "is the user logged in?".
 *
 * Note: We inline logic (rather than importing from a lib) because the proxy runs
 * in an Edge runtime that has strict module constraints in Next.js 16.
 */

const SESSION_COOKIE = 'session'

// Fail closed in production — see src/lib/auth/simple-session.ts for the
// matching check (this file must sign/verify with the exact same secret).
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET must be set in production — refusing to start with a public default session secret.')
}
const SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production-please-use-a-long-random-string'

/** Sign payload with HMAC-SHA256 (must match simple-session.ts). */
function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // must match simple-session.ts's SESSION_MAX_AGE

/**
 * Verify session token format + expiry — full DB lookup happens in handler.
 * Token format (must match simple-session.ts): userId.issuedAtMs.signature.
 */
function isValidSessionFormat(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [userId, issuedAtStr, signature] = parts
  if (!userId || !issuedAtStr || !signature) return false
  const issuedAt = Number(issuedAtStr)
  if (!Number.isFinite(issuedAt)) return false
  const expected = sign(`${userId}.${issuedAtStr}`)
  if (expected.length !== signature.length) return false
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false
  } catch {
    return false
  }
  return Date.now() - issuedAt <= SESSION_MAX_AGE_MS
}

// Public API routes — no auth required
const PUBLIC_API_ROUTES = [
  '/api/health',
  // Scraped by Prometheus, which can't carry a session cookie — the route
  // itself does its own bearer-token check (METRICS_TOKEN), same pattern
  // as the crypto webhook receiver below.
  '/api/metrics',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/public/',
  // Scoped to the inbound gateway-webhook receiver only — NOT '/api/webhooks/',
  // which would also match the tenant-scoped WebhookSubscription CRUD route
  // (GET/PATCH/DELETE /api/webhooks/[id]) and exempt it from both the
  // session-auth check and the CSRF Origin check below.
  '/api/webhooks/crypto/',
  '/api/team/invite/',
  '/api/sandbox/start',
  '/api/sandbox/action',
  '/api/sandbox/convert',
]

// Public page routes (login/signup/blog/etc.)
// '/' is included because it's a single client-rendered shell (src/app/page.tsx)
// that shows the landing page + auth modal for logged-out visitors and the
// dashboard for logged-in users — the page itself must load before the client
// can check auth state via /api/auth/me.
const PUBLIC_PAGE_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/pricing',
  '/blog',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/invite',
]

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-DNS-Prefetch-Control': 'on',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    process.env.NODE_ENV === 'production'
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://google.serper.dev https://*.chatglm.cn https://*.z.ai",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_API_ROUTES.some(r => pathname.startsWith(r))) return true
  if (PUBLIC_PAGE_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return true
  return false
}

function isMaliciousPath(pathname: string): boolean {
  if (pathname.includes('..')) return true
  if (pathname.includes('\0')) return true
  if (pathname.includes('%00')) return true
  if (pathname.includes('%2e%2e')) return true
  if (/[\x00-\x1f\x7f]/.test(pathname)) return true
  return false
}

function addHeaders(res: NextResponse, ids?: { requestId: string; correlationId: string }): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v)
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  if (ids) {
    res.headers.set('X-Request-Id', ids.requestId)
    res.headers.set('X-Correlation-Id', ids.correlationId)
  }
  return res
}

// Request ID: unique per HTTP request, generated here (the single global
// entry point) so every log line for this request — proxy, route handler,
// any queue job it enqueues — can be tied together. Correlation ID: same
// value by default, but a caller (an external system chaining calls, or a
// client replaying a browser action) can supply its own via
// X-Correlation-Id to tie multiple requests together into one operation.
// Both are forwarded to the route handler as request headers (read by
// withProtection) and echoed back as response headers for the client.
function resolveRequestIds(req: NextRequest): { requestId: string; correlationId: string } {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const correlationId = req.headers.get('x-correlation-id') || requestId
  return { requestId, correlationId }
}

function nextWithIds(req: NextRequest, ids: { requestId: string; correlationId: string }): NextResponse {
  const headers = new Headers(req.headers)
  headers.set('x-request-id', ids.requestId)
  headers.set('x-correlation-id', ids.correlationId)
  return NextResponse.next({ request: { headers } })
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const ids = resolveRequestIds(req)

  // 1. Reject malicious paths
  if (isMaliciousPath(pathname)) {
    return addHeaders(new NextResponse('Bad Request', { status: 400 }), ids)
  }

  // 2. Allow static assets and Next internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/images/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return addHeaders(nextWithIds(req, ids), ids)
  }

  // 3. Allow public routes (with headers applied)
  if (isPublic(pathname)) {
    return addHeaders(nextWithIds(req, ids), ids)
  }

  // 4. Enforce auth on /api/* and other protected routes
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value
  if (!sessionToken || !isValidSessionFormat(sessionToken)) {
    if (pathname.startsWith('/api/')) {
      return addHeaders(NextResponse.json(
        { error: 'unauthenticated', message: 'Session required' },
        { status: 401 },
      ), ids)
    }
    return addHeaders(NextResponse.json(
      { error: 'unauthenticated', message: 'Please sign in' },
      { status: 401 },
    ), ids)
  }

  // 5. CSRF defense-in-depth for authenticated state-changing requests.
  // The session cookie is SameSite=Lax, not Strict, and there's no CSRF
  // token — a cross-site <form method="POST"> top-level navigation would
  // still carry it. Reject when the browser-supplied Origin is present and
  // doesn't match this app's own origin. Absent Origin is allowed through
  // (non-browser API clients, older browsers) — this is defense-in-depth,
  // not a complete guarantee.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.get('origin')
    // `req.nextUrl.origin` reflects the server's own bind address (e.g.
    // `http://0.0.0.0:3000` for the standalone Docker server), not the host
    // the browser actually addressed — comparing against it made this check
    // reject every authenticated write in that deployment mode, since a
    // real browser's Origin header can never equal `http://0.0.0.0:PORT`.
    // Build the expected origin from the Host header instead (set by the
    // client for a direct connection, forwarded by Caddy in production),
    // falling back to nextUrl only if Host is somehow absent.
    const host = req.headers.get('host')
    const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')
    const expectedOrigin = host ? `${proto}://${host}` : req.nextUrl.origin
    if (origin && origin !== expectedOrigin) {
      return addHeaders(NextResponse.json(
        { error: 'cross_origin_request_denied', message: 'Request origin does not match this site' },
        { status: 403 },
      ), ids)
    }
  }

  // 6. Authenticated — allow with headers
  return addHeaders(nextWithIds(req, ids), ids)
}

export const config = {
  // Match all routes (including /api/*) except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}

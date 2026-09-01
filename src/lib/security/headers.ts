/**
 * Security headers middleware.
 *
 * Adds a strict Content-Security-Policy, HSTS, X-Frame-Options,
 * X-Content-Type-Options, Referrer-Policy, and Permissions-Policy to
 * every response. The CSP is permissive enough for Next.js dev (inline
 * styles, eval in dev) but locked down for production.
 */

import { NextRequest, NextResponse } from 'next/server'

const isProd = process.env.NODE_ENV === 'production'

function buildCsp(): string {
  const directives: string[] = []

  // default-src — fallback for any unlisted resource type
  directives.push("default-src 'self'")

  // script-src — Next.js needs inline scripts for hydration + eval in dev
  if (isProd) {
    directives.push("script-src 'self' 'unsafe-inline'")
  } else {
    directives.push("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
  }

  // style-src — Tailwind + shadcn use inline styles
  directives.push("style-src 'self' 'unsafe-inline'")

  // img-src — allow data: URLs (charts), https: for external images
  directives.push("img-src 'self' data: https:")

  // font-src — Google Fonts + local fonts
  directives.push("font-src 'self' data:")

  // connect-src — same-origin + Serper + z-ai backend
  directives.push(
    "connect-src 'self' https://google.serper.dev https://*.chatglm.cn https://*.z.ai",
  )

  // frame-ancestors — prevent clickjacking
  directives.push("frame-ancestors 'none'")

  // form-action — only allow same-origin
  directives.push("form-action 'self'")

  // base-uri — lock to self
  directives.push("base-uri 'self'")

  // object-src — block plugins
  directives.push("object-src 'none'")

  // upgrade-insecure-requests in prod
  if (isProd) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-DNS-Prefetch-Control': 'on',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': buildCsp(),
}

if (isProd) {
  SECURITY_HEADERS['Strict-Transport-Security'] =
    'max-age=63072000; includeSubDomains; preload'
}

/** Apply security headers to a NextResponse. */
export function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v)
  }
  return res
}

/** Middleware-style helper that wraps any response with security headers. */
export function withSecurityHeaders<T>(handler: (req: NextRequest) => Promise<T>): (req: NextRequest) => Promise<T> {
  return async (req: NextRequest) => {
    const res = await handler(req)
    if (res instanceof NextResponse) {
      applySecurityHeaders(res)
    }
    return res
  }
}

export { SECURITY_HEADERS }

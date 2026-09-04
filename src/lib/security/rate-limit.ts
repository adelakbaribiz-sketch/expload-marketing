/**
 * Rate limiter for API routes.
 *
 * Implements a sliding-window counter per identifier (IP or user).
 * Uses in-memory storage — sufficient for a single-instance deployment.
 * For multi-instance setups, swap `store` with a Redis-backed store.
 *
 * Usage:
 *   import { rateLimit, getClientId } from '@/lib/security/rate-limit'
 *   const result = rateLimit({ key: getClientId(req), limit: 50, windowMs: 60_000 })
 *   if (!result.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: result.headers })
 */

import { NextRequest } from 'next/server'

interface Bucket {
  count: number
  resetAt: number
}

interface Store {
  buckets: Map<string, Bucket>
}

const globalStore: Store = { buckets: new Map() }

// Cleanup expired buckets every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(store: Store, now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [k, b] of store.buckets) {
    if (b.resetAt <= now) store.buckets.delete(k)
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Unix ms timestamp when the bucket resets */
  resetAt: number
  /** Headers to attach to the response */
  headers: Record<string, string>
}

export interface RateLimitOptions {
  /** Unique identifier for the client (IP, user id, etc.) */
  key: string
  /** Maximum requests allowed in the window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
  /** Optional namespace to bucket keys (e.g. "leads:search") */
  namespace?: string
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  cleanup(globalStore, now)

  const bucketKey = opts.namespace ? `${opts.namespace}:${opts.key}` : opts.key
  const bucket = globalStore.buckets.get(bucketKey)

  if (!bucket || bucket.resetAt <= now) {
    // Create new bucket
    const resetAt = now + opts.windowMs
    globalStore.buckets.set(bucketKey, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: opts.limit - 1,
      resetAt,
      headers: buildHeaders(opts.limit, opts.limit - 1, resetAt),
    }
  }

  bucket.count++
  const remaining = Math.max(0, opts.limit - bucket.count)
  const allowed = bucket.count <= opts.limit

  if (!allowed) {
    // Return 429-friendly headers with Retry-After
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      headers: {
        ...buildHeaders(opts.limit, 0, bucket.resetAt),
        'Retry-After': String(Math.ceil((bucket.resetAt - now) / 1000)),
      },
    }
  }

  return {
    allowed: true,
    remaining,
    resetAt: bucket.resetAt,
    headers: buildHeaders(opts.limit, remaining, bucket.resetAt),
  }
}

function buildHeaders(limit: number, remaining: number, resetAt: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.floor(resetAt / 1000)),
  }
}

/** Extract a client identifier from a Next.js request. */
export function getClientId(req: NextRequest): string {
  // Trust X-Forwarded-For only if behind a known proxy
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    return xff.split(',')[0].trim()
  }
  // Fall back to the request's IP (Next.js-specific)
  const ip = (req as any).ip ?? req.headers.get('x-real-ip') ?? 'unknown'
  return String(ip)
}

/** Pre-configured rate limit presets. */
export const RATE_LIMITS = {
  /** Read endpoints — generous, 100 req/min */
  read: { limit: 100, windowMs: 60 * 1000 },
  /** Write endpoints — moderate, 30 req/min */
  write: { limit: 30, windowMs: 60 * 1000 },
  /** AI/generation endpoints — strict, 10 req/min */
  ai: { limit: 10, windowMs: 60 * 1000 },
  /** Auth endpoints — very strict, 5 req/min */
  auth: { limit: 5, windowMs: 60 * 1000 },
  /** Public, unauthenticated endpoints that write to the DB (sandbox, demo,
   *  pricing calculator) — no session to key off of and no legitimate
   *  reason for a real visitor to call these dozens of times a minute. */
  public: { limit: 20, windowMs: 60 * 1000 },
} as const

import { NextResponse } from 'next/server'
import { getCached, setCached } from '@/lib/cache/ttl-cache'

interface StoredResponse {
  status: number
  body: unknown
}

// Long enough to cover a realistic client retry window (a payment flow
// retried after a network blip, a double-tapped submit button) without
// keeping every response cached forever.
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Opt-in request idempotency via the `Idempotency-Key` header (a client-
 * generated token the caller reuses across retries of "the same"
 * request). On a repeat call with the same key, returns the exact cached
 * response instead of re-running the handler — the standard fix for
 * "duplicate click / retried POST double-charges a payment." No general
 * mechanism existed anywhere in the app before this phase
 * (RELIABILITY-AUDIT.md: only ad hoc, per-domain duplicate handling
 * existed — the crypto webhook's state-machine guard, sendCampaign's
 * already-sent skip).
 *
 * Deliberately opt-in per call site (via `cacheKeyPrefix`, which the
 * caller must build to already be tenant/user-scoped), not automatic for
 * every POST — most writes don't need it, and caching the wrong kind of
 * response (anything with side effects that should legitimately repeat)
 * would be actively wrong. Applied so far to payment creation, the
 * single highest "duplicate = real money" endpoint in the app; see
 * RELIABILITY-AUDIT.md for the rollout note on where else this could
 * apply.
 *
 * Best-effort, single-process — same `ttl-cache.ts` caveat as
 * `dashboard/unified`'s cache (Phase 16): fine for this app's current
 * single-instance deployment, not a distributed guarantee.
 */
export async function withIdempotency(
  req: Request,
  cacheKeyPrefix: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const key = req.headers.get('idempotency-key')
  if (!key) return handler()

  const cacheKey = `idempotency:${cacheKeyPrefix}:${key}`
  const cached = getCached<StoredResponse>(cacheKey)
  if (cached) {
    const res = NextResponse.json(cached.body, { status: cached.status })
    res.headers.set('X-Idempotent-Replay', 'true')
    return res
  }

  const result = await handler()
  // Never cache a 5xx — a transient failure must stay retryable for
  // real, not get replayed as the same error forever.
  if (result.status < 500) {
    const body = await result.clone().json().catch(() => null)
    if (body !== null) setCached(cacheKey, { status: result.status, body }, IDEMPOTENCY_TTL_MS)
  }
  return result
}

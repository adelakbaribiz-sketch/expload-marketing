/**
 * Shared conventions for every external-service adapter in
 * `src/lib/integrations/`. Each integration (email, SMS, payment — AI and
 * file storage already have their own adapters, `src/lib/llm/aggregator.ts`
 * and `src/lib/storage/`, and aren't duplicated here) follows the same
 * Timeout / Retry / Idempotency / Error-handling shape so a caller doesn't
 * need to learn a different failure model per vendor. See
 * INTEGRATION-ARCHITECTURE.md.
 */

export interface IntegrationResult<T> {
  ok: boolean
  data?: T
  error?: string
  /** True when this result came from a mock/simulated provider, not a real vendor call — never silently indistinguishable from a real result. */
  mocked?: boolean
  /** Round-trip time, for the same kind of per-call monitoring the LLM aggregator already does. */
  latencyMs: number
}

export class IntegrationTimeoutError extends Error {
  constructor(provider: string, ms: number) {
    super(`${provider} call timed out after ${ms}ms`)
    this.name = 'IntegrationTimeoutError'
  }
}

/** Reject a promise if it doesn't settle within `ms` — every outbound HTTP call in this directory goes through this, since `fetch` has no timeout by default and a hung vendor connection must not hang the request that triggered it. */
export function withTimeout<T>(promise: Promise<T>, ms: number, provider: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new IntegrationTimeoutError(provider, ms)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

export interface RetryOptions {
  attempts: number
  /** Base delay in ms; each retry backs off by `delayMs * 2^attempt`. */
  delayMs: number
  /** Only retry when this returns true (e.g. skip retrying a 4xx auth failure) — defaults to "retry everything". */
  shouldRetry?: (err: unknown) => boolean
}

/** Retry a transient failure with exponential backoff — for network blips, not for errors that will never succeed on retry (bad credentials, invalid input). */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < opts.attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (opts.shouldRetry && !opts.shouldRetry(err)) throw err
      if (attempt < opts.attempts - 1) {
        await new Promise((r) => setTimeout(r, opts.delayMs * 2 ** attempt))
      }
    }
  }
  throw lastError
}

/** Wrap a call, timing it and normalizing success/failure into IntegrationResult — the shape every provider's public method returns. */
export async function timed<T>(fn: () => Promise<T>): Promise<IntegrationResult<T>> {
  const start = Date.now()
  try {
    const data = await fn()
    return { ok: true, data, latencyMs: Date.now() - start }
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message ?? err), latencyMs: Date.now() - start }
  }
}

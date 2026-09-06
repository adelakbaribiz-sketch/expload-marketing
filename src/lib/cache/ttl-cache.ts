/**
 * Minimal in-process TTL cache for cheap, short-lived response caching —
 * e.g. dashboard KPI aggregates where a few seconds of staleness is a
 * completely standard, acceptable tradeoff, not a correctness concern.
 *
 * Cached on `globalThis` for the same reason as
 * `src/lib/observability/metrics.ts` (see that file's header comment in
 * full): Next.js compiles each route.ts into its own module bundle, so a
 * plain module-level `new Map()` here would silently become a different
 * object per route, defeating the cache the moment two different routes
 * (or two hits of the same route across dev hot-reloads) needed to share
 * an entry.
 *
 * Not Redis-backed, and deliberately so: this is a single-process,
 * best-effort cache for read-heavy/write-rare aggregate data, not a
 * distributed cache or a substitute for one. If this app ever runs more
 * than one instance, each instance keeps its own copy — the worst case is
 * one instance being up to `ttlMs` behind another, which is exactly the
 * staleness this cache already accepts by design.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const g = globalThis as unknown as { __ttlCache?: Map<string, CacheEntry<unknown>> }
const store = g.__ttlCache ?? (g.__ttlCache = new Map())

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return undefined
  }
  return entry.value as T
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function invalidateCached(key: string): void {
  store.delete(key)
}

/** Compute-and-cache: returns the cached value if fresh, otherwise runs `compute()` and caches the result. */
export async function withTtlCache<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key)
  if (cached !== undefined) return cached
  const value = await compute()
  setCached(key, value, ttlMs)
  return value
}

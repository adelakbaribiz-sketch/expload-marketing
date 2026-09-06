/**
 * Next.js instrumentation hook — runs once when the server process starts,
 * before it accepts any requests. Two things belong here specifically
 * because they need to run exactly once at boot, not per-request:
 *
 *  1. `logEnvStatus()` already existed (src/lib/config/env.ts) but had no
 *     caller anywhere in the app — the startup diagnostic banner it builds
 *     was dead code, never actually printed. Wiring it here is what makes
 *     it real.
 *  2. Eagerly importing the queue module registers its Prometheus
 *     queue-depth gauge sampler (see src/lib/observability/metrics.ts)
 *     immediately, so `GET /api/metrics` reports queue depth from the
 *     first scrape rather than only after the first job is enqueued
 *     (import is safe with no side effect beyond that — the worker loop
 *     itself only starts on the first real `enqueue()` call).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logEnvStatus } = await import('@/lib/config/env')
    logEnvStatus()

    await import('@/lib/queue')
  }
}

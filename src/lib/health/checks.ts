/**
 * Shared health-check logic, used by /api/health, /api/health/ready, and
 * (indirectly, by staying fast and dependency-free) /api/health/live.
 */

import { validateEnv } from '@/lib/config/env'
import { db } from '@/lib/db'
import { isEmbeddingApiConfigured, isQdrantEnabled } from '@/lib/vector/qdrant'

export interface CheckResult {
  ok: boolean
  latency?: number
  error?: string
}

export interface HealthChecks {
  database: CheckResult
  redis?: CheckResult
  smtp?: CheckResult
  semanticSearch: CheckResult
}

/** Runs the readiness-affecting checks (DB, configured Redis, configured SMTP) plus the informational semantic-search status. */
export async function runHealthChecks(): Promise<{ checks: HealthChecks; ready: boolean }> {
  const env = validateEnv()
  const checks: Partial<HealthChecks> = {}

  const dbStart = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = { ok: true, latency: Date.now() - dbStart }
  } catch (err: any) {
    checks.database = { ok: false, error: String(err?.message ?? err).slice(0, 200) }
  }

  if (process.env.REDIS_URL) {
    const redisStart = Date.now()
    try {
      const { default: Redis } = await import('ioredis')
      const redis = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      })
      await redis.connect()
      await redis.ping()
      await redis.disconnect()
      checks.redis = { ok: true, latency: Date.now() - redisStart }
    } catch (err: any) {
      checks.redis = { ok: false, error: String(err?.message ?? err).slice(0, 200) }
    }
  }

  if (env.config.smtp.configured) {
    checks.smtp = { ok: true }
  }

  // Informational only — deliberately excluded from `ready` below. See
  // the historical reasoning preserved in /api/health/route.ts.
  checks.semanticSearch = {
    ok: isEmbeddingApiConfigured(),
    ...(isEmbeddingApiConfigured()
      ? {}
      : { error: `No embedding API key configured — falling back to non-semantic pseudo-embeddings (backend: ${isQdrantEnabled() ? 'qdrant' : 'in-db-fallback'})` }),
  }

  const full = checks as HealthChecks
  const ready = Object.entries(full)
    .filter(([k]) => k !== 'semanticSearch')
    .every(([, v]) => v.ok) && env.ok

  return { checks: full, ready }
}

/** Strip error text and latency for anonymous/public callers — booleans only. */
export function publicChecks(checks: HealthChecks): Record<string, { ok: boolean }> {
  return Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, { ok: v.ok }]))
}

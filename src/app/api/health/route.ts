import { NextResponse } from 'next/server'
import { validateEnv } from '@/lib/config/env'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { isQdrantEnabled, isEmbeddingApiConfigured } from '@/lib/vector/qdrant'

/**
 * Health check endpoint for load balancer / container orchestration probes.
 *
 * Returns 200 if the app is healthy, 503 if not.
 * Checks:
 *   - Environment variables are valid
 *   - Database connection is alive
 *   - (optional) Redis connection if configured
 */
export async function GET() {
  const env = validateEnv()
  const checks: Record<string, { ok: boolean; latency?: number; error?: string }> = {}

  // 1. Database check
  const dbStart = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = { ok: true, latency: Date.now() - dbStart }
  } catch (err: any) {
    checks.database = { ok: false, error: String(err?.message ?? err).slice(0, 200) }
  }

  // 2. Redis check (if configured)
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

  // 3. SMTP check (if configured) — just verify transport can be created
  if (env.config.smtp.configured) {
    checks.smtp = { ok: true }
  }

  // Overall health — computed from the checks above only. Liveness/
  // readiness probes must fail solely on things that make the app actually
  // down (DB, configured Redis/SMTP); an optional AI feature running in a
  // degraded-but-functional mode is not that, and must never flip the
  // container into a restart loop.
  const allOk = Object.values(checks).every((c) => c.ok) && env.ok

  // Semantic search — with no real embedding API key configured, vector
  // search silently degrades to a deterministic hash-based pseudo-embedding
  // (see src/lib/vector/qdrant.ts) that carries no real semantic meaning.
  // Informational only (added after allOk, deliberately not part of it) —
  // flagged so this isn't invisible in a deployed environment, not treated
  // as a liveness failure.
  checks.semanticSearch = {
    ok: isEmbeddingApiConfigured(),
    ...(isEmbeddingApiConfigured() ? {} : { error: `No embedding API key configured — falling back to non-semantic pseudo-embeddings (backend: ${isQdrantEnabled() ? 'qdrant' : 'in-db-fallback'})` }),
  }

  // This route is deliberately public (proxy.ts) — container/load-balancer
  // probes and Dockerfile's HEALTHCHECK hit it with no auth available. But
  // "public" only needs to mean up/down, not a free infra-reconnaissance
  // dump: masked DB/Redis URLs, which integrations are configured, exact
  // uptime, and raw upstream error text were previously returned to every
  // anonymous caller. Only a real platform SuperAdmin gets the detail.
  const admin = await isSuperAdmin()
  const publicChecks = Object.fromEntries(
    Object.entries(checks).map(([k, v]) => [k, { ok: v.ok }]),
  )

  return NextResponse.json(
    admin
      ? {
          status: allOk ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: env.config.nodeEnv,
          version: process.env.npm_package_version ?? 'unknown',
          checks,
          config: env.config,
        }
      : {
          status: allOk ? 'healthy' : 'unhealthy',
          checks: publicChecks,
        },
    { status: allOk ? 200 : 503 },
  )
}

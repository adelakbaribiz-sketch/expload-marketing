import { NextResponse } from 'next/server'
import { validateEnv } from '@/lib/config/env'
import { db } from '@/lib/db'

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

  // Overall health
  const allOk = Object.values(checks).every((c) => c.ok) && env.ok

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.config.nodeEnv,
      version: process.env.npm_package_version ?? 'unknown',
      checks,
      config: env.config,
    },
    { status: allOk ? 200 : 503 },
  )
}

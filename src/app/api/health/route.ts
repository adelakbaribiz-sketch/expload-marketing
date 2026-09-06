import { NextResponse } from 'next/server'
import { validateEnv } from '@/lib/config/env'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { runHealthChecks, publicChecks } from '@/lib/health/checks'
import { alertCritical } from '@/lib/observability/alerts'

/**
 * Combined health check — DB/Redis/SMTP readiness plus environment/config
 * detail for admins. Kept as the detailed/aggregate endpoint for backward
 * compatibility (Dockerfile's HEALTHCHECK and the admin panel both hit
 * this one); see /api/health/live and /api/health/ready for the
 * liveness/readiness split an orchestrator like Kubernetes expects.
 *
 * Returns 200 if the app is healthy, 503 if not.
 */
export async function GET() {
  const env = validateEnv()
  const { checks, ready } = await runHealthChecks()
  const allOk = ready

  if (!allOk) {
    alertCritical({
      title: 'Health check unhealthy',
      detail: Object.entries(checks)
        .filter(([, v]) => !v.ok)
        .map(([k, v]) => `${k}: ${v.error ?? 'failing'}`)
        .join('; '),
      source: 'health.combined',
    }).catch(() => {})
  }

  // This route is deliberately public (proxy.ts) — container/load-balancer
  // probes and Dockerfile's HEALTHCHECK hit it with no auth available. But
  // "public" only needs to mean up/down, not a free infra-reconnaissance
  // dump: masked DB/Redis URLs, which integrations are configured, exact
  // uptime, and raw upstream error text were previously returned to every
  // anonymous caller. Only a real platform SuperAdmin gets the detail.
  const admin = await isSuperAdmin()

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
          checks: publicChecks(checks),
        },
    { status: allOk ? 200 : 503 },
  )
}

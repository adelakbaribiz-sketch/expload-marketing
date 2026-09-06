import { NextResponse } from 'next/server'
import { runHealthChecks, publicChecks } from '@/lib/health/checks'

/**
 * Readiness probe — "can this instance actually serve traffic right now"
 * (DB reachable, configured Redis/SMTP reachable). An orchestrator should
 * use this to decide whether to route requests to the instance, not
 * whether to restart it — see /api/health/live for that distinction.
 * Public, booleans-only response — same reasoning as /api/health.
 */
export async function GET() {
  const { checks, ready } = await runHealthChecks()
  return NextResponse.json(
    { status: ready ? 'ready' : 'not_ready', checks: publicChecks(checks) },
    { status: ready ? 200 : 503 },
  )
}

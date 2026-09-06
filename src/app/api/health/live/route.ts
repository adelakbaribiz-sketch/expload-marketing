import { NextResponse } from 'next/server'

/**
 * Liveness probe — answers only "is the process up and able to respond",
 * with zero dependency checks (no DB/Redis). This is the endpoint an
 * orchestrator should use to decide whether to *restart* the container —
 * a slow/unreachable database must never trigger a restart loop, since
 * restarting the app does nothing to fix the database. See
 * /api/health/ready for "can this instance actually serve traffic".
 */
export async function GET() {
  return NextResponse.json({ status: 'alive', uptime: process.uptime() })
}

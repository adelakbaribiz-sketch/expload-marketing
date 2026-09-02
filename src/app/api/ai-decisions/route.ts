import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

/**
 * Read-only log of AI Decision Engine activity — every recommendation the
 * platform's AI made, with its reasoning, confidence, evidence, alternatives
 * considered, and (once known) the actual outcome. No POST: decisions are
 * only ever written by the domain modules that make them (negotiation,
 * campaign scheduler, graph planner), never directly by a client.
 */
export async function GET(req: NextRequest) {
  const tenantId = await requireTenantId()
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get('domain')

  const decisions = await db.aiDecision.findMany({
    where: { tenantId, ...(domain ? { domain } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ decisions })
}

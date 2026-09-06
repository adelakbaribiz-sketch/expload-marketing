import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { executePlan, ExecutionPlan, UnconfirmedHighRiskNodesError, HIGH_RISK_NODE_TYPES } from '@/lib/graph/orchestrator'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method !== 'POST') return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })

  const body = await req.json()
  if (!body.plan) return NextResponse.json({ error: 'plan required' }, { status: 400 })

  const plan = body.plan as ExecutionPlan
  const confirmedNodeIds: string[] = Array.isArray(body.confirmedNodeIds) ? body.confirmedNodeIds : []

  // Execute (this is synchronous — for production, use a queue). Nodes
  // with a real external effect (send email, spend ad budget, create a
  // payment) are refused unless the caller explicitly confirmed each one —
  // see HIGH_RISK_NODE_TYPES / AI-STACK-AUDIT.md.
  let state
  try {
    state = await executePlan(plan, user.tenantId, user.id, undefined, confirmedNodeIds)
  } catch (err) {
    if (err instanceof UnconfirmedHighRiskNodesError) {
      return NextResponse.json({
        error: 'confirmation_required',
        message: err.message,
        unconfirmedNodes: err.nodes,
      }, { status: 428 })
    }
    throw err
  }

  // Convert Map to plain object for JSON response
  const results: any = {}
  for (const [k, v] of state.results.entries()) {
    results[k] = v
  }

  return NextResponse.json({
    status: state.status,
    started_at: state.started_at,
    completed_at: state.completed_at,
    plan: state.plan,
    results,
  })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { generatePlan, PLAN_TEMPLATES, ExecutionPlan } from '@/lib/graph/orchestrator'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    // Return available plan templates
    return NextResponse.json({
      templates: Object.keys(PLAN_TEMPLATES).map(key => ({
        id: key,
        name: PLAN_TEMPLATES[key]().plan_name,
        goal: PLAN_TEMPLATES[key]().goal,
        node_count: PLAN_TEMPLATES[key]().nodes.length,
        estimated_minutes: PLAN_TEMPLATES[key]().estimated_duration_minutes,
      })),
    })
  }

  if (req.method === 'POST') {
    const body = await req.json()

    let plan: ExecutionPlan
    if (body.template_id && PLAN_TEMPLATES[body.template_id]) {
      // Use pre-built template
      plan = PLAN_TEMPLATES[body.template_id]()
    } else if (body.goal) {
      // Generate plan via LLM
      plan = await generatePlan(body.goal, user.tenantId, user.id)
    } else {
      return NextResponse.json({ error: 'Either template_id or goal required' }, { status: 400 })
    }

    return NextResponse.json({ plan }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

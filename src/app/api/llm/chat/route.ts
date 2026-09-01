import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { llmAggregator } from '@/lib/llm/aggregator'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'POST') {
    const body = await req.json()
    const { messages, model, temperature, maxTokens, sessionType, sessionId } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    try {
      const response = await llmAggregator.complete({
        messages,
        model,
        temperature,
        maxTokens,
        sessionType: sessionType ?? 'chat',
        sessionId,
        tenantId: user.tenantId,
      })
      return NextResponse.json({ response })
    } catch (err: any) {
      return NextResponse.json({ error: 'llm_failed', message: err.message }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

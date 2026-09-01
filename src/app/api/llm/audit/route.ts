import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const provider = url.searchParams.get('provider')
  const eventType = url.searchParams.get('eventType')
  const limit = parseInt(url.searchParams.get('limit') ?? '100')

  const where: any = {}
  if (provider) where.provider = provider
  if (eventType) where.eventType = eventType

  const events = await db.llmAuditEvent.findMany({
    where, orderBy: { createdAt: 'desc' }, take: limit,
  })
  return NextResponse.json({ events })
}

export const GET = withProtection(handler, { rateLimit: 'read' })

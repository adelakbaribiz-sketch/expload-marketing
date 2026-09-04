import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { approveSchedule } from '@/lib/campaign-scheduler/scheduler'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method !== 'POST') return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })

  const existing = await db.campaignScheduleSuggestion.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const body = await req.json()
  const suggestion = await approveSchedule(id, body.startDate, body.endDate)
  return NextResponse.json({ suggestion })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

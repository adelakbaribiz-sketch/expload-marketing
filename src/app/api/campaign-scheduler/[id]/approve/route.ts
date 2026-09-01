import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { approveSchedule } from '@/lib/campaign-scheduler/scheduler'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method !== 'POST') return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })

  const body = await req.json()
  const suggestion = await approveSchedule(id, body.startDate, body.endDate)
  return NextResponse.json({ suggestion })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

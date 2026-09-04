import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { recordPayment } from '@/lib/project-intake/engine'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method !== 'POST') return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })

  const existing = await db.projectBrief.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const body = await req.json()
  const brief = await recordPayment(id, {
    paymentOption: body.paymentOption,  // 'full' | 'phased'
    amount: body.amount,
    tier: body.tier,
  })

  return NextResponse.json({ brief })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

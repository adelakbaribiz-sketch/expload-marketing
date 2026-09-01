import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  const payment = await db.cryptoPayment.findUnique({ where: { id } })
  if (!payment) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Only allow owner to view
  if (payment.tenantId && payment.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  return NextResponse.json({ payment })
}

export const GET = withProtection(handler, { rateLimit: 'read' })

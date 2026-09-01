import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const config = await db.payrollConfig.findFirst({ where: { isActive: true } })
    return NextResponse.json({ config })
  }

  if (req.method === 'POST' || req.method === 'PATCH') {
    const body = await req.json()
    // Upsert — only one active config
    const existing = await db.payrollConfig.findFirst({ where: { isActive: true } })
    const data = {
      ownerSharePercent: body.ownerSharePercent ?? 50,
      staffPoolPercent: body.staffPoolPercent ?? 40,
      reinvestmentPercent: body.reinvestmentPercent ?? 10,
      roleWeights: JSON.stringify(body.roleWeights ?? {
        c_level: 3, vp: 2.5, director: 2, manager: 1.5, lead: 1.2, senior: 1, staff: 0.7,
      }),
      bonusPoolPercent: body.bonusPoolPercent ?? 5,
      payoutFrequency: body.payoutFrequency ?? 'monthly',
      payoutDay: body.payoutDay ?? 1,
    }
    let config
    if (existing) {
      config = await db.payrollConfig.update({ where: { id: existing.id }, data })
    } else {
      config = await db.payrollConfig.create({ data })
    }
    return NextResponse.json({ config })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const plans = await db.supportPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    })
    return NextResponse.json({ plans })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const plan = await db.supportPlan.create({
      data: {
        name: body.name,
        description: body.description,
        monthlyPrice: body.monthlyPrice,
        annualPrice: body.annualPrice,
        currency: body.currency ?? 'USD',
        features: JSON.stringify(body.features ?? []),
        responseTimeHours: body.responseTimeHours ?? 48,
        resolutionTimeHours: body.resolutionTimeHours,
        channels: JSON.stringify(body.channels ?? ['email']),
        monthlyTicketsLimit: body.monthlyTicketsLimit,
        monthlyHoursLimit: body.monthlyHoursLimit,
        isFeatured: body.isFeatured ?? false,
        displayOrder: body.displayOrder ?? 100,
        color: body.color ?? '#1B3A4B',
      },
    })
    return NextResponse.json({ plan }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

export async function GET(req: NextRequest) {
  const tenantId = await requireTenantId()
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const events = await db.calendarEvent.findMany({
    where: {
      tenantId,
      ...(startDate && endDate ? { startDate: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
    },
    orderBy: { startDate: 'asc' },
    take: 200,
  })
  return NextResponse.json({ events })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const event = await db.calendarEvent.create({
    data: {
      tenantId,
      title: body.title,
      description: body.description || null,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      allDay: body.allDay || false,
      sourceType: body.sourceType || 'manual',
      sourceId: body.sourceId || null,
      channel: body.channel || null,
      status: body.status || 'scheduled',
      color: body.color || '#3b82f6',
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    },
  })
  return NextResponse.json({ event }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

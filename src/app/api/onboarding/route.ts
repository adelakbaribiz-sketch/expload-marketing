import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function GET() {
  const tenantId = await requireTenantId()
  const steps = await db.onboardingStep.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ steps })
}

export async function POST(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const step = await db.onboardingStep.upsert({
    where: { tenantId_step: { tenantId, step: body.step } },
    create: { tenantId, step: body.step, status: body.status || 'completed', data: body.data ? JSON.stringify(body.data) : null, completedAt: body.status === 'completed' ? new Date() : null },
    update: { status: body.status || 'completed', data: body.data ? JSON.stringify(body.data) : null, completedAt: body.status === 'completed' ? new Date() : null },
  })
  return NextResponse.json({ step })
}

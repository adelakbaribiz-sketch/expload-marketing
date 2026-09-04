import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isPlatformStaffAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    const where: any = { isActive: true }
    if (category) where.category = category
    const services = await db.assistantService.findMany({
      where, orderBy: { category: 'asc' },
    })
    return NextResponse.json({ services })
  }

  if (req.method === 'POST') {
    // AssistantService is a platform-global catalog (no tenantId).
    if (!(await isPlatformStaffAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    const service = await db.assistantService.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        deliverables: body.deliverables ? JSON.stringify(body.deliverables) : null,
        pricingType: body.pricingType ?? 'fixed',
        fixedPrice: body.fixedPrice,
        hourlyEstimate: body.hourlyEstimate,
        monthlyHours: body.monthlyHours,
        currency: body.currency ?? 'USD',
        estimatedDays: body.estimatedDays ?? 7,
        requiredSkills: body.requiredSkills ? JSON.stringify(body.requiredSkills) : null,
      },
    })
    return NextResponse.json({ service }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

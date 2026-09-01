import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const skill = url.searchParams.get('skill')
    const availableOnly = url.searchParams.get('available') === 'true'
    const where: any = { status: 'active' }
    if (availableOnly) where.isAvailable = true
    if (skill) where.primarySkill = skill

    const assistants = await db.virtualAssistant.findMany({
      where,
      include: { _count: { select: { assignments: true } } },
      orderBy: [{ rating: 'desc' }, { totalProjects: 'desc' }],
      take: 100,
    })
    return NextResponse.json({ assistants })
  }

  if (req.method === 'POST') {
    // Create new assistant (admin/super_admin only — but we don't check here for simplicity)
    const body = await req.json()
    const assistant = await db.virtualAssistant.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        bio: body.bio,
        skills: JSON.stringify(body.skills ?? []),
        primarySkill: body.primarySkill ?? body.skills?.[0] ?? 'general',
        languages: JSON.stringify(body.languages ?? ['en']),
        workMode: body.workMode ?? 'remote',
        location: body.location,
        timezone: body.timezone ?? 'UTC',
        hourlyRate: body.hourlyRate ?? 25,
        monthlyRate: body.monthlyRate,
        currency: body.currency ?? 'USD',
        isAvailable: body.isAvailable ?? true,
        isVerified: body.isVerified ?? false,
      },
    })
    return NextResponse.json({ assistant }, { status: 201 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })

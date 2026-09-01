import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
  const promotions = await db.platformPromotion.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ promotions })
}

async function postHandler(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const promo = await db.platformPromotion.create({
    data: {
      name: body.name,
      type: body.type || 'email_campaign',
      title: body.title,
      description: body.description || null,
      content: body.content ? JSON.stringify(body.content) : null,
      targetAudience: body.targetAudience || 'all',
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      status: body.status || 'draft',
      isAiGenerated: body.isAiGenerated ?? false,
    },
  })
  return NextResponse.json({ promotion: promo }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

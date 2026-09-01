import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeMultiline } from '@/lib/security/sanitize'
import { z } from 'zod'

const TemplateCreate = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
  category: z.enum(['general', 'welcome', 'follow_up', 'newsletter', 'promotional']).default('general'),
})

export async function GET() {
  const tenantId = await requireTenantId()
  const templates = await db.emailTemplate.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { campaigns: true } },
    },
  })
  return NextResponse.json({ templates })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => null)
  const parsed = TemplateCreate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const template = await db.emailTemplate.create({
    data: {
      name: sanitizeText(parsed.data.name, 200),
      subject: sanitizeText(parsed.data.subject, 500),
      body: sanitizeMultiline(parsed.data.body, 10000),
      category: parsed.data.category,
      tenantId,
    },
  })

  return NextResponse.json({ template }, { status: 201 })
}

export const POST = withProtection(postHandler, {
  rateLimit: 'write',
  audit: { type: 'created', message: () => 'Template created' },
})

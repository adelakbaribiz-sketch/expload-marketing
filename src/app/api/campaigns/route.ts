import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection, getTenantIdFromRequest } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeMultiline } from '@/lib/security/sanitize'
import { requireNonViewer } from '@/lib/auth/rbac'
import { z } from 'zod'

const CampaignCreate = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
  templateId: z.string().max(100).optional(),
  recipientFilter: z
    .object({
      status: z.string().optional(),
      industry: z.string().optional(),
      minScore: z.number().min(0).max(100).optional(),
      projectId: z.string().optional(),
    })
    .optional(),
})

export async function GET() {
  const tenantId = await requireTenantId()
  const campaigns = await db.emailCampaign.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      template: true,
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { logs: true } },
    },
    take: 100,
  })
  return NextResponse.json({ campaigns })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const access = await requireNonViewer()
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 })
  const body = await req.json().catch(() => null)
  const parsed = CampaignCreate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const campaign = await db.emailCampaign.create({
    data: {
      name: sanitizeText(parsed.data.name, 200),
      subject: sanitizeText(parsed.data.subject, 500),
      body: sanitizeMultiline(parsed.data.body, 10000),
      templateId: parsed.data.templateId || null,
      recipientFilter: parsed.data.recipientFilter
        ? JSON.stringify(parsed.data.recipientFilter)
        : null,
      tenantId,
    },
  })

  return NextResponse.json({ campaign }, { status: 201 })
}

export const POST = withProtection(postHandler, {
  rateLimit: 'write',
  audit: {
    type: 'created',
    message: () => 'Campaign created',
    tenantId: (req) => getTenantIdFromRequest(req),
  },
})

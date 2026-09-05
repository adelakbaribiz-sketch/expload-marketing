import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId, getTenantIdOrNull } from '@/lib/tenant'
import { withProtection, getTenantIdFromRequest } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeEmail, sanitizeUrl, sanitizePhone, sanitizeStringList, sanitizeMultiline } from '@/lib/security/sanitize'
import { requireNonViewer } from '@/lib/auth/rbac'
import { z } from 'zod'

const LeadCreate = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  industry: z.string().max(80).optional(),
  description: z.string().max(1000).optional(),
  services: z.array(z.string().max(100)).max(10).optional(),
  score: z.number().min(0).max(100).default(0),
  status: z.enum(['new', 'contacted', 'qualified', 'won', 'lost']).default('new'),
  source: z.string().max(50).optional(),
  projectId: z.string().max(100).optional(),
})

export async function GET(req: NextRequest) {
  const tenantId = await getTenantIdOrNull()
  if (!tenantId) return NextResponse.json({ leads: [] })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const industry = searchParams.get('industry') ?? undefined
  const projectId = searchParams.get('projectId') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const minScore = searchParams.get('minScore')
  const sort = searchParams.get('sort') ?? 'createdAt:desc'

  const [sortField, sortDir] = sort.split(':')
  const order =
    sortField === 'score' || sortField === 'name'
      ? { [sortField]: sortDir === 'asc' ? 'asc' as const : 'desc' as const }
      : { createdAt: sortDir === 'asc' ? 'asc' as const : 'desc' as const }

  const leads = await db.lead.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(industry ? { industry } : {}),
      ...(projectId ? { projectId } : {}),
      ...(q ? { name: { contains: q } } : {}),
      ...(minScore ? { score: { gte: Number(minScore) } } : {}),
    },
    orderBy: order,
    include: { project: true, company: true },
    take: 200,
  })
  return NextResponse.json({ leads })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const access = await requireNonViewer()
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 })
  const body = await req.json().catch(() => null)
  const parsed = LeadCreate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { services, ...rest } = parsed.data
  const lead = await db.lead.create({
    data: {
      name: sanitizeText(rest.name, 200),
      email: sanitizeEmail(rest.email) ?? null,
      phone: sanitizePhone(rest.phone) ?? null,
      website: sanitizeUrl(rest.website),
      address: rest.address ? sanitizeText(rest.address, 300) : null,
      industry: rest.industry ? sanitizeText(rest.industry, 80) : null,
      description: rest.description ? sanitizeMultiline(rest.description, 1000) : null,
      services: services ? JSON.stringify(sanitizeStringList(services)) : null,
      score: rest.score,
      status: rest.status,
      source: rest.source ? sanitizeText(rest.source, 50) : null,
      projectId: rest.projectId || null,
      tenantId,
    },
  })
  await db.activity.create({
    data: {
      type: 'created',
      message: `Lead «${lead.name}» created`,
      leadId: lead.id,
      tenantId,
    },
  })
  return NextResponse.json({ lead }, { status: 201 })
}

export const POST = withProtection(postHandler, {
  rateLimit: 'write',
  audit: {
    type: 'created',
    message: (req) => 'Lead create attempt',
    tenantId: (req) => getTenantIdFromRequest(req),
  },
})

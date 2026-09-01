import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId, getTenantIdOrNull } from '@/lib/tenant'
import { withProtection, getTenantIdFromRequest } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeMultiline } from '@/lib/security/sanitize'
import { z } from 'zod'

const ProjectCreate = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
})

export async function GET() {
  const tenantId = await getTenantIdOrNull()
  if (!tenantId) return NextResponse.json({ projects: [] })
  const projects = await db.project.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { leads: true } } },
  })
  return NextResponse.json({ projects })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => null)
  const parsed = ProjectCreate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const project = await db.project.create({
    data: {
      name: sanitizeText(parsed.data.name, 200),
      description: parsed.data.description
        ? sanitizeMultiline(parsed.data.description, 1000)
        : null,
      status: parsed.data.status,
      tenantId,
    },
  })
  return NextResponse.json({ project }, { status: 201 })
}

export const POST = withProtection(postHandler, {
  rateLimit: 'write',
  audit: {
    type: 'created',
    message: () => 'Project created',
    tenantId: (req) => getTenantIdFromRequest(req),
  },
})

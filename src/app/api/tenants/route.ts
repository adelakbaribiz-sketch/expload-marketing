import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText } from '@/lib/security/sanitize'
import { z } from 'zod'

const TenantCreate = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(200).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Invalid domain'),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
})

export async function GET() {
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { leads: true, projects: true, users: true } } },
  })
  return NextResponse.json({ tenants })
}

async function postHandler(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = TenantCreate.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { name, domain, plan } = parsed.data
  const tenant = await db.tenant.create({
    data: {
      name: sanitizeText(name, 200),
      domain: sanitizeText(domain.toLowerCase(), 200),
      plan,
    },
  })
  return NextResponse.json({ tenant }, { status: 201 })
}

export const POST = withProtection(postHandler, {
  rateLimit: 'write',
  audit: { type: 'created', message: () => 'Tenant created' },
})

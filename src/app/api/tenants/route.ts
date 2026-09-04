import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText } from '@/lib/security/sanitize'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { z } from 'zod'

const TenantCreate = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(200).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Invalid domain'),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
})

// Scoped to the caller's own tenant, unless they're a SuperAdmin (who needs
// the full list to power the sidebar's tenant-switcher — see src/lib/tenant.ts).
// Previously returned every tenant's id/name/domain/plan/counts to any
// signed-up user — see KNOWN-ISSUES.md #4.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const where = user.isSuperAdmin ? {} : { id: user.tenantId }
  const tenants = await db.tenant.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { leads: true, projects: true, users: true } } },
  })
  return NextResponse.json({ tenants })
}

async function postHandler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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

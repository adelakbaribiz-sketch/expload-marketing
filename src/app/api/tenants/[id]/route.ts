import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'

async function canAccessTenant(id: string) {
  const user = await getCurrentUser()
  if (!user) return { allowed: false as const, status: 401 as const }
  if (user.tenantId === id || (await isSuperAdmin())) return { allowed: true as const }
  return { allowed: false as const, status: 403 as const }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const access = await canAccessTenant(id)
  if (!access.allowed) return NextResponse.json({ error: 'forbidden' }, { status: access.status })
  const tenant = await db.tenant.findUnique({
    where: { id },
    include: { _count: { select: { leads: true, projects: true, users: true } } },
  })
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ tenant })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const access = await canAccessTenant(id)
  if (!access.allowed) return NextResponse.json({ error: 'forbidden' }, { status: access.status })
  const body = await req.json().catch(() => ({}))
  const updated = await db.tenant.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name) } : {}),
      ...(body.domain ? { domain: String(body.domain).toLowerCase() } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
      ...(body.plan ? { plan: String(body.plan) } : {}),
    },
  })
  return NextResponse.json({ tenant: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  // Deleting a tenant is destructive platform-wide — restrict to super admins,
  // even though a tenant owner can view/edit their own tenant above.
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

  // A handful of models deliberately keep their row after the owning tenant
  // is gone (`onDelete: SetNull` — they're audit/business records this app
  // never silently destroys, e.g. AuditLogEntry's own comment). But several
  // of them carry direct PII in fields that have nothing to do with WHY
  // they're kept (a name, an email, an IP/user-agent) — found in the Phase
  // 20 production-readiness audit: tenant deletion left this PII behind as
  // orphaned, unreferenced data with no purge path anywhere in the app, a
  // real gap for any GDPR-style "right to be forgotten" request. Anonymize
  // those specific fields (never the whole row — the record itself, and
  // its financial/audit value, is exactly what's meant to survive) in the
  // same transaction as the tenant delete, so this can't partially apply.
  await db.$transaction(async (tx) => {
    await tx.auditLogEntry.updateMany({
      where: { tenantId: id },
      data: { userName: null, ipAddress: null, userAgent: null, entityName: null, changes: null },
    })
    await tx.pricingCalculation.updateMany({
      where: { tenantId: id },
      data: { customerName: null, customerEmail: null },
    })
    await tx.investorProfile.updateMany({
      where: { tenantId: id },
      data: { name: '[deleted]', email: null },
    })
    await tx.cofounderProfile.updateMany({
      where: { tenantId: id },
      data: { name: '[deleted]', email: null },
    })
    await tx.partnershipOpportunity.updateMany({
      where: { tenantId: id },
      data: { partnerName: '[deleted]' },
    })
    await tx.referral.updateMany({
      where: { refereeTenantId: id },
      data: { refereeEmail: '[deleted]' },
    })
    await tx.tenant.delete({ where: { id } })
  })

  return NextResponse.json({ ok: true })
}

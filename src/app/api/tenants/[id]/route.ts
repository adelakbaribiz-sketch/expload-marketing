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
  await db.tenant.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function patchHandler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.clubAdvertisement.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))

  // `status`/`reviewedAt` are a platform-moderation gate (ads created via
  // club/membership start `pending`) — the tenant that owns the ad could
  // previously self-approve straight to `active`, bypassing moderation
  // entirely. Found in the Phase 20 audit, same self-approval bug class as
  // reseller/applications. Content edits (title/description) stay
  // self-service; only the moderation decision requires staff.
  if (body.status !== undefined) {
    const superAdmin = await isSuperAdmin()
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const updated = await db.clubAdvertisement.update({
    where: { id },
    data: {
      ...(body.status ? { status: String(body.status), reviewedAt: new Date() } : {}),
      ...(body.title ? { title: String(body.title).slice(0, 200) } : {}),
      ...(typeof body.description === 'string' ? { description: String(body.description).slice(0, 1000) } : {}),
    },
  })
  return NextResponse.json({ ad: updated })
}

async function deleteHandler(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.clubAdvertisement.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.clubAdvertisement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export const PATCH = withProtection(patchHandler, { rateLimit: 'write' })
export const DELETE = withProtection(deleteHandler, { rateLimit: 'write' })

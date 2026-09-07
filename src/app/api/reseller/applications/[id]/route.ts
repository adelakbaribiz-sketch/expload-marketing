import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { requireTenantId } from '@/lib/tenant'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'

async function patchHandler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.resellerApplication.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))

  // Review/approval fields (status, contract dates) name their own intent
  // — `reviewedAt`/`reviewedBy`/`reviewNotes` — as a staff review workflow.
  // Found in the Phase 20 audit: this route previously let the applicant
  // tenant itself set `status: 'approved'` (and set the contract dates)
  // with no staff involvement at all — the same self-approval bug class
  // as club/ads below. Only a SuperAdmin can review; the applicant tenant
  // can still be extended a real self-service action here later (e.g.
  // withdrawing their own pending application) if that's wanted, but
  // that's not what this route did before, so nothing is removed by
  // requiring staff review — only the ability to self-approve.
  if (body.status !== undefined || body.reviewNotes !== undefined || body.contractStart !== undefined || body.contractEnd !== undefined) {
    const superAdmin = await isSuperAdmin()
    if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const user = await getCurrentUser()
    const updated = await db.resellerApplication.update({
      where: { id },
      data: {
        ...(body.status ? { status: String(body.status), reviewedAt: new Date(), reviewedBy: user?.id } : {}),
        ...(body.reviewNotes ? { reviewNotes: String(body.reviewNotes).slice(0, 1000) } : {}),
        ...(body.contractStart ? { contractStart: new Date(body.contractStart) } : {}),
        ...(body.contractEnd ? { contractEnd: new Date(body.contractEnd) } : {}),
      },
    })
    return NextResponse.json({ application: updated })
  }

  return NextResponse.json({ error: 'no_recognized_fields' }, { status: 400 })
}

async function deleteHandler(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.resellerApplication.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.resellerApplication.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export const PATCH = withProtection(patchHandler, { rateLimit: 'write' })
export const DELETE = withProtection(deleteHandler, { rateLimit: 'write' })

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

async function patchHandler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.apiKey.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const updated = await db.apiKey.update({
    where: { id },
    data: {
      ...(body.name ? { name: String(body.name).slice(0, 100) } : {}),
      ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive, revokedAt: body.isActive ? null : new Date() } : {}),
      // `balance` is deliberately not client-settable here either — see
      // the POST handler's comment in ../route.ts.
    },
  })
  return NextResponse.json({ apiKey: updated })
}

async function deleteHandler(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const existing = await db.apiKey.findFirst({ where: { id, tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.apiKey.update({ where: { id }, data: { isActive: false, revokedAt: new Date() } })
  return NextResponse.json({ ok: true })
}

export const PATCH = withProtection(patchHandler, { rateLimit: 'write' })
export const DELETE = withProtection(deleteHandler, { rateLimit: 'write' })

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'

// ApiProduct is a platform-global marketplace listing (no tenantId — it
// isn't owned by any one tenant), so the only correct scope for changing
// one is the platform operator. Previously PATCH/DELETE had no auth check
// at all — any signed-up user could edit/deactivate any listing. See
// KNOWN-ISSUES.md #5. (No frontend caller of PATCH/DELETE on this route
// was found anywhere in the app, so this doesn't change any live behavior.)

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const product = await db.apiProduct.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ product })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const updated = await db.apiProduct.update({ where: { id }, data: body })
  return NextResponse.json({ product: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params
  await db.apiProduct.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}

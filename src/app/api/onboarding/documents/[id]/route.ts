import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { getStorage } from '@/lib/storage'

async function requireOwnedDoc(id: string, tenantId: string) {
  const doc = await db.onboardingDocument.findUnique({ where: { id }, include: { session: true } })
  if (!doc || doc.session.tenantId !== tenantId) return null
  return doc
}

/** Metadata only — never returns extractedText in bulk lists; this single-document read is the one place a caller legitimately needs it (e.g. to show a preview). */
async function getHandler(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const doc = await requireOwnedDoc(id, tenantId)
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const { session, ...rest } = doc
  return NextResponse.json({ doc: rest })
}

async function deleteHandler(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const doc = await requireOwnedDoc(id, tenantId)
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await getStorage().delete(doc.storageUrl)
  await db.onboardingDocument.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export const GET = withProtection(getHandler, { rateLimit: 'read' })
export const DELETE = withProtection(deleteHandler, { rateLimit: 'write' })

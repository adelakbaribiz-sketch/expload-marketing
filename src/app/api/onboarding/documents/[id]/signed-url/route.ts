import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { signDocumentToken } from '@/lib/storage/signed-url'

/** Mint a 15-minute signed download link for a private document — for sharing outside an authenticated in-app session (e.g. handing a link to an external reviewer). Requires the caller to already own the document. */
async function handler(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const doc = await db.onboardingDocument.findUnique({ where: { id }, include: { session: true } })
  if (!doc || doc.session.tenantId !== tenantId) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const token = signDocumentToken(id)
  return NextResponse.json({ url: `/api/onboarding/documents/${id}/download?token=${token}`, expiresInSeconds: 15 * 60 })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

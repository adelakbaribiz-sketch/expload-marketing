import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { verifyDocumentToken } from '@/lib/storage/signed-url'
import { getStorage } from '@/lib/storage'

/**
 * Download the original file. Two checks stack, not either/or: the caller
 * must be an authenticated member of the owning tenant (as everywhere
 * else), AND must present a signed token minted by the signed-url endpoint
 * — a time-limited (15 min), single-document capability, not just "logged
 * in". This is the same pattern S3 presigned URLs are used for even inside
 * already-authenticated apps: it bounds how long a copied/leaked link
 * keeps working.
 */
async function handler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId()
  const { id } = await ctx.params
  const doc = await db.onboardingDocument.findUnique({ where: { id }, include: { session: true } })
  if (!doc || doc.session.tenantId !== tenantId) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const token = req.nextUrl.searchParams.get('token')
  if (!verifyDocumentToken(id, token)) {
    return NextResponse.json({ error: 'missing or expired download token — request a new one from the signed-url endpoint' }, { status: 403 })
  }

  const buffer = await getStorage().read(doc.storageUrl)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.filename)}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, no-store',
    },
  })
}

export const GET = withProtection(handler, { rateLimit: 'read' })

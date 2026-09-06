import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { requireNonViewer } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText, sanitizePhone } from '@/lib/security/sanitize'
import { buildListWhere, buildListOrderBy, buildListPagination } from '@/lib/crud/query'
import { getSmsProvider } from '@/lib/integrations/sms-provider'

async function getList(req: NextRequest) {
  const tenantId = await requireTenantId()
  const { searchParams } = new URL(req.url)
  const where = buildListWhere(searchParams, tenantId, ['status', 'campaignId'])
  const orderBy = buildListOrderBy(searchParams.get('sort'), [])
  const { page, limit, skip } = buildListPagination(searchParams, 200)
  const [items, total] = await Promise.all([
    db.smsMessage.findMany({ where, orderBy, take: limit, skip }),
    db.smsMessage.count({ where }),
  ])
  return NextResponse.json({ items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
}

/**
 * Actually sends an SMS via the configured provider (see
 * src/lib/integrations/sms-provider.ts) instead of trusting a
 * client-supplied status/sentAt — the previous CRUD-factory-backed version
 * of this route let a caller create a row claiming `status: 'delivered'`
 * with no message ever sent. The backend, not the request body, now
 * decides whether this was actually delivered.
 */
async function postItem(req: NextRequest) {
  const tenantId = await requireTenantId()
  const access = await requireNonViewer()
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const to = sanitizePhone(body.to)
  if (!to) return NextResponse.json({ error: 'A valid "to" phone number is required' }, { status: 400 })
  const text = sanitizeText(body.body, 1600)
  if (!text) return NextResponse.json({ error: '"body" is required' }, { status: 400 })

  const provider = getSmsProvider()
  const message = await db.smsMessage.create({
    data: {
      to, body: text, provider: provider.name, status: 'pending',
      campaignId: body.campaignId || null, leadId: body.leadId || null, tenantId,
    },
  })

  const result = await provider.send({ to, body: text })

  const updated = await db.smsMessage.update({
    where: { id: message.id },
    data: result.ok
      ? { status: 'sent', sentAt: new Date(), cost: result.data?.cost ?? 0 }
      : { status: 'failed', errorMessage: (result.error ?? 'unknown error').slice(0, 500) },
  })

  return NextResponse.json({ item: updated, mocked: result.mocked ?? false }, { status: result.ok ? 201 : 502 })
}

export const GET = withProtection(getList, { rateLimit: 'read' })
export const POST = withProtection(postItem, { rateLimit: 'write' })

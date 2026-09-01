import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText } from '@/lib/security/sanitize'

/**
 * Generic domain API handler.
 *
 * Creates CRUD endpoints for any Prisma model that has a tenantId field.
 * This keeps the codebase DRY across all 10+ domains.
 */

export interface DomainConfig {
  model: keyof typeof db
  fields: string[]
  include?: Record<string, true>
  maxListItems?: number
}

function prepareValue(val: any): any {
  if (typeof val === 'string') return sanitizeText(val, 10000)
  if (Array.isArray(val)) return JSON.stringify(val)
  if (typeof val === 'object' && val !== null) return JSON.stringify(val)
  return val
}

export function createDomainHandlers(config: DomainConfig) {
  const maxItems = config.maxListItems ?? 200

  async function getList() {
    const tenantId = await requireTenantId()
    const model = db[config.model] as any
    const items = await model.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: config.include,
      take: maxItems,
    })
    return NextResponse.json({ items })
  }

  async function postItem(req: NextRequest) {
    const tenantId = await requireTenantId()
    const body = await req.json().catch(() => ({}))
    const data: Record<string, any> = { tenantId }
    for (const field of config.fields) {
      if (body[field] !== undefined) {
        data[field] = prepareValue(body[field])
      }
    }
    const model = db[config.model] as any
    const item = await model.create({ data })
    return NextResponse.json({ item }, { status: 201 })
  }

  return {
    GET: getList,
    POST: withProtection(postItem, { rateLimit: 'write' }),
  }
}

export function createDomainItemHandlers(config: DomainConfig) {
  async function getItem(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params
    const model = db[config.model] as any
    const item = await model.findUnique({
      where: { id },
      include: config.include,
    })
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ item })
  }

  async function patchItem(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const data: Record<string, any> = {}
    for (const field of config.fields) {
      if (body[field] !== undefined) {
        data[field] = prepareValue(body[field])
      }
    }
    const model = db[config.model] as any
    const item = await model.update({ where: { id }, data })
    return NextResponse.json({ item })
  }

  async function deleteItem(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params
    const model = db[config.model] as any
    await model.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  return {
    GET: getItem,
    PATCH: withProtection(patchItem, { rateLimit: 'write' }),
    DELETE: withProtection(deleteItem, { rateLimit: 'write' }),
  }
}

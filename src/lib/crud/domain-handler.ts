import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText } from '@/lib/security/sanitize'
import { ApiError } from '@/lib/api/errors'
import { buildListWhere, buildListOrderBy, buildListPagination } from '@/lib/crud/query'

export { buildListWhere, buildListOrderBy, buildListPagination } from '@/lib/crud/query'

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
  /** Query-param fields eligible for exact-match filtering on the list endpoint (in addition to the always-applied tenantId scope). */
  filterableFields?: string[]
  /** Fields eligible for `?sort=field:asc|desc` on the list endpoint. `createdAt` is always allowed regardless of this list. */
  sortableFields?: string[]
  /**
   * Validate a POST/PATCH body before the field allowlist runs. Return
   * `{ valid: false, error }` to reject with a 400. See adr/0003 — this is
   * the intended place to adopt zod per-domain without special-casing the
   * factory itself.
   */
  validate?: (body: unknown) => { valid: true; data: Record<string, any> } | { valid: false; error: string }
  /**
   * Transform the allowlisted data before it's written — e.g. compute a
   * derived field, or enforce a state-machine transition on PATCH. Runs
   * after `validate`/allowlisting, before the Prisma write. `existing` is
   * the current row (PATCH only, undefined on create) — the intended place
   * to reject an illegal status/stage transition using
   * `src/lib/workflow/state-machine.ts` rather than trusting whatever the
   * client sent. See WORKFLOW-AUDIT.md.
   */
  beforeWrite?: (data: Record<string, any>, tenantId: string, existing?: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>
}

function prepareValue(val: any): any {
  if (typeof val === 'string') return sanitizeText(val, 10000)
  if (Array.isArray(val)) return JSON.stringify(val)
  if (typeof val === 'object' && val !== null) return JSON.stringify(val)
  return val
}

export function createDomainHandlers(config: DomainConfig) {
  const maxItems = config.maxListItems ?? 200

  async function getList(req: NextRequest) {
    const tenantId = await requireTenantId()
    const model = db[config.model] as any
    const { searchParams } = new URL(req.url)

    const where = buildListWhere(searchParams, tenantId, config.filterableFields)
    const orderBy = buildListOrderBy(searchParams.get('sort'), config.sortableFields)
    const { page, limit, skip } = buildListPagination(searchParams, maxItems)

    const [items, total] = await Promise.all([
      model.findMany({ where, orderBy, include: config.include, take: limit, skip }),
      model.count({ where }),
    ])

    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  }

  async function postItem(req: NextRequest) {
    const tenantId = await requireTenantId()
    const body = await req.json().catch(() => ({}))

    let source: Record<string, any> = body && typeof body === 'object' ? body : {}
    if (config.validate) {
      const result = config.validate(body)
      if (!result.valid) return NextResponse.json({ error: result.error }, { status: 400 })
      source = result.data
    }

    let data: Record<string, any> = { tenantId }
    for (const field of config.fields) {
      if (source[field] !== undefined) {
        data[field] = prepareValue(source[field])
      }
    }
    if (config.beforeWrite) data = await config.beforeWrite(data, tenantId)

    const model = db[config.model] as any
    const item = await model.create({ data })
    return NextResponse.json({ item }, { status: 201 })
  }

  return {
    GET: withProtection(getList, { rateLimit: 'read' }),
    POST: withProtection(postItem, { rateLimit: 'write' }),
  }
}

export function createDomainItemHandlers(config: DomainConfig) {
  // Fetch-then-compare tenant ownership check, shared by GET/PATCH/DELETE.
  // Models addressed by this factory all carry their own `tenantId` field —
  // this is NOT true for every Prisma model (e.g. CompetitorAnalysis is
  // scoped via its parent CompetitorProfile), so this factory must only be
  // used for models with a direct tenantId column.
  async function requireOwnedItem(id: string, tenantId: string) {
    const model = db[config.model] as any
    return model.findFirst({ where: { id, tenantId } })
  }

  async function getItem(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const tenantId = await requireTenantId()
    const { id } = await ctx.params
    const model = db[config.model] as any
    const item = await model.findFirst({
      where: { id, tenantId },
      include: config.include,
    })
    if (!item) throw new ApiError(404, 'Not found')
    return NextResponse.json({ item })
  }

  async function patchItem(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const tenantId = await requireTenantId()
    const { id } = await ctx.params
    const existing = await requireOwnedItem(id, tenantId)
    if (!existing) throw new ApiError(404, 'Not found')
    const body = await req.json().catch(() => ({}))

    let source: Record<string, any> = body && typeof body === 'object' ? body : {}
    if (config.validate) {
      const result = config.validate(body)
      if (!result.valid) return NextResponse.json({ error: result.error }, { status: 400 })
      source = result.data
    }

    let data: Record<string, any> = {}
    for (const field of config.fields) {
      if (source[field] !== undefined) {
        data[field] = prepareValue(source[field])
      }
    }
    if (config.beforeWrite) data = await config.beforeWrite(data, tenantId, existing)

    const model = db[config.model] as any
    const item = await model.update({ where: { id }, data })
    return NextResponse.json({ item })
  }

  async function deleteItem(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const tenantId = await requireTenantId()
    const { id } = await ctx.params
    const existing = await requireOwnedItem(id, tenantId)
    if (!existing) throw new ApiError(404, 'Not found')
    const model = db[config.model] as any
    await model.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  return {
    GET: withProtection(getItem, { rateLimit: 'read' }),
    PATCH: withProtection(patchItem, { rateLimit: 'write' }),
    DELETE: withProtection(deleteItem, { rateLimit: 'write' }),
  }
}

/**
 * Pure query-building helpers for the CRUD factory's list endpoint
 * (`src/lib/crud/domain-handler.ts`). Kept dependency-free (no `@/lib/tenant`,
 * no `next/headers`, nothing importing the `server-only` guard) so they can
 * be unit tested directly with `bun test` outside the Next.js request
 * runtime.
 */

/** Build the Prisma `where` clause for a list endpoint: tenant scope plus any configured exact-match filters present in the query string. */
export function buildListWhere(
  searchParams: URLSearchParams,
  tenantId: string,
  filterableFields: string[] = [],
): Record<string, any> {
  const where: Record<string, any> = { tenantId }
  for (const field of filterableFields) {
    const val = searchParams.get(field)
    if (val !== null && val !== '') where[field] = val
  }
  return where
}

/** Parse `?sort=field:asc|desc` into a Prisma `orderBy`, restricted to the allowed field set. Falls back to `createdAt:desc` for a missing/invalid/disallowed param. */
export function buildListOrderBy(
  sortParam: string | null,
  sortableFields: string[] = [],
): Record<string, 'asc' | 'desc'> {
  const allowed = new Set(['createdAt', ...sortableFields])
  if (sortParam) {
    const [field, dir] = sortParam.split(':')
    if (field && allowed.has(field)) {
      return { [field]: dir === 'asc' ? 'asc' : 'desc' }
    }
  }
  return { createdAt: 'desc' }
}

export interface ListPagination {
  page: number
  limit: number
  skip: number
}

/** Parse `?page=`/`?limit=` into a bounded offset, capping `limit` at `maxItems` and defaulting to it when unset — matches the factory's pre-pagination behavior for callers that pass neither param. */
export function buildListPagination(searchParams: URLSearchParams, maxItems: number): ListPagination {
  const requestedLimit = Number(searchParams.get('limit'))
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(Math.floor(requestedLimit), maxItems)
    : maxItems
  const requestedPage = Number(searchParams.get('page'))
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1
  return { page, limit, skip: (page - 1) * limit }
}

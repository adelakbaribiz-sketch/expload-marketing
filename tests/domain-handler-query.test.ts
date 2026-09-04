import { describe, expect, test } from 'bun:test'
import { buildListWhere, buildListOrderBy, buildListPagination } from '../src/lib/crud/query'

describe('buildListWhere', () => {
  test('always scopes to the tenant, with no filters by default', () => {
    const where = buildListWhere(new URLSearchParams(), 'tenant-1')
    expect(where).toEqual({ tenantId: 'tenant-1' })
  })

  test('ignores query params that are not in filterableFields', () => {
    const where = buildListWhere(new URLSearchParams('status=won'), 'tenant-1', [])
    expect(where).toEqual({ tenantId: 'tenant-1' })
  })

  test('applies configured filterable fields present in the query', () => {
    const where = buildListWhere(new URLSearchParams('status=won&industry=retail'), 'tenant-1', ['status', 'industry'])
    expect(where).toEqual({ tenantId: 'tenant-1', status: 'won', industry: 'retail' })
  })

  test('skips a filterable field whose query value is empty', () => {
    const where = buildListWhere(new URLSearchParams('status='), 'tenant-1', ['status'])
    expect(where).toEqual({ tenantId: 'tenant-1' })
  })
})

describe('buildListOrderBy', () => {
  test('defaults to createdAt desc with no sort param', () => {
    expect(buildListOrderBy(null, [])).toEqual({ createdAt: 'desc' })
  })

  test('allows createdAt regardless of sortableFields', () => {
    expect(buildListOrderBy('createdAt:asc', [])).toEqual({ createdAt: 'asc' })
  })

  test('applies a configured sortable field', () => {
    expect(buildListOrderBy('score:asc', ['score'])).toEqual({ score: 'asc' })
  })

  test('falls back to createdAt desc for a field not in sortableFields', () => {
    expect(buildListOrderBy('secretField:asc', ['score'])).toEqual({ createdAt: 'desc' })
  })

  test('defaults direction to desc for an unrecognized direction token', () => {
    expect(buildListOrderBy('score:sideways', ['score'])).toEqual({ score: 'desc' })
  })
})

describe('buildListPagination', () => {
  test('defaults to page 1 and the full maxItems limit with no query params', () => {
    expect(buildListPagination(new URLSearchParams(), 200)).toEqual({ page: 1, limit: 200, skip: 0 })
  })

  test('honors a smaller requested limit', () => {
    expect(buildListPagination(new URLSearchParams('limit=10'), 200)).toEqual({ page: 1, limit: 10, skip: 0 })
  })

  test('caps a requested limit at maxItems', () => {
    expect(buildListPagination(new URLSearchParams('limit=9999'), 200)).toEqual({ page: 1, limit: 200, skip: 0 })
  })

  test('computes skip from page and limit', () => {
    expect(buildListPagination(new URLSearchParams('page=3&limit=20'), 200)).toEqual({ page: 3, limit: 20, skip: 40 })
  })

  test('ignores invalid page/limit values and falls back to defaults', () => {
    expect(buildListPagination(new URLSearchParams('page=-1&limit=abc'), 200)).toEqual({ page: 1, limit: 200, skip: 0 })
  })
})

import { describe, expect, test, mock } from 'bun:test'
import { logger, runWithLogContext, getLogContext } from '../src/lib/observability/logger'
import { normalizeRoute, recordBusinessEvent, businessEventsTotal } from '../src/lib/observability/metrics'

describe('logger', () => {
  test('redacts sensitive keys in meta, at any nesting depth', () => {
    const lines: string[] = []
    const spy = mock((line: string) => { lines.push(line) })
    const original = console.log
    console.log = spy
    try {
      logger.info('test.event', { password: 'hunter2', nested: { apiKey: 'sk-live-abc', ok: 'fine' } })
    } finally {
      console.log = original
    }
    const parsed = JSON.parse(lines[0])
    expect(parsed.meta.password).toBe('[redacted]')
    expect(parsed.meta.nested.apiKey).toBe('[redacted]')
    expect(parsed.meta.nested.ok).toBe('fine')
  })

  test('attaches requestId/correlationId from the running log context', () => {
    const lines: string[] = []
    const spy = mock((line: string) => { lines.push(line) })
    const original = console.log
    console.log = spy
    try {
      runWithLogContext({ requestId: 'req-1', correlationId: 'corr-1' }, () => {
        logger.info('inside.context')
        expect(getLogContext()).toEqual({ requestId: 'req-1', correlationId: 'corr-1' })
      })
    } finally {
      console.log = original
    }
    const parsed = JSON.parse(lines[0])
    expect(parsed.requestId).toBe('req-1')
    expect(parsed.correlationId).toBe('corr-1')
  })

  test('never throws on a circular meta object', () => {
    const circular: Record<string, unknown> = { a: 1 }
    circular.self = circular
    expect(() => logger.error('circular.test', circular)).not.toThrow()
  })
})

describe('normalizeRoute', () => {
  test('collapses cuid path segments to :id', () => {
    expect(normalizeRoute('/api/leads/ckx7f8g9h0000abcdefghijkl')).toBe('/api/leads/:id')
  })

  test('collapses uuid path segments to :id', () => {
    expect(normalizeRoute('/api/webhooks/550e8400-e29b-41d4-a716-446655440000')).toBe('/api/webhooks/:id')
  })

  test('collapses numeric and queue job-id segments to :id', () => {
    expect(normalizeRoute('/api/items/12345')).toBe('/api/items/:id')
    expect(normalizeRoute('/api/queue/job_1699999999999_ab12cd3')).toBe('/api/queue/:id')
  })

  test('leaves static route segments untouched', () => {
    expect(normalizeRoute('/api/leads/export')).toBe('/api/leads/export')
    expect(normalizeRoute('/api/health/ready')).toBe('/api/health/ready')
  })
})

describe('recordBusinessEvent', () => {
  test('increments the business_events_total counter for the given event label', async () => {
    recordBusinessEvent('test.event.unique_marker')
    const value = await businessEventsTotal.get()
    const match = value.values.find((v) => v.labels.event === 'test.event.unique_marker')
    expect(match?.value).toBeGreaterThanOrEqual(1)
  })
})

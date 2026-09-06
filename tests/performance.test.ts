import { describe, expect, test } from 'bun:test'
import { mapWithConcurrency } from '../src/lib/async/concurrency'
import { getCached, setCached, invalidateCached, withTtlCache } from '../src/lib/cache/ttl-cache'

describe('mapWithConcurrency', () => {
  test('preserves input order regardless of completion order', async () => {
    const delays = [30, 10, 20, 5, 25]
    const result = await mapWithConcurrency(delays, 3, async (ms, i) => {
      await new Promise((r) => setTimeout(r, ms))
      return i
    })
    expect(result).toEqual([0, 1, 2, 3, 4])
  })

  test('never runs more than `limit` items concurrently', async () => {
    let active = 0
    let maxActive = 0
    const items = Array.from({ length: 10 })
    await mapWithConcurrency(items, 3, async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
    })
    expect(maxActive).toBeLessThanOrEqual(3)
  })

  test('propagates a thrown error', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom')
        return n
      }),
    ).rejects.toThrow('boom')
  })

  test('handles an empty array', async () => {
    const result = await mapWithConcurrency([], 5, async (n) => n)
    expect(result).toEqual([])
  })
})

describe('ttl-cache', () => {
  test('returns undefined for a missing key', () => {
    expect(getCached('perf-test:missing')).toBeUndefined()
  })

  test('returns a cached value before expiry', () => {
    setCached('perf-test:fresh', { n: 42 }, 10_000)
    expect(getCached<{ n: number }>('perf-test:fresh')).toEqual({ n: 42 })
  })

  test('expires a value after its TTL', async () => {
    setCached('perf-test:short', 'value', 5)
    await new Promise((r) => setTimeout(r, 20))
    expect(getCached('perf-test:short')).toBeUndefined()
  })

  test('invalidateCached removes an entry immediately', () => {
    setCached('perf-test:invalidate-me', 'value', 10_000)
    invalidateCached('perf-test:invalidate-me')
    expect(getCached('perf-test:invalidate-me')).toBeUndefined()
  })

  test('withTtlCache computes once and reuses the cached result', async () => {
    let calls = 0
    const compute = async () => { calls++; return calls }
    const first = await withTtlCache('perf-test:compute-once', 10_000, compute)
    const second = await withTtlCache('perf-test:compute-once', 10_000, compute)
    expect(first).toBe(1)
    expect(second).toBe(1)
    expect(calls).toBe(1)
  })
})

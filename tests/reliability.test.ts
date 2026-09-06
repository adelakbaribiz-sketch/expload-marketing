import { describe, expect, test } from 'bun:test'
import { NextResponse } from 'next/server'
import { withIdempotency } from '../src/lib/security/idempotency'

// QueueUnavailableError / StorageError / PaymentGatewayUnavailableError
// aren't unit-tested here: their modules (queue/index.ts, storage/
// index.ts, payment/crypto.ts) import the `server-only` guard package,
// which isn't resolvable outside Next's own build pipeline — `bun test`
// has no webpack aliasing for it (crud/query.ts is deliberately kept free
// of that import for exactly this reason — see its own top comment). Live-
// verified instead, against a running dev server — see RELIABILITY-AUDIT.md.

function fakeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/test', { headers })
}

describe('withIdempotency', () => {
  test('runs the handler normally when no Idempotency-Key header is present', async () => {
    let calls = 0
    const req = fakeRequest()
    const res = await withIdempotency(req, `test:${Math.random()}`, async () => {
      calls++
      return NextResponse.json({ ok: true }, { status: 201 })
    })
    expect(calls).toBe(1)
    expect(res.status).toBe(201)
  })

  test('replays the cached response for a repeated key instead of re-running the handler', async () => {
    let calls = 0
    const prefix = `test:${Math.random()}`
    const req = fakeRequest({ 'idempotency-key': 'key-1' })
    const handler = async () => {
      calls++
      return NextResponse.json({ id: calls }, { status: 201 })
    }

    const first = await withIdempotency(req, prefix, handler)
    const second = await withIdempotency(req, prefix, handler)

    expect(calls).toBe(1)
    expect(await first.json()).toEqual({ id: 1 })
    expect(await second.json()).toEqual({ id: 1 })
    expect(second.headers.get('X-Idempotent-Replay')).toBe('true')
  })

  test('does not cache a 5xx response — a retried request re-runs the handler', async () => {
    let calls = 0
    const prefix = `test:${Math.random()}`
    const req = fakeRequest({ 'idempotency-key': 'key-2' })
    const handler = async () => {
      calls++
      return calls === 1
        ? NextResponse.json({ error: 'boom' }, { status: 500 })
        : NextResponse.json({ ok: true }, { status: 201 })
    }

    const first = await withIdempotency(req, prefix, handler)
    const second = await withIdempotency(req, prefix, handler)

    expect(first.status).toBe(500)
    expect(second.status).toBe(201)
    expect(calls).toBe(2)
  })

  test('different keys never collide', async () => {
    let calls = 0
    const prefix = `test:${Math.random()}`
    const handler = async () => { calls++; return NextResponse.json({ n: calls }, { status: 201 }) }

    await withIdempotency(fakeRequest({ 'idempotency-key': 'a' }), prefix, handler)
    await withIdempotency(fakeRequest({ 'idempotency-key': 'b' }), prefix, handler)

    expect(calls).toBe(2)
  })
})

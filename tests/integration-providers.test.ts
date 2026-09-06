import { describe, expect, test } from 'bun:test'
import { withTimeout, withRetry, IntegrationTimeoutError } from '../src/lib/integrations/types'
import { MockEmailProvider } from '../src/lib/integrations/email-provider'
import { MockSmsProvider } from '../src/lib/integrations/sms-provider'
import { MockPaymentProvider, UnconfiguredPaymentProvider } from '../src/lib/integrations/payment-provider'

describe('withTimeout', () => {
  test('resolves normally when the promise settles in time', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 100, 'test')
    expect(result).toBe('ok')
  })

  test('rejects with IntegrationTimeoutError when the promise is too slow', async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve('too late'), 200))
    await expect(withTimeout(slow, 20, 'test-provider')).rejects.toThrow(IntegrationTimeoutError)
  })
})

describe('withRetry', () => {
  test('returns the result on first success', async () => {
    let calls = 0
    const result = await withRetry(async () => { calls++; return 'ok' }, { attempts: 3, delayMs: 1 })
    expect(result).toBe('ok')
    expect(calls).toBe(1)
  })

  test('retries up to the attempt limit on failure', async () => {
    let calls = 0
    await expect(
      withRetry(async () => { calls++; throw new Error('always fails') }, { attempts: 3, delayMs: 1 }),
    ).rejects.toThrow('always fails')
    expect(calls).toBe(3)
  })

  test('succeeds after a transient failure within the attempt budget', async () => {
    let calls = 0
    const result = await withRetry(async () => {
      calls++
      if (calls < 2) throw new Error('transient')
      return 'recovered'
    }, { attempts: 3, delayMs: 1 })
    expect(result).toBe('recovered')
    expect(calls).toBe(2)
  })

  test('shouldRetry: false stops retrying immediately', async () => {
    let calls = 0
    await expect(
      withRetry(async () => { calls++; throw new Error('permanent') }, {
        attempts: 3, delayMs: 1, shouldRetry: () => false,
      }),
    ).rejects.toThrow('permanent')
    expect(calls).toBe(1)
  })
})

describe('MockEmailProvider', () => {
  test('records every sent message', async () => {
    const provider = new MockEmailProvider()
    const result = await provider.send({ to: 'a@example.com', from: 'noreply@example.com', subject: 'Hi', text: 'body', html: '<p>body</p>' })
    expect(result.ok).toBe(true)
    expect(result.mocked).toBe(true)
    expect(provider.sent.length).toBe(1)
    expect(provider.sent[0].to).toBe('a@example.com')
  })

  test('failNext simulates a failure without sending', async () => {
    const provider = new MockEmailProvider()
    provider.failNext = 1
    const result = await provider.send({ to: 'a@example.com', from: 'x', subject: 'x', text: 'x', html: 'x' })
    expect(result.ok).toBe(false)
    expect(provider.sent.length).toBe(0)
  })
})

describe('MockSmsProvider', () => {
  test('records every sent message', async () => {
    const provider = new MockSmsProvider()
    const result = await provider.send({ to: '+15551234567', body: 'hello' })
    expect(result.ok).toBe(true)
    expect(provider.sent.length).toBe(1)
  })
})

describe('Payment providers', () => {
  test('MockPaymentProvider records checkouts and returns a mocked result', async () => {
    const provider = new MockPaymentProvider()
    const result = await provider.createCheckout({ amount: 100, currency: 'USD' })
    expect(result.ok).toBe(true)
    expect(result.mocked).toBe(true)
    expect(provider.checkouts.length).toBe(1)
  })

  test('UnconfiguredPaymentProvider always fails honestly, never fabricates a checkout', async () => {
    const provider = new UnconfiguredPaymentProvider('stripe')
    expect(provider.configured).toBe(false)
    const result = await provider.createCheckout({ amount: 100, currency: 'USD' })
    expect(result.ok).toBe(false)
    expect(result.data).toBeUndefined()
  })
})

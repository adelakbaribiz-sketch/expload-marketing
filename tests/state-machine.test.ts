import { describe, expect, test } from 'bun:test'
import { StateMachine } from '../src/lib/workflow/state-machine'
import {
  LEAD_STATUS_MACHINE, DEAL_STAGE_MACHINE, CRYPTO_PAYMENT_MACHINE,
  DISTRIBUTOR_PAYOUT_MACHINE, TIMESHEET_STATUS_MACHINE,
} from '../src/lib/workflow/definitions'

describe('StateMachine', () => {
  const m = new StateMachine<'a' | 'b' | 'c'>({
    states: ['a', 'b', 'c'],
    transitions: { a: ['b'], b: ['c'], c: [] },
  })

  test('allows a defined transition', () => {
    expect(m.canTransition('a', 'b')).toBe(true)
  })

  test('rejects an undefined transition', () => {
    expect(m.canTransition('a', 'c')).toBe(false)
  })

  test('always allows a same-state no-op', () => {
    expect(m.canTransition('b', 'b')).toBe(true)
  })

  test('assertTransition throws ApiError(409) on an illegal move', () => {
    expect(() => m.assertTransition('a', 'c')).toThrow('Cannot transition from "a" to "c"')
  })

  test('assertTransition does not throw on a legal move', () => {
    expect(() => m.assertTransition('a', 'b')).not.toThrow()
  })

  test('isTerminal is true only for a state with no outgoing transitions', () => {
    expect(m.isTerminal('c')).toBe(true)
    expect(m.isTerminal('a')).toBe(false)
  })
})

describe('LEAD_STATUS_MACHINE', () => {
  test('cannot skip straight from new to won', () => {
    expect(LEAD_STATUS_MACHINE.canTransition('new', 'won')).toBe(false)
  })

  test('must pass through qualified to reach won', () => {
    expect(LEAD_STATUS_MACHINE.canTransition('qualified', 'won')).toBe(true)
  })

  test('a lost lead can be re-engaged', () => {
    expect(LEAD_STATUS_MACHINE.canTransition('lost', 'contacted')).toBe(true)
  })
})

describe('DEAL_STAGE_MACHINE', () => {
  test('cannot skip straight from lead to won', () => {
    expect(DEAL_STAGE_MACHINE.canTransition('lead', 'won')).toBe(false)
  })

  test('a won deal cannot move back into an active pipeline stage', () => {
    expect(DEAL_STAGE_MACHINE.canTransition('won', 'negotiation')).toBe(false)
    expect(DEAL_STAGE_MACHINE.canTransition('won', 'qualified')).toBe(false)
  })

  test('a won deal can still fall through to lost', () => {
    expect(DEAL_STAGE_MACHINE.canTransition('won', 'lost')).toBe(true)
  })

  test('a lost deal re-opens at the start of the pipeline', () => {
    expect(DEAL_STAGE_MACHINE.canTransition('lost', 'lead')).toBe(true)
    expect(DEAL_STAGE_MACHINE.canTransition('lost', 'proposal')).toBe(false)
  })
})

describe('CRYPTO_PAYMENT_MACHINE', () => {
  test('a completed payment cannot regress to expired or failed', () => {
    expect(CRYPTO_PAYMENT_MACHINE.canTransition('completed', 'expired')).toBe(false)
    expect(CRYPTO_PAYMENT_MACHINE.canTransition('completed', 'failed')).toBe(false)
  })

  test('a completed payment can still be refunded', () => {
    expect(CRYPTO_PAYMENT_MACHINE.canTransition('completed', 'refunded')).toBe(true)
  })

  test('confirming can jump straight to completed (NOWPayments "finished" webhook)', () => {
    expect(CRYPTO_PAYMENT_MACHINE.canTransition('confirming', 'completed')).toBe(true)
  })

  test('failed/expired/refunded are terminal', () => {
    expect(CRYPTO_PAYMENT_MACHINE.isTerminal('failed')).toBe(true)
    expect(CRYPTO_PAYMENT_MACHINE.isTerminal('expired')).toBe(true)
    expect(CRYPTO_PAYMENT_MACHINE.isTerminal('refunded')).toBe(true)
  })
})

describe('DISTRIBUTOR_PAYOUT_MACHINE', () => {
  test('cannot mark paid without approval first', () => {
    expect(DISTRIBUTOR_PAYOUT_MACHINE.canTransition('pending', 'paid')).toBe(false)
  })

  test('approved can be marked paid', () => {
    expect(DISTRIBUTOR_PAYOUT_MACHINE.canTransition('approved', 'paid')).toBe(true)
  })

  test('void is terminal', () => {
    expect(DISTRIBUTOR_PAYOUT_MACHINE.isTerminal('void')).toBe(true)
  })
})

describe('TIMESHEET_STATUS_MACHINE', () => {
  test('approved and rejected cannot flip directly into each other', () => {
    expect(TIMESHEET_STATUS_MACHINE.canTransition('approved', 'rejected')).toBe(false)
    expect(TIMESHEET_STATUS_MACHINE.canTransition('rejected', 'approved')).toBe(false)
  })

  test('both route back through pending', () => {
    expect(TIMESHEET_STATUS_MACHINE.canTransition('approved', 'pending')).toBe(true)
    expect(TIMESHEET_STATUS_MACHINE.canTransition('rejected', 'pending')).toBe(true)
  })
})

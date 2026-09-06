import { StateMachine } from './state-machine'

/**
 * Central registry of this project's business-critical workflow state
 * machines. Each one previously had its status field writable to any
 * string a client sent (see WORKFLOW-AUDIT.md for the full audit). Import
 * from here rather than re-deriving the allowed-transitions map inline —
 * one source of truth per workflow, same reasoning as
 * `src/lib/billing/pricing-engine.ts` (Phase 08) for the pricing algorithm.
 */

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
export const LEAD_STATUS_MACHINE = new StateMachine<LeadStatus>({
  states: ['new', 'contacted', 'qualified', 'won', 'lost'],
  transitions: {
    // A lead must pass through qualification before it can be won — going
    // straight from "new" to "won" would mean a deal closed with zero
    // recorded engagement, which is a pipeline-integrity red flag, not a
    // real sales outcome.
    new: ['contacted', 'qualified', 'lost'],
    contacted: ['qualified', 'lost', 'new'],
    qualified: ['won', 'lost', 'contacted'],
    won: ['qualified', 'lost'], // correcting a mistaken "won"
    lost: ['new', 'contacted', 'qualified'], // re-engagement is normal in sales
  },
})

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export const DEAL_STAGE_MACHINE = new StateMachine<DealStage>({
  states: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
  transitions: {
    lead: ['qualified', 'lost'],
    qualified: ['proposal', 'lost'],
    proposal: ['negotiation', 'lost'],
    negotiation: ['won', 'lost'],
    // Once "won", revenue aggregates (dashboard's wonRevenue, etc.) treat
    // this deal as booked. The only legitimate forward move is "the deal
    // fell through after closing" (won -> lost) — there's no legitimate
    // reason to silently move a booked deal back into an active pipeline
    // stage; that would corrupt revenue reporting, not reflect reality.
    won: ['lost'],
    lost: ['lead'], // full re-open, back to the start of the pipeline
  },
})

// Matches prisma/schema.prisma's CryptoPayment.status comment exactly:
// pending | confirming | confirmed | completed | failed | expired | refunded.
// "confirmed" (enough on-chain confirmations, not yet settled) is distinct
// from "confirming" (still accumulating them) and from "completed"
// (NOWPayments' own "finished" event, which can arrive without a separate
// "confirmed" step first — hence confirming -> completed is also allowed).
export type CryptoPaymentStatus = 'pending' | 'confirming' | 'confirmed' | 'completed' | 'failed' | 'expired' | 'refunded'
export const CRYPTO_PAYMENT_MACHINE = new StateMachine<CryptoPaymentStatus>({
  states: ['pending', 'confirming', 'confirmed', 'completed', 'failed', 'expired', 'refunded'],
  transitions: {
    pending: ['confirming', 'failed', 'expired'],
    confirming: ['confirmed', 'completed', 'failed', 'expired'],
    confirmed: ['completed', 'failed', 'expired'],
    // completed is money-received — the only legitimate exit is a refund.
    // A late/out-of-order webhook claiming "expired" or "failed" after
    // completion must never regress this state (see updateCryptoPaymentStatus).
    completed: ['refunded'],
    failed: [],
    expired: [],
    refunded: [],
  },
})

export type DistributorPayoutStatus = 'pending' | 'approved' | 'paid' | 'disputed' | 'void'
export const DISTRIBUTOR_PAYOUT_MACHINE = new StateMachine<DistributorPayoutStatus>({
  states: ['pending', 'approved', 'paid', 'disputed', 'void'],
  transitions: {
    pending: ['approved', 'disputed', 'void'],
    approved: ['paid', 'disputed'],
    paid: ['disputed'], // a chargeback/clawback can still surface after payment
    disputed: ['approved', 'void'],
    void: [],
  },
})

export type TimesheetStatus = 'pending' | 'approved' | 'rejected'
export const TIMESHEET_STATUS_MACHINE = new StateMachine<TimesheetStatus>({
  states: ['pending', 'approved', 'rejected'],
  transitions: {
    // Approved/rejected can only be reconsidered by routing back through
    // pending, not flipped directly into each other — makes "someone
    // changed their mind" an explicit two-step action, not a single click.
    pending: ['approved', 'rejected'],
    approved: ['pending'],
    rejected: ['pending'],
  },
})

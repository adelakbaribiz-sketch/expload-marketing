import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'
import { withProtection } from '@/lib/security/with-protection'
import { emitNotificationEvent } from '@/lib/notifications/emitter'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const where: any = { tenantId: user.tenantId }
    if (status) where.status = status
    const subs = await db.supportSubscription.findMany({
      where, include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 200,
    })
    return NextResponse.json({ subscriptions: subs })
  }

  if (req.method === 'POST') {
    // Request a support plan subscription. Starts `pending_payment`, NOT
    // `active` — no real payment gateway is wired for this flow anywhere
    // in the codebase (see src/lib/integrations/payment-provider.ts's
    // UnconfiguredPaymentProvider), so creating it as immediately-active
    // let any authenticated user grant themselves a paid support plan for
    // free, with the platform's own `monthlyRevenue`/`totalSubscribers`
    // counters incremented as if a real payment had been collected. Found
    // in the Phase 20 production-readiness audit — the same "fail
    // honestly, require a trusted human until a real gateway exists"
    // principle already applied to the non-crypto payment gateways now
    // applies here too: a platform SuperAdmin must confirm payment
    // (PATCH action=confirm_payment) before the subscription counts as
    // active or any revenue is recorded.
    const body = await req.json()
    const plan = await db.supportPlan.findUnique({ where: { id: body.planId } })
    if (!plan) return NextResponse.json({ error: 'plan_not_found' }, { status: 404 })

    const amount = body.billingCycle === 'annual' ? (plan.annualPrice ?? plan.monthlyPrice * 12) : plan.monthlyPrice
    const nextBillingAt = new Date()
    if (body.billingCycle === 'annual') nextBillingAt.setFullYear(nextBillingAt.getFullYear() + 1)
    else nextBillingAt.setMonth(nextBillingAt.getMonth() + 1)

    const sub = await db.supportSubscription.create({
      data: {
        planId: body.planId,
        tenantId: user.tenantId,
        billingCycle: body.billingCycle ?? 'monthly',
        nextBillingAt,
        amount,
        currency: plan.currency,
        autoRenew: body.autoRenew ?? true,
        paymentMethod: body.paymentMethod ?? 'stripe',
        status: 'pending_payment',
      },
    })

    await emitNotificationEvent({
      type: 'support_subscribed',
      title: 'Support plan subscription requested',
      message: `${plan.name} plan requested — pending payment confirmation before the ${plan.responseTimeHours}h response SLA takes effect.`,
      severity: 'info',
      tenantId: user.tenantId,
      category: 'support',
    })

    return NextResponse.json({ subscription: sub }, { status: 201 })
  }

  if (req.method === 'PATCH') {
    const body = await req.json()
    if (body.action === 'cancel') {
      // Ownership check — see KNOWN-ISSUES.md #2 (Critical): this route
      // previously cancelled any subscription by id with no tenant check.
      const existing = await db.supportSubscription.findUnique({ where: { id: body.id } })
      if (!existing || existing.tenantId !== user.tenantId) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      const sub = await db.supportSubscription.update({
        where: { id: body.id },
        data: { status: 'cancelled', autoRenew: false, cancelledAt: new Date() },
      })
      return NextResponse.json({ subscription: sub })
    }
    if (body.action === 'confirm_payment') {
      // Manual reconciliation gate (see the POST handler's comment) —
      // SuperAdmin only, since this is the step that actually records
      // revenue and activates the paid SLA.
      const superAdmin = await isSuperAdmin()
      if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      const existing = await db.supportSubscription.findUnique({ where: { id: body.id }, include: { plan: true } })
      if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      if (existing.status !== 'pending_payment') {
        return NextResponse.json({ error: 'not_pending_payment' }, { status: 400 })
      }
      const sub = await db.$transaction(async (tx) => {
        const updated = await tx.supportSubscription.update({
          where: { id: body.id },
          data: { status: 'active' },
        })
        await tx.supportPlan.update({
          where: { id: existing.planId },
          data: { totalSubscribers: { increment: 1 }, monthlyRevenue: { increment: existing.amount } },
        })
        return updated
      })
      await emitNotificationEvent({
        type: 'support_subscribed',
        title: 'Support plan activated',
        message: `${existing.plan.name} plan is now active. ${existing.plan.responseTimeHours}h response SLA.`,
        severity: 'success',
        tenantId: existing.tenantId,
        category: 'support',
      })
      return NextResponse.json({ subscription: sub })
    }
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }

  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}

export const GET = withProtection(handler, { rateLimit: 'read' })
export const POST = withProtection(handler, { rateLimit: 'write' })
export const PATCH = withProtection(handler, { rateLimit: 'write' })

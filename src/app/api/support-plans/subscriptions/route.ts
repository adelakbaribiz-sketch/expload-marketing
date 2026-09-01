import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
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
      where, include: { plan: true }, orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ subscriptions: subs })
  }

  if (req.method === 'POST') {
    // Subscribe to a support plan
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
        status: 'active',
      },
    })

    await db.supportPlan.update({
      where: { id: body.planId },
      data: { totalSubscribers: { increment: 1 }, monthlyRevenue: { increment: amount } },
    })

    await emitNotificationEvent({
      type: 'support_subscribed',
      title: 'Support plan activated',
      message: `${plan.name} plan is now active. ${plan.responseTimeHours}h response SLA.`,
      severity: 'success',
      tenantId: user.tenantId,
      category: 'support',
    })

    return NextResponse.json({ subscription: sub }, { status: 201 })
  }

  if (req.method === 'PATCH') {
    const body = await req.json()
    if (body.action === 'cancel') {
      const sub = await db.supportSubscription.update({
        where: { id: body.id },
        data: { status: 'cancelled', autoRenew: false, cancelledAt: new Date() },
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

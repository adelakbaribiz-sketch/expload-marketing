import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

export async function GET() {
  const tenantId = await requireTenantId()
  const methods = await db.paymentMethod.findMany({ where: { tenantId, isActive: true }, orderBy: { isDefault: 'desc' } })
  return NextResponse.json({ methods })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const method = await db.paymentMethod.create({
    data: {
      tenantId,
      type: body.type || 'card',
      provider: body.provider || 'stripe',
      brand: body.brand || null,
      last4: body.last4 || null,
      expiryMonth: body.expiryMonth || null,
      expiryYear: body.expiryYear || null,
      holderName: body.holderName || null,
      stripePaymentMethodId: body.stripePaymentMethodId || null,
      isDefault: body.isDefault ?? false,
    },
  })
  return NextResponse.json({ method }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

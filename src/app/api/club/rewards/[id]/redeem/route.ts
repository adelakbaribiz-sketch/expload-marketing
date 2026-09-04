import { NextRequest, NextResponse } from 'next/server'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { redeemReward } from '@/lib/club/redeem-reward'

async function handler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const tenantId = await requireTenantId()
  const { reward, effect, remainingPoints } = await redeemReward(tenantId, id)
  return NextResponse.json({ success: true, reward, effect, remainingPoints })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

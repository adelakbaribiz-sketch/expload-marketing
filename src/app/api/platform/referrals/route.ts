import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

export async function GET() {
  const tenantId = await requireTenantId()
  // Get active referral programs
  const programs = await db.referralProgram.findMany({ where: { isActive: true } })
  // Get user's referrals — include the program so paid rewards are summed
  // using each program's own configured referrerReward, not a flat guess.
  const referrals = await db.referral.findMany({
    where: { referrerTenantId: tenantId },
    orderBy: { invitedAt: 'desc' },
    include: { program: { select: { referrerReward: true } } },
  })
  const totalEarned = referrals
    .filter(r => r.referrerRewardPaid)
    .reduce((sum, r) => sum + r.program.referrerReward, 0)
  return NextResponse.json({ programs, referrals, totalEarned })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const crypto = await import('crypto')
  const code = crypto.randomBytes(6).toString('hex').toUpperCase()

  const referral = await db.referral.create({
    data: {
      programId: body.programId,
      referrerTenantId: tenantId,
      refereeEmail: body.refereeEmail,
      referralCode: code,
    },
  })
  return NextResponse.json({ referral, shareUrl: `/?ref=${code}` }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { suggestCampaignDates } from '@/lib/campaign-scheduler/scheduler'

async function handler(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (req.method !== 'POST') return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })

  const body = await req.json()
  const result = await suggestCampaignDates({
    tenantId: user.tenantId,
    briefId: body.briefId,
    campaignName: body.campaignName,
    campaignType: body.campaignType ?? 'multi_channel',
    totalBudget: body.totalBudget,
    depositReceived: body.depositReceived,
    currency: body.currency ?? 'USD',
    industry: body.industry,
    countries: body.countries,
  })

  return NextResponse.json(result, { status: 201 })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

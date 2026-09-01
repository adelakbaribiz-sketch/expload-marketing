import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })

  // Get all active investors
  const investors = await db.investorProfile.findMany({ where: { isActive: true } })

  // Calculate match scores
  const matched = investors.map(inv => {
    let score = 50
    const reasons: string[] = []

    // Sector match
    const sectors = inv.sectors ? JSON.parse(inv.sectors) : []
    if (sectors.includes('Marketing') || sectors.includes('SaaS') || sectors.includes('AI')) {
      score += 20
      reasons.push('Invests in Marketing/SaaS/AI sector')
    }

    // Stage match
    const stages = inv.stages ? JSON.parse(inv.stages) : []
    if (stages.includes('seed') || stages.includes('pre-seed')) {
      score += 15
      reasons.push('Invests at seed/pre-seed stage')
    }

    // Geography match
    if (inv.geography === 'Global' || inv.geography === 'Middle East') {
      score += 10
      reasons.push(`Invests in ${inv.geography}`)
    }

    // Check size match
    if (inv.ticketSize && inv.ticketSize >= 10000 && inv.ticketSize <= 500000) {
      score += 10
      reasons.push(`Ticket size ($${inv.ticketSize?.toLocaleString()}) matches your stage`)
    }

    return { ...inv, matchScore: Math.min(score, 100), matchReasons: JSON.stringify(reasons) }
  }).sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))

  return NextResponse.json({ matches: matched.slice(0, 20) })
}

export const POST = withProtection(handler, { rateLimit: 'read' })

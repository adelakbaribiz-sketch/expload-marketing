import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

/**
 * 1-Click Setup Wizard.
 * Auto-configures the tenant's marketing platform with sensible defaults:
 *   1. Creates a default project
 *   2. Seeds demo leads
 *   3. Creates default email template
 *   4. Creates default fraud detection rules
 *   5. Creates default marketing funnel
 *   6. Creates welcome customer journey
 *   7. Sets up default webhook
 *   8. Enrolls in Customer Club (Bronze)
 *   9. Creates Progressive Unlock record
 *   10. Creates default goals
 */
async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const businessName = body.businessName || 'My Business'
  const industry = body.industry || 'general'
  const budget = Number(body.budget || 200)

  const results: string[] = []

  // 1. Default project
  const project = await db.project.findFirst({ where: { tenantId, name: 'Main Campaign' } })
  if (!project) {
    await db.project.create({ data: { name: 'Main Campaign', description: `Marketing campaign for ${businessName}`, tenantId, status: 'active' } })
    results.push('✓ Default project created')
  }

  // 2. Demo leads (if none exist)
  const leadCount = await db.lead.count({ where: { tenantId } })
  if (leadCount === 0) {
    const sampleLeads = [
      { name: `${businessName} — Lead 1`, industry, score: 75, status: 'new', source: 'setup', tenantId },
      { name: `${businessName} — Lead 2`, industry, score: 62, status: 'new', source: 'setup', tenantId },
      { name: `${businessName} — Lead 3`, industry, score: 88, status: 'qualified', source: 'setup', tenantId },
    ]
    for (const lead of sampleLeads) {
      await db.lead.create({ data: lead })
    }
    results.push('✓ 3 demo leads created')
  }

  // 3. Default email template
  const template = await db.emailTemplate.findFirst({ where: { tenantId } })
  if (!template) {
    await db.emailTemplate.create({
      data: {
        name: 'Welcome Template',
        subject: `Welcome to ${businessName}!`,
        body: `Hi {{name}},\n\nThank you for your interest in ${businessName}. We're excited to help you grow!\n\nBest regards,\n${businessName} Team`,
        category: 'welcome',
        tenantId,
      },
    })
    results.push('✓ Welcome email template created')
  }

  // 4. Default fraud detection rules
  const fraudRules = await db.fraudRule.count({ where: { tenantId } })
  if (fraudRules === 0) {
    const rules = [
      { name: 'Click Injection Detection', type: 'click_injection', description: 'Detects clicks injected just before install', config: JSON.stringify({ ctctThreshold: 10 }), severity: 'high', action: 'block', tenantId },
      { name: 'SDK Spoofing Detection', type: 'sdk_spoofing', description: 'Detects fake SDK calls from malware', config: JSON.stringify({ signatureCheck: true }), severity: 'critical', action: 'block', tenantId },
      { name: 'IP Anomaly Detection', type: 'ip_anomaly', description: 'Flags installs from suspicious IPs', config: JSON.stringify({ maxInstallsPerIp: 5 }), severity: 'medium', action: 'flag', tenantId },
      { name: 'Device Farm Detection', type: 'device_farm', description: 'Detects installs from device farms', config: JSON.stringify({ patternCheck: true }), severity: 'high', action: 'block', tenantId },
    ]
    for (const rule of rules) {
      await db.fraudRule.create({ data: rule })
    }
    results.push('✓ 4 fraud detection rules created')
  }

  // 5. Default marketing funnel
  const funnel = await db.marketingFunnel.findFirst({ where: { tenantId } })
  if (!funnel) {
    await db.marketingFunnel.create({
      data: {
        name: 'Default Marketing Funnel',
        description: 'Standard lead-to-customer funnel',
        stages: JSON.stringify([
          { name: 'Visit', event: 'page_view' },
          { name: 'Signup', event: 'signup' },
          { name: 'Lead', event: 'lead_created' },
          { name: 'Qualified', event: 'lead_qualified' },
          { name: 'Deal', event: 'deal_created' },
          { name: 'Customer', event: 'deal_won' },
        ]),
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 86400000),
        tenantId,
      },
    })
    results.push('✓ Marketing funnel created')
  }

  // 6. Welcome customer journey
  const journey = await db.customerJourney.findFirst({ where: { tenantId } })
  if (!journey) {
    await db.customerJourney.create({
      data: {
        name: 'Welcome Journey',
        description: 'Automatic welcome sequence for new signups',
        trigger: 'signup',
        steps: JSON.stringify([
          { id: 1, type: 'trigger', config: { event: 'signup' } },
          { id: 2, type: 'action', config: { channel: 'email', template: 'welcome' } },
          { id: 3, type: 'wait', config: { duration: '2 days' } },
          { id: 4, type: 'action', config: { channel: 'push', message: 'Check out our features!' } },
          { id: 5, type: 'wait', config: { duration: '5 days' } },
          { id: 6, type: 'action', config: { channel: 'email', template: 'follow_up' } },
        ]),
        isActive: true,
        tenantId,
      },
    })
    results.push('✓ Welcome customer journey created')
  }

  // 7. Default webhook (if URL provided)
  if (body.webhookUrl) {
    const webhook = await db.webhookSubscription.findFirst({ where: { tenantId } })
    if (!webhook) {
      await db.webhookSubscription.create({
        data: {
          url: body.webhookUrl,
          events: JSON.stringify(['lead.created', 'campaign.sent', 'deal.won']),
          tenantId,
        },
      })
      results.push('✓ Webhook subscription created')
    }
  }

  // 8. Enroll in Customer Club (Bronze)
  const membership = await db.clubMembership.findUnique({ where: { tenantId } })
  if (!membership) {
    let bronzeTier = await db.clubTier.findFirst({ where: { level: 1 } })
    if (!bronzeTier) {
      // Create default tiers
      const tiers = [
        { name: 'Bronze', level: 1, minSpend: 0, minMonths: 0, discountPct: 0, freeAdCredits: 1, apiCallBonus: 0, prioritySupport: false, earlyAccess: false, color: '#CD7F32', icon: '🥉', description: 'Welcome to the club!' },
        { name: 'Silver', level: 2, minSpend: 500, minMonths: 3, discountPct: 10, freeAdCredits: 3, apiCallBonus: 500, prioritySupport: false, earlyAccess: false, color: '#C0C0C0', icon: '🥈', description: '10% discount + 3 free ad credits' },
        { name: 'Gold', level: 3, minSpend: 2000, minMonths: 6, discountPct: 20, freeAdCredits: 10, apiCallBonus: 2000, prioritySupport: true, earlyAccess: true, color: '#FFD700', icon: '🥇', description: '20% discount + priority support' },
        { name: 'Platinum', level: 4, minSpend: 5000, minMonths: 12, discountPct: 30, freeAdCredits: 25, apiCallBonus: 5000, prioritySupport: true, earlyAccess: true, color: '#E5E4E2', icon: '💎', description: '30% discount + all benefits' },
      ]
      for (const t of tiers) await db.clubTier.create({ data: t })
      bronzeTier = await db.clubTier.findFirst({ where: { level: 1 } })
    }
    const newMembership = await db.clubMembership.create({
      data: { tenantId, tierId: bronzeTier!.id, availablePoints: 100, totalPoints: 100, lifetimePoints: 100 },
    })
    await db.clubPoint.create({
      data: { membershipId: newMembership.id, points: 100, reason: 'signup_bonus', description: 'Welcome bonus!' },
    })
    results.push('✓ Enrolled in Customer Club (Bronze) + 100 bonus points')
  }

  // 9. Progressive unlock
  const unlock = await db.progressiveUnlock.findUnique({ where: { tenantId } })
  if (!unlock) {
    await db.progressiveUnlock.create({
      data: { tenantId, unlockedPhases: JSON.stringify(['P1']), currentPhase: 'P1', overallProgress: 10, plan: 'starter', monthlyBudget: budget },
    })
    results.push('✓ Progressive roadmap initialized (P1 unlocked)')
  }

  // 10. Default goals
  const goals = await db.goal.count({ where: { tenantId } })
  if (goals === 0) {
    await db.goal.create({
      data: { title: 'Reach 100 leads', type: 'leads', targetValue: 100, currentValue: leadCount, unit: 'count', endDate: new Date(Date.now() + 30 * 86400000), priority: 'high', linkedPhases: JSON.stringify(['P1']), tenantId },
    })
    await db.goal.create({
      data: { title: 'Generate $5,000 revenue', type: 'revenue', targetValue: 5000, unit: 'usd', endDate: new Date(Date.now() + 90 * 86400000), priority: 'critical', linkedPhases: JSON.stringify(['P2', 'P5']), tenantId },
    })
    results.push('✓ 2 default goals created (100 leads, $5K revenue)')
  }

  return NextResponse.json({ success: true, results, stepsCompleted: results.length })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

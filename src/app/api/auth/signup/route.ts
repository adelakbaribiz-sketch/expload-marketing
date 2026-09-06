import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeEmail } from '@/lib/security/sanitize'
import { audit } from '@/lib/security/audit'
import { logger } from '@/lib/observability/logger'
import { recordBusinessEvent } from '@/lib/observability/metrics'
import { z } from 'zod'

const SignupSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  tenantName: z.string().min(1).max(200),
  tenantDomain: z.string().min(1).max(200).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Invalid domain'),
})

/**
 * Signup endpoint — creates a new tenant + owner user.
 * Also auto-runs 1-Click Setup so the platform is ready immediately.
 * This is the self-service entry point for new organizations.
 */
async function handler(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = SignupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, password, tenantName, tenantDomain } = parsed.data
  const cleanEmail = sanitizeEmail(email)!

  // Check if email is already taken
  const existingUser = await db.user.findUnique({ where: { email: cleanEmail } })
  if (existingUser) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  // Check if domain is already taken
  const existingTenant = await db.tenant.findUnique({ where: { domain: tenantDomain.toLowerCase() } })
  if (existingTenant) {
    return NextResponse.json({ error: 'Domain already registered' }, { status: 409 })
  }

  // Create tenant + owner user
  const hashedPassword = await hashPassword(password)

  const tenant = await db.tenant.create({
    data: {
      name: sanitizeText(tenantName, 200),
      domain: sanitizeText(tenantDomain.toLowerCase(), 200),
      plan: 'pro',
      users: {
        create: {
          email: cleanEmail,
          name: sanitizeText(name, 200),
          hashedPassword,
          role: 'owner',
        },
      },
    },
    include: { users: true },
  })

  await audit({
    type: 'auth',
    message: `New tenant "${tenant.name}" registered with owner ${cleanEmail}`,
    tenantId: tenant.id,
    userId: tenant.users[0].id,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  // === AUTO 1-CLICK SETUP ===
  // Automatically configure everything so the user lands in a ready platform
  const setupResults: string[] = []

  try {
    // 1. Default project
    await db.project.create({
      data: { name: 'Main Campaign', description: `Marketing campaign for ${tenantName}`, tenantId: tenant.id, status: 'active' },
    })
    setupResults.push('project')

    // 2. Demo leads
    const industries = ['Software', 'Marketing', 'Restaurant', 'Fitness', 'Consulting']
    for (let i = 0; i < 5; i++) {
      await db.lead.create({
        data: {
          name: `Sample Lead ${i + 1} — ${industries[i]}`,
          industry: industries[i],
          score: 50 + Math.floor(Math.random() * 40),
          status: i < 2 ? 'new' : i < 4 ? 'contacted' : 'qualified',
          source: 'setup',
          tenantId: tenant.id,
        },
      })
    }
    setupResults.push('leads')

    // 3. Welcome email template
    await db.emailTemplate.create({
      data: {
        name: 'Welcome Template',
        subject: `Welcome to ${tenantName}!`,
        body: `Hi {{name}},\n\nThank you for your interest in ${tenantName}. We're excited to help you grow!\n\nBest regards,\n${tenantName} Team`,
        category: 'welcome',
        tenantId: tenant.id,
      },
    })
    setupResults.push('email_template')

    // 4. Fraud detection rules
    const fraudRules = [
      { name: 'Click Injection Detection', type: 'click_injection', description: 'Detects clicks injected before install', config: JSON.stringify({ ctctThreshold: 10 }), severity: 'high', action: 'block', tenantId: tenant.id },
      { name: 'SDK Spoofing Detection', type: 'sdk_spoofing', description: 'Detects fake SDK calls', config: JSON.stringify({ signatureCheck: true }), severity: 'critical', action: 'block', tenantId: tenant.id },
      { name: 'IP Anomaly Detection', type: 'ip_anomaly', description: 'Flags suspicious IPs', config: JSON.stringify({ maxInstallsPerIp: 5 }), severity: 'medium', action: 'flag', tenantId: tenant.id },
      { name: 'Device Farm Detection', type: 'device_farm', description: 'Detects device farm installs', config: JSON.stringify({ patternCheck: true }), severity: 'high', action: 'block', tenantId: tenant.id },
    ]
    for (const rule of fraudRules) {
      await db.fraudRule.create({ data: rule })
    }
    setupResults.push('fraud_rules')

    // 5. Marketing funnel
    await db.marketingFunnel.create({
      data: {
        name: 'Default Funnel',
        description: 'Lead-to-customer funnel',
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
        tenantId: tenant.id,
      },
    })
    setupResults.push('funnel')

    // 6. Welcome customer journey
    await db.customerJourney.create({
      data: {
        name: 'Welcome Journey',
        description: 'Auto welcome sequence',
        trigger: 'signup',
        steps: JSON.stringify([
          { id: 1, type: 'trigger', config: { event: 'signup' } },
          { id: 2, type: 'action', config: { channel: 'email', template: 'welcome' } },
          { id: 3, type: 'wait', config: { duration: '2 days' } },
          { id: 4, type: 'action', config: { channel: 'push', message: 'Check our features!' } },
        ]),
        isActive: true,
        tenantId: tenant.id,
      },
    })
    setupResults.push('journey')

    // 7. Customer Club enrollment (Bronze)
    let bronzeTier = await db.clubTier.findFirst({ where: { level: 1 } })
    if (!bronzeTier) {
      const tiers = [
        { name: 'Bronze', level: 1, minSpend: 0, minMonths: 0, discountPct: 0, freeAdCredits: 1, apiCallBonus: 0, prioritySupport: false, earlyAccess: false, color: '#CD7F32', icon: '🥉', description: 'Welcome!' },
        { name: 'Silver', level: 2, minSpend: 500, minMonths: 3, discountPct: 10, freeAdCredits: 3, apiCallBonus: 500, prioritySupport: false, earlyAccess: false, color: '#C0C0C0', icon: '🥈', description: '10% off' },
        { name: 'Gold', level: 3, minSpend: 2000, minMonths: 6, discountPct: 20, freeAdCredits: 10, apiCallBonus: 2000, prioritySupport: true, earlyAccess: true, color: '#FFD700', icon: '🥇', description: '20% off + priority' },
        { name: 'Platinum', level: 4, minSpend: 5000, minMonths: 12, discountPct: 30, freeAdCredits: 25, apiCallBonus: 5000, prioritySupport: true, earlyAccess: true, color: '#E5E4E2', icon: '💎', description: '30% off + all' },
      ]
      for (const t of tiers) await db.clubTier.create({ data: t })
      bronzeTier = await db.clubTier.findFirst({ where: { level: 1 } })
    }
    if (bronzeTier) {
      const membership = await db.clubMembership.create({
        data: { tenantId: tenant.id, tierId: bronzeTier.id, availablePoints: 100, totalPoints: 100, lifetimePoints: 100 },
      })
      await db.clubPoint.create({
        data: { membershipId: membership.id, points: 100, reason: 'signup_bonus', description: 'Welcome bonus!' },
      })
    }
    setupResults.push('club')

    // 8. Default rewards
    const rewards = [
      { name: '5% Discount', description: '5% off next month', pointsCost: 200, type: 'discount', value: 5, minTierLevel: 1, icon: '🏷️' },
      { name: '10 Ad Credits', description: '10 free ad credits', pointsCost: 500, type: 'ad_credits', value: 10, minTierLevel: 1, icon: '📢' },
      { name: 'Free Month', description: '1 month free', pointsCost: 2000, type: 'free_month', value: 1, minTierLevel: 3, icon: '🎁' },
    ]
    for (const r of rewards) {
      const existing = await db.clubReward.findFirst({ where: { name: r.name } })
      if (!existing) await db.clubReward.create({ data: r })
    }
    setupResults.push('rewards')

    // 9. Progressive unlock
    await db.progressiveUnlock.create({
      data: { tenantId: tenant.id, unlockedPhases: JSON.stringify(['P1']), currentPhase: 'P1', overallProgress: 10, plan: 'pro', monthlyBudget: 199 },
    })
    setupResults.push('roadmap')

    // 10. Default goals
    await db.goal.create({
      data: { title: 'Reach 50 leads', type: 'leads', targetValue: 50, unit: 'count', endDate: new Date(Date.now() + 30 * 86400000), priority: 'high', linkedPhases: JSON.stringify(['P1']), tenantId: tenant.id },
    })
    await db.goal.create({
      data: { title: 'Generate $5,000 revenue', type: 'revenue', targetValue: 5000, unit: 'usd', endDate: new Date(Date.now() + 90 * 86400000), priority: 'critical', linkedPhases: JSON.stringify(['P2', 'P5']), tenantId: tenant.id },
    })
    setupResults.push('goals')

    logger.info('signup.auto_setup_completed', { tenantId: tenant.id, itemCount: setupResults.length })
  } catch (err) {
    logger.error('signup.auto_setup_failed', { tenantId: tenant.id, error: String(err) })
  }

  recordBusinessEvent('signup')

  return NextResponse.json({
    tenant: { id: tenant.id, name: tenant.name, domain: tenant.domain },
    user: { id: tenant.users[0].id, email: tenant.users[0].email, name: tenant.users[0].name },
    autoSetup: setupResults,
  }, { status: 201 })
}

export const POST = withProtection(handler, {
  rateLimit: 'auth',
  audit: { type: 'auth', message: () => 'Signup attempt' },
})

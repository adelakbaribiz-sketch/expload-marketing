import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

/**
 * Progressive Unlock System.
 *
 * Phases unlock based on:
 *   1. Plan tier (starter = P1-P3, growth = P1-P7, enterprise = P1-P10)
 *   2. Budget (higher budget = faster unlocking)
 *   3. Time since signup (one new phase every 7 days for starter, 3 days for growth, 1 day for enterprise)
 *   4. Activity (using features in current phase progresses to next)
 */

const PHASE_INFO = [
  { id: 'P1', title: 'Lead Generation', desc: 'Discover potential customers via Google Maps, search engines, and AI enrichment', icon: 'Users' },
  { id: 'P2', title: 'CRM & Engagement', desc: 'Manage deals, email campaigns, WhatsApp, chatbot, and review monitoring', icon: 'Target' },
  { id: 'P3', title: 'Content Strategy', desc: 'AI-generated content ideas, content calendar, and strategy planning', icon: 'Lightbulb' },
  { id: 'P4', title: 'SEO Platform', desc: 'Website crawler, technical audit, keyword tracking, and A/B testing', icon: 'Search' },
  { id: 'P5', title: 'Advertising', desc: 'Google Ads, Meta Ads, budget optimization, and AI ad copy generation', icon: 'Megaphone' },
  { id: 'P6', title: 'Social Media', desc: 'Multi-channel publishing, social listening, and engagement analytics', icon: 'Share2' },
  { id: 'P7', title: 'Backlink Platform', desc: 'Discover backlink opportunities, manage outreach, track authority', icon: 'Link2' },
  { id: 'P8', title: 'Specialized Analyzers', desc: 'Social media analysis, export market research, competitor intelligence', icon: 'BarChart3' },
  { id: 'P9', title: 'AI Advisor', desc: 'Monthly reports, business diagnostics, SWOT, growth recommendations', icon: 'Brain' },
  { id: 'P10', title: 'Autonomous Agent', desc: 'Fully automated weekly marketing cycle across all phases', icon: 'Bot' },
]

/** Plan-based unlock limits */
const PLAN_PHASE_LIMITS: Record<string, number> = {
  starter: 3,      // P1, P2, P3
  growth: 7,       // P1 through P7
  enterprise: 10,  // All phases
}

/** Plan-based unlock interval (days between phase unlocks) */
const PLAN_UNLOCK_INTERVAL: Record<string, number> = {
  starter: 7,      // 1 phase per week
  growth: 3,       // 1 phase per 3 days
  enterprise: 1,   // 1 phase per day
}

/** Budget acceleration factor (higher budget = faster unlocking) */
function getBudgetAcceleration(budget: number): number {
  if (budget >= 2000) return 0.5  // 2x faster
  if (budget >= 1000) return 0.7  // 1.4x faster
  if (budget >= 500) return 0.85  // 1.2x faster
  return 1.0 // normal speed
}

export async function GET() {
  const tenantId = await requireTenantId()

  // Get or create progressive unlock record
  let record = await db.progressiveUnlock.findUnique({ where: { tenantId } })

  if (!record) {
    // Get tenant's subscription info
    const subscription = await db.subscription.findUnique({ where: { tenantId } })
    const plan = subscription?.plan || 'starter'
    const budget = subscription?.amount || 0

    record = await db.progressiveUnlock.create({
      data: {
        tenantId,
        unlockedPhases: JSON.stringify(['P1']),
        currentPhase: 'P1',
        phaseProgress: 0,
        overallProgress: 5,
        plan,
        monthlyBudget: budget,
        signupDate: new Date(),
      },
    })
  }

  // Calculate which phases should be unlocked based on time + plan + budget
  const plan = record.plan
  const maxPhases = PLAN_PHASE_LIMITS[plan] ?? 3
  const intervalDays = PLAN_UNLOCK_INTERVAL[plan] ?? 7
  const acceleration = getBudgetAcceleration(record.monthlyBudget)
  const effectiveInterval = intervalDays * acceleration

  const daysSinceSignup = Math.floor((Date.now() - record.signupDate.getTime()) / (1000 * 60 * 60 * 24))
  const phasesFromTime = Math.min(Math.floor(daysSinceSignup / effectiveInterval) + 1, maxPhases)

  // Merge: unlocked phases from DB + phases that should be unlocked by time
  const currentUnlocked: string[] = JSON.parse(record.unlockedPhases)
  const allUnlockedSet = new Set<string>(currentUnlocked)

  // Add phases that should be unlocked by time
  for (let i = 0; i < phasesFromTime; i++) {
    if (i < maxPhases && i < PHASE_INFO.length) {
      allUnlockedSet.add(PHASE_INFO[i].id)
    }
  }

  const allUnlocked = Array.from(allUnlockedSet).sort((a, b) => {
    return PHASE_INFO.findIndex(p => p.id === a) - PHASE_INFO.findIndex(p => p.id === b)
  })

  // Update record if new phases unlocked
  const newlyUnlocked = allUnlocked.filter(p => !currentUnlocked.includes(p))
  if (newlyUnlocked.length > 0) {
    const history = record.unlockHistory ? JSON.parse(record.unlockHistory) : []
    newlyUnlocked.forEach(phase => {
      history.push({ phase, unlockedAt: new Date().toISOString(), trigger: 'time' })
    })

    // Find current active phase (last unlocked)
    const currentActive = allUnlocked[allUnlocked.length - 1] || 'P1'
    const overallProgress = Math.round((allUnlocked.length / PHASE_INFO.length) * 100)

    record = await db.progressiveUnlock.update({
      where: { id: record.id },
      data: {
        unlockedPhases: JSON.stringify(allUnlocked),
        currentPhase: currentActive,
        overallProgress,
        unlockHistory: JSON.stringify(history),
      },
    })
  }

  // Calculate progress within each phase based on tenant's activity
  const phaseProgress = await calculatePhaseProgress(tenantId, allUnlocked)

  // Build the roadmap
  const roadmap = PHASE_INFO.map((phase, i) => ({
    ...phase,
    order: i + 1,
    unlocked: allUnlocked.includes(phase.id),
    locked: !allUnlocked.includes(phase.id),
    progress: phaseProgress[phase.id] || 0,
    isCurrent: record!.currentPhase === phase.id,
    unlockDate: newlyUnlocked.includes(phase.id) ? new Date().toISOString() : null,
    estimatedUnlock: !allUnlocked.includes(phase.id) ? estimateUnlockDate(record!.signupDate, i + 1, effectiveInterval) : null,
  }))

  // Build milestones
  const milestones = roadmap.filter(p => p.unlocked).map(p => ({
    phase: p.id,
    title: p.title,
    completed: p.progress >= 80,
    date: p.unlockDate,
  }))

  return NextResponse.json({
    record,
    roadmap,
    milestones,
    stats: {
      totalPhases: PHASE_INFO.length,
      unlockedCount: allUnlocked.length,
      maxPhasesForPlan: maxPhases,
      overallProgress: record!.overallProgress,
      currentPhase: record!.currentPhase,
      daysSinceSignup,
      nextPhaseUnlock: allUnlocked.length < maxPhases
        ? `${Math.ceil(effectiveInterval - (daysSinceSignup % effectiveInterval))} days`
        : null,
      plan,
      budget: record!.monthlyBudget,
      acceleration: `${Math.round((1 - acceleration) * 100)}% faster`,
    },
  })
}

/** Calculate progress within each phase based on tenant's actual activity. */
async function calculatePhaseProgress(tenantId: string, unlockedPhases: string[]): Promise<Record<string, number>> {
  const progress: Record<string, number> = {}

  // P1: Lead Generation — based on lead count
  if (unlockedPhases.includes('P1')) {
    const leadCount = await db.lead.count({ where: { tenantId } })
    progress.P1 = Math.min(Math.round((leadCount / 50) * 100), 100)
  }

  // P2: CRM & Engagement — based on deals + campaigns
  if (unlockedPhases.includes('P2')) {
    const [deals, campaigns] = await Promise.all([
      db.deal.count({ where: { tenantId } }),
      db.emailCampaign.count({ where: { tenantId } }),
    ])
    progress.P2 = Math.min(Math.round(((deals * 5) + (campaigns * 10)) / 2), 100)
  }

  // P3: Content Strategy
  if (unlockedPhases.includes('P3')) {
    const content = await db.contentPiece.count({ where: { tenantId } })
    progress.P3 = Math.min(Math.round((content / 5) * 100), 100)
  }

  // P4: SEO
  if (unlockedPhases.includes('P4')) {
    const seo = await db.seoProject.count({ where: { tenantId } })
    progress.P4 = Math.min(Math.round((seo / 2) * 100), 100)
  }

  // P5: Ads
  if (unlockedPhases.includes('P5')) {
    const ads = await db.adCampaign.count({ where: { tenantId } })
    progress.P5 = Math.min(Math.round((ads / 2) * 100), 100)
  }

  // P6: Social
  if (unlockedPhases.includes('P6')) {
    const [accounts, posts] = await Promise.all([
      db.socialAccount.count({ where: { tenantId } }),
      db.socialPost.count({ where: { tenantId } }),
    ])
    progress.P6 = Math.min(Math.round(((accounts * 20) + (posts * 5)) / 2), 100)
  }

  // P7: Backlinks
  if (unlockedPhases.includes('P7')) {
    const backlinks = await db.backlinkOpportunity.count({ where: { tenantId } })
    progress.P7 = Math.min(Math.round((backlinks / 10) * 100), 100)
  }

  // P8: Analyzers
  if (unlockedPhases.includes('P8')) {
    const [social, competitors, markets] = await Promise.all([
      db.socialAnalysis.count({ where: { tenantId } }),
      db.competitorProfile.count({ where: { tenantId } }),
      db.exportMarket.count({ where: { tenantId } }),
    ])
    progress.P8 = Math.min(Math.round(((social * 20) + (competitors * 15) + (markets * 15)) / 3), 100)
  }

  // P9: AI Advisor
  if (unlockedPhases.includes('P9')) {
    const [reports, diags] = await Promise.all([
      db.monthlyReport.count({ where: { tenantId } }),
      db.businessDiagnostic.count({ where: { tenantId } }),
    ])
    progress.P9 = Math.min(Math.round(((reports * 30) + (diags * 40)) / 2), 100)
  }

  // P10: Autonomous Agent
  if (unlockedPhases.includes('P10')) {
    const cycles = await db.agentCycle.count({ where: { tenantId } })
    progress.P10 = Math.min(Math.round((cycles / 4) * 100), 100)
  }

  return progress
}

function estimateUnlockDate(signupDate: Date, phaseNumber: number, intervalDays: number): string {
  const unlockDate = new Date(signupDate)
  unlockDate.setDate(unlockDate.getDate() + (phaseNumber - 1) * intervalDays)
  return unlockDate.toISOString()
}

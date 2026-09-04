import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withProtection } from '@/lib/security/with-protection'

/**
 * PUBLIC Live Demo API — no authentication required.
 *
 * Creates an anonymous demo session and returns mock data that
 * simulates a fully-populated marketing dashboard.
 */
async function handler(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body.action || 'init' // init | navigate | track

  // Generate or reuse session token
  let sessionToken = body.sessionToken

  if (action === 'init' || !sessionToken) {
    sessionToken = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    try {
      await db.demoSession.create({
        data: {
          sessionToken,
          currentView: body.view || 'dashboard',
          userAgent: req.headers.get('user-agent')?.slice(0, 200),
          referrer: req.headers.get('referer')?.slice(0, 200),
        },
      })
    } catch {
      // DB might not be available — continue with mock data
    }
  } else if (action === 'navigate' || action === 'track') {
    try {
      await db.demoSession.updateMany({
        where: { sessionToken },
        data: {
          currentView: body.view || 'dashboard',
          interactions: { increment: 1 },
          lastActiveAt: new Date(),
        },
      })
    } catch {
      // ignore
    }
  }

  // Return demo data based on the requested view
  const demoData = getDemoData(body.view || 'dashboard')

  return NextResponse.json({
    sessionToken,
    view: body.view || 'dashboard',
    data: demoData,
    isDemo: true,
  })
}

export const POST = withProtection(handler, { rateLimit: 'public' })

/** Generate realistic demo data for each dashboard view. */
function getDemoData(view: string): any {
  const baseStats = {
    totalLeads: 247,
    newLeads: 38,
    qualified: 52,
    won: 14,
    avgScore: 68.5,
    deals: 31,
    pipelineValue: 145000,
    wonRevenue: 67500,
    campaigns: 8,
    emailsSent: 1240,
    contentPieces: 23,
    seoProjects: 3,
    seoIssues: 7,
    avgSeoScore: 72,
    adCampaigns: 5,
    adSpend: 3200,
    socialAccounts: 6,
    socialPosts: 47,
    socialFollowers: 12450,
    backlinks: 34,
    aiRecommendations: 12,
    workflows: 4,
  }

  switch (view) {
    case 'dashboard':
      return {
        stats: baseStats,
        recentLeads: generateDemoLeads(6),
        recentActivity: generateDemoActivity(8),
        scoreBuckets: [
          { label: '0-20', count: 12 },
          { label: '20-40', count: 28 },
          { label: '40-60', count: 45 },
          { label: '60-80', count: 67 },
          { label: '80-100', count: 35 },
        ],
        statuses: [
          { name: 'New', value: 120, color: '#0A2A3A' },
          { name: 'Contacted', value: 65, color: '#FF5722' },
          { name: 'Qualified', value: 40, color: '#80DEEA' },
          { name: 'Won', value: 14, color: '#22c55e' },
          { name: 'Lost', value: 8, color: '#ef4444' },
        ],
      }

    case 'leads':
      return {
        leads: generateDemoLeads(20),
        total: 247,
      }

    case 'generator':
      return {
        sampleQuery: 'software company in Dubai',
        sampleResults: generateDemoLeads(8).map(l => ({ ...l, score: Math.floor(60 + Math.random() * 35) })),
      }

    case 'seo':
      return {
        projects: [
          { id: 'demo-1', name: 'Acme Corp', domain: 'acme.com', avgScore: 78, pages: 45, issues: 3, backlinks: 120 },
          { id: 'demo-2', name: 'TechFlow', domain: 'techflow.io', avgScore: 65, pages: 28, issues: 7, backlinks: 56 },
        ],
      }

    case 'analytics':
      return {
        metrics: baseStats,
        chartData: [
          { name: 'Leads', value: 247 },
          { name: 'Deals', value: 31 },
          { name: 'Campaigns', value: 8 },
          { name: 'Content', value: 23 },
          { name: 'Social', value: 47 },
          { name: 'Ads', value: 5 },
        ],
      }

    default:
      return { stats: baseStats }
  }
}

function generateDemoLeads(count: number) {
  const names = ['Nexus Labs', 'Apex Studio', 'Lumen Cafe', 'Vertex Fitness', 'Pulse Real Estate', 'Quanta Consulting', 'Cobalt Works', 'Prism Group', 'Helix Works', 'Atlas Hub', 'Zenith Co', 'Orbit Labs']
  const industries = ['Software', 'Marketing', 'Restaurant', 'Fitness', 'Real Estate', 'Consulting', 'E-commerce', 'Dental']
  const cities = ['Tehran', 'Dubai', 'Istanbul', 'Berlin', 'Toronto', 'Singapore']
  const statuses = ['new', 'contacted', 'qualified', 'won']

  return Array.from({ length: count }, (_, i) => ({
    id: `demo-lead-${i}`,
    name: `${names[i % names.length]} — ${industries[i % industries.length]} (${cities[i % cities.length]})`,
    email: i % 3 === 0 ? `info@${names[i % names.length].toLowerCase().replace(/\s/g, '')}.example.com` : null,
    industry: industries[i % industries.length],
    score: Math.floor(30 + Math.random() * 60),
    status: statuses[i % statuses.length],
    source: 'demo',
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }))
}

function generateDemoActivity(count: number) {
  const messages = [
    'Lead «Nexus Labs» created',
    'Campaign «Q4 Outreach» sent to 45 recipients',
    'SEO crawl completed: 12 issues found',
    'AI recommendation: Increase ad budget for Google Ads',
    '5 new leads generated via Serper search',
    'Social post published on LinkedIn',
    'Deal «Enterprise Subscription» moved to Negotiation',
    'Backlink acquired from techblog.com (DA: 65)',
    'Content piece «10 SEO Tips» published',
    'Autonomous agent cycle completed: 3 tasks created',
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: `demo-act-${i}`,
    type: ['created', 'updated', 'enriched'][i % 3],
    message: messages[i % messages.length],
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
  }))
}

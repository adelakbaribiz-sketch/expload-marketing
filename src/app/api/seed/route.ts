import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { audit } from '@/lib/security/audit'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

/**
 * Seeds a demo tenant + project + user (with password) + sample leads.
 * Idempotent — safe to call multiple times.
 *
 * Requires authentication: the only real caller (src/app/page.tsx's
 * auto-bootstrap effect) already only fires once a session exists, and
 * this must not be reachable by an anonymous caller — see KNOWN-ISSUES.md #1.
 */
async function handler() {
  const caller = await getCurrentUser()
  if (!caller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let tenant = await db.tenant.findFirst({ where: { domain: 'demo.expload.io' } })
  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: 'Expload Demo',
        domain: 'demo.expload.io',
        plan: 'pro',
      },
    })
  }

  // Create or update demo user with known password
  const hashedPassword = await hashPassword('demo12345')
  let user = await db.user.findFirst({ where: { email: 'admin@expload.io' } })
  if (!user) {
    user = await db.user.create({
      data: {
        email: 'admin@expload.io',
        name: 'Demo Admin',
        role: 'owner',
        hashedPassword,
        tenantId: tenant.id,
      },
    })
  } else if (!user.hashedPassword) {
    // Update existing user with password
    user = await db.user.update({
      where: { id: user.id },
      data: { hashedPassword, tenantId: tenant.id },
    })
  }

  let project = await db.project.findFirst({ where: { tenantId: tenant.id, name: 'Q3 Outreach' } })
  if (!project) {
    project = await db.project.create({
      data: {
        name: 'Q3 Outreach',
        description: 'Outbound lead generation campaign for Q3',
        status: 'active',
        tenantId: tenant.id,
      },
    })
  }

  const samples = [
    { name: 'Nexus Labs — Software (Tehran)', email: 'hello@nexus-labs.example.com', website: 'https://nexus-labs.example.com', industry: 'Software', description: 'Full-stack software studio building web and mobile products.', services: JSON.stringify(['Web Development', 'Mobile Apps', 'Cloud Architecture']), score: 78, status: 'qualified' as const, rating: 4.6, reviewsCount: 127 },
    { name: 'Apex Studio — Marketing Agency (Dubai)', email: 'contact@apex-studio.example.com', website: 'https://apex-studio.example.com', industry: 'Marketing Agency', description: 'Performance marketing agency specialising in paid social and SEO.', services: JSON.stringify(['SEO', 'Paid Social', 'Content']), score: 65, status: 'contacted' as const, rating: 4.3, reviewsCount: 89 },
    { name: 'Lumen Cafe — Restaurant (Istanbul)', website: 'https://lumen-cafe.example.com', industry: 'Restaurant', description: 'Specialty coffee shop in the heart of Istanbul.', services: JSON.stringify(['Coffee', 'Breakfast', 'Catering']), score: 42, status: 'new' as const, rating: 4.8, reviewsCount: 312 },
    { name: 'Vertex Fitness — Gym (Toronto)', email: 'info@vertex-fitness.example.com', industry: 'Fitness', description: 'Boutique strength & conditioning gym with personal coaching.', services: JSON.stringify(['Personal Training', 'Group Classes']), score: 55, status: 'new' as const, rating: 4.5, reviewsCount: 156 },
    { name: 'Pulse Real Estate — Real Estate (Berlin)', industry: 'Real Estate', description: 'Residential and commercial real estate brokerage.', services: JSON.stringify(['Residential', 'Commercial', 'Property Management']), score: 71, status: 'qualified' as const, rating: 4.1, reviewsCount: 64 },
    { name: 'Quanta Consulting — Consulting (Singapore)', email: 'team@quanta-consulting.example.com', industry: 'Consulting', description: 'Strategy consulting for fast-growing technology companies.', services: JSON.stringify(['Growth Strategy', 'Operations', 'Fundraising']), score: 88, status: 'won' as const, rating: 4.9, reviewsCount: 203 },
  ]

  const existing = await db.lead.count({ where: { tenantId: tenant.id } })
  if (existing === 0) {
    for (const s of samples) {
      const lead = await db.lead.create({
        data: { ...s, tenantId: tenant.id, projectId: project.id, source: 'mock' },
      })
      await db.activity.create({
        data: {
          type: 'created',
          message: `Seeded lead «${lead.name}»`,
          leadId: lead.id,
          tenantId: tenant.id,
          userId: user.id,
        },
      })
    }
  }

  // Create demo email template
  let template = await db.emailTemplate.findFirst({ where: { tenantId: tenant.id } })
  if (!template) {
    template = await db.emailTemplate.create({
      data: {
        name: 'Welcome Outreach',
        subject: 'Helping {{company}} grow with AI-powered marketing',
        body: `Hi {{name}},

I hope this email finds you well. I came across {{company}} and was impressed by your work in the {{industry}} space.

At Expload, we help companies like yours automate lead generation and customer engagement using AI. Our platform has helped businesses increase their qualified leads by up to 3x in just 90 days.

Would you be open to a brief 15-minute call next week to explore if there's a fit?

Best regards,
The Expload Team`,
        category: 'general',
        tenantId: tenant.id,
        createdBy: user.id,
      },
    })
  }

  await audit({
    type: 'auth',
    message: 'Demo data seeded',
    tenantId: tenant.id,
    userId: user.id,
  })

  // Note: this used to also return the demo account's plaintext password —
  // removed (KNOWN-ISSUES.md #1). No caller ever read that field; the demo
  // login is documented separately for whoever needs to sign in as it.
  return NextResponse.json({
    tenantId: tenant.id,
    projectId: project.id,
    templateId: template.id,
    seeded: existing === 0,
  })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

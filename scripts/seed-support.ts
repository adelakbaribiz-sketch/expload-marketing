/**
 * Seed: Support Plans + Sample Virtual Assistant + Default Payroll Config.
 *
 * Run: npx tsx scripts/seed-support.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Seeding support plans...')
  const plans = [
    {
      name: 'Basic',
      description: 'Email-only support for small teams getting started.',
      monthlyPrice: 99, annualPrice: 990,
      features: ['Email support', '48h response time', '5 tickets/month', 'Knowledge base access'],
      responseTimeHours: 48, resolutionTimeHours: 168,
      channels: ['email'],
      monthlyTicketsLimit: 5, monthlyHoursLimit: 2,
      color: '#8CD4D8', displayOrder: 10,
    },
    {
      name: 'Premium',
      description: 'For growing businesses that need faster responses and a dedicated CSM.',
      monthlyPrice: 499, annualPrice: 4990,
      features: ['Email + chat support', '4h response time', 'Unlimited tickets', 'Dedicated Customer Success Manager', 'Monthly strategy call', 'Priority bug fixes'],
      responseTimeHours: 4, resolutionTimeHours: 48,
      channels: ['email', 'chat'],
      monthlyTicketsLimit: null, monthlyHoursLimit: 10,
      isFeatured: true, color: '#F26522', displayOrder: 20,
    },
    {
      name: 'Enterprise',
      description: '24/7 white-glove support for mission-critical operations.',
      monthlyPrice: 1999, annualPrice: 19990,
      features: ['24/7 phone + Slack channel', '1h response SLA', 'Unlimited everything', 'Dedicated support team', 'Quarterly on-site visit', 'Custom integrations', 'SLA credits'],
      responseTimeHours: 1, resolutionTimeHours: 8,
      channels: ['email', 'chat', 'phone', 'slack'],
      monthlyTicketsLimit: null, monthlyHoursLimit: null,
      color: '#1B3A4B', displayOrder: 30,
    },
  ]
  for (const p of plans) {
    const existing = await db.supportPlan.findFirst({ where: { name: p.name } })
    if (!existing) {
      await db.supportPlan.create({
        data: {
          name: p.name,
          description: p.description,
          monthlyPrice: p.monthlyPrice,
          annualPrice: p.annualPrice,
          currency: 'USD',
          features: JSON.stringify(p.features),
          responseTimeHours: p.responseTimeHours,
          resolutionTimeHours: p.resolutionTimeHours,
          channels: JSON.stringify(p.channels),
          monthlyTicketsLimit: p.monthlyTicketsLimit,
          monthlyHoursLimit: p.monthlyHoursLimit,
          isFeatured: p.isFeatured ?? false,
          displayOrder: p.displayOrder,
          color: p.color,
        },
      })
      console.log(`  ✓ ${p.name}`)
    } else {
      console.log(`  (skipped ${p.name} — already exists)`)
    }
  }

  console.log('Seeding default payroll config...')
  const existingConfig = await db.payrollConfig.findFirst({ where: { isActive: true } })
  if (!existingConfig) {
    await db.payrollConfig.create({
      data: {
        ownerSharePercent: 50,
        staffPoolPercent: 40,
        reinvestmentPercent: 10,
        roleWeights: JSON.stringify({
          c_level: 3, vp: 2.5, director: 2, manager: 1.5,
          lead: 1.2, senior: 1, staff: 0.7,
        }),
        bonusPoolPercent: 5,
        payoutFrequency: 'monthly',
        payoutDay: 1,
      },
    })
    console.log('  ✓ Default payroll config (50/40/10 split)')
  } else {
    console.log('  (skipped — already exists)')
  }

  console.log('Seeding sample virtual assistants...')
  const sampleAssistants = [
    {
      name: 'Sarah Chen', email: 'sarah.chen@cppflow.io',
      phone: '+1-555-0101', bio: 'Senior SEO specialist with 8 years of experience. Worked with Fortune 500 brands.',
      skills: ['SEO', 'Content', 'Analytics'], primarySkill: 'seo',
      languages: ['en', 'zh'], workMode: 'remote', location: 'San Francisco', timezone: 'America/Los_Angeles',
      hourlyRate: 65, monthlyRate: 8000, rating: 4.9, totalProjects: 47, totalHours: 1240, completionRate: 98,
      isAvailable: true, isVerified: true,
    },
    {
      name: 'Ahmed Hassan', email: 'ahmed.hassan@cppflow.io',
      phone: '+971-50-123-4567', bio: 'Full-stack developer specializing in Next.js, Node, and React Native. MENA region.',
      skills: ['Development', 'Design'], primarySkill: 'development',
      languages: ['en', 'ar'], workMode: 'remote', location: 'Dubai', timezone: 'Asia/Dubai',
      hourlyRate: 55, monthlyRate: 7000, rating: 4.8, totalProjects: 32, totalHours: 890, completionRate: 96,
      isAvailable: true, isVerified: true,
    },
    {
      name: 'Maria Rodriguez', email: 'maria.rodriguez@cppflow.io',
      phone: '+34-612-345-678', bio: 'Social media strategist and content creator. 5M+ followers managed across platforms.',
      skills: ['Social', 'Content', 'Ads'], primarySkill: 'social',
      languages: ['en', 'es'], workMode: 'hybrid', location: 'Madrid', timezone: 'Europe/Madrid',
      hourlyRate: 45, monthlyRate: 5500, rating: 4.7, totalProjects: 28, totalHours: 650, completionRate: 100,
      isAvailable: true, isVerified: true,
    },
    {
      name: 'David Kim', email: 'david.kim@cppflow.io',
      phone: '+82-10-1234-5678', bio: 'Performance marketing expert. $50M+ ad spend managed. Google + Meta certified.',
      skills: ['Ads', 'Analytics', 'SEO'], primarySkill: 'ads',
      languages: ['en', 'ko'], workMode: 'remote', location: 'Seoul', timezone: 'Asia/Seoul',
      hourlyRate: 75, monthlyRate: 10000, rating: 5.0, totalProjects: 19, totalHours: 480, completionRate: 100,
      isAvailable: false, isVerified: true,
    },
    {
      name: 'Fatima Al-Zahra', email: 'fatima.zahra@cppflow.io',
      phone: '+966-50-123-4567', bio: 'Email marketing + CRM automation specialist. HubSpot + Mailchimp certified.',
      skills: ['Email', 'Content', 'Analytics'], primarySkill: 'email',
      languages: ['en', 'ar'], workMode: 'remote', location: 'Riyadh', timezone: 'Asia/Riyadh',
      hourlyRate: 40, monthlyRate: 5000, rating: 4.6, totalProjects: 22, totalHours: 540, completionRate: 94,
      isAvailable: true, isVerified: true,
    },
  ]
  for (const a of sampleAssistants) {
    const existing = await db.virtualAssistant.findUnique({ where: { email: a.email } })
    if (!existing) {
      await db.virtualAssistant.create({
        data: {
          ...a,
          skills: JSON.stringify(a.skills),
          languages: JSON.stringify(a.languages),
          currency: 'USD',
          verifiedAt: a.isVerified ? new Date() : null,
        },
      })
      console.log(`  ✓ ${a.name} (${a.primarySkill})`)
    } else {
      console.log(`  (skipped ${a.name} — already exists)`)
    }
  }

  console.log('✓ Seed complete.')
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => db.$disconnect())

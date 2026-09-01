import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantIdOrNull } from '@/lib/tenant'

export async function GET() {
  const tenantId = await getTenantIdOrNull()
  if (!tenantId) {
    return NextResponse.json({
      totalLeads: 0,
      totalProjects: 0,
      newLeads: 0,
      qualifiedLeads: 0,
      wonLeads: 0,
      avgScore: 0,
      industries: [],
      statuses: [],
      recentLeads: [],
      recentActivities: [],
      scoreBuckets: [],
    })
  }

  const [
    totalLeads,
    totalProjects,
    newLeads,
    qualifiedLeads,
    wonLeads,
    industryAgg,
    statusAgg,
    recentLeads,
    recentActivities,
    scoreBuckets,
  ] = await Promise.all([
    db.lead.count({ where: { tenantId } }),
    db.project.count({ where: { tenantId } }),
    db.lead.count({ where: { tenantId, status: 'new' } }),
    db.lead.count({ where: { tenantId, status: 'qualified' } }),
    db.lead.count({ where: { tenantId, status: 'won' } }),
    db.lead.groupBy({
      by: ['industry'],
      where: { tenantId, industry: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { industry: 'desc' } },
      take: 8,
    }),
    db.lead.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    }),
    db.lead.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { project: true },
    }),
    db.activity.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { lead: true },
    }),
    db.lead.findMany({
      where: { tenantId },
      select: { score: true, status: true },
      take: 500,
    }),
  ])

  // Compute avg score + score distribution
  const scores = scoreBuckets.map((l) => l.score)
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const buckets = [
    { label: '0-20', count: 0 },
    { label: '20-40', count: 0 },
    { label: '40-60', count: 0 },
    { label: '60-80', count: 0 },
    { label: '80-100', count: 0 },
  ]
  for (const s of scores) {
    const idx = Math.min(Math.floor(s / 20), 4)
    buckets[idx].count++
  }

  return NextResponse.json({
    totalLeads,
    totalProjects,
    newLeads,
    qualifiedLeads,
    wonLeads,
    avgScore: Math.round(avgScore * 10) / 10,
    industries: industryAgg.map((i) => ({ name: i.industry, count: i._count._all })),
    statuses: statusAgg.map((s) => ({ name: s.status, count: s._count._all })),
    recentLeads,
    recentActivities,
    scoreBuckets: buckets,
  })
}

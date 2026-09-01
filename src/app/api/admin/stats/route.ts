import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

  const [tenants, users, leads, campaigns, blogPosts, apiProducts, activeSubs] = await Promise.all([
    db.tenant.count(),
    db.user.count(),
    db.lead.count(),
    db.emailCampaign.count(),
    db.blogPost.count({ where: { status: 'published' } }),
    db.apiProduct.count({ where: { isActive: true } }),
    db.subscription.count({ where: { status: 'active' } }),
  ])

  // Revenue estimate
  const subscriptions = await db.subscription.findMany({ where: { status: 'active' } })
  const mrr = subscriptions.reduce((sum, s) => sum + s.amount, 0)

  return NextResponse.json({
    tenants, users, leads, campaigns, blogPosts, apiProducts, activeSubs,
    mrr,
    arr: mrr * 12,
  })
}

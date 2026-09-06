import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET() {
  const products = await db.apiProduct.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { keys: true, usage: true } } },
    take: 200,
  })
  return NextResponse.json({ products })
}

export async function POST(req: Request) {
  await requireTenantId()
  // ApiProduct has no tenantId — it's a platform-global marketplace listing,
  // same reasoning as marketplace/products/[id]'s PATCH/DELETE (already
  // SuperAdmin-gated). POST was the one method left open to any tenant user.
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const product = await db.apiProduct.create({
    data: {
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-'),
      description: body.description,
      pricePerCall: Number(body.pricePerCall || 0.01),
      pricePerMonth: Number(body.pricePerMonth || 0),
      rateLimit: Number(body.rateLimit || 100),
      dailyLimit: Number(body.dailyLimit || 10000),
      category: body.category || 'marketing',
      endpoint: body.endpoint,
      method: body.method || 'POST',
      docContent: body.docContent || null,
      codeExamples: body.codeExamples ? JSON.stringify(body.codeExamples) : null,
      isFeatured: body.isFeatured || false,
    },
  })
  return NextResponse.json({ product }, { status: 201 })
}

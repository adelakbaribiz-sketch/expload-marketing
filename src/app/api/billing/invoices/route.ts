import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'

export async function GET() {
  const tenantId = await requireTenantId()
  const invoices = await db.invoice.findMany({ where: { tenantId }, orderBy: { issueDate: 'desc' }, take: 50 })
  return NextResponse.json({ invoices })
}

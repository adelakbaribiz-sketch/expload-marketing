import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { isSuperAdmin } from '@/lib/auth/rbac'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const superAdmin = await isSuperAdmin()
  const distributor = await db.distributor.findUnique({
    where: { id },
    include: {
      tenant: { select: { name: true, domain: true, plan: true } },
      contracts: true,
      territories: true,
      _count: { select: { allocations: true, payouts: true, supportTickets: true } },
    },
  })
  if (!distributor) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!superAdmin && distributor.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json({ distributor })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const superAdmin = await isSuperAdmin()
  const existing = await db.distributor.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!superAdmin && existing.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const allowedFields = [
    'companyName', 'legalName', 'taxId', 'country', 'region', 'city', 'address',
    'contactName', 'contactEmail', 'contactPhone', 'bankName', 'bankAccount',
    'iban', 'swiftCode', 'tier', 'status', 'notes', 'internalOwnerId',
  ]
  const data: any = {}
  for (const f of allowedFields) if (f in body) data[f] = body[f]

  // Status transitions only by super_admin
  if (!superAdmin) delete data.status

  const updated = await db.distributor.update({ where: { id }, data })
  return NextResponse.json({ distributor: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const superAdmin = await isSuperAdmin()
  if (!superAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  await db.distributor.update({ where: { id }, data: { status: 'terminated', terminatedAt: new Date() } })
  return NextResponse.json({ ok: true })
}

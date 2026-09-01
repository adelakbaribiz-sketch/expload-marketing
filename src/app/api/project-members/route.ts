import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'

export async function GET(req: NextRequest) {
  const tenantId = await requireTenantId()
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  const members = await db.projectMember.findMany({
    where: { tenantId, ...(projectId ? { projectId } : {}) },
    include: {
      user: { select: { id: true, email: true, name: true } },
      project: { select: { id: true, name: true } },
      role: { select: { id: true, displayName: true, level: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ members })
}

async function postHandler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const body = await req.json().catch(() => ({}))
  const member = await db.projectMember.create({
    data: {
      userId: body.userId,
      projectId: body.projectId,
      roleId: body.roleId || null,
      customPermissions: body.customPermissions ? JSON.stringify(body.customPermissions) : null,
      status: 'active',
      joinedAt: new Date(),
      tenantId,
    },
  })
  return NextResponse.json({ member }, { status: 201 })
}

export const POST = withProtection(postHandler, { rateLimit: 'write' })

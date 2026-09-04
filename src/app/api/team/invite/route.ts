import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { getAuthUserId } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeEmail, sanitizeText } from '@/lib/security/sanitize'
import { hasPermission } from '@/lib/auth/rbac'
import { z } from 'zod'

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  roleId: z.string().optional(),
  roleName: z.string().default('member'),
})

async function handler(req: NextRequest) {
  const tenantId = await requireTenantId()
  const check = await hasPermission('team.manage')
  if (!check.allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const invitedBy = await getAuthUserId()
  const body = await req.json().catch(() => null)
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const email = sanitizeEmail(parsed.data.email)!
  const crypto = await import('crypto')
  const token = crypto.randomBytes(32).toString('hex')

  const invitation = await db.teamInvitation.create({
    data: {
      email,
      role: parsed.data.roleName,
      token,
      tenantId,
      invitedBy: invitedBy || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 86400000), // 7 days
    },
  })

  // Log
  await db.auditLogEntry.create({
    data: {
      userId: invitedBy ?? undefined,
      action: 'invite',
      entityType: 'user',
      entityName: email,
      description: `Invited ${email} as ${parsed.data.roleName}`,
      tenantId,
    },
  })

  return NextResponse.json({ invitation, inviteUrl: `/invite/${token}` }, { status: 201 })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

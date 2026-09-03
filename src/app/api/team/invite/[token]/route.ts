import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { sanitizeText } from '@/lib/security/sanitize'
import { z } from 'zod'

/** Look up an invitation by token — used by the public /invite/[token] page. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const invitation = await db.teamInvitation.findUnique({
    where: { token },
    include: { tenant: { select: { name: true } } },
  })
  if (!invitation) return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })

  const existingUser = await db.user.findUnique({ where: { email: invitation.email }, select: { id: true } })
  const expired = new Date(invitation.expiresAt) < new Date()

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    tenantName: invitation.tenant.name,
    status: invitation.status,
    expired,
    userExists: !!existingUser,
  })
}

const AcceptNewUserSchema = z.object({
  action: z.literal('accept'),
  name: z.string().min(1).max(200),
  password: z.string().min(8),
})

/** Accept or reject a team invitation by token. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const body = await req.json().catch(() => ({}))

  const invitation = await db.teamInvitation.findUnique({ where: { token } })
  if (!invitation) return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  if (invitation.status !== 'pending') return NextResponse.json({ error: 'Invitation already processed' }, { status: 400 })
  if (new Date(invitation.expiresAt) < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })

  if (body.action === 'accept') {
    const existingUser = await db.user.findUnique({ where: { email: invitation.email } })

    if (existingUser) {
      // Existing account — just add them to the inviting tenant with the invited role.
      await db.user.update({
        where: { id: existingUser.id },
        data: { tenantId: invitation.tenantId, role: invitation.role, isActive: true },
      })
    } else {
      // Brand-new invitee — create their account with a real password so they can log in.
      const parsed = AcceptNewUserSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      }
      const hashedPassword = await hashPassword(parsed.data.password)
      await db.user.create({
        data: {
          email: invitation.email,
          name: sanitizeText(parsed.data.name, 200),
          hashedPassword,
          tenantId: invitation.tenantId,
          role: invitation.role,
          isActive: true,
        },
      })
    }

    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    })
    return NextResponse.json({ ok: true, message: 'Invitation accepted', tenantId: invitation.tenantId, email: invitation.email })
  } else {
    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ ok: true, message: 'Invitation rejected' })
  }
}

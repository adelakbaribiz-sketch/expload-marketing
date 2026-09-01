import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** Accept or reject a team invitation by token. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const body = await req.json().catch(() => ({}))

  const invitation = await db.teamInvitation.findUnique({ where: { token } })
  if (!invitation) return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  if (invitation.status !== 'pending') return NextResponse.json({ error: 'Invitation already processed' }, { status: 400 })
  if (new Date(invitation.expiresAt) < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })

  if (body.action === 'accept') {
    // If user already exists, just add them to the tenant
    const existingUser = await db.user.findUnique({ where: { email: invitation.email } })
    if (existingUser) {
      await db.user.update({
        where: { id: existingUser.id },
        data: { tenantId: invitation.tenantId, role: invitation.role, isActive: true },
      })
    }
    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    })
    return NextResponse.json({ ok: true, message: 'Invitation accepted', tenantId: invitation.tenantId })
  } else {
    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ ok: true, message: 'Invitation rejected' })
  }
}

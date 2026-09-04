import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { withProtection } from '@/lib/security/with-protection'
import { z } from 'zod'

const ConvertSchema = z.object({
  sessionId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().max(200).optional(),
})

/** Convert sandbox session to real user account. */
async function handler(req: NextRequest) {
  const parsed = ConvertSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    // Matches signup's own password policy — this route creates a full
    // owner-role account and was previously reachable with any truthy
    // password (e.g. a single character), completely bypassing signup's
    // min(8) rule since it hashed the password itself instead of going
    // through the shared hashPassword() helper.
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { sessionId, email, password, name } = parsed.data

  const session = await db.sandboxSession.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Check if email already exists
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'email_already_registered' }, { status: 409 })
  }

  // Use the mock tenant created at sandbox start, or create a new one
  let tenant = session.mockTenantId ? await db.tenant.findUnique({ where: { id: session.mockTenantId } }) : null
  if (!tenant) {
    tenant = await db.tenant.create({
      data: { name: name ?? email, domain: `${email.split('@')[0]}.local`, plan: 'pro' },
    })
  } else {
    // Upgrade the mock tenant
    tenant = await db.tenant.update({
      where: { id: tenant.id },
      data: { name: name ?? email, domain: `${email.split('@')[0]}.local`, plan: 'pro' },
    })
  }

  // Hash password (shared helper — same cost factor as every other account-creation path)
  const hashedPassword = await hashPassword(password)

  // Create user
  const user = await db.user.create({
    data: { email: email.toLowerCase(), name, hashedPassword, role: 'owner', tenantId: tenant.id },
  })

  // Mark sandbox as converted
  await db.sandboxSession.update({
    where: { id: sessionId },
    data: { status: 'converted', convertedToUser: true, convertedUserId: user.id },
  })

  return NextResponse.json({
    userId: user.id,
    tenantId: tenant.id,
    email: user.email,
    message: 'Account created successfully. You can now log in.',
  }, { status: 201 })
}

export const POST = withProtection(handler, { rateLimit: 'public' })

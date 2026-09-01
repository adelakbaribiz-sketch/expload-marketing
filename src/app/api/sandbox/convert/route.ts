import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** Convert sandbox session to real user account. */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sessionId, email, password, name } = body
  if (!sessionId || !email || !password) {
    return NextResponse.json({ error: 'sessionId, email, password required' }, { status: 400 })
  }

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

  // Hash password
  const bcrypt = await import('bcryptjs')
  const hashedPassword = await bcrypt.hash(password, 10)

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

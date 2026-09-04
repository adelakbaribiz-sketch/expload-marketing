import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeEmail } from '@/lib/security/sanitize'
import { getClientId } from '@/lib/security/rate-limit'
import { audit } from '@/lib/security/audit'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

async function handler(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const email = sanitizeEmail(parsed.data.email)
  if (!email) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const user = await authenticateUser(email, parsed.data.password)
  const ip = getClientId(req)
  if (!user) {
    // Failed logins were previously not logged anywhere, making a sustained
    // password-guessing run against one account invisible in the audit
    // trail. This doesn't by itself throttle anything (the rate limiter
    // already does that) — it's what makes an ongoing attack detectable.
    await audit({
      type: 'auth',
      message: `Failed login attempt for ${email}`,
      ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  await audit({ type: 'auth', message: `Login: ${email}`, tenantId: user.tenantId, userId: user.id, ip })

  return NextResponse.json({ user })
}

export const POST = withProtection(handler, { rateLimit: 'auth' })

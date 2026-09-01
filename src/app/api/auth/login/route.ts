import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeEmail } from '@/lib/security/sanitize'
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
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  return NextResponse.json({ user })
}

export const POST = withProtection(handler, { rateLimit: 'auth' })

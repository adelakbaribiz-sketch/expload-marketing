import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'

async function handler() {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}

export const POST = withProtection(handler, { rateLimit: 'write' })

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { withProtection } from '@/lib/security/with-protection'
import { seedDemoData } from '@/lib/seed-demo-data'

/**
 * Seeds a demo tenant + project + user (with password) + sample leads.
 * Idempotent — safe to call multiple times.
 *
 * Requires authentication: the only real caller (src/app/page.tsx's
 * auto-bootstrap effect) already only fires once a session exists, and
 * this must not be reachable by an anonymous caller — see KNOWN-ISSUES.md #1.
 *
 * Shares its actual seeding logic with `scripts/seed.ts` (the CLI/deploy-
 * time path, `bun run db:seed`) via `src/lib/seed-demo-data.ts` — see that
 * file for why a second, unauthenticated entry point exists at all.
 */
async function handler() {
  const caller = await getCurrentUser()
  if (!caller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Note: this used to also return the demo account's plaintext password —
  // removed (KNOWN-ISSUES.md #1). No caller ever read that field; the demo
  // login is documented separately for whoever needs to sign in as it.
  const result = await seedDemoData()
  return NextResponse.json(result)
}

export const POST = withProtection(handler, { rateLimit: 'write' })

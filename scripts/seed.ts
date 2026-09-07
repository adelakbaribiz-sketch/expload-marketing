/**
 * `bun run db:seed` — the CLI/deploy-time seed entry point.
 *
 * Was referenced by README-DEPLOY.md and scripts/dev-setup.sh for a long
 * time without ever existing as a real package.json script
 * (KNOWN-ISSUES.md #16a) — the only seeding logic that existed lived in
 * `POST /api/seed`, which requires an authenticated session and therefore
 * can't bootstrap the very first account on a fresh deploy (a real
 * chicken-and-egg gap, not just a missing script name). This script calls
 * the same shared logic (`src/lib/seed-demo-data.ts`) with no auth
 * required, since a CLI invocation on a machine with direct DB access is
 * already a trusted context.
 *
 * Idempotent — safe to run on every deploy, not just the first one.
 */

import { seedDemoData } from '../src/lib/seed-demo-data'

async function main() {
  const result = await seedDemoData()
  console.log(`Seeded demo tenant ${result.tenantId} (admin@expload.io / demo12345)${result.seeded ? ' — new leads created' : ' — leads already existed, skipped'}.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })

/**
 * Bootstrap the very first SuperAdmin (platform-wide) account.
 *
 * Every other path to becoming a SuperAdmin (PATCH /api/admin/users/[id])
 * itself requires an existing SuperAdmin — this script is the one supported
 * out-of-band way to break that deadlock. It promotes an already-signed-up
 * user by email; it does not create accounts.
 *
 * Run with: bun run scripts/bootstrap-super-admin.ts <email>
 */

import { db } from '../src/lib/db'

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) {
    console.error('Usage: bun run scripts/bootstrap-super-admin.ts <email>')
    process.exit(1)
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found with email "${email}". Sign up first, then re-run this script.`)
    process.exit(1)
  }

  const superAdmin = await db.superAdmin.upsert({
    where: { userId: user.id },
    create: { userId: user.id, level: 1, assignedBy: 'bootstrap-script' },
    update: { isActive: true },
  })

  console.log(`✓ ${user.email} is now a SuperAdmin (level ${superAdmin.level}).`)
  console.log('  They can now sign in and see the Super Admin panel, and promote/demote other SuperAdmins from there.')
}

main().catch(console.error).finally(() => process.exit(0))

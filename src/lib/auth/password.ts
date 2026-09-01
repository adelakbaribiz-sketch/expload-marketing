/**
 * Password hashing utilities.
 *
 * Separated from auth/config.ts so that API routes which only need
 * hashing (like /api/seed) don't pull in the entire NextAuth config
 * and its heavy dependencies.
 */

/** Hash a password using bcrypt. Lazy-loads bcryptjs. */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = (await import('bcryptjs')).default
  return bcrypt.hash(password, 12)
}

/** Verify a password against a bcrypt hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = (await import('bcryptjs')).default
  return bcrypt.compare(password, hash)
}

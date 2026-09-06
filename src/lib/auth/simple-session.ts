import 'server-only'
import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'

/**
 * Lightweight session management without NextAuth.js.
 *
 * Uses a properly-signed HMAC-SHA256 session token stored in an httpOnly cookie.
 * Token format: userId.hmac(userId + secret)
 */

const SESSION_COOKIE = 'session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

// Fail closed in production: a session secret that ships as a public,
// hardcoded default would let anyone forge a valid session cookie for any
// userId. The dev fallback only applies outside production.
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET must be set in production — refusing to start with a public default session secret.')
}
const SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production-please-use-a-long-random-string'

/** Sign payload with HMAC-SHA256. */
function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

/**
 * Create a session token for a user.
 * Format: userId.issuedAtMs.hmac(userId.issuedAtMs). The issuedAt claim is
 * what lets verifySessionToken enforce real server-side expiry — see
 * adr/0007 step 1. (Tokens issued before this change have no issuedAt
 * segment and are rejected by verifySessionToken below, so this change
 * logs out every existing session the moment it ships — expected, not a bug.)
 */
export function createSessionToken(userId: string): string {
  const issuedAt = Date.now()
  return `${userId}.${issuedAt}.${sign(`${userId}.${issuedAt}`)}`
}

/** Verify a session token and return the userId. Constant-time comparison, checks expiry. */
export function verifySessionToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, issuedAtStr, signature] = parts
  const issuedAt = Number(issuedAtStr)
  if (!Number.isFinite(issuedAt)) return null
  const expected = sign(`${userId}.${issuedAtStr}`)
  if (expected.length !== signature.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null
  } catch {
    return null
  }
  if (Date.now() - issuedAt > SESSION_MAX_AGE * 1000) return null
  return userId
}

/** Set the session cookie. */
export async function setSessionCookie(userId: string): Promise<void> {
  const token = createSessionToken(userId)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/** Clear the session cookie. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/** Platform-level role flags, layered on top of the tenant-scoped `role` string. */
async function getPlatformRoleFlags(userId: string): Promise<{ isSuperAdmin: boolean; internalPlatformRole: string | null }> {
  const [superAdmin, internalEmployee] = await Promise.all([
    db.superAdmin.findUnique({ where: { userId } }),
    db.internalEmployee.findUnique({ where: { userId } }),
  ])
  return {
    isSuperAdmin: !!superAdmin && superAdmin.isActive,
    internalPlatformRole: internalEmployee && internalEmployee.status !== 'terminated' ? internalEmployee.platformRole : null,
  }
}

/** Get the current authenticated user from the session cookie. */
export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const userId = verifySessionToken(token)
  if (!userId) return null

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  })

  if (!user || !user.isActive || !user.tenant?.isActive) return null

  const { isSuperAdmin, internalPlatformRole } = await getPlatformRoleFlags(user.id)

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    // `hasPermission()` (src/lib/auth/rbac.ts) has always looked up
    // `(user as any).roleId` to enforce a custom role's granted
    // permissions — but this function never included it on the object it
    // returns, so that lookup was silent dead code: every custom-role
    // permission check fell through to "not owner/admin, no roleId" and
    // was denied, or (via requireNonViewer(), which never looked at
    // roleId at all) was allowed outright. See ACCEPTANCE-CRITERIA.md
    // AC-7 and QA-AUDIT.md.
    roleId: user.roleId,
    tenantId: user.tenantId,
    isSuperAdmin,
    internalPlatformRole,
  }
}

/** Get the authenticated user's tenantId. */
export async function getAuthTenantId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.tenantId ?? null
}

/** Get the authenticated user's id. */
export async function getAuthUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id ?? null
}

/** Verify credentials and create a session. Returns null on failure. */
export async function authenticateUser(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { tenant: true },
  })

  if (!user || !user.hashedPassword) return null
  if (!user.isActive) return null
  if (!user.tenant?.isActive) return null

  const isValid = await verifyPassword(password, user.hashedPassword)
  if (!isValid) return null

  await setSessionCookie(user.id)
  const { isSuperAdmin, internalPlatformRole } = await getPlatformRoleFlags(user.id)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleId: user.roleId,
    tenantId: user.tenantId,
    isSuperAdmin,
    internalPlatformRole,
  }
}

export { SESSION_COOKIE, SESSION_MAX_AGE }

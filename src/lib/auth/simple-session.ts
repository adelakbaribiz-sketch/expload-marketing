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
const SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production-please-use-a-long-random-string'

/** Sign payload with HMAC-SHA256. */
function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

/** Create a session token for a user. */
export function createSessionToken(userId: string): string {
  return `${userId}.${sign(userId)}`
}

/** Verify a session token and return the userId. Constant-time comparison. */
export function verifySessionToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [userId, signature] = parts
  const expected = sign(userId)
  if (expected.length !== signature.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null
    return userId
  } catch {
    return null
  }
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

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
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
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
  }
}

export { SESSION_COOKIE, SESSION_MAX_AGE }

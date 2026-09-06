import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Time-limited signed access tokens for private file downloads — same
 * HMAC-SHA256 pattern as the session cookie (src/lib/auth/simple-session.ts),
 * reusing NEXTAUTH_SECRET so there's one signing secret to manage, not two.
 */
const SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production-please-use-a-long-random-string'

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

/** Mint a signed, time-limited token for one document id. */
export function signDocumentToken(documentId: string, ttlMs = 15 * 60 * 1000): string {
  const expiresAt = Date.now() + ttlMs
  const payload = `${documentId}.${expiresAt}`
  return `${expiresAt}.${sign(payload)}`
}

/** Verify a token minted by signDocumentToken for the given document id. */
export function verifyDocumentToken(documentId: string, token: string | null): boolean {
  if (!token) return false
  const [expiresAtStr, signature] = token.split('.')
  if (!expiresAtStr || !signature) return false
  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false

  const expected = sign(`${documentId}.${expiresAt}`)
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

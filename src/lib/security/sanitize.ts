/**
 * Input sanitization helpers.
 *
 * These complement Zod validation by stripping dangerous characters
 * that should never reach the database or be rendered back to the user.
 *
 * Prisma already parameterizes queries (no SQL injection), so these
 * helpers focus on:
 *   - Stripping HTML tags from plain-text fields (anti stored-XSS)
 *   - Trimming and clamping overly long strings
 *   - Rejecting control characters
 *   - Validating URLs and email formats server-side
 */

/** Strip HTML tags + control chars from a string. */
export function sanitizeText(input: string | null | undefined, maxLen = 2000): string {
  if (!input) return ''
  let s = String(input)
  // Remove HTML tags
  s = s.replace(/<[^>]*>/g, '')
  // Remove null bytes and other control chars (except newline/tab)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  // Trim and clamp
  s = s.trim().slice(0, maxLen)
  return s
}

/** Sanitize a multi-line textarea field (preserve newlines). */
export function sanitizeMultiline(input: string | null | undefined, maxLen = 5000): string {
  if (!input) return ''
  let s = String(input)
  s = s.replace(/<[^>]*>/g, '')
  // Allow \n and \t
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  s = s.trim().slice(0, maxLen)
  return s
}

/** Validate that a string is a well-formed URL with http/https scheme. */
export function sanitizeUrl(input: string | null | undefined): string | null {
  if (!input) return null
  const s = String(input).trim().slice(0, 500)
  if (!s) return null
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

/** Validate and normalize an email address. Returns null if invalid. */
export function sanitizeEmail(input: string | null | undefined): string | null {
  if (!input) return null
  const s = String(input).trim().toLowerCase().slice(0, 254)
  // RFC 5322 simplified pattern
  const re = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
  return re.test(s) ? s : null
}

/** Sanitize a phone number — strip everything except digits, +, -, spaces, parens. */
export function sanitizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  const s = String(input).trim().slice(0, 30)
  if (!s) return null
  return s.replace(/[^\d+\-\s()]/g, '')
}

/** Sanitize a list of strings (e.g. services array). */
export function sanitizeStringList(
  input: unknown,
  maxItems = 10,
  maxItemLen = 100,
): string[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((x): x is string => typeof x === 'string')
    .map((x) => sanitizeText(x, maxItemLen))
    .filter((x) => x.length > 0)
    .slice(0, maxItems)
}

/** Detect obvious path-traversal patterns in user input. */
export function containsPathTraversal(input: string | null | undefined): boolean {
  if (!input) return false
  return /(\.\.|\/etc\/|\/var\/|\\windows\\|%2e%2e)/i.test(String(input))
}

/** Generic object sanitizer — applies sanitizeText to all string values. */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options?: { multilineFields?: string[]; maxLen?: number },
): T {
  const multiline = new Set(options?.multilineFields ?? [])
  const maxLen = options?.maxLen ?? 2000
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      out[k] = multiline.has(k) ? sanitizeMultiline(v, 5000) : sanitizeText(v, maxLen)
    } else {
      out[k] = v
    }
  }
  return out as T
}

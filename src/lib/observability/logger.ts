/**
 * Structured JSON logging.
 *
 * Every line is a single JSON object on stdout/stderr — searchable and
 * parseable by any log aggregator that tails container output (Loki,
 * CloudWatch, ELK, `docker logs`) with no extra shipping agent required.
 * No logging library is used deliberately: the app's actual needs (leveled
 * JSON lines + automatic request/correlation-id attachment + redaction) are
 * a few dozen lines, not a dependency.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

export interface LogContext {
  requestId?: string
  correlationId?: string
  tenantId?: string
  userId?: string
}

// Cached on `globalThis` — Next.js compiles each route.ts into its own
// module bundle, so a plain module-level `new AsyncLocalStorage()` would
// be a different instance depending on which route's bundle imported this
// file first. That would silently break context propagation into any
// module bundled separately from the request's own route handler — e.g.
// src/lib/queue/index.ts reading `getLogContext()` inside `enqueue()` to
// tag a job with the request's correlationId. See the matching comment in
// src/lib/observability/metrics.ts (same root cause, found the same way:
// live-verified, not assumed).
const g = globalThis as unknown as { __logContextStorage?: AsyncLocalStorage<LogContext> }
const contextStorage: AsyncLocalStorage<LogContext> =
  g.__logContextStorage ?? (g.__logContextStorage = new AsyncLocalStorage<LogContext>())

/** Run `fn` with the given log context attached to every log call inside it (including across awaits). */
export function runWithLogContext<T>(ctx: LogContext, fn: () => T): T {
  return contextStorage.run(ctx, fn)
}

/** Merge additional fields into the currently-running log context (e.g. once tenantId is known partway through a request). */
export function extendLogContext(patch: LogContext): void {
  const current = contextStorage.getStore()
  if (current) Object.assign(current, patch)
}

export function getLogContext(): LogContext {
  return contextStorage.getStore() ?? {}
}

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const
type Level = keyof typeof LEVELS

function configuredLevel(): number {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as Level | undefined
  if (envLevel && envLevel in LEVELS) return LEVELS[envLevel]
  return process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug
}

// Field names (case-insensitive) whose values are always redacted, no
// matter how deeply nested — a caller passing a whole object into `meta`
// (e.g. a request body) must not be able to leak a secret through it.
const SENSITIVE_KEYS = new Set([
  'password', 'hashedpassword', 'newpassword', 'oldpassword',
  'token', 'accesstoken', 'refreshtoken', 'sessiontoken', 'idtoken',
  'apikey', 'api_key', 'secret', 'clientsecret', 'privatekey',
  'authorization', 'cookie', 'setcookie',
  'ssn', 'creditcard', 'cardnumber', 'cvv', 'cvc',
])

function redactingReplacer(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) return '[redacted]'
  return value
}

function safeStringify(entry: Record<string, unknown>): string {
  try {
    return JSON.stringify(entry, redactingReplacer)
  } catch {
    // Circular reference or BigInt in meta — never let a logging call throw.
    return JSON.stringify({ ts: entry.ts, level: entry.level, message: entry.message, note: 'log entry serialization failed' })
  }
}

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < configuredLevel()) return
  const ctx = getLogContext()
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
    ...(ctx.correlationId ? { correlationId: ctx.correlationId } : {}),
    ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}),
    ...(ctx.userId ? { userId: ctx.userId } : {}),
    ...(meta ? { meta } : {}),
  }
  const line = safeStringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
}

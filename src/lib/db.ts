import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/observability/logger'
import { dbQueryDuration, dbQueriesTotal, errorsTotal } from '@/lib/observability/metrics'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  // Next.js compiles each route.ts into its own module bundle, so this
  // file's top-level code (including the db.$on(...) calls below) re-runs
  // once per bundle even though `db` itself resolves to the same cached
  // PrismaClient instance — without this guard, every bundle that imports
  // db.ts would attach its own extra 'query'/'error'/'warn' listener to
  // that one instance, and a single query would fire N listeners,
  // N-multiplying db_queries_total. Keyed by instance (not a single global
  // flag) so this stays correct if a deployment mode ever does create more
  // than one real PrismaClient (see the NODE_ENV branch below).
  dbMetricsAttached: WeakSet<PrismaClient> | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Event-based logging (rather than the array-of-strings form) so query
    // duration can feed metrics without printing every query's SQL/params
    // to stdout in production — full query text (which can include
    // parameter values) is only ever logged in development, below.
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  })

const SLOW_QUERY_MS = 500
const attached = globalForPrisma.dbMetricsAttached ?? (globalForPrisma.dbMetricsAttached = new WeakSet())

if (!attached.has(db)) {
  attached.add(db)

  db.$on('query' as never, (e: { query: string; duration: number }) => {
    dbQueriesTotal.inc()
    dbQueryDuration.observe(e.duration / 1000)
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('db.query', { durationMs: e.duration, query: e.query.slice(0, 300) })
    } else if (e.duration > SLOW_QUERY_MS) {
      // No SQL text/params in production logs — see comment above.
      logger.warn('db.slow_query', { durationMs: e.duration })
    }
  })

  db.$on('error' as never, (e: { message: string }) => {
    errorsTotal.labels('db', 'query').inc()
    logger.error('db.error', { message: e.message })
  })

  db.$on('warn' as never, (e: { message: string }) => {
    logger.warn('db.warning', { message: e.message })
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

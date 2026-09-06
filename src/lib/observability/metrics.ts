/**
 * Prometheus metrics registry.
 *
 * Scraped by `GET /api/metrics` (bearer-token gated — see that route).
 * `collectDefaultMetrics()` supplies CPU/memory/event-loop/GC out of the
 * box; everything below it is this app's own instrumentation.
 *
 * Cached on `globalThis` — the same pattern src/lib/db.ts already uses for
 * the Prisma client, and for the same reason: Next.js compiles each
 * route.ts into its own module bundle, so a plain module-level
 * `new client.Registry()` here would be a *different object* depending on
 * which route's bundle happened to import this file first. Metrics
 * incremented from `with-protection.ts` (bundled into every protected
 * route) would then live in a registry instance `/api/metrics` (a
 * separate bundle) never reads from — confirmed live: HELP/TYPE lines
 * appeared (the metric was defined) but every series was empty (nothing
 * had ever incremented *that* instance). `globalThis` is the one thing
 * genuinely shared across all of them, module bundling aside.
 */

import client from 'prom-client'
import { logger } from '@/lib/observability/logger'

interface MetricsGlobal {
  registry?: client.Registry
  httpRequestsTotal?: client.Counter<'method' | 'route' | 'status'>
  httpRequestDuration?: client.Histogram<'method' | 'route' | 'status'>
  errorsTotal?: client.Counter<'source' | 'route'>
  dbQueryDuration?: client.Histogram<string>
  dbQueriesTotal?: client.Counter<string>
  queueJobsTotal?: client.Counter<'type' | 'status'>
  queueJobDuration?: client.Histogram<'type'>
  queueDepth?: client.Gauge<'status'>
  businessEventsTotal?: client.Counter<'event'>
  queueDepthSampler?: (() => Promise<Record<string, number>>) | null
}

const g = globalThis as unknown as { __observability?: MetricsGlobal }
const bag: MetricsGlobal = g.__observability ?? (g.__observability = {})

export const registry: client.Registry =
  bag.registry ??
  (bag.registry = (() => {
    const r = new client.Registry()
    client.collectDefaultMetrics({ register: r })
    return r
  })())

// ---------------------------------------------------------------------------
// API (request latency + volume)
// ---------------------------------------------------------------------------

export const httpRequestsTotal =
  bag.httpRequestsTotal ??
  (bag.httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests handled',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [registry],
  }))

export const httpRequestDuration =
  bag.httpRequestDuration ??
  (bag.httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  }))

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const errorsTotal =
  bag.errorsTotal ??
  (bag.errorsTotal = new client.Counter({
    name: 'app_errors_total',
    help: 'Total handled errors, by source',
    labelNames: ['source', 'route'] as const,
    registers: [registry],
  }))

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export const dbQueryDuration =
  bag.dbQueryDuration ??
  (bag.dbQueryDuration = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Prisma query duration in seconds',
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  }))

export const dbQueriesTotal =
  bag.dbQueriesTotal ??
  (bag.dbQueriesTotal = new client.Counter({
    name: 'db_queries_total',
    help: 'Total Prisma queries executed',
    registers: [registry],
  }))

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export const queueJobsTotal =
  bag.queueJobsTotal ??
  (bag.queueJobsTotal = new client.Counter({
    name: 'queue_jobs_total',
    help: 'Total queue jobs processed, by type and outcome',
    labelNames: ['type', 'status'] as const,
    registers: [registry],
  }))

export const queueJobDuration =
  bag.queueJobDuration ??
  (bag.queueJobDuration = new client.Histogram({
    name: 'queue_job_duration_seconds',
    help: 'Queue job processing duration in seconds, by type',
    labelNames: ['type'] as const,
    buckets: [0.1, 0.5, 1, 5, 15, 30, 60, 120, 300],
    registers: [registry],
  }))

export function registerQueueDepthSampler(sampler: () => Promise<Record<string, number>>): void {
  bag.queueDepthSampler = sampler
}

// A gauge whose value is computed at scrape time (via `collect()`) rather
// than incrementally updated, so it always reflects live queue depth
// without a separate polling loop.
export const queueDepth =
  bag.queueDepth ??
  (bag.queueDepth = new client.Gauge({
    name: 'queue_depth',
    help: 'Current number of jobs by status (queued/processing)',
    labelNames: ['status'] as const,
    registers: [registry],
    async collect() {
      if (!bag.queueDepthSampler) return
      try {
        const counts = await bag.queueDepthSampler()
        for (const [status, count] of Object.entries(counts)) this.set({ status }, count)
      } catch (err) {
        // Never let a failed sample break the whole scrape (e.g. a
        // configured-but-unreachable Redis — see KNOWN-ISSUES.md) — but a
        // silently-swallowed error here previously meant `queue_depth`
        // just vanished from scrapes with zero indication why. Log it
        // instead so that's diagnosable.
        logger.warn('metrics.queue_depth_sample_failed', { error: String(err) })
      }
    },
  }))

// ---------------------------------------------------------------------------
// Business metrics
// ---------------------------------------------------------------------------

export const businessEventsTotal =
  bag.businessEventsTotal ??
  (bag.businessEventsTotal = new client.Counter({
    name: 'business_events_total',
    help: 'Domain events — signups, records created/updated/deleted per model, campaigns sent, payments completed',
    labelNames: ['event'] as const,
    registers: [registry],
  }))

export function recordBusinessEvent(event: string): void {
  businessEventsTotal.labels(event).inc()
}

// ---------------------------------------------------------------------------
// Route label normalization — collapse dynamic id segments so per-entity
// traffic doesn't create one Prometheus time series per row in the
// database (e.g. `/api/leads/ckx7f...` and `/api/leads/ckx7g...` both
// become `/api/leads/:id`).
// ---------------------------------------------------------------------------

const CUID_RE = /^c[a-z0-9]{20,}$/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERIC_RE = /^\d+$/
const JOB_ID_RE = /^job_\d+_[a-z0-9]+$/i

export function normalizeRoute(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => {
      if (!seg) return seg
      if (CUID_RE.test(seg) || UUID_RE.test(seg) || NUMERIC_RE.test(seg) || JOB_ID_RE.test(seg)) return ':id'
      return seg
    })
    .join('/')
}

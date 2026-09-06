/**
 * Job queue abstraction.
 *
 * In development, uses an in-memory queue with a simple polling worker.
 * In production, swap the `RedisQueueAdapter` (commented below) by
 * setting REDIS_URL — the interface stays the same.
 *
 * Supported job types:
 *   - 'email_campaign'   : send a campaign to all recipients
 *   - 'lead_generation'  : batch lead generation with AI enrichment
 *   - 'lead_enrich'      : enrich a single lead with AI
 *   - 'document_extract' : extract text from an uploaded onboarding document
 */

import { sendCampaign } from '@/lib/email/service'
import { logger, getLogContext, runWithLogContext } from '@/lib/observability/logger'
import { queueJobsTotal, queueJobDuration, registerQueueDepthSampler } from '@/lib/observability/metrics'

export type JobType = 'email_campaign' | 'lead_generation' | 'lead_enrich' | 'document_extract'

export interface Job {
  id: string
  type: JobType
  payload: Record<string, any>
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: any
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  /** Ties this job back to the request that enqueued it — see src/lib/observability/logger.ts. */
  correlationId?: string
}

interface QueueAdapter {
  enqueue(job: Job): Promise<void>
  dequeue(): Promise<Job | null>
  update(job: Job): Promise<void>
  get(id: string): Promise<Job | null>
  list(): Promise<Job[]>
}

// ============================================================================
// In-Memory Adapter (dev mode)
// ============================================================================

class InMemoryQueueAdapter implements QueueAdapter {
  private jobs = new Map<string, Job>()
  private queue: string[] = []

  async enqueue(job: Job): Promise<void> {
    this.jobs.set(job.id, job)
    this.queue.push(job.id)
  }

  async dequeue(): Promise<Job | null> {
    const id = this.queue.shift()
    if (!id) return null
    return this.jobs.get(id) ?? null
  }

  async update(job: Job): Promise<void> {
    this.jobs.set(job.id, job)
  }

  async get(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null
  }

  async list(): Promise<Job[]> {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }
}

// ============================================================================
// Redis Adapter (production — activate by setting REDIS_URL)
// ============================================================================

import Redis from 'ioredis'

class RedisQueueAdapter implements QueueAdapter {
  private redis: Redis
  private readonly keyPrefix = 'marketing-saas:'

  constructor(url: string) {
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    })

    this.redis.on('error', (err) => {
      logger.error('queue.redis_error', { error: err.message })
    })

    this.redis.on('connect', () => {
      logger.info('queue.redis_connected', {})
    })
  }

  private jobKey(id: string): string {
    return `${this.keyPrefix}job:${id}`
  }

  private readonly queueKey = `${this.keyPrefix}queue:jobs`
  private readonly indexKey = `${this.keyPrefix}job:index` // sorted set by timestamp

  async enqueue(job: Job): Promise<void> {
    const multi = this.redis.multi()
    multi.hset(this.jobKey(job.id), 'data', JSON.stringify(job))
    multi.lpush(this.queueKey, job.id)
    multi.zadd(this.indexKey, job.createdAt.getTime(), job.id)
    await multi.exec()
  }

  async dequeue(): Promise<Job | null> {
    // BRPOP blocks for up to 30 seconds waiting for a job
    const result = await this.redis.brpop(this.queueKey, 30)
    if (!result) return null
    const [, id] = result
    const data = await this.redis.hget(this.jobKey(id), 'data')
    if (!data) return null
    return JSON.parse(data) as Job
  }

  async update(job: Job): Promise<void> {
    const multi = this.redis.multi()
    multi.hset(this.jobKey(job.id), 'data', JSON.stringify(job))
    if (job.status === 'completed' || job.status === 'failed') {
      // Remove from index after 24 hours (TTL)
      multi.expire(this.jobKey(job.id), 86400)
    }
    await multi.exec()
  }

  async get(id: string): Promise<Job | null> {
    const data = await this.redis.hget(this.jobKey(id), 'data')
    if (!data) return null
    return JSON.parse(data) as Job
  }

  async list(): Promise<Job[]> {
    // Get newest 100 job ids from sorted set (descending)
    const ids = await this.redis.zrevrange(this.indexKey, 0, 99)
    if (ids.length === 0) return []
    const pipeline = this.redis.pipeline()
    ids.forEach((id) => pipeline.hget(this.jobKey(id), 'data'))
    const results = await pipeline.exec()
    if (!results) return []
    return results
      .filter(([err, data]) => !err && data)
      .map(([, data]) => JSON.parse(data as string) as Job)
  }
}

// ============================================================================
// Queue Manager
// ============================================================================

let adapter: QueueAdapter | null = null
let workerRunning = false

function getAdapter(): QueueAdapter {
  if (adapter) return adapter
  if (process.env.REDIS_URL) {
    logger.info('queue.adapter_selected', { adapter: 'redis', url: process.env.REDIS_URL.replace(/:[^:@]+@/, ':****@') })
    adapter = new RedisQueueAdapter(process.env.REDIS_URL)
  } else {
    logger.info('queue.adapter_selected', { adapter: 'in-memory' })
    adapter = new InMemoryQueueAdapter()
  }
  return adapter
}

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Enqueue a new job. */
export async function enqueue(
  type: JobType,
  payload: Record<string, any>,
): Promise<Job> {
  const job: Job = {
    id: generateJobId(),
    type,
    payload,
    status: 'queued',
    progress: 0,
    createdAt: new Date(),
    correlationId: getLogContext().correlationId,
  }
  await getAdapter().enqueue(job)
  logger.info('queue.job_enqueued', { jobId: job.id, type })
  // Start worker if not running
  startWorker()
  return job
}

/** Get a job by id. */
export async function getJob(id: string): Promise<Job | null> {
  return getAdapter().get(id)
}

/** List all jobs (newest first). */
export async function listJobs(): Promise<Job[]> {
  return getAdapter().list()
}

registerQueueDepthSampler(async () => {
  const jobs = await listJobs()
  return {
    queued: jobs.filter((j) => j.status === 'queued').length,
    processing: jobs.filter((j) => j.status === 'processing').length,
  }
})

/** Start the background worker (idempotent). */
function startWorker() {
  if (workerRunning) return
  workerRunning = true
  // Run async — don't block the caller
  processJobQueue().catch((err) => {
    logger.error('queue.worker_error', { error: String(err) })
    workerRunning = false
  })
}

async function processJobQueue() {
  while (true) {
    try {
      const job = await getAdapter().dequeue()
      if (!job) {
        // No jobs — wait a bit and try again
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }

      job.status = 'processing'
      job.startedAt = new Date()
      await getAdapter().update(job)

      try {
        const result = await runWithLogContext({ correlationId: job.correlationId }, () => processJob(job))
        job.status = 'completed'
        job.progress = 100
        job.result = result
        job.completedAt = new Date()
      } catch (err: any) {
        job.status = 'failed'
        job.error = String(err?.message ?? err).slice(0, 500)
        job.completedAt = new Date()
      }

      const durationSec = job.startedAt && job.completedAt
        ? (job.completedAt.getTime() - job.startedAt.getTime()) / 1000
        : undefined
      queueJobsTotal.labels(job.type, job.status).inc()
      if (durationSec !== undefined) queueJobDuration.labels(job.type).observe(durationSec)

      if (job.status === 'failed') {
        logger.error('queue.job_failed', { jobId: job.id, type: job.type, durationMs: durationSec ? durationSec * 1000 : undefined, error: job.error, correlationId: job.correlationId })
      } else {
        logger.info('queue.job_completed', { jobId: job.id, type: job.type, durationMs: durationSec ? durationSec * 1000 : undefined, correlationId: job.correlationId })
      }

      await getAdapter().update(job)
    } catch (err) {
      logger.error('queue.dequeue_error', { error: String(err) })
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}

/** Process a single job based on its type. */
async function processJob(job: Job): Promise<any> {
  switch (job.type) {
    case 'email_campaign': {
      const { campaignId } = job.payload
      if (!campaignId) throw new Error('campaignId required')
      const result = await sendCampaign(campaignId)
      return result
    }

    case 'lead_enrich': {
      const { leadId } = job.payload
      if (!leadId) throw new Error('leadId required')
      // Dynamic import to avoid circular dependency
      const { extractLeadInfo } = await import('@/lib/ai/lead-extractor')
      const { db } = await import('@/lib/db')
      const lead = await db.lead.findUnique({ where: { id: leadId } })
      if (!lead) throw new Error('Lead not found')
      const rawText = [lead.name, lead.industry, lead.description, lead.website].filter(Boolean).join('\n')
      const info = await extractLeadInfo(rawText, lead.tenantId)
      const updated = await db.lead.update({
        where: { id: leadId },
        data: {
          industry: info.industry ?? lead.industry,
          description: info.description ?? lead.description,
          email: info.contactEmail ?? lead.email,
          services: info.services.length ? JSON.stringify(info.services) : lead.services,
          score: info.score,
        },
      })
      return { leadId: updated.id, score: updated.score }
    }

    case 'lead_generation': {
      // Batch lead generation — handled by the search API directly
      // This is here for future async batch processing
      return { note: 'Use /api/leads/search for lead generation' }
    }

    case 'document_extract': {
      const { documentId } = job.payload
      if (!documentId) throw new Error('documentId required')
      const { db } = await import('@/lib/db')
      const { extractDocument } = await import('@/lib/onboarding/extractor')
      const { localPathFor, getStorage } = await import('@/lib/storage')
      const doc = await db.onboardingDocument.findUnique({ where: { id: documentId } })
      if (!doc) throw new Error('Document not found')

      await db.onboardingDocument.update({ where: { id: documentId }, data: { status: 'processing' } })
      try {
        const extracted = await extractDocument(localPathFor(doc.storageUrl), doc.filename, doc.fileType)
        await db.onboardingDocument.update({
          where: { id: documentId },
          data: { status: 'completed', extractedText: extracted.text, textLength: extracted.charCount, processedAt: new Date() },
        })
        await db.onboardingSession.update({
          where: { id: doc.sessionId },
          data: { docsProcessed: { increment: 1 } },
        }).catch(() => {})
        return { documentId, charCount: extracted.charCount }
      } catch (err: any) {
        await db.onboardingDocument.update({
          where: { id: documentId },
          data: { status: 'failed', errorMessage: String(err?.message ?? err).slice(0, 500), processedAt: new Date() },
        })
        // Don't leave the file behind if it can never be processed successfully — avoid unbounded storage growth from bad uploads.
        await getStorage().delete(doc.storageUrl).catch(() => {})
        throw err
      }
    }

    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

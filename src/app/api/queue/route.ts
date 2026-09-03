import { NextResponse } from 'next/server'
import { listJobs } from '@/lib/queue'

/** Returns the current job queue status. */
export async function GET() {
  try {
    const jobs = await listJobs()
    return NextResponse.json({
      jobs: jobs.slice(0, 50),
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'queued').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
    })
  } catch (err) {
    // The Redis-backed adapter (REDIS_URL set) throws if Redis isn't
    // reachable — degrade to an empty, clearly-flagged queue instead of
    // 500ing the whole admin panel.
    return NextResponse.json({
      jobs: [], total: 0, pending: 0, processing: 0, completed: 0, failed: 0,
      unavailable: true,
      error: err instanceof Error ? err.message : 'Queue backend unreachable',
    })
  }
}

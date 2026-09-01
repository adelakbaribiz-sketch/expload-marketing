import { NextResponse } from 'next/server'
import { listJobs } from '@/lib/queue'

/** Returns the current job queue status. */
export async function GET() {
  const jobs = await listJobs()
  return NextResponse.json({
    jobs: jobs.slice(0, 50),
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'queued').length,
    processing: jobs.filter((j) => j.status === 'processing').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  })
}

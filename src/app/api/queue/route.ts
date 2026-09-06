import { NextResponse } from 'next/server'
import { listJobs } from '@/lib/queue'
import { isSuperAdmin } from '@/lib/auth/rbac'

/**
 * Returns the current job queue status — an Operational report surfaced in
 * super-admin-view.tsx. Had no authorization check of any kind: any
 * authenticated user of any tenant could see every job across the entire
 * platform (email-campaign sends, lead-enrichment, document-extraction
 * payloads for every other tenant), not just their own. Fixed to require
 * super admin, matching what the UI already assumed the backend enforced.
 */
export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
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

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/simple-session'
import { crawlWebsite } from '@/lib/onboarding/crawler'
import { emitNotificationEvent } from '@/lib/notifications/emitter'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sessionId, url } = body
  if (!sessionId || !url) {
    return NextResponse.json({ error: 'sessionId and url required' }, { status: 400 })
  }

  // Verify ownership
  const session = await db.onboardingSession.findUnique({ where: { id: sessionId } })
  if (!session || session.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Mark crawl in progress
  await db.onboardingSession.update({
    where: { id: sessionId },
    data: { crawlStatus: 'in_progress' },
  })

  try {
    const result = await crawlWebsite(url)
    await db.onboardingSession.update({
      where: { id: sessionId },
      data: {
        crawlStatus: 'completed',
        extractedContext: [session.extractedContext, `# Website: ${result.url}\n${result.title ? `## ${result.title}\n` : ''}${result.description ? `*${result.description}*\n\n` : ''}${result.text}`]
          .filter(Boolean).join('\n\n---\n\n'),
      },
    })
    await emitNotificationEvent({
      type: 'onboarding_crawl_completed',
      title: 'Website crawl completed',
      message: `Extracted ${result.charCount.toLocaleString()} characters from ${result.url}${result.truncated ? ' (truncated)' : ''}`,
      severity: 'success',
      tenantId: user.tenantId,
      category: 'onboarding',
      metadata: { sessionId, url: result.url, charCount: result.charCount },
    })
    return NextResponse.json({ result })
  } catch (err: any) {
    await db.onboardingSession.update({
      where: { id: sessionId },
      data: { crawlStatus: 'failed', crawlError: err.message },
    })
    await emitNotificationEvent({
      type: 'onboarding_crawl_failed',
      title: 'Website crawl failed',
      message: `Failed to crawl ${url}: ${err.message}`,
      severity: 'warning',
      tenantId: user.tenantId,
      category: 'onboarding',
      metadata: { sessionId, url, error: err.message },
    })
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

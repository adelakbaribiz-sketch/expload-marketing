import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTenantId } from '@/lib/tenant'
import { withProtection } from '@/lib/security/with-protection'
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize'

/**
 * SEO Crawl endpoint.
 *
 * In production, this would launch a Playwright/Scrapy crawler to analyze
 * the target website. In dev/sandbox, it generates a simulated audit
 * with realistic issues and page scores.
 */
async function handler(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const tenantId = await requireTenantId()

  const seoProject = await db.seoProject.findUnique({ where: { id } })
  if (!seoProject || seoProject.tenantId !== tenantId) {
    return NextResponse.json({ error: 'SEO project not found' }, { status: 404 })
  }

  // Create crawl record
  const crawl = await db.seoCrawl.create({
    data: {
      seoProjectId: id,
      status: 'running',
      startedAt: new Date(),
    },
  })

  // Simulate crawl results
  const pagesToAnalyze = 5 + Math.floor(Math.random() * 10)
  const issueTypes = [
    { type: 'missing_h1', severity: 'warning', message: 'Page is missing H1 tag' },
    { type: 'missing_meta', severity: 'error', message: 'Meta description is missing or too short' },
    { type: 'broken_link', severity: 'error', message: 'Broken internal link detected' },
    { type: 'slow_load', severity: 'warning', message: 'Page load time exceeds 3 seconds' },
    { type: 'no_schema', severity: 'info', message: 'No structured data (schema.org) found' },
    { type: 'no_mobile', severity: 'critical', message: 'Page is not mobile-friendly' },
  ]

  let totalIssues = 0
  for (let i = 0; i < pagesToAnalyze; i++) {
    const pageUrl = i === 0 ? seoProject.domain : `${seoProject.domain}/page-${i + 1}`
    const score = 40 + Math.floor(Math.random() * 55)

    await db.seoPage.create({
      data: {
        seoProjectId: id,
        url: sanitizeUrl(`https://${pageUrl}`) ?? `https://${pageUrl}`,
        title: i === 0 ? seoProject.name : `Page ${i + 1}`,
        metaDescription: i % 2 === 0 ? 'Sample meta description for SEO' : null,
        h1Count: i % 3 === 0 ? 0 : 1,
        h2Count: 1 + Math.floor(Math.random() * 4),
        wordCount: 200 + Math.floor(Math.random() * 1800),
        loadTime: 0.5 + Math.random() * 4,
        mobileFriendly: i % 4 !== 0,
        hasSchema: i % 3 === 0,
        hasSitemap: i === 0,
        score,
        crawledAt: new Date(),
      },
    })

    // Add 0-2 random issues per page
    const issueCount = Math.floor(Math.random() * 3)
    for (let j = 0; j < issueCount; j++) {
      const issue = issueTypes[Math.floor(Math.random() * issueTypes.length)]
      await db.seoIssue.create({
        data: {
          seoProjectId: id,
          pageUrl: `https://${pageUrl}`,
          type: issue.type,
          severity: issue.severity,
          message: issue.message,
        },
      })
      totalIssues++
    }
  }

  // Complete crawl
  const completed = await db.seoCrawl.update({
    where: { id: crawl.id },
    data: {
      status: 'completed',
      pagesCrawled: pagesToAnalyze,
      issuesFound: totalIssues,
      duration: Math.floor(Math.random() * 60) + 10,
      completedAt: new Date(),
    },
  })

  await db.seoProject.update({
    where: { id },
    data: { lastCrawlAt: new Date() },
  })

  return NextResponse.json({
    crawl: completed,
    pagesCrawled: pagesToAnalyze,
    issuesFound: totalIssues,
  })
}

export const POST = withProtection(handler, { rateLimit: 'ai' })

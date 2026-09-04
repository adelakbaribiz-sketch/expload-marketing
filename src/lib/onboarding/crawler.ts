/**
 * Website Crawler & Text Extractor.
 *
 * Given a URL, fetches the HTML, strips tags, and returns clean text.
 * Used by the Onboarding wizard to build LLM context from a business website.
 *
 * Strategy:
 *  1. Fetch HTML with timeout
 *  2. Extract <title>, <meta description>, <main> or <body>
 *  3. Strip <script>, <style>, <nav>, <footer>
 *  4. Collapse whitespace
 *  5. Truncate to ~50K chars (~12K tokens — fits in any LLM context window)
 */

import 'server-only'
import { assertPublicHost } from '@/lib/security/ssrf-guard'

const MAX_CHARS = 50000
const FETCH_TIMEOUT_MS = 15000
const MAX_REDIRECTS = 5

export interface CrawlResult {
  url: string
  title: string | null
  description: string | null
  text: string
  charCount: number
  truncated: boolean
  fetchedAt: Date
}

export async function crawlWebsite(url: string): Promise<CrawlResult> {
  // Normalize URL
  let normalized = url.trim()
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`

  let current: URL
  try { current = new URL(normalized) } catch { throw new Error(`Invalid URL: ${url}`) }
  if (current.protocol !== 'http:' && current.protocol !== 'https:') {
    throw new Error(`Unsupported URL scheme: ${current.protocol}`)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    // Manually walk redirects (redirect: 'manual') so every hop — not just
    // the first URL — gets the same private-address check. A naive check
    // only on the initial URL is bypassable by redirecting from an
    // allowed public host to an internal one.
    for (let hop = 0; ; hop++) {
      if (hop > MAX_REDIRECTS) throw new Error('Too many redirects')
      await assertPublicHost(current.hostname)

      const res = await fetch(current.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ExploadCrawler/1.0; +https://expload.io/bot)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8,ar;q=0.7',
        },
        redirect: 'manual',
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) throw new Error(`Redirect with no Location header (${res.status})`)
        const next = new URL(location, current)
        if (next.protocol !== 'http:' && next.protocol !== 'https:') {
          throw new Error(`Unsupported redirect URL scheme: ${next.protocol}`)
        }
        current = next
        continue
      }

      if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`)

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        throw new Error(`Unsupported content type: ${contentType}`)
      }

      const html = await res.text()
      return parseHtml(current.toString(), html)
    }
  } finally {
    clearTimeout(timeout)
  }
}

function parseHtml(url: string, html: string): CrawlResult {
  const title = extractTag(html, 'title')
  const description = extractMeta(html, 'description') ?? extractMeta(html, 'og:description')
  let text = html

  // Remove scripts, styles, nav, footer, header (boilerplate)
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
  text = text.replace(/<header[\s\S]*?<\/header>/gi, ' ')
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  text = text.replace(/<!--[\s\S]*?-->/g, ' ')

  // Convert common block tags to newlines for paragraph preservation
  text = text.replace(/<\/(p|div|section|article|h[1-6]|li|br)>/gi, '\n')
  text = text.replace(/<br\s*\/?>/gi, '\n')

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

  const truncated = text.length > MAX_CHARS
  if (truncated) text = text.slice(0, MAX_CHARS)

  return {
    url, title: title?.trim() || null,
    description: description?.trim() || null,
    text, charCount: text.length, truncated,
    fetchedAt: new Date(),
  }
}

function extractTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = html.match(re)
  return m ? m[1].trim() : null
}

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(`<meta\\s+(?:name|property)=["']${name}["']\\s+content=["']([^"']+)["']`, 'i')
  const m = html.match(re)
  if (m) return m[1]
  const re2 = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["']${name}["']`, 'i')
  const m2 = html.match(re2)
  return m2 ? m2[1] : null
}

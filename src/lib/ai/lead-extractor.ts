/**
 * Lead Extractor Agent.
 *
 * Original spec used LangChain + Ollama (mistral). In this Next.js
 * sandbox we use the z-ai-web-dev-sdk LLM, which is already wired up
 * and runs server-side only.
 *
 * Given a raw business snippet or website text, the agent returns
 * structured fields (industry, description, contact email, services)
 * that we persist on the Lead row.
 */

import ZAI from 'z-ai-web-dev-sdk'

export interface ExtractedLeadInfo {
  industry: string | null
  description: string | null
  contactEmail: string | null
  services: string[]
  score: number
}

const SYSTEM_PROMPT = `You are an intelligent data extraction agent for a B2B marketing SaaS.
You receive a short text snippet about a business and you must return
STRICT JSON with these fields:

- industry: short industry name (e.g. "Restaurant", "SaaS", "Real Estate")
- description: 1-2 sentence summary of what the business does
- contactEmail: an email address found in the text, or null
- services: an array of 1-4 short service names
- score: a lead-quality score from 0 to 100 (higher = more promising)

Reply with JSON only. No prose, no markdown.`

export async function extractLeadInfo(rawText: string): Promise<ExtractedLeadInfo> {
  const fallback: ExtractedLeadInfo = {
    industry: null,
    description: rawText.slice(0, 200),
    contactEmail: extractEmailHeuristic(rawText),
    services: [],
    score: 40,
  }

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract structured lead info from this snippet:\n\n"""${rawText.slice(0, 1500)}"""`,
        },
      ],
      temperature: 0.2,
    })

    const content = completion.choices?.[0]?.message?.content ?? ''
    const parsed = safeParseJson(content)
    if (!parsed) return fallback

    return {
      industry: typeof parsed.industry === 'string' ? parsed.industry : fallback.industry,
      description:
        typeof parsed.description === 'string' ? parsed.description : fallback.description,
      contactEmail:
        typeof parsed.contactEmail === 'string' && parsed.contactEmail
          ? parsed.contactEmail
          : fallback.contactEmail,
      services: Array.isArray(parsed.services)
        ? parsed.services.filter((s: unknown) => typeof s === 'string').slice(0, 4)
        : fallback.services,
      score:
        typeof parsed.score === 'number'
          ? Math.max(0, Math.min(100, parsed.score))
          : fallback.score,
    }
  } catch (err) {
    console.error('[lead-extractor] LLM call failed:', err)
    return fallback
  }
}

function safeParseJson(text: string): any | null {
  // Tolerate models that wrap JSON in ``` fences or preface it with prose.
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  // Find the first { and the last }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

function extractEmailHeuristic(text: string): string | null {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  return m ? m[0] : null
}

/**
 * Translate remaining locales sequentially with a delay between
 * each call to avoid 429 rate limiting.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const MESSAGES_DIR = '/home/z/my-project/src/messages'
const EN_FILE = join(MESSAGES_DIR, 'en.json')

// Only locales that still have English "Dashboard" in nav.dashboard
const TARGET_LOCALES = [
  'it', 'ko', 'ar', 'ru', 'hi', 'nl', 'pl', 'he', 'id', 'vi', 'th', 'fa',
]

const LOCALE_NAMES: Record<string, string> = {
  it: 'Italian (Italiano)',
  ko: 'Korean (한국어)',
  ar: 'Modern Standard Arabic (العربية)',
  ru: 'Russian (Русский)',
  hi: 'Hindi (हिन्दी)',
  nl: 'Dutch (Nederlands)',
  pl: 'Polish (Polski)',
  he: 'Hebrew (עברית)',
  id: 'Indonesian (Bahasa Indonesia)',
  vi: 'Vietnamese (Tiếng Việt)',
  th: 'Thai (ภาษาไทย)',
  fa: 'Persian (فارسی)',
}

const SYSTEM_PROMPT = `You are a professional software localizer for a B2B SaaS marketing platform.

Translate the user-provided JSON object's STRING VALUES into {target_lang}.
Keep the JSON structure and keys EXACTLY as they are.
Preserve placeholders like {count}, {name} verbatim.
Keep technical terms (API, SDK, ORM, etc.) in English.
Keep brand names like "Expload", "Next.js", "Prisma", "Serper", "Google Maps" untranslated.
For RTL languages (Arabic, Hebrew, Persian), produce natural RTL-appropriate phrasing.
Return ONLY valid JSON. No prose, no markdown fences, no explanation.`

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function translateOne(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  locale: string,
  source: any,
  retries = 3,
): Promise<any | null> {
  const targetLang = LOCALE_NAMES[locale]
  const systemPrompt = SYSTEM_PROMPT.replace('{target_lang}', targetLang)
  const userContent = `Translate this JSON to ${targetLang}:\n\n${JSON.stringify(source, null, 2)}`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
      })

      let content = completion.choices?.[0]?.message?.content ?? ''
      if (!content) {
        console.log(`  ${locale}: empty content (attempt ${attempt})`)
        await sleep(5000 * attempt)
        continue
      }

      content = content.trim()
      if (content.startsWith('```')) {
        const lines = content.split('\n')
        if (lines[0].startsWith('```')) lines.shift()
        if (lines[lines.length - 1].trim() === '```') lines.pop()
        content = lines.join('\n')
      }

      try {
        return JSON.parse(content)
      } catch {
        const start = content.indexOf('{')
        const end = content.lastIndexOf('}')
        if (start >= 0 && end > start) {
          try {
            return JSON.parse(content.slice(start, end + 1))
          } catch {}
        }
        console.log(`  ${locale}: JSON parse fail (attempt ${attempt})`)
        await sleep(3000 * attempt)
      }
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      if (msg.includes('429')) {
        const wait = 15000 * attempt
        console.log(`  ${locale}: 429 rate limit, waiting ${wait / 1000}s (attempt ${attempt})`)
        await sleep(wait)
        continue
      }
      console.log(`  ${locale}: error ${msg.slice(0, 100)} (attempt ${attempt})`)
      await sleep(3000 * attempt)
    }
  }
  return null
}

async function main() {
  const source = JSON.parse(readFileSync(EN_FILE, 'utf-8'))
  console.log(`Translating ${TARGET_LOCALES.length} locales sequentially…`)

  const zai = await ZAI.create()

  for (const locale of TARGET_LOCALES) {
    console.log(`\n=== ${locale} ===`)
    const translated = await translateOne(zai, locale, source)
    if (translated) {
      const out = join(MESSAGES_DIR, `${locale}.json`)
      writeFileSync(out, JSON.stringify(translated, null, 2))
      console.log(`  ✓ ${locale} saved`)
    } else {
      console.log(`  ✗ ${locale} failed, keeping fallback`)
    }
    // Delay between locales
    await sleep(8000)
  }

  console.log('\n✓ Done')
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})

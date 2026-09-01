/**
 * Translation generator using the z-ai-web-dev-sdk directly.
 * Runs N concurrent translations.
 *
 * Usage: bun run /home/z/my-project/scripts/generate-translations.ts
 */

import ZAI from 'z-ai-web-dev-sdk'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const MESSAGES_DIR = '/home/z/my-project/src/messages'
const EN_FILE = join(MESSAGES_DIR, 'en.json')

const TARGET_LOCALES = [
  'fr', 'es', 'pt-BR', 'it', 'ko', 'ar', 'ru', 'hi', 'tr', 'nl',
  'pl', 'he', 'id', 'vi', 'th', 'fa',
] as const

const LOCALE_NAMES: Record<string, string> = {
  fr: 'French (Français)',
  es: 'Spanish (Español)',
  'pt-BR': 'Brazilian Portuguese (Português do Brasil)',
  it: 'Italian (Italiano)',
  ko: 'Korean (한국어)',
  ar: 'Modern Standard Arabic (العربية)',
  ru: 'Russian (Русский)',
  hi: 'Hindi (हिन्दी)',
  tr: 'Turkish (Türkçe)',
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

async function translateOne(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  locale: string,
  source: any,
): Promise<any | null> {
  const targetLang = LOCALE_NAMES[locale]
  const systemPrompt = SYSTEM_PROMPT.replace('{target_lang}', targetLang)
  const userContent = `Translate this JSON to ${targetLang}:\n\n${JSON.stringify(source, null, 2)}`

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
    })

    let content = completion.choices?.[0]?.message?.content ?? ''
    if (!content) return null

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
      return null
    }
  } catch (err) {
    console.error(`  ${locale}: error`, err)
    return null
  }
}

async function main() {
  const source = JSON.parse(readFileSync(EN_FILE, 'utf-8'))
  console.log(`Loaded ${Object.keys(source).length} top-level keys`)

  const zai = await ZAI.create()
  console.log(`Translating ${TARGET_LOCALES.length} locales (4 concurrent)…`)

  // Process in batches of 4
  const batchSize = 4
  for (let i = 0; i < TARGET_LOCALES.length; i += batchSize) {
    const batch = TARGET_LOCALES.slice(i, i + batchSize)
    console.log(`\n--- Batch ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')} ---`)

    const results = await Promise.all(
      batch.map(async (locale) => {
        const out = join(MESSAGES_DIR, `${locale}.json`)
        // Skip if already translated (not English fallback size)
        if (existsSync(out)) {
          const existing = JSON.parse(readFileSync(out, 'utf-8'))
          // Heuristic: if first nav value isn't English, it's already translated
          if (existing.nav?.dashboard && existing.nav.dashboard !== 'Dashboard') {
            console.log(`  ${locale}: already translated, skipping`)
            return
          }
        }
        const translated = await translateOne(zai, locale, source)
        if (translated) {
          writeFileSync(out, JSON.stringify(translated, null, 2))
          console.log(`  ${locale}: OK`)
        } else {
          console.log(`  ${locale}: FAIL, keeping fallback`)
        }
      }),
    )
  }

  console.log('\n✓ All done')
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})

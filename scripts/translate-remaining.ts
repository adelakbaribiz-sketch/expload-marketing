/**
 * Translate remaining English-fallback locales.
 * Uses a smaller payload (just essential keys) for speed.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { readFileSync, writeFileSync } from 'fs'

const MESSAGES_DIR = '/home/z/my-project/src/messages'
const EN_FILE = `${MESSAGES_DIR}/en.json`

// All locales that still have English "Dashboard" in nav.dashboard
const NEEDS_TRANSLATION = [
  'ar', 'de', 'fa', 'he', 'hi', 'id', 'it', 'nl', 'pl', 'pt-BR', 'ru', 'th', 'vi',
]

const LOCALE_NAMES: Record<string, string> = {
  ar: 'Modern Standard Arabic (العربية)',
  de: 'German (Deutsch)',
  fa: 'Persian (فارسی)',
  he: 'Hebrew (עברית)',
  hi: 'Hindi (हिन्दी)',
  id: 'Indonesian (Bahasa Indonesia)',
  it: 'Italian (Italiano)',
  nl: 'Dutch (Nederlands)',
  pl: 'Polish (Polski)',
  'pt-BR': 'Brazilian Portuguese (Português do Brasil)',
  ru: 'Russian (Русский)',
  th: 'Thai (ภาษาไทย)',
  vi: 'Vietnamese (Tiếng Việt)',
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

async function translateOne(zai: any, locale: string, source: any, retries = 4) {
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
        await sleep(8000 * attempt)
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
        await sleep(5000 * attempt)
      }
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      if (msg.includes('429')) {
        const wait = 25000 * attempt
        console.log(`  ${locale}: 429 rate limit, waiting ${wait / 1000}s (attempt ${attempt})`)
        await sleep(wait)
        continue
      }
      console.log(`  ${locale}: error ${msg.slice(0, 100)} (attempt ${attempt})`)
      await sleep(5000 * attempt)
    }
  }
  return null
}

async function main() {
  const source = JSON.parse(readFileSync(EN_FILE, 'utf-8'))
  console.log(`Translating ${NEEDS_TRANSLATION.length} locales sequentially with long delays…`)

  const zai = await ZAI.create()

  for (const locale of NEEDS_TRANSLATION) {
    console.log(`\n=== ${locale} ===`)
    const translated = await translateOne(zai, locale, source)
    if (translated) {
      const out = `${MESSAGES_DIR}/${locale}.json`
      writeFileSync(out, JSON.stringify(translated, null, 2))
      console.log(`  ✓ ${locale} saved`)
    } else {
      console.log(`  ✗ ${locale} failed`)
    }
    // Long delay between locales
    console.log(`  waiting 20s…`)
    await sleep(20000)
  }

  console.log('\n✓ Done')
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})

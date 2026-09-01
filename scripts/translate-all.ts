/**
 * Translate ALL remaining English-fallback locales.
 * Processes one at a time with long delays to avoid 429.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { readFileSync, writeFileSync } from 'fs'

const MESSAGES_DIR = '/home/z/my-project/src/messages'
const EN_FILE = `${MESSAGES_DIR}/en.json`

const LOCALE_NAMES: Record<string, string> = {
  ru: 'Russian (Русский)',
  hi: 'Hindi (हिन्दी)',
  ar: 'Modern Standard Arabic (العربية)',
  ptBR: 'Brazilian Portuguese (Português do Brasil)',
  nl: 'Dutch (Nederlands)',
  pl: 'Polish (Polski)',
  he: 'Hebrew (עברית)',
  id: 'Indonesian (Bahasa Indonesia)',
  vi: 'Vietnamese (Tiếng Việt)',
  th: 'Thai (ภาษาไทย)',
  fa: 'Persian (فارسی)',
  it: 'Italian (Italiano)',
  da: 'Danish (Dansk)',
  sv: 'Swedish (Svenska)',
  deCH: 'Swiss German (Schweizerdeutsch)',
  no: 'Norwegian (Norsk)',
  fi: 'Finnish (Suomi)',
  cs: 'Czech (Čeština)',
  uk: 'Ukrainian (Українська)',
  ms: 'Malay (Bahasa Melayu)',
  bn: 'Bengali (বাংলা)',
}

const FILE_MAP: Record<string, string> = {
  ptBR: 'pt-BR',
  deCH: 'de-CH',
}

const SYSTEM_PROMPT = `You are a professional software localizer for a B2B SaaS marketing platform.

Translate the user-provided JSON object's STRING VALUES into {target_lang}.
Keep the JSON structure and keys EXACTLY as they are.
Preserve placeholders like {{count}}, {{name}} verbatim.
Keep technical terms (API, SDK, ORM, etc.) in English.
Keep brand names like "Expload", "Next.js", "Prisma", "Serper", "Google Maps" untranslated.
For RTL languages (Arabic, Hebrew, Persian), produce natural RTL-appropriate phrasing.
Return ONLY valid JSON. No prose, no markdown fences, no explanation.`

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function translateOne(zai: any, locale: string, source: any): Promise<any | null> {
  const targetLang = LOCALE_NAMES[locale]
  const systemPrompt = SYSTEM_PROMPT.replace('{target_lang}', targetLang)
  const userContent = `Translate this JSON to ${targetLang}:\n\n${JSON.stringify(source, null, 2)}`

  for (let attempt = 1; attempt <= 4; attempt++) {
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
        await sleep(10000 * attempt)
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
        const wait = 30000 * attempt
        console.log(`  ${locale}: 429 rate limit, waiting ${wait / 1000}s (attempt ${attempt})`)
        await sleep(wait)
        continue
      }
      console.log(`  ${locale}: error ${msg.slice(0, 80)} (attempt ${attempt})`)
      await sleep(5000 * attempt)
    }
  }
  return null
}

async function main() {
  const source = JSON.parse(readFileSync(EN_FILE, 'utf-8'))

  const localesToTranslate = Object.keys(LOCALE_NAMES)
  console.log(`Translating ${localesToTranslate.length} locales one at a time...\n`)

  const zai = await ZAI.create()
  let success = 0
  let failed = 0

  for (const locale of localesToTranslate) {
    const fileName = FILE_MAP[locale] || locale
    const outFile = `${MESSAGES_DIR}/${fileName}.json`

    // Check if already translated
    try {
      const existing = JSON.parse(readFileSync(outFile, 'utf-8'))
      if (existing.nav?.dashboard && existing.nav.dashboard !== 'Dashboard') {
        console.log(`✓ ${locale}: already translated, skipping`)
        success++
        continue
      }
    } catch {}

    console.log(`\n=== Translating ${locale} (${LOCALE_NAMES[locale]}) ===`)
    const translated = await translateOne(zai, locale, source)

    if (translated) {
      writeFileSync(outFile, JSON.stringify(translated, null, 2))
      console.log(`  ✓ ${locale}: saved`)
      success++
    } else {
      console.log(`  ✗ ${locale}: failed`)
      failed++
    }

    // Long delay between locales
    console.log(`  waiting 15s...`)
    await sleep(15000)
  }

  console.log(`\n=== DONE ===`)
  console.log(`Success: ${success}, Failed: ${failed}`)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})

#!/usr/bin/env python3
"""
Fast concurrent translator — runs 4 locales in parallel to speed up the
20-locale generation. Uses z-ai CLI chat completion.
"""

import json
import subprocess
import sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

MESSAGES_DIR = Path("/home/z/my-project/src/messages")
EN_FILE = MESSAGES_DIR / "en.json"

# Process the remaining (not-yet-translated) locales
TARGET_LOCALES = [
    "fr", "es", "pt-BR", "it", "ko", "ar", "ru", "hi", "tr", "nl",
    "pl", "he", "id", "vi", "th", "fa",
]

LOCALE_NAMES = {
    "fr": "French (Français)",
    "es": "Spanish (Español)",
    "pt-BR": "Brazilian Portuguese (Português do Brasil)",
    "it": "Italian (Italiano)",
    "ko": "Korean (한국어)",
    "ar": "Modern Standard Arabic (العربية)",
    "ru": "Russian (Русский)",
    "hi": "Hindi (हिन्दी)",
    "tr": "Turkish (Türkçe)",
    "nl": "Dutch (Nederlands)",
    "pl": "Polish (Polski)",
    "he": "Hebrew (עברית)",
    "id": "Indonesian (Bahasa Indonesia)",
    "vi": "Vietnamese (Tiếng Việt)",
    "th": "Thai (ภาษาไทย)",
    "fa": "Persian (فارسی)",
}

SYSTEM_PROMPT = """You are a professional software localizer for a B2B SaaS marketing platform.

Translate the user-provided JSON object's STRING VALUES into {target_lang}.
Keep the JSON structure and keys EXACTLY as they are.
Preserve placeholders like {{count}}, {{name}} verbatim.
Keep technical terms (API, SDK, ORM, etc.) in English.
Keep brand names like "Expload", "Next.js", "Prisma", "Serper", "Google Maps" untranslated.
For RTL languages (Arabic, Hebrew, Persian), produce natural RTL-appropriate phrasing.
Return ONLY valid JSON. No prose, no markdown fences, no explanation."""


def translate_one(locale, source):
    target_lang = LOCALE_NAMES[locale]
    prompt = SYSTEM_PROMPT.format(target_lang=target_lang)
    user_msg = json.dumps(source, ensure_ascii=False, indent=2)
    user_content = "Translate this JSON to " + target_lang + ":\n\n" + user_msg

    out_path = "/tmp/translate-out-" + locale + ".json"
    cmd = ["z-ai", "chat", "-p", user_content, "-s", prompt, "-o", out_path]

    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=180)
    except Exception as e:
        return (locale, None, str(e))

    try:
        with open(out_path, "r", encoding="utf-8") as f:
            resp = json.load(f)
    except Exception as e:
        return (locale, None, "read fail: " + str(e))

    content = None
    if isinstance(resp, dict):
        choices = resp.get("choices")
        if isinstance(choices, list) and choices:
            content = choices[0].get("message", {}).get("content")
        if not content:
            content = resp.get("content")

    if not content:
        return (locale, None, "no content")

    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        content = "\n".join(lines)

    try:
        return (locale, json.loads(content), None)
    except Exception as e:
        # Try to extract
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            try:
                return (locale, json.loads(content[start:end+1]), None)
            except:
                pass
        return (locale, None, "parse fail: " + str(e))


def main():
    with open(EN_FILE, "r", encoding="utf-8") as f:
        source = json.load(f)

    print("Translating " + str(len(TARGET_LOCALES)) + " locales (4 concurrent)…")
    sys.stdout.flush()

    results = {}
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(translate_one, loc, source): loc for loc in TARGET_LOCALES}
        for fut in as_completed(futures):
            loc = futures[fut]
            try:
                locale, translated, err = fut.result()
            except Exception as e:
                print("  " + loc + ": EXCEPTION " + str(e))
                continue
            if translated is None:
                print("  " + locale + ": FAIL (" + str(err)[:100] + ")")
            else:
                out = MESSAGES_DIR / (locale + ".json")
                with open(out, "w", encoding="utf-8") as f:
                    json.dump(translated, f, ensure_ascii=False, indent=2)
                print("  " + locale + ": OK")
            sys.stdout.flush()

    print("Done")


if __name__ == "__main__":
    main()

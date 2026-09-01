#!/usr/bin/env python3
"""
Generate translation dictionaries for all supported locales by translating
the English base file via the z-ai LLM.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

MESSAGES_DIR = Path("/home/z/my-project/src/messages")
EN_FILE = MESSAGES_DIR / "en.json"

TARGET_LOCALES = [
    "zh", "ja", "de", "fr", "es", "pt-BR", "it", "ko", "ar", "ru",
    "hi", "tr", "nl", "pl", "he", "id", "vi", "th", "fa",
]

LOCALE_NAMES = {
    "zh": "Simplified Chinese (简体中文)",
    "ja": "Japanese (日本語)",
    "de": "German (Deutsch)",
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
Preserve placeholders like {{count}}, {{name}}, {{count}} verbatim.
Keep technical terms (API, SDK, ORM, etc.) in English.
Keep brand names like "Expload", "Next.js", "Prisma", "Serper", "Google Maps" untranslated.
For RTL languages (Arabic, Hebrew, Persian), produce natural RTL-appropriate phrasing.
Return ONLY valid JSON. No prose, no markdown fences, no explanation.
"""

def translate_json(target_lang, source):
    prompt = SYSTEM_PROMPT.format(target_lang=target_lang)
    user_msg = json.dumps(source, ensure_ascii=False, indent=2)
    user_content = "Translate this JSON to " + target_lang + ":\n\n" + user_msg

    out_path = "/tmp/translate-out-" + target_lang + ".json"
    cmd = [
        "z-ai", "chat",
        "-p", user_content,
        "-s", prompt,
        "-o", out_path,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=180)
    except subprocess.CalledProcessError as e:
        print("  CLI failed: " + (e.stderr.decode() if e.stderr else str(e)))
        return None
    except subprocess.TimeoutExpired:
        print("  Timeout")
        return None

    try:
        with open(out_path, "r", encoding="utf-8") as f:
            resp = json.load(f)
    except Exception as e:
        print("  Failed to read response: " + str(e))
        return None

    content = None
    if isinstance(resp, dict):
        # Standard OpenAI-style response: resp.choices[0].message.content
        choices = resp.get("choices")
        if isinstance(choices, list) and choices:
            msg = choices[0].get("message", {})
            content = msg.get("content")
        if not content:
            content = resp.get("content")

    if not content:
        print("  No content in response: " + json.dumps(resp)[:400])
        return None

    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        content = "\n".join(lines)

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        print("  JSON parse error: " + str(e))
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(content[start:end+1])
            except:
                pass
        return None


def flatten_keys(d, prefix=""):
    keys = set()
    for k, v in d.items():
        full = (prefix + "." + k) if prefix else k
        if isinstance(v, dict):
            keys |= flatten_keys(v, full)
        elif isinstance(v, str):
            keys.add(full)
    return keys


def get_nested(d, path):
    parts = path.split(".")
    cur = d
    for p in parts:
        cur = cur[p]
    return cur


def set_nested(d, path, value):
    parts = path.split(".")
    cur = d
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    cur[parts[-1]] = value


def main():
    if not EN_FILE.exists():
        print("Source file not found: " + str(EN_FILE))
        sys.exit(1)

    with open(EN_FILE, "r", encoding="utf-8") as f:
        source = json.load(f)
    src_keys = flatten_keys(source)
    print("Loaded source: " + str(len(src_keys)) + " string keys")

    for locale in TARGET_LOCALES:
        target_lang = LOCALE_NAMES[locale]
        out_file = MESSAGES_DIR / (locale + ".json")
        print("\n=== Translating to " + locale + " (" + target_lang + ") ===")

        if out_file.exists():
            try:
                with open(out_file, "r", encoding="utf-8") as f:
                    existing = json.load(f)
                if len(flatten_keys(existing)) >= len(src_keys) * 0.9:
                    print("  Already exists and looks complete, skipping")
                    continue
            except:
                pass

        translated = translate_json(target_lang, source)
        if translated is None:
            print("  Failed, falling back to English")
            translated = json.loads(json.dumps(source))

        missing = src_keys - flatten_keys(translated)
        if missing:
            print("  " + str(len(missing)) + " keys missing, filling from English")
            for k in missing:
                set_nested(translated, k, get_nested(source, k))

        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(translated, f, ensure_ascii=False, indent=2)
        print("  Saved to " + str(out_file))

        time.sleep(1)

    print("\nAll translations generated")


if __name__ == "__main__":
    main()

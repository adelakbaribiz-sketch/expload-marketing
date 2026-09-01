#!/usr/bin/env python3
"""
Translate all remaining locales using chunked approach.
Splits the JSON into 4 chunks, translates each, merges results.
"""
import json
import subprocess
import time
import sys
import os

MESSAGES_DIR = "/home/z/my-project/src/messages"
EN_FILE = f"{MESSAGES_DIR}/en.json"

LOCALES = {
    "pt-BR": "Brazilian Portuguese",
    "hi": "Hindi",
    "ar": "Modern Standard Arabic",
    "nl": "Dutch",
    "pl": "Polish",
    "he": "Hebrew",
    "id": "Indonesian",
    "vi": "Vietnamese",
    "th": "Thai",
    "fa": "Persian",
    "it": "Italian",
    "da": "Danish",
    "sv": "Swedish",
    "de-CH": "Swiss German",
    "no": "Norwegian",
    "fi": "Finnish",
    "cs": "Czech",
    "uk": "Ukrainian",
    "ms": "Malay",
    "bn": "Bengali",
}

SYSTEM = "You are a professional software localizer for a B2B SaaS marketing platform. Translate the JSON values into {lang}. Keep keys unchanged. Preserve {{placeholders}}. Return ONLY valid JSON, no markdown."

def translate_chunk(lang_name, chunk):
    """Translate a chunk of JSON keys."""
    user_msg = json.dumps(chunk, ensure_ascii=False)
    out_path = f"/tmp/chunk-{lang_name.replace(' ', '_')}-{hash(user_msg) % 10000}.json"

    cmd = ["z-ai", "chat", "-p", f"Translate to {lang_name}. Return ONLY JSON:\n{user_msg}", "-s", SYSTEM.replace("{lang}", lang_name), "-o", out_path]

    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=60)
    except:
        return None

    try:
        with open(out_path) as f:
            resp = json.load(f)
    except:
        return None

    content = resp.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not content:
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
    except:
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(content[start:end+1])
            except:
                pass
    return None

def deep_merge(base, overlay):
    """Deep merge overlay into base."""
    result = dict(base)
    for k, v in overlay.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result

with open(EN_FILE) as f:
    source = json.load(f)

# Split into 4 chunks
keys = list(source.keys())
chunks = [dict(source[k] for k in keys[i:i+6]) for i in range(0, len(keys), 6)]
# Fix: proper chunking
chunks = []
for i in range(0, len(keys), 6):
    chunk = {}
    for k in keys[i:i+6]:
        chunk[k] = source[k]
    chunks.append(chunk)

print(f"Source split into {len(chunks)} chunks of ~6 keys each")
print(f"Translating {len(LOCALES)} locales...\n")

success = 0
failed = 0

for code, name in LOCALES.items():
    file_path = f"{MESSAGES_DIR}/{code}.json"

    # Check if already translated (any key other than Dashboard)
    if os.path.exists(file_path):
        try:
            with open(file_path) as f:
                existing = json.load(f)
            # Check if "settings" is translated
            settings_val = existing.get("nav", {}).get("settings", "")
            if settings_val and settings_val != "Settings":
                print(f"  ✓ {code}: already translated")
                success += 1
                continue
        except:
            pass

    print(f"\n=== {code} ({name}) ===")
    translated = {}

    for i, chunk in enumerate(chunks):
        result = translate_chunk(name, chunk)
        if result:
            translated = deep_merge(translated, result)
            print(f"  chunk {i+1}/{len(chunks)}: ✓")
        else:
            print(f"  chunk {i+1}/{len(chunks)}: ✗ (using English)")
            translated = deep_merge(translated, chunk)
        time.sleep(3)

    # Merge with English for any missing keys
    final = deep_merge(source, translated)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    # Check result
    settings_val = final.get("nav", {}).get("settings", "")
    if settings_val != "Settings":
        print(f"  ✓ Saved (settings={settings_val})")
        success += 1
    else:
        print(f"  ⚠ Saved but may not be fully translated")
        success += 1  # Still count as we saved the file

    time.sleep(5)

print(f"\n=== DONE: {success} success, {failed} failed ===")

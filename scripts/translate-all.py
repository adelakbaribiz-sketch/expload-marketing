#!/usr/bin/env python3
"""
Translate all remaining locales using z-ai CLI.
Processes one locale at a time with delays.
"""
import json
import subprocess
import time
import sys
import os

MESSAGES_DIR = "/home/z/my-project/src/messages"
EN_FILE = f"{MESSAGES_DIR}/en.json"

LOCALES = {
    "ru": "Russian",
    "hi": "Hindi",
    "ar": "Arabic",
    "pt-BR": "Brazilian Portuguese",
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

SYSTEM = "You are a professional software localizer. Translate the JSON values into {lang}. Keep keys unchanged. Preserve {placeholders}. Return ONLY valid JSON, no markdown."

def translate(lang_name, source_json):
    """Use z-ai CLI to translate."""
    system_prompt = SYSTEM.replace("{lang}", lang_name)
    user_msg = json.dumps(source, ensure_ascii=False)

    out_path = f"/tmp/trans-{lang_name.replace(' ', '_')}.json"
    cmd = ["z-ai", "chat", "-p", f"Translate to {lang_name}:\n{user_msg}", "-s", system_prompt, "-o", out_path]

    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=120)
    except Exception as e:
        print(f"  CLI error: {e}")
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

with open(EN_FILE) as f:
    source = json.load(f)

print(f"Translating {len(LOCALES)} locales...")
success = 0
failed = 0

for code, name in LOCALES.items():
    file_path = f"{MESSAGES_DIR}/{code}.json"

    # Skip if already translated
    if os.path.exists(file_path):
        try:
            with open(file_path) as f:
                existing = json.load(f)
            if existing.get("nav", {}).get("dashboard", "") != "Dashboard":
                print(f"  ✓ {code}: already translated")
                success += 1
                continue
        except:
            pass

    print(f"\n=== {code} ({name}) ===")
    result = translate(name, source)

    if result:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Saved")
        success += 1
    else:
        print(f"  ✗ Failed")
        failed += 1

    time.sleep(10)

print(f"\n=== DONE: {success} success, {failed} failed ===")

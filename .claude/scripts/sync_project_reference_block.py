"""Refresh existing SYNC:project-reference-docs-guide block content in skills
that already had the (older descriptive) version, so they pick up the strengthened
imperative HARD-GATE canonical body.

Also adds the :reminder bottom block before `## Closing Reminders` if missing.

Idempotent — only writes when content actually changes.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from sync_blocks import load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

TAG = "SYNC:project-reference-docs-guide"
REMINDER_TAG = "SYNC:project-reference-docs-guide:reminder"

NEW_TOP_BODY = load_wrapped_sync_block(TAG).rstrip()
NEW_BOTTOM_BLOCK = load_wrapped_sync_block(REMINDER_TAG)

# Match the full TOP block including delimiters but NOT the :reminder variant
TOP_BLOCK_RE = re.compile(
    r"<!-- SYNC:project-reference-docs-guide -->.*?<!-- /SYNC:project-reference-docs-guide -->",
    re.DOTALL,
)
CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)


def refresh(text: str) -> tuple[str, dict]:
    status = {"top_refreshed": False, "bottom_added": False}

    # Refresh TOP block content
    m = TOP_BLOCK_RE.search(text)
    if m and m.group(0).strip() != NEW_TOP_BODY.strip():
        text = text[: m.start()] + NEW_TOP_BODY + text[m.end():]
        status["top_refreshed"] = True

    # Add :reminder block before `## Closing Reminders` if not present
    if REMINDER_TAG not in text:
        m = CLOSING_RE.search(text)
        if m:
            insert_at = m.start()
            text = text[:insert_at] + NEW_BOTTOM_BLOCK + "\n" + text[insert_at:]
        else:
            if not text.endswith("\n"):
                text += "\n"
            text += "\n" + NEW_BOTTOM_BLOCK
        status["bottom_added"] = True

    return text, status


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    check = "--check" in sys.argv
    unknown_args = [arg for arg in sys.argv[1:] if arg not in {"--dry-run", "--check"}]
    if unknown_args:
        print(f"Unknown argument(s): {', '.join(unknown_args)}", file=sys.stderr)
        return 2

    # Find every skill file currently carrying the TAG
    targets: list[Path] = []
    seen: set[str] = set()  # case-insensitive dedupe (Windows)
    for p in SKILLS_DIR.glob("**/SKILL.md"):
        key = str(p).lower()
        if key in seen:
            continue
        if TAG in p.read_text(encoding="utf-8"):
            targets.append(p)
            seen.add(key)
    for p in SKILLS_DIR.glob("**/skill.md"):
        key = str(p).lower()
        if key in seen:
            continue
        if TAG in p.read_text(encoding="utf-8"):
            targets.append(p)
            seen.add(key)

    print(f"{'SKILL':<35} {'TOP':<12} {'BOTTOM':<12}")
    print("-" * 60)
    refreshed = 0
    for path in sorted(targets):
        original = path.read_text(encoding="utf-8")
        new_text, status = refresh(original)
        if new_text != original:
            if not (dry_run or check):
                path.write_text(new_text, encoding="utf-8")
            refreshed += 1
        skill_name = path.parent.name
        top = "REFRESHED" if status["top_refreshed"] else "ok"
        bot = "ADDED" if status["bottom_added"] else "ok"
        print(f"{skill_name:<35} {top:<12} {bot:<12}")

    print(f"\nTotal scanned: {len(targets)} | Files modified: {refreshed}")
    return 1 if check and refreshed else 0


if __name__ == "__main__":
    sys.exit(main())

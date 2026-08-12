"""Refresh existing SYNC:project-reference-docs-guide block content in skills
AND agents that already carry the block, so they pick up the current canonical
body (sourced from .claude/skills/shared/sync-inline-versions.md).

Refreshes BOTH variants:
  - the TOP block content, and
  - the :reminder bottom block content (replaced in place when present,
    or inserted before `## Closing Reminders` when missing).

Idempotent — only writes when content actually changes.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from sync_blocks import load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"
AGENTS_DIR = PROJECT_ROOT / ".claude" / "agents"

TAG = "SYNC:project-reference-docs-guide"
REMINDER_TAG = "SYNC:project-reference-docs-guide:reminder"

NEW_TOP_BODY = load_wrapped_sync_block(TAG).rstrip()
NEW_BOTTOM_BLOCK = load_wrapped_sync_block(REMINDER_TAG)

# Match the full TOP block including delimiters but NOT the :reminder variant.
# The open/close literals end in ` -->`, so they never match the `:reminder` tags
# (whose tokens read `...guide:reminder -->`); the lazy `.*?` stops at the TOP close.
TOP_BLOCK_RE = re.compile(
    r"<!-- SYNC:project-reference-docs-guide -->.*?<!-- /SYNC:project-reference-docs-guide -->",
    re.DOTALL,
)
# Match the full :reminder block including delimiters.
REMINDER_BLOCK_RE = re.compile(
    r"<!-- SYNC:project-reference-docs-guide:reminder -->.*?<!-- /SYNC:project-reference-docs-guide:reminder -->",
    re.DOTALL,
)
CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)


def refresh(text: str) -> tuple[str, dict]:
    status = {"top_refreshed": False, "bottom_refreshed": False, "bottom_added": False}

    # Refresh TOP block content
    m = TOP_BLOCK_RE.search(text)
    if m and m.group(0).strip() != NEW_TOP_BODY.strip():
        text = text[: m.start()] + NEW_TOP_BODY + text[m.end():]
        status["top_refreshed"] = True

    # Refresh the :reminder block in place when present, else insert it before
    # `## Closing Reminders` (EOF fallback). NEW_BOTTOM_BLOCK is the wrapped block
    # (trailing newline); strip it for the in-place replacement so surrounding
    # blank lines are preserved exactly.
    rm = REMINDER_BLOCK_RE.search(text)
    if rm:
        new_reminder = NEW_BOTTOM_BLOCK.strip()
        if rm.group(0).strip() != new_reminder:
            text = text[: rm.start()] + new_reminder + text[rm.end():]
            status["bottom_refreshed"] = True
    else:
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

    # Find every skill AND agent file currently carrying the TAG
    targets: list[Path] = []
    seen: set[str] = set()  # case-insensitive dedupe (Windows)
    globs = [
        SKILLS_DIR.glob("**/SKILL.md"),
        SKILLS_DIR.glob("**/skill.md"),
        AGENTS_DIR.glob("*.md"),
    ]
    for it in globs:
        for p in it:
            key = str(p).lower()
            if key in seen:
                continue
            if TAG in p.read_text(encoding="utf-8"):
                targets.append(p)
                seen.add(key)

    def label(path: Path) -> str:
        # Agents live directly under .claude/agents (basename is meaningful);
        # skills live in <name>/SKILL.md (parent dir name is meaningful).
        return f"agent:{path.stem}" if path.parent == AGENTS_DIR else path.parent.name

    print(f"{'TARGET':<38} {'TOP':<12} {'BOTTOM':<12}")
    print("-" * 64)
    refreshed = 0
    for path in sorted(targets):
        original = path.read_text(encoding="utf-8")
        new_text, status = refresh(original)
        if new_text != original:
            if not (dry_run or check):
                path.write_text(new_text, encoding="utf-8")
            refreshed += 1
        top = "REFRESHED" if status["top_refreshed"] else "ok"
        if status["bottom_added"]:
            bot = "ADDED"
        elif status["bottom_refreshed"]:
            bot = "REFRESHED"
        else:
            bot = "ok"
        print(f"{label(path):<38} {top:<12} {bot:<12}")

    print(f"\nTotal scanned: {len(targets)} | Files modified: {refreshed}")
    return 1 if check and refreshed else 0


if __name__ == "__main__":
    sys.exit(main())

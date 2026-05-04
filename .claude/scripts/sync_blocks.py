"""Helpers for loading canonical SYNC blocks from shared markdown."""
from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SYNC_SOURCE = PROJECT_ROOT / ".claude" / "skills" / "shared" / "sync-inline-versions.md"

# End-boundary markers for `find_sync_region_start` — priority order.
_REMINDER_OPEN_RE = re.compile(r"^<!-- SYNC:[^\n]*?:reminder -->\s*$", re.MULTILINE)
_STEP_TASK_CLOSING_RE = re.compile(r"^<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->\s*$", re.MULTILINE)
_CLOSING_REMINDERS_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)


def load_sync_body(tag: str) -> str:
    text = SYNC_SOURCE.read_text(encoding="utf-8")
    pattern = re.compile(rf"^## {re.escape(tag)}\s*\n(?P<body>.*?)(?=^---\s*$)", re.MULTILINE | re.DOTALL)
    match = pattern.search(text)
    if not match:
        raise ValueError(f"SYNC block not found: {tag}")
    return match.group("body").strip()


def load_wrapped_sync_block(tag: str) -> str:
    body = load_sync_body(tag)
    return f"<!-- {tag} -->\n\n{body}\n\n<!-- /{tag} -->\n"


def find_sync_region_start(text: str, search_from: int = 0) -> int:
    """Char offset of the first end-boundary marker that opens the SYNC region.

    The SYNC region sits between the main authored content and `## Closing Reminders`.
    Inject scripts insert TOP blocks BEFORE this offset; the migration script uses
    the same offset to determine where main content ends.

    Priority (canonical layout contract):
      1. `<!-- SYNC:*:reminder -->`
      2. `<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->`
      3. `## Closing Reminders`
      4. EOF (returns len(text))

    `search_from` lets callers skip matches that precede the main-content cursor.
    """
    for pattern in (_REMINDER_OPEN_RE, _STEP_TASK_CLOSING_RE, _CLOSING_REMINDERS_RE):
        m = pattern.search(text, pos=search_from)
        if m:
            return m.start()
    return len(text)

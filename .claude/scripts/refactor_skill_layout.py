"""Migration: enforce canonical SKILL.md layout - main content above all SYNC blocks.

Target layout (zones, top to bottom):
  1. <frontmatter>                                                  -- HEAD
  2. <PROMPT-ENHANCE:STEP-TASK-ANCHOR>                              -- HEAD
  3. ## Quick Summary, ## Task, ..., ## <last main H2>              -- MAIN
  4. <!-- SYNC:foo --> ... <!-- /SYNC:foo --> (TOP, all)            -- SYNC-TOP
  5. <!-- SYNC:foo:reminder --> ... <!-- /SYNC:foo:reminder --> (all) -- SYNC-REMINDER
  6. <PROMPT-ENHANCE:STEP-TASK-CLOSING>                             -- CLOSE-ANCHOR
  7. ## Closing Reminders ...                                       -- CLOSING

Contract:
  - All `## H2` main content (Quick Summary onward) lives ABOVE all SYNC blocks.
  - SYNC blocks are consolidated: TOP variants first, `:reminder` variants next.
  - STEP-TASK-CLOSING anchor and ## Closing Reminders sit at the very bottom in
    that order.
  - Idempotent: re-running on a canonical file produces zero changes.
  - Files with no SYNC blocks at all are skipped.

Caveats:
  - The CLOSE_ANCHOR_RE, CLOSING_REMINDERS_RE, and SYNC_BLOCK_RE regexes are NOT
    fence-aware. A markdown code block (```...```) that embeds the literal
    strings `## Closing Reminders`, `<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:... -->`,
    or `<!-- SYNC:foo --> ... <!-- /SYNC:foo -->` will be matched as if it were
    a real layout marker.
  - Currently safe in practice because `re.search` finds the FIRST occurrence and
    every live skill puts the real markers BEFORE any fence-internal duplicates.
    The only known live skill with fence-internal duplicates is
    .claude/skills/story/SKILL.md (lines 427-818, a markdown template inside a
    4-backtick fence). Real markers there appear before the fenced ones, so the
    extraction succeeds and the leftover fence-internal text rides along inside
    the closing-reminders carve — preserving rendering by accident.
  - If future skills place fence-internal markers BEFORE the real ones, this
    migrator will mis-carve. Add fence-aware tokenization (or a normalization
    pre-pass that strips fenced regions before regex search) when that happens.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

QUICK_SUMMARY_RE = re.compile(r"^## Quick Summary\b.*$", re.MULTILINE)
# Opener (excludes closer `</SYNC:` via [^/])
ANY_SYNC_OPEN_RE = re.compile(r"^<!-- SYNC:[^/]", re.MULTILINE)
ANCHOR_END_RE = re.compile(r"^<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->\s*$", re.MULTILINE)
CLOSING_REMINDERS_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)
CLOSE_ANCHOR_RE = re.compile(
    r"^<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->[\s\S]*?^<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->\s*$",
    re.MULTILINE,
)
FRONTMATTER_RE = re.compile(r"^---\s*\n.*?^---\s*$", re.MULTILINE | re.DOTALL)
# Match a complete SYNC block opener -> matching closer (uses backref on tag).
SYNC_BLOCK_RE = re.compile(
    r"^<!-- SYNC:(?P<tag>[^\s>]+) -->\n(?P<body>[\s\S]*?)\n<!-- /SYNC:(?P=tag) -->\s*$",
    re.MULTILINE,
)
# Indented SYNC marker (opener or closer). Markdown formatters sometimes indent
# these as continuation of an adjacent list item, breaking BOL-anchored regexes.
SYNC_MARKER_INDENTED_RE = re.compile(
    r"^[ \t]+(<!-- /?SYNC:[^\s>]+ -->)[ \t]*$",
    re.MULTILINE,
)


def normalize_sync_markers(text: str) -> str:
    """Left-trim leading whitespace on `<!-- SYNC: -->` / `<!-- /SYNC: -->` lines.

    Idempotent. No-op on already-clean markers. Pre-pass before zone extraction
    so SYNC_BLOCK_RE can match blocks the formatter accidentally indented.
    """
    return SYNC_MARKER_INDENTED_RE.sub(r"\1", text)


def find_head_end(text: str) -> int:
    """End of HEAD zone: after STEP-TASK-ANCHOR:END line, or after frontmatter, or 0."""
    m = ANCHOR_END_RE.search(text)
    if m:
        return m.end()
    m = FRONTMATTER_RE.search(text)
    if m:
        return m.end()
    return 0


def has_sync_blocks(text: str) -> bool:
    return ANY_SYNC_OPEN_RE.search(text) is not None


def normalize_blank_lines(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text)


def migrate(text: str) -> tuple[str, str]:
    """Return (new_text, status).

    Statuses: NO-SYNC-SKIP | NO-QUICK-SUMMARY | NO-CHANGE | MIGRATED.
    """
    original = text
    text = normalize_sync_markers(text)
    if not has_sync_blocks(text):
        return text, "NO-SYNC-SKIP" if text == original else "MIGRATED"
    if QUICK_SUMMARY_RE.search(text) is None:
        return text, "NO-QUICK-SUMMARY"

    head_end = find_head_end(text)
    head = text[:head_end]
    after_head = text[head_end:]

    # Pull close-anchor out (carry-through, kept verbatim).
    close_anchor_match = CLOSE_ANCHOR_RE.search(after_head)
    close_anchor = ""
    if close_anchor_match:
        close_anchor = close_anchor_match.group(0)
        after_head = after_head[: close_anchor_match.start()] + after_head[close_anchor_match.end():]

    # Pull `## Closing Reminders` (heading + everything after to EOF) out.
    closing_reminders_match = CLOSING_REMINDERS_RE.search(after_head)
    closing_reminders = ""
    if closing_reminders_match:
        closing_reminders = after_head[closing_reminders_match.start():]
        after_head = after_head[: closing_reminders_match.start()]

    # Extract every SYNC block from the remaining after_head; categorize.
    sync_top: list[str] = []
    sync_reminders: list[str] = []

    def collect(match: re.Match[str]) -> str:
        full = match.group(0)
        tag = match.group("tag")
        if tag.endswith(":reminder"):
            sync_reminders.append(full)
        else:
            sync_top.append(full)
        return ""

    main_body = SYNC_BLOCK_RE.sub(collect, after_head)

    # Reassemble in canonical zone order.
    pieces: list[str] = [head.rstrip(), "\n\n", main_body.strip()]
    if sync_top:
        pieces.append("\n\n")
        pieces.append("\n\n".join(block.strip() for block in sync_top))
    if sync_reminders:
        pieces.append("\n\n")
        pieces.append("\n\n".join(block.strip() for block in sync_reminders))
    if close_anchor:
        pieces.append("\n\n")
        pieces.append(close_anchor.strip())
    if closing_reminders:
        pieces.append("\n\n")
        pieces.append(closing_reminders.strip())

    new_text = "".join(pieces)
    new_text = normalize_blank_lines(new_text)
    if not new_text.endswith("\n"):
        new_text += "\n"

    if new_text == original:
        return new_text, "NO-CHANGE"
    return new_text, "MIGRATED"


def find_skill_files() -> list[Path]:
    targets: list[Path] = []
    seen: set[str] = set()
    for pattern in ("**/SKILL.md", "**/skill.md"):
        for p in SKILLS_DIR.glob(pattern):
            key = str(p).lower()
            if key in seen:
                continue
            targets.append(p)
            seen.add(key)
    return sorted(targets, key=lambda p: p.parent.name.lower())


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    check = "--check" in sys.argv
    only = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--only=")), None)
    unknown = [a for a in sys.argv[1:] if a not in {"--dry-run", "--check"} and not a.startswith("--only=")]
    if unknown:
        print(f"Unknown argument(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    results: list[tuple[str, str, str]] = []
    migrated = 0
    would_migrate = 0

    for path in find_skill_files():
        if only and path.parent.name != only:
            continue
        original = path.read_text(encoding="utf-8")
        new_text, status = migrate(original)
        note = ""
        if status == "MIGRATED":
            if check or dry_run:
                status = "WOULD-MIGRATE"
                would_migrate += 1
                note = f"(would delta={len(new_text) - len(original):+d} chars)"
            else:
                path.write_text(new_text, encoding="utf-8")
                migrated += 1
                delta = len(new_text) - len(original)
                note = f"(delta={delta:+d} chars)"
        results.append((path.parent.name, status, note))

    print(f"{'SKILL':<45} {'STATUS':<18} NOTE")
    print("-" * 80)
    for name, status, note in results:
        print(f"{name:<45} {status:<18} {note}")

    counts = {
        "NO-SYNC-SKIP": 0,
        "NO-QUICK-SUMMARY": 0,
        "NO-CHANGE": 0,
        "MIGRATED": migrated,
        "WOULD-MIGRATE": would_migrate,
    }
    for _, status, _ in results:
        if status in counts and status not in {"MIGRATED", "WOULD-MIGRATE"}:
            counts[status] += 1

    print(
        f"\nTotal: {len(results)} | "
        f"Migrated: {counts['MIGRATED']} | Would-migrate: {counts['WOULD-MIGRATE']} | "
        f"No-change: {counts['NO-CHANGE']} | "
        f"Sync-free skipped: {counts['NO-SYNC-SKIP']} | "
        f"No-quick-summary: {counts['NO-QUICK-SUMMARY']}"
    )

    if check and would_migrate:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Migration: relocate main content of every SKILL.md ABOVE all SYNC blocks.

Target layout:
  <frontmatter>
  <PROMPT-ENHANCE:STEP-TASK-ANCHOR>
  ## Quick Summary ...                  <-- main content (top)
  <!-- SYNC:foo --> ... <!-- /SYNC:foo --> (TOP blocks)
  <!-- SYNC:foo:reminder --> ... <!-- /SYNC:foo:reminder --> (reminders)
  ## Closing Reminders
  ...

Idempotent: a file is "already migrated" iff `## Quick Summary` precedes any
`<!-- SYNC:` tag. Files with no SYNC blocks at all are skipped.

Main-content end-boundary priority (canonical with sync_blocks.find_sync_region_start):
  1. <!-- SYNC:*:reminder -->
  2. <!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->
  3. ## Closing Reminders
  4. EOF
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from sync_blocks import find_sync_region_start

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

QUICK_SUMMARY_RE = re.compile(r"^## Quick Summary\b.*$", re.MULTILINE)
ANY_SYNC_OPEN_RE = re.compile(r"^<!-- SYNC:", re.MULTILINE)
ANCHOR_END_RE = re.compile(r"^<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->\s*$", re.MULTILINE)
FRONTMATTER_RE = re.compile(r"^---\s*\n.*?^---\s*$", re.MULTILINE | re.DOTALL)


def is_already_migrated(text: str) -> bool:
    """True iff first `## Quick Summary` precedes any `<!-- SYNC:` opener."""
    qs = QUICK_SUMMARY_RE.search(text)
    sync = ANY_SYNC_OPEN_RE.search(text)
    if qs is None or sync is None:
        return False
    return qs.start() < sync.start()


def has_sync_blocks(text: str) -> bool:
    return ANY_SYNC_OPEN_RE.search(text) is not None


def find_insertion_point(text: str) -> int:
    """Char offset where the lifted main content is re-inserted.
    After STEP-TASK-ANCHOR:END line, else after frontmatter, else 0."""
    m = ANCHOR_END_RE.search(text)
    if m:
        return m.end()
    m = FRONTMATTER_RE.search(text)
    if m:
        return m.end()
    return 0


def normalize_blank_lines(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text)


def migrate(text: str) -> tuple[str, str]:
    """Return (new_text, status).

    Statuses: ALREADY-MIGRATED | NO-SYNC-SKIP | NO-QUICK-SUMMARY | MIGRATED.
    """
    if not has_sync_blocks(text):
        return text, "NO-SYNC-SKIP"
    if is_already_migrated(text):
        return text, "ALREADY-MIGRATED"

    qs_match = QUICK_SUMMARY_RE.search(text)
    if qs_match is None:
        return text, "NO-QUICK-SUMMARY"

    qs_start = qs_match.start()
    qs_end = find_sync_region_start(text, search_from=qs_start)
    main_content = text[qs_start:qs_end].strip()
    if not main_content:
        return text, "NO-QUICK-SUMMARY"

    cut_text = text[:qs_start] + text[qs_end:]
    insertion_at = find_insertion_point(cut_text)

    head = cut_text[:insertion_at].rstrip() + "\n\n"
    tail = "\n\n" + cut_text[insertion_at:].lstrip("\n")
    new_text = head + main_content + tail
    new_text = normalize_blank_lines(new_text)
    if not new_text.endswith("\n"):
        new_text += "\n"

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
    unknown = [a for a in sys.argv[1:] if a not in {"--dry-run", "--check"}]
    if unknown:
        print(f"Unknown argument(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    results: list[tuple[str, str, str]] = []
    migrated = 0
    would_migrate = 0

    for path in find_skill_files():
        original = path.read_text(encoding="utf-8")
        new_text, status = migrate(original)
        note = ""
        if status == "MIGRATED":
            if check or dry_run:
                status = "WOULD-MIGRATE"
                would_migrate += 1
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
        "ALREADY-MIGRATED": 0,
        "NO-SYNC-SKIP": 0,
        "NO-QUICK-SUMMARY": 0,
        "MIGRATED": migrated,
        "WOULD-MIGRATE": would_migrate,
    }
    for _, status, _ in results:
        if status in counts and status not in {"MIGRATED", "WOULD-MIGRATE"}:
            counts[status] += 1

    print(
        f"\nTotal: {len(results)} | "
        f"Migrated: {counts['MIGRATED']} | Would-migrate: {counts['WOULD-MIGRATE']} | "
        f"Already-migrated: {counts['ALREADY-MIGRATED']} | "
        f"Sync-free skipped: {counts['NO-SYNC-SKIP']} | "
        f"No-quick-summary: {counts['NO-QUICK-SUMMARY']}"
    )

    if check and would_migrate:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

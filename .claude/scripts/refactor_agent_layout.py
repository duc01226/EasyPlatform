"""Migration: enforce canonical agent .md layout - Quick Summary leads, SYNC at bottom.

Source agents currently:
  frontmatter
  > intro banner (blockquotes)            <- IMPORTANT / Evidence Gate / External Memory
  <!-- SYNC:... --> ... (top blocks)
  ## Quick Summary ... ## <last main H2>
  ---                                      <- seam separator
  <!-- SYNC:...:reminder --> (some)
  ## Closing Reminders ...
  <!-- SYNC:...:reminder --> (more, interleaved)

Target layout (zones, top to bottom):
  1. frontmatter                                                    -- HEAD
  2. ## Quick Summary (+ intro banner relocated right after the      -- MAIN
     Quick Summary section so Quick Summary is the FIRST content)
     ... remaining main-body H2 sections ...
  3. <!-- SYNC:foo --> ... (all top variants, doc order)            -- SYNC-TOP
  4. <!-- SYNC:foo:reminder --> ... (all reminder variants)          -- SYNC-REMINDER
  5. ## Closing Reminders ...                                        -- CLOSING

Contract:
  - `## Quick Summary` is the first content after frontmatter.
  - The intro banner is relocated to immediately after the Quick Summary
    section (kept prominent, no longer above Quick Summary).
  - All SYNC blocks are consolidated at the bottom: top variants first,
    `:reminder` variants next, then `## Closing Reminders` last.
  - The dangling seam `---` between body and the old bottom zone is removed;
    in-body horizontal rules are preserved (only a TRAILING rule is stripped).
  - Idempotent: re-running on a canonical file produces zero changes.
  - Files with no SYNC blocks, no frontmatter, or no Quick Summary are skipped.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
AGENTS_DIR = PROJECT_ROOT / ".claude" / "agents"

FRONTMATTER_RE = re.compile(r"^---\s*\n.*?^---\s*$", re.MULTILINE | re.DOTALL)
QUICK_SUMMARY_RE = re.compile(r"^## Quick Summary\b.*$", re.MULTILINE)
CLOSING_REMINDERS_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)
H2_RE = re.compile(r"^## .*$", re.MULTILINE)
ANY_SYNC_OPEN_RE = re.compile(r"^[ \t]*<!-- SYNC:[^/]", re.MULTILINE)
# Complete SYNC block: opener -> matching closer (backref on tag). Leading
# whitespace on either marker is tolerated (formatters sometimes indent them).
SYNC_BLOCK_RE = re.compile(
    r"^[ \t]*<!-- SYNC:(?P<tag>[^\s>]+) -->\n(?P<body>[\s\S]*?)\n[ \t]*<!-- /SYNC:(?P=tag) -->[ \t]*$",
    re.MULTILINE,
)
SYNC_MARKER_INDENTED_RE = re.compile(r"^[ \t]+(<!-- /?SYNC:[^\s>]+ -->)[ \t]*$", re.MULTILINE)
# One or more trailing standalone horizontal rules (zone seams left by SYNC removal).
TRAILING_HR_RE = re.compile(r"(?:\n+-{3,}[ \t]*)+$")
STANDALONE_HR_RE = re.compile(r"^-{3,}[ \t]*$", re.MULTILINE)


def normalize_sync_markers(text: str) -> str:
    return SYNC_MARKER_INDENTED_RE.sub(r"\1", text)


def normalize_blank_lines(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text)


def migrate(text: str) -> tuple[str, str]:
    """Return (new_text, status).

    Statuses: NO-SYNC-SKIP | NO-FRONTMATTER | NO-QUICK-SUMMARY | NO-CHANGE | MIGRATED.
    """
    original = text
    text = normalize_sync_markers(text)
    if ANY_SYNC_OPEN_RE.search(text) is None:
        return text, "NO-SYNC-SKIP"

    m_fm = FRONTMATTER_RE.search(text)
    if not m_fm or m_fm.start() != 0:
        return text, "NO-FRONTMATTER"
    head = text[: m_fm.end()]
    body = text[m_fm.end():]

    if QUICK_SUMMARY_RE.search(body) is None:
        return text, "NO-QUICK-SUMMARY"

    # 1. Extract EVERY SYNC block from the body, categorized, in document order.
    sync_top: list[str] = []
    sync_reminders: list[str] = []

    def collect(match: re.Match[str]) -> str:
        full = match.group(0).strip()
        if match.group("tag").endswith(":reminder"):
            sync_reminders.append(full)
        else:
            sync_top.append(full)
        return ""

    body_nosync = SYNC_BLOCK_RE.sub(collect, body)

    # 2. Carve `## Closing Reminders` -> EOF (now free of SYNC blocks).
    closing = ""
    m_close = CLOSING_REMINDERS_RE.search(body_nosync)
    if m_close:
        closing = body_nosync[m_close.start():]
        body_nosync = body_nosync[: m_close.start()]

    # 3. Split: preamble (everything before Quick Summary -- intro banner plus
    #    any H2 sections that precede it) vs main body (Quick Summary onward).
    m_qs = QUICK_SUMMARY_RE.search(body_nosync)
    preamble = body_nosync[: m_qs.start()]
    main_body = body_nosync[m_qs.start():]

    # Strip standalone `---` seam rules from the preamble (zone separators left
    # behind by SYNC removal); table separators (`| --- |`) are untouched.
    preamble = STANDALONE_HR_RE.sub("", preamble)
    preamble = normalize_blank_lines(preamble).strip()

    # 4. Drop dangling trailing seam `---` rules from the main body.
    main_body = TRAILING_HR_RE.sub("", main_body.rstrip()).rstrip()

    # 5. Relocate the preamble to immediately after the Quick Summary section.
    if preamble:
        m_qs2 = QUICK_SUMMARY_RE.search(main_body)
        after_qs = main_body[m_qs2.end():]
        m_next = H2_RE.search(after_qs)
        if m_next:
            idx = m_qs2.end() + m_next.start()
            main_body = (
                main_body[:idx].rstrip() + "\n\n" + preamble + "\n\n" + main_body[idx:]
            )
        else:
            main_body = main_body.rstrip() + "\n\n" + preamble

    # 6. Reassemble in canonical zone order.
    pieces: list[str] = [head.rstrip(), "\n\n", main_body.strip()]
    if sync_top:
        pieces.append("\n\n")
        pieces.append("\n\n".join(sync_top))
    if sync_reminders:
        pieces.append("\n\n")
        pieces.append("\n\n".join(sync_reminders))
    if closing:
        pieces.append("\n\n")
        pieces.append(closing.strip())

    new_text = normalize_blank_lines("".join(pieces))
    if not new_text.endswith("\n"):
        new_text += "\n"

    if new_text == original:
        return new_text, "NO-CHANGE"
    return new_text, "MIGRATED"


def find_agent_files() -> list[Path]:
    return sorted(AGENTS_DIR.glob("*.md"), key=lambda p: p.name.lower())


def verify_quick_summary_first(text: str) -> bool:
    """First non-frontmatter content line is the `## Quick Summary` heading."""
    m_fm = FRONTMATTER_RE.search(text)
    rest = text[m_fm.end():] if m_fm else text
    for line in rest.splitlines():
        if line.strip():
            return line.strip().startswith("## Quick Summary")
    return False


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    check = "--check" in sys.argv
    only = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--only=")), None)
    unknown = [a for a in sys.argv[1:] if a not in {"--dry-run", "--check"} and not a.startswith("--only=")]
    if unknown:
        print(f"Unknown argument(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    results: list[tuple[str, str, str]] = []
    migrated = would_migrate = 0

    for path in find_agent_files():
        if only and path.name != only and path.stem != only:
            continue
        original = path.read_text(encoding="utf-8")
        new_text, status = migrate(original)
        note = ""
        if status == "MIGRATED":
            if not verify_quick_summary_first(new_text):
                status = "ERROR-QS-NOT-FIRST"
                note = "(refusing to write)"
            elif check or dry_run:
                status = "WOULD-MIGRATE"
                would_migrate += 1
                note = f"(delta={len(new_text) - len(original):+d} chars)"
            else:
                path.write_text(new_text, encoding="utf-8")
                migrated += 1
                note = f"(delta={len(new_text) - len(original):+d} chars)"
        results.append((path.name, status, note))

    print(f"{'AGENT':<34} {'STATUS':<20} NOTE")
    print("-" * 78)
    for name, status, note in results:
        print(f"{name:<34} {status:<20} {note}")

    errors = sum(1 for _, s, _ in results if s.startswith("ERROR"))
    print(
        f"\nTotal: {len(results)} | Migrated: {migrated} | Would-migrate: {would_migrate} | "
        f"Errors: {errors}"
    )

    if errors:
        return 2
    if check and would_migrate:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

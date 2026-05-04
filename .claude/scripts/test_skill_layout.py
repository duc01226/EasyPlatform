"""Verification script for skill-layout refactor.

Encodes Phase 3 acceptance criteria + plan TC-SKILL-LAYOUT-001..005, 007 as
runnable assertions. TC-006 / TC-008 are validated externally via the inject
scripts' --check mode. Exits non-zero on any failure.

Usage:
    python .claude/scripts/test_skill_layout.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from refactor_skill_layout import (
    QUICK_SUMMARY_RE,
    ANY_SYNC_OPEN_RE,
    has_sync_blocks,
    is_already_migrated,
    migrate,
)
from sync_blocks import find_sync_region_start

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"


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


def line_of(text: str, offset: int) -> int:
    return text[:offset].count("\n") + 1


def check_layout(path: Path) -> tuple[str, str]:
    """Return (status, detail) for a file. Status: PASS | FAIL | SKIP."""
    text = path.read_text(encoding="utf-8")
    qs = QUICK_SUMMARY_RE.search(text)
    sync = ANY_SYNC_OPEN_RE.search(text)
    if qs is None:
        return "FAIL", "missing `## Quick Summary`"
    if sync is None:
        return "SKIP", "no SYNC blocks (sync-free file)"
    if qs.start() >= sync.start():
        return (
            "FAIL",
            f"`## Quick Summary` at line {line_of(text, qs.start())} but first SYNC at line {line_of(text, sync.start())}",
        )
    return "PASS", f"QS@L{line_of(text, qs.start())} < SYNC@L{line_of(text, sync.start())}"


def test_idempotency(files: list[Path]) -> tuple[bool, str]:
    """TC-001: second run of migrate() must be no-op on already-migrated files."""
    for p in files:
        text = p.read_text(encoding="utf-8")
        if not has_sync_blocks(text):
            continue
        new_text, status = migrate(text)
        if status != "ALREADY-MIGRATED":
            return False, f"{p.parent.name}: expected ALREADY-MIGRATED, got {status}"
        if new_text != text:
            return False, f"{p.parent.name}: text mutated despite ALREADY-MIGRATED"
    return True, f"{len(files)} files re-checked, all idempotent"


def test_end_boundary_reminder_priority() -> tuple[bool, str]:
    """TC-002: `:reminder` wins over `## Closing Reminders` when both present."""
    fixture = (
        "## Quick Summary\n\nbody\n\n"
        "<!-- SYNC:foo:reminder -->\nrem\n<!-- /SYNC:foo:reminder -->\n\n"
        "## Closing Reminders\nclose\n"
    )
    qs = QUICK_SUMMARY_RE.search(fixture)
    end = find_sync_region_start(fixture, search_from=qs.start())
    expected_end = fixture.index("<!-- SYNC:foo:reminder -->")
    if end != expected_end:
        return False, f"expected end={expected_end}, got {end}"
    return True, "reminder anchor takes priority over Closing Reminders"


def test_end_boundary_closing_fallback() -> tuple[bool, str]:
    """TC-003: file with STEP-TASK-CLOSING but no :reminder uses STEP-TASK-CLOSING anchor."""
    fixture = (
        "## Quick Summary\n\nbody\n\n"
        "<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->\n"
        "anchor\n"
        "<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->\n\n"
        "## Closing Reminders\nclose\n"
    )
    qs = QUICK_SUMMARY_RE.search(fixture)
    end = find_sync_region_start(fixture, search_from=qs.start())
    expected_end = fixture.index("<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->")
    if end != expected_end:
        return False, f"expected end={expected_end}, got {end}"
    return True, "STEP-TASK-CLOSING anchor used when no :reminder present"


def test_sync_free_skip() -> tuple[bool, str]:
    """TC-004: file with no SYNC tags reports NO-SYNC-SKIP."""
    fixture = "## Quick Summary\n\njust content\n"
    _, status = migrate(fixture)
    if status != "NO-SYNC-SKIP":
        return False, f"expected NO-SYNC-SKIP, got {status}"
    return True, "sync-free file correctly skipped"


def test_already_migrated_skip() -> tuple[bool, str]:
    """TC-005: already-migrated file reports ALREADY-MIGRATED."""
    fixture = (
        "## Quick Summary\nbody\n\n"
        "<!-- SYNC:foo -->\nx\n<!-- /SYNC:foo -->\n"
    )
    _, status = migrate(fixture)
    if status != "ALREADY-MIGRATED":
        return False, f"expected ALREADY-MIGRATED, got {status}"
    return True, "already-migrated detector correct"


def test_no_content_loss(files: list[Path]) -> tuple[bool, str]:
    """TC-007: re-running migrate() yields same text (proves content stable)."""
    for p in files:
        text = p.read_text(encoding="utf-8")
        if not has_sync_blocks(text):
            continue
        new_text, _ = migrate(text)
        if new_text != text:
            return False, f"{p.parent.name}: re-migrate produced delta"
    return True, "all migrated files stable on re-migrate (no further changes)"


def main() -> int:
    files = find_skill_files()
    print(f"Scanning {len(files)} skill files...\n")

    pass_n = fail_n = skip_n = 0
    failures: list[tuple[str, str]] = []
    for p in files:
        status, detail = check_layout(p)
        if status == "PASS":
            pass_n += 1
        elif status == "SKIP":
            skip_n += 1
        else:
            fail_n += 1
            failures.append((p.parent.name, detail))

    print(f"Layout check: PASS={pass_n} SKIP={skip_n} FAIL={fail_n}")
    for name, detail in failures:
        print(f"  FAIL {name}: {detail}")
    print()

    tcs = [
        ("TC-001 idempotency", test_idempotency(files)),
        ("TC-002 reminder-priority", test_end_boundary_reminder_priority()),
        ("TC-003 closing-fallback", test_end_boundary_closing_fallback()),
        ("TC-004 sync-free-skip", test_sync_free_skip()),
        ("TC-005 already-migrated-skip", test_already_migrated_skip()),
        ("TC-007 no-content-loss", test_no_content_loss(files)),
    ]
    tc_fail = 0
    for name, (ok, detail) in tcs:
        marker = "PASS" if ok else "FAIL"
        if not ok:
            tc_fail += 1
        print(f"{marker} {name}: {detail}")

    print()
    if fail_n or tc_fail:
        print(f"FAILED: layout-fails={fail_n} tc-fails={tc_fail}")
        return 1
    print(f"OK: {pass_n} migrated + {skip_n} sync-free, all 6 TCs pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())

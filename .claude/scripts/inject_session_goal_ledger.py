"""Inject SYNC:session-goal-ledger into every workflow orchestrator skill.

Targets are DISCOVERED, not listed: every `.claude/skills/workflow-*/SKILL.md` plus
`start-workflow` (workflow activation) and `workflow-end` (completion). A newly added
workflow skill is therefore covered on the next run, and `--check` fails until it is.

Why workflow skills and not workflows.json: editing `preActions.injectContext` changes
workflow manifest fingerprints and breaks resume of in-flight runs; the SKILL.md carriers
are read at activation and at every step by the orchestrating assistant.

Layout (same contract as inject_workflow_registry_binding.py):
  TOP block:  immediately BEFORE the SYNC region start (sync_blocks.find_sync_region_start)
  BOTTOM:     SYNC:...:reminder block immediately BEFORE `## Closing Reminders` (else EOF)
Existing blocks are refreshed in place from the canonical text (idempotent). A skill
that carries a guide entry for the tag (sync_blocks.has_guide_entry: converted to guide
lines) never gets the TOP block back; its reminder is still refreshed. Files keep their
own line-ending style.

Usage: py -3 .claude/scripts/inject_session_goal_ledger.py [--check | --dry-run]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from line_endings import read_text, write_text
from sync_blocks import find_sync_region_start, has_guide_entry, load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

EXTRA_SKILLS = ("start-workflow",)

TAG = "SYNC:session-goal-ledger"
REMINDER_TAG = "SYNC:session-goal-ledger:reminder"
TOP_OPEN = f"<!-- {TAG} -->"
REMINDER_OPEN = f"<!-- {REMINDER_TAG} -->"

TOP_BLOCK = load_wrapped_sync_block(TAG)
BOTTOM_BLOCK = load_wrapped_sync_block(REMINDER_TAG)

CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)
TOP_BLOCK_RE = re.compile(
    r"<!-- SYNC:session-goal-ledger -->.*?<!-- /SYNC:session-goal-ledger -->\n?",
    re.DOTALL,
)
BOTTOM_BLOCK_RE = re.compile(
    r"<!-- SYNC:session-goal-ledger:reminder -->.*?<!-- /SYNC:session-goal-ledger:reminder -->\n?",
    re.DOTALL,
)


def target_skills() -> list[Path]:
    paths = sorted(p for p in SKILLS_DIR.glob("workflow-*/SKILL.md") if p.is_file())
    for name in EXTRA_SKILLS:
        p = SKILLS_DIR / name / "SKILL.md"
        if p.is_file():
            paths.append(p)
    return paths


def _replace(text: str, pattern: re.Pattern[str], block: str) -> tuple[str, bool]:
    m = pattern.search(text)
    if not m or m.group(0) == block:
        return text, False
    return text[: m.start()] + block + text[m.end():], True


def _insert_bottom(text: str) -> str:
    m = CLOSING_RE.search(text)
    if m:
        return text[: m.start()] + BOTTOM_BLOCK + "\n" + text[m.start():]
    if not text.endswith("\n"):
        text += "\n"
    return text + "\n" + BOTTOM_BLOCK


def inject(text: str) -> tuple[str, list[str]]:
    actions: list[str] = []
    if TOP_OPEN in text:
        text, changed = _replace(text, TOP_BLOCK_RE, TOP_BLOCK)
        if changed:
            actions.append("top-refreshed")
    elif has_guide_entry(text, TAG.removeprefix("SYNC:")):
        pass  # carried as a guide line: no body; the reminder below is still refreshed
    else:
        # Insert the TOP block before the SYNC region start (computed before the reminder exists).
        insert_at = find_sync_region_start(text)
        head = text[:insert_at].rstrip() + "\n\n"
        tail = "\n" + text[insert_at:].lstrip("\n")
        text = head + TOP_BLOCK + tail
        actions.append("top-inserted")

    if REMINDER_OPEN in text:
        text, changed = _replace(text, BOTTOM_BLOCK_RE, BOTTOM_BLOCK)
        if changed:
            actions.append("reminder-refreshed")
    else:
        text = _insert_bottom(text)
        actions.append("reminder-inserted")
    return text, actions


def main() -> int:
    args = set(sys.argv[1:])
    unknown = args - {"--check", "--dry-run"}
    if unknown:
        print(f"Unknown argument(s): {', '.join(sorted(unknown))}", file=sys.stderr)
        return 2
    check = "--check" in args
    dry_run = "--dry-run" in args

    pending = 0
    for path in target_skills():
        rel = path.relative_to(PROJECT_ROOT).as_posix()
        original, newline = read_text(path)
        if original.count(TOP_OPEN) > 1 or original.count(REMINDER_OPEN) > 1:
            print(f"MALFORMED  {rel} (duplicate block)")
            return 1
        updated, actions = inject(original)
        if updated == original:
            print(f"OK         {rel}")
            continue
        pending += 1
        if check or dry_run:
            print(f"{'WOULD-FIX ' if check else 'DRY-RUN   '} {rel} ({', '.join(actions)})")
            continue
        write_text(path, updated, newline)
        print(f"UPDATED    {rel} ({', '.join(actions)})")
    print(f"\n{pending} file(s) {'need an update' if check else 'changed' if not dry_run else 'would change'}")
    return 1 if check and pending else 0


if __name__ == "__main__":
    sys.exit(main())

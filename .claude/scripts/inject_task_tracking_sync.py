"""Inject SYNC:task-tracking-external-report block into plan/review skills.

Idempotent — files that already carry the protocol (the SYNC tag, or a guide entry
from a skill converted to guide lines: sync_blocks.has_guide_entry) are only
refreshed; the TOP block is never put back into a guided skill. Files keep their own
line-ending style.
Inserts:
  TOP block:  immediately BEFORE the SYNC region start (per
              sync_blocks.find_sync_region_start) — co-locates TOP with reminders
              below the main authored content.
  BOTTOM:     a SYNC:...:reminder block immediately BEFORE `## Closing Reminders`
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from line_endings import read_text, write_text
from sync_blocks import find_sync_region_start, has_guide_entry, load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

SKILL_NAMES = [
    # Plan family
    "plan",
    # Review family
    "security-audit",
    "ai-engineering-review",
    "code-quality-review",
    "knowledge-review",
    # `work-item` keeps its task-tracking body inline in work-item/references/mode-review.md, so it is not an injector target.
    "changes-review",
    "production-readiness-review",
    # `architecture` (review and full modes) keeps its task-tracking body inline in
    # architecture/references/mode-*.md, so it is not an injector target.
    "why-review",
    "workflow-review-changes",
    # Cook family
    "feature-implement",
    # Bugfix / fix family (ci/issue/logs/test/ui folded into /fix --target=*)
    "fix",
    # Investigate family
    "investigate",
    # Spec authoring quality gates (discovery / clarify) are `spec` modes: their bodies carry
    # these blocks inline in spec/references/mode-*.md, so `spec` is intentionally not a target.
    # workflow-integration-test step skills (those not already listed)
    # NOTE: `spec` (merged feature-spec router) is intentionally NOT a target —
    # it carries task-tracking via STEP-TASK-ANCHOR and writes its TC registry
    # to docs/specs/; the external-report block would duplicate that contract.
    "integration-test",
    # `docs-manager` modes carry this block inline in docs-manager/references/mode-*.md,
    # so `docs-manager` is intentionally not a target.
    "watzup",
    "workflow-integration-test",
    # workflow-end is intentionally excluded — it just clears state, no long work
]

TAG = "SYNC:task-tracking-external-report"
REMINDER_TAG = "SYNC:task-tracking-external-report:reminder"

TOP_BLOCK = load_wrapped_sync_block(TAG)
BOTTOM_BLOCK = load_wrapped_sync_block(REMINDER_TAG)

# Closing Reminders heading (## Closing Reminders, allow trailing text)
CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)
TOP_BLOCK_RE = re.compile(
    r"<!-- SYNC:task-tracking-external-report -->.*?<!-- /SYNC:task-tracking-external-report -->",
    re.DOTALL,
)
BOTTOM_BLOCK_RE = re.compile(
    r"<!-- SYNC:task-tracking-external-report:reminder -->.*?<!-- /SYNC:task-tracking-external-report:reminder -->",
    re.DOTALL,
)


def find_skill_path(name: str) -> Path | None:
    base = SKILLS_DIR / name
    for fname in ("SKILL.md", "skill.md"):
        p = base / fname
        if p.exists():
            return p
    return None


def inject(text: str) -> tuple[str, dict]:
    status = {"top": "skipped", "bottom": "skipped", "already_present": False}

    if TAG in text or has_guide_entry(text, TAG.removeprefix("SYNC:")):
        status["already_present"] = True
        m = TOP_BLOCK_RE.search(text)
        if m and m.group(0).strip() != TOP_BLOCK.strip():
            text = text[: m.start()] + TOP_BLOCK + text[m.end():]
            status["top"] = "refreshed"
        if REMINDER_TAG in text:
            m = BOTTOM_BLOCK_RE.search(text)
            if m and m.group(0).strip() != BOTTOM_BLOCK.strip():
                text = text[: m.start()] + BOTTOM_BLOCK + text[m.end():]
                status["bottom"] = "refreshed"
        else:
            m = CLOSING_RE.search(text)
            if m:
                text = text[: m.start()] + BOTTOM_BLOCK + "\n" + text[m.start():]
                status["bottom"] = "before-closing-reminders"
            else:
                if not text.endswith("\n"):
                    text += "\n"
                text += "\n" + BOTTOM_BLOCK
                status["bottom"] = "appended-eof"
        return text, status

    # --- TOP insert: BEFORE the SYNC region start (co-located with reminders) ---
    insert_at = find_sync_region_start(text)
    head = text[:insert_at].rstrip() + "\n\n"
    tail = "\n" + text[insert_at:].lstrip("\n")
    text = head + TOP_BLOCK + tail
    status["top"] = "before-sync-region-start"

    # --- BOTTOM insert: before `## Closing Reminders` heading ---
    m = CLOSING_RE.search(text)
    if m:
        insert_at = m.start()
        text = text[:insert_at] + BOTTOM_BLOCK + "\n" + text[insert_at:]
        status["bottom"] = "before-closing-reminders"
    else:
        # append at end
        if not text.endswith("\n"):
            text += "\n"
        text += "\n" + BOTTOM_BLOCK
        status["bottom"] = "appended-eof"

    return text, status


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    check = "--check" in sys.argv
    unknown_args = [arg for arg in sys.argv[1:] if arg not in {"--dry-run", "--check"}]
    if unknown_args:
        print(f"Unknown argument(s): {', '.join(unknown_args)}", file=sys.stderr)
        return 2

    results: list[tuple[str, str, dict]] = []
    for name in SKILL_NAMES:
        path = find_skill_path(name)
        if path is None:
            results.append((name, "MISSING", {}))
            continue
        original, newline = read_text(path)
        new_text, status = inject(original)
        if status["already_present"] and new_text == original:
            results.append((name, "ALREADY-PRESENT", status))
            continue
        if new_text == original:
            results.append((name, "NO-CHANGE", status))
            continue
        if check or dry_run:
            results.append((name, "WOULD-UPDATE" if check else "DRY-RUN", status))
            continue
        write_text(path, new_text, newline)
        results.append((name, "UPDATED", status))

    # summary
    print(f"{'SKILL':<28} {'STATUS':<18} TOP / BOTTOM")
    print("-" * 80)
    for name, kind, status in results:
        top = status.get("top", "-")
        bot = status.get("bottom", "-")
        print(f"{name:<28} {kind:<18} {top} / {bot}")
    return 1 if check and any(k == "WOULD-UPDATE" for _, k, _ in results) else 0


if __name__ == "__main__":
    sys.exit(main())

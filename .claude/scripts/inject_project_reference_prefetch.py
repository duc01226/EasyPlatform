"""Inject SYNC:project-reference-docs-guide block (TOP + reminder BOTTOM) into
implementation/planning/review/investigation skills.

Idempotent — skips files that already contain the SYNC tag.
Block content is GENERIC (project-agnostic) — works for any project that uses
the canonical .claude harness with hook-initialized docs/project-reference/.

TOP placement:    immediately BEFORE the SYNC region start (per
                  sync_blocks.find_sync_region_start) — co-locates TOP with
                  reminders below the main authored content.
BOTTOM placement: a SYNC:...:reminder block immediately BEFORE `## Closing Reminders`
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from sync_blocks import find_sync_region_start, load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

SKILL_NAMES = [
    # Plan family
    "plan", "plan-analysis", "plan-archive", "plan-ci", "plan-cro",
    "plan-review", "plan-validate", "planning",
    # Cook family
    "cook",
    # Code family
    "code", "code-auto", "code-no-test", "code-parallel",
    # Fix family
    "fix", "fix-ci", "fix-issue", "fix-logs",
    "fix-test", "fix-types", "fix-ui",
    # Feature family
    "feature", "feature-implementation", "create-feature",
    # Investigate / scout family
    "investigate", "debug-investigate", "feature-investigation",
    "scout", "scout-ext",
    # Refactor / migration / scaffold
    "refactoring", "migration", "db-migrate", "scaffold",
    # Review family
    "arch-security-review", "code-review", "integration-test-review",
    "knowledge-review", "refine-review", "review-architecture",
    "review-artifact", "review-changes", "review-domain-entities",
    "review-post-task", "sre-review", "story-review", "tdd-spec-review",
    "why-review", "workflow-review", "workflow-review-changes",
    # Workflow step skills
    "tdd-spec", "integration-test", "integration-test-verify",
    "docs-update", "watzup", "workflow-write-integration-test",
]

TAG = "SYNC:project-reference-docs-guide"
REMINDER_TAG = "SYNC:project-reference-docs-guide:reminder"

TOP_BLOCK = load_wrapped_sync_block(TAG)
BOTTOM_BLOCK = load_wrapped_sync_block(REMINDER_TAG)

CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)
TOP_BLOCK_RE = re.compile(
    r"<!-- SYNC:project-reference-docs-guide -->.*?<!-- /SYNC:project-reference-docs-guide -->",
    re.DOTALL,
)
BOTTOM_BLOCK_RE = re.compile(
    r"<!-- SYNC:project-reference-docs-guide:reminder -->.*?<!-- /SYNC:project-reference-docs-guide:reminder -->",
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

    if TAG in text:
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
        original = path.read_text(encoding="utf-8")
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
        path.write_text(new_text, encoding="utf-8")
        results.append((name, "UPDATED", status))

    print(f"{'SKILL':<30} {'STATUS':<18} TOP / BOTTOM")
    print("-" * 90)
    for name, kind, status in results:
        top = status.get("top", "-")
        bot = status.get("bottom", "-")
        print(f"{name:<30} {kind:<18} {top} / {bot}")

    updated = sum(1 for _, k, _ in results if k == "UPDATED")
    already = sum(1 for _, k, _ in results if k == "ALREADY-PRESENT")
    missing = sum(1 for _, k, _ in results if k == "MISSING")
    print(f"\nTotal: {len(results)} | Updated: {updated} | Already-present: {already} | Missing: {missing}")
    return 1 if check and any(k == "WOULD-UPDATE" for _, k, _ in results) else 0


if __name__ == "__main__":
    sys.exit(main())

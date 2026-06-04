"""Inject SYNC:nested-task-creation block into multi-phase skills + all workflow-* orchestrators.

Idempotent — skip files that already contain the SYNC tag.
Inserts:
  TOP block:  immediately BEFORE the SYNC region start (per
              sync_blocks.find_sync_region_start) — co-locates TOP with reminders
              below the main authored content.
  BOTTOM:     a SYNC:...:reminder block immediately BEFORE `## Closing Reminders`

TODO (follow-up): the inject_*.py family (this + inject_task_tracking_sync.py +
inject_project_reference_prefetch.py) is ~85% identical. Extract a shared
inject_sync_block(skills, tag, top, bottom) helper. Tracked as MEDIUM DRY finding
in plans/reports/workflow-review-changes-260504-0353-tooling-changeset.md.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from sync_blocks import find_sync_region_start, load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

SKILL_NAMES = [
    # ---- Child skills (multi-phase work that nests under workflow steps) ----
    # Plan family
    "plan", "plan-analysis",
    "plan-review", "plan-validate",
    # Review family
    "security-review", "code-review", "integration-test-review",
    "knowledge-review", "review-architecture",
    "review-artifact", "review-changes", "review-domain-entities",
    "production-readiness-review",
    "why-review",
    # Cook family
    "feature-implement",
    # Code family
    "plan-execute",
    # Fix family (ci/issue/logs/test/ui folded into /fix --target=*)
    "fix",
    # Investigate / scout family
    "investigate", "debug-investigate",
    "scout",
    # Spec authoring quality family (idea → spec gates)
    "spec-discovery", "spec-clarify",
    # Refactor / migration / scaffold
    "refactoring", "db-migrate", "scaffold",
    # Workflow step skills (inner phases)
    # NOTE: `spec` (merged feature-spec router) is intentionally NOT a target —
    # it carries task-tracking via STEP-TASK-ANCHOR and inherits feature-spec's
    # lean SYNC set; injecting here would duplicate existing coverage.
    "integration-test", "integration-test-verify",
    "docs-update", "watzup",
    # ---- Orchestrator skills (workflow-*) ----
    "workflow-big-feature",
    "workflow-bugfix",
    "workflow-e2e", "workflow-feature",
    "workflow-feature-spec",
    "workflow-greenfield-init",
    "workflow-idea-to-pbi",
    "workflow-idea-to-spec",
    "workflow-refactor", "workflow-research",
    "workflow-review-changes",
    "workflow-seed-test-data", "workflow-code-to-spec", "workflow-spec-to-pbi",
    "workflow-spec-sync",
    "workflow-visualize",
    "workflow-write-integration-test",
    # workflow-end + start-workflow intentionally excluded — they are state-only,
    # no multi-phase internal work.
]

TAG = "SYNC:nested-task-creation"
REMINDER_TAG = "SYNC:nested-task-creation:reminder"
TOP_OPEN = f"<!-- {TAG} -->"
REMINDER_OPEN = f"<!-- {REMINDER_TAG} -->"

TOP_BLOCK = load_wrapped_sync_block(TAG)
BOTTOM_BLOCK = load_wrapped_sync_block(REMINDER_TAG)

CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)
TOP_BLOCK_RE = re.compile(
    r"<!-- SYNC:nested-task-creation -->.*?<!-- /SYNC:nested-task-creation -->",
    re.DOTALL,
)
BOTTOM_BLOCK_RE = re.compile(
    r"<!-- SYNC:nested-task-creation:reminder -->.*?<!-- /SYNC:nested-task-creation:reminder -->",
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
    status = {"top": "skipped", "bottom": "skipped", "already_present": False, "errors": []}

    top_present = TOP_OPEN in text
    bottom_present = REMINDER_OPEN in text

    if top_present:
        status["already_present"] = True
        m = TOP_BLOCK_RE.search(text)
        if not m:
            status["errors"].append(f"malformed {TAG} block")
        elif m.group(0).strip() != TOP_BLOCK.strip():
            text = text[: m.start()] + TOP_BLOCK + text[m.end():]
            status["top"] = "refreshed"

    if bottom_present:
        m = BOTTOM_BLOCK_RE.search(text)
        if not m:
            status["errors"].append(f"malformed {REMINDER_TAG} block")
        elif m.group(0).strip() != BOTTOM_BLOCK.strip():
            text = text[: m.start()] + BOTTOM_BLOCK + text[m.end():]
            status["bottom"] = "refreshed"

    if top_present:
        if not bottom_present:
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

    if not bottom_present:
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
        if status.get("errors"):
            results.append((name, "MALFORMED", status))
            continue
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

    print(f"{'SKILL':<42} {'STATUS':<18} TOP / BOTTOM")
    print("-" * 100)
    for name, kind, status in results:
        top = status.get("top", "-")
        bot = status.get("bottom", "-")
        print(f"{name:<42} {kind:<18} {top} / {bot}")
        for error in status.get("errors", []):
            print(f"{'':<42} {'':<18} ERROR: {error}")

    updated = sum(1 for _, k, _ in results if k == "UPDATED")
    already = sum(1 for _, k, _ in results if k == "ALREADY-PRESENT")
    missing = sum(1 for _, k, _ in results if k == "MISSING")
    malformed = sum(1 for _, k, _ in results if k == "MALFORMED")
    print(f"\nTotal: {len(results)} | Updated: {updated} | Already-present: {already} | Missing: {missing} | Malformed: {malformed}")
    if malformed:
        return 1
    return 1 if check and any(k == "WOULD-UPDATE" for _, k, _ in results) else 0


if __name__ == "__main__":
    sys.exit(main())

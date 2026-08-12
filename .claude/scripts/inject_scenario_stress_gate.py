"""Inject SYNC:scenario-stress-eval marker + reminder into the hand-picked host skills + one agent.

Idempotent — skip / refresh files that already contain the SYNC tag.
Inserts:
  TOP block:  immediately BEFORE the SYNC region start (per
              sync_blocks.find_sync_region_start) — co-locates the marker with
              the reminders region below the main authored content. When a host
              has NO SYNC region (find_sync_region_start returns EOF), the block
              appends at EOF, creating the host's first SYNC region (acceptable —
              e.g. architecture-scalability-review, solution-architect).
  BOTTOM:     a SYNC:...:reminder block immediately BEFORE `## Closing Reminders`,
              or appended at EOF when no such heading exists.

Host set is hand-picked — the top-down scenario-stress companion to the bottom-up
SYNC:scale-technique-gate — so this uses explicit name lists rather than the
inject_review_skill_blocks.py review-batch matrix. Seven hosts total:

  6 skills  — architecture-design (design-time), architecture-review (Cat 11),
              architecture-scalability-review (scorecard), production-readiness-review
              (SRE), tech-stack-research (stack selection), performance-review
              (data-volume + backpressure depth — a scenario host the technique gate
              does NOT target, hence not in the sibling's SKILL_NAMES).
  1 agent   — solution-architect. Greenfield inception designs for scenarios up front;
              it authors resilience posture, so the scenario gate belongs in its context.
              The technique gate has no agent hosts; this one does, hence the extra loop.

`inject(text)` is path-agnostic (operates on file text, no path assumptions), so the
agent file flows through the SAME proven logic as the skills. Structure mirrors
inject_scale_technique_gate.py.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from sync_blocks import find_sync_region_start, load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"
AGENTS_DIR = PROJECT_ROOT / ".claude" / "agents"

SKILL_NAMES = [
    "architecture-design",             # "do" — design-time scenario consideration
    "architecture-review",             # review — Cat 11 scalability & coupling
    "architecture-scalability-review", # review — scalability scorecard (no SYNC region → EOF append)
    "production-readiness-review",     # review — SRE readiness / resilience
    "tech-stack-research",             # research — scenario-aware stack selection
    "performance-review",              # review — data-volume growth + backpressure depth
]

AGENT_NAMES = [
    "solution-architect",              # agent — greenfield inception designs for scenarios up front
]

TAG = "SYNC:scenario-stress-eval"
REMINDER_TAG = "SYNC:scenario-stress-eval:reminder"
TOP_OPEN = f"<!-- {TAG} -->"
REMINDER_OPEN = f"<!-- {REMINDER_TAG} -->"

TOP_BLOCK = load_wrapped_sync_block(TAG)
BOTTOM_BLOCK = load_wrapped_sync_block(REMINDER_TAG)

CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)
TOP_BLOCK_RE = re.compile(
    rf"<!-- {re.escape(TAG)} -->.*?<!-- /{re.escape(TAG)} -->",
    re.DOTALL,
)
BOTTOM_BLOCK_RE = re.compile(
    rf"<!-- {re.escape(REMINDER_TAG)} -->.*?<!-- /{re.escape(REMINDER_TAG)} -->",
    re.DOTALL,
)


def find_skill_path(name: str) -> Path | None:
    base = SKILLS_DIR / name
    for fname in ("SKILL.md", "skill.md"):
        p = base / fname
        if p.exists():
            return p
    return None


def find_agent_path(name: str) -> Path | None:
    p = AGENTS_DIR / f"{name}.md"
    return p if p.exists() else None


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

    hosts: list[tuple[str, Path | None]] = []
    for name in SKILL_NAMES:
        hosts.append((name, find_skill_path(name)))
    for name in AGENT_NAMES:
        hosts.append((f"{name} (agent)", find_agent_path(name)))

    results: list[tuple[str, str, dict]] = []
    for name, path in hosts:
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

    print(f"{'HOST':<42} {'STATUS':<18} TOP / BOTTOM")
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

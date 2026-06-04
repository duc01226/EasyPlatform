"""Inject the P3 review-skill SYNC blocks into their adoption-matrix skills.

Tags propagated (each with its `:reminder` sibling):
  - SYNC:systematic-review-batching     -> 10 multi-file / diff reviewers
  - SYNC:severity-rubric                -> 15 finding-emitting reviewers
  - SYNC:category-review-thinking        -> same 10 as batching (co-paired:
        the batching block names it as each batch agent's primary thinking model,
        so it must resolve wherever batching is adopted)

Idempotent. For each (skill, tag):
  TOP main block -> refreshed in place if drifted, else inserted BEFORE
                    sync_blocks.find_sync_region_start (co-located with reminders,
                    after the skill's main authored content).
  REMINDER       -> refreshed in place if drifted, else inserted BEFORE
                    `## Closing Reminders` (else appended at EOF).

Bodies/reminders are loaded from the canonical source via load_wrapped_sync_block,
so they match canonical by construction. Run sync-update-blocks.py afterwards to
normalize main-block bodies to Operation A's exact output (guarantees --dry-run clean).

Usage:
    python inject_review_skill_blocks.py [--dry-run]

Does NOT touch mirrors (.agents/, .codex/, AGENTS.md) — deferred per plan.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from sync_blocks import find_sync_region_start, load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

BATCHING = [
    "review-changes", "code-review", "review-architecture", "review-domain-entities",
    "review-ui", "integration-test-review", "security-review",
    "performance-review", "production-readiness-review",
]
SEVERITY = [
    "code-review", "review-changes", "review-architecture",
    "review-domain-entities", "review-ui", "integration-test-review", "security-review",
    "performance-review", "production-readiness-review", "knowledge-review", "review-artifact",
    "spec-clarify",
    "plan-review", "why-review", "code-simplifier",
]
CATEGORY = list(BATCHING)  # co-paired with batching

# Canonical apply order per skill (stable, cosmetic only).
MATRIX = [
    ("SYNC:systematic-review-batching", BATCHING),
    ("SYNC:severity-rubric", SEVERITY),
    ("SYNC:category-review-thinking", CATEGORY),
]

CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)


def find_skill_path(name: str) -> Path | None:
    base = SKILLS_DIR / name
    for fname in ("SKILL.md", "skill.md"):
        p = base / fname
        if p.exists():
            return p
    return None


def block_re(tag: str) -> re.Pattern:
    # Matches the main fence pair but NOT the :reminder variant — the open tag
    # requires ` -->` directly after `tag`, which `tag:reminder` breaks.
    return re.compile(rf"<!-- {re.escape(tag)} -->.*?<!-- /{re.escape(tag)} -->", re.DOTALL)


def inject_tag(text: str, tag: str) -> tuple[str, dict]:
    reminder_tag = f"{tag}:reminder"
    top_block = load_wrapped_sync_block(tag)
    bottom_block = load_wrapped_sync_block(reminder_tag)
    top_re = block_re(tag)
    bot_re = block_re(reminder_tag)
    status = {"top": "-", "bottom": "-"}

    # --- TOP main block ---
    m = top_re.search(text)
    if m:
        if m.group(0).strip() != top_block.strip():
            text = text[: m.start()] + top_block + text[m.end():]
            status["top"] = "refreshed"
        else:
            status["top"] = "present"
    else:
        insert_at = find_sync_region_start(text)
        head = text[:insert_at].rstrip() + "\n\n"
        tail = "\n" + text[insert_at:].lstrip("\n")
        text = head + top_block + tail
        status["top"] = "inserted"

    # --- BOTTOM reminder block ---
    m = bot_re.search(text)
    if m:
        if m.group(0).strip() != bottom_block.strip():
            text = text[: m.start()] + bottom_block + text[m.end():]
            status["bottom"] = "refreshed"
        else:
            status["bottom"] = "present"
    else:
        cm = CLOSING_RE.search(text)
        if cm:
            text = text[: cm.start()] + bottom_block + "\n" + text[cm.start():]
            status["bottom"] = "before-closing"
        else:
            if not text.endswith("\n"):
                text += "\n"
            text += "\n" + bottom_block
            status["bottom"] = "appended-eof"

    return text, status


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    unknown = [a for a in sys.argv[1:] if a != "--dry-run"]
    if unknown:
        print(f"Unknown argument(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    # Build deterministic per-skill tag list (canonical tag order).
    skill_tags: dict[str, list[str]] = {}
    for tag, skills in MATRIX:
        for s in skills:
            skill_tags.setdefault(s, [])
            if tag not in skill_tags[s]:
                skill_tags[s].append(tag)

    results = []
    for skill in sorted(skill_tags):
        path = find_skill_path(skill)
        if path is None:
            results.append((skill, "MISSING", {}))
            continue
        original = path.read_text(encoding="utf-8")
        text = original
        per_tag = {}
        for tag in skill_tags[skill]:
            text, st = inject_tag(text, tag)
            per_tag[tag] = st
        if text == original:
            results.append((skill, "NO-CHANGE", per_tag))
            continue
        if not dry_run:
            path.write_text(text, encoding="utf-8")
        results.append((skill, "DRY-RUN" if dry_run else "UPDATED", per_tag))

    print(f"{'SKILL':<26} {'STATUS':<10} TAG -> top/bottom")
    print("-" * 92)
    for skill, kind, per_tag in results:
        if not per_tag:
            print(f"{skill:<26} {kind:<10}")
            continue
        parts = [f"{t.split(':',1)[1]}={s['top']}/{s['bottom']}" for t, s in per_tag.items()]
        print(f"{skill:<26} {kind:<10} " + "  ".join(parts))
    changed = sum(1 for _, k, _ in results if k in ("UPDATED", "DRY-RUN"))
    print(f"\nFiles {'would change' if dry_run else 'changed'}: {changed}  (dry-run={dry_run})")
    return 0


if __name__ == "__main__":
    sys.exit(main())

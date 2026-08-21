"""Inject the P3 review-skill SYNC blocks into their adoption-matrix skills.

Tags propagated (each with its `:reminder` sibling):
  - SYNC:systematic-review-batching     -> 10 multi-file / diff reviewers
  - SYNC:severity-rubric                -> 16 finding-emitting reviewers
  - SYNC:category-review-thinking        -> same 10 as batching (co-paired:
        the batching block names it as each batch agent's primary thinking model,
        so it must resolve wherever batching is adopted)
  - SYNC:double-round-trip-review       -> 14 finding-PRODUCER review skills
        (review->validate->fix->full-re-review loop; graders + loop-orchestrators
        excluded — see DOUBLE_ROUND_TRIP comment)
  - SYNC:goal-contract-satisfaction-loop -> ALL_REVIEW_SKILLS (all 20)
        (save-goal-before-loop + check-goal-each-cycle; additive-safe)
  - SYNC:trade-off-interrogation-gate    -> ALL_REVIEW_SKILLS (all 20)
        (trade-off? worth it? material -> confirm with user; additive-safe,
         graders and loop-orchestrators included — see ALL_REVIEW_SKILLS comment)

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
    "changes-review", "code-review", "architecture-review", "domain-entities-review",
    "ui-review", "integration-test-review", "security-review",
    "performance-review", "production-readiness-review", "architecture-review-full",
]
SEVERITY = [
    "code-review", "changes-review", "architecture-review",
    "domain-entities-review", "ui-review", "integration-test-review", "security-review",
    "performance-review", "production-readiness-review", "knowledge-review", "artifact-review",
    "spec-clarify",
    "plan-review", "why-review", "code-simplifier", "architecture-review-full",
]
CATEGORY = list(BATCHING)  # co-paired with batching

# The review->validate->fix->full-re-review convergence loop. Finding-PRODUCER review
# skills only. EXCLUDES graders (architecture-scalability-review, quality-gate-review):
# verify-review-validate-coverage.mjs forbids graders from carrying this fix-loop block
# (a grader emits a grade, not a review->fix loop). EXCLUDES the loop-orchestrators
# (why-review-loop, workflow-review-changes, workflow-review-changes-loop) — they own the
# OUTER fix loop and each inner /why-review round self-binds this block already.
DOUBLE_ROUND_TRIP = [
    "changes-review", "code-review", "architecture-review", "architecture-review-full",
    "domain-entities-review", "ui-review", "integration-test-review",
    "security-review", "performance-review", "production-readiness-review",
    "knowledge-review", "artifact-review", "plan-review", "why-review",
]
# EVERY review skill — finding-producers, graders, AND loop-orchestrators. Declared ONCE
# because two tags below adopt this exact population, and maintaining the roster twice is
# how it drifts: GOAL_CONTRACT once fell a skill behind TRADE_OFF (missing
# "changes-review-loop") and nothing detected it — verify-sync-adoption-parity.mjs compares
# declared carriers against injected blocks per tag, so two internally-consistent lists that
# disagree with EACH OTHER both pass. One roster makes that class of drift unrepresentable.
# Adding a review skill here adopts it into every ALL_REVIEW_SKILLS tag at once; a tag that
# must genuinely diverge replaces its alias below with its own literal list.
ALL_REVIEW_SKILLS = [
    "changes-review", "changes-review-loop", "code-review", "architecture-review",
    "architecture-review-full",
    "architecture-scalability-review", "domain-entities-review", "ui-review",
    "integration-test-review", "integration-test-verify-loop",
    "security-review", "performance-review",
    "production-readiness-review", "quality-gate-review", "knowledge-review",
    "artifact-review", "plan-review", "why-review", "why-review-loop",
    "workflow-review-changes", "workflow-review-changes-loop",
]
# Save-goal-before-loop + read-goal-each-cycle + Goal-Satisfaction-matrix: every review skill
# anchors its loop to a persisted Goal Contract. verify-workflow-cycle-compliance.mjs is
# positive-only (no forbid rule for extra carriers), so this is additive-safe.
GOAL_CONTRACT = list(ALL_REVIEW_SKILLS)
# The 3-question trade-off gate (trade-off? worth it? material -> confirm with user).
# Every review skill, graders and loop-orchestrators included: a grader that scores a design
# without pricing what the design sacrifices is as incomplete as a finding-producer that
# recommends a fix without pricing it, and a fix-loop is exactly where an unpriced one-way
# door ships silently under convergence pressure. Additive-safe: no verifier forbids extra
# carriers of this tag (unlike DOUBLE_ROUND_TRIP, which graders must not carry per
# verify-review-validate-coverage.mjs).
TRADE_OFF = list(ALL_REVIEW_SKILLS)

# The 40-clause UI/UX Design Principles. NOT an ALL_REVIEW_SKILLS tag — its carriers are the
# UI-surface skills across THREE roles (review · design/plan · build), which is a different
# population from "every review skill": most review skills never touch a user-facing surface,
# and three of these carriers (design, ui-ux-pro-max, pbi-mockup) are not review skills at all.
# Declared here so a canonical-body edit auto-propagates to every carrier and
# verify-sync-adoption-parity.mjs can sense drift; without the tag in MATRIX the bodies would
# silently fossilize at whatever they were on the day they were embedded.
UI_DESIGN_PRINCIPLES = [
    # review role — clauses are fail-conditions citing UI-<clause> + file:line
    "ui-review", "web-design-guidelines", "artifact-review", "test-ui",
    # design/plan role — clauses shape the artifact the skill authors
    "design", "design-spec", "ui-ux-pro-max", "figma-design",
    # build role — pbi-mockup emits real markup, so clauses are build constraints
    "pbi-mockup",
]

# Canonical apply order per skill (stable, cosmetic only).
MATRIX = [
    ("SYNC:systematic-review-batching", BATCHING),
    ("SYNC:severity-rubric", SEVERITY),
    ("SYNC:category-review-thinking", CATEGORY),
    ("SYNC:double-round-trip-review", DOUBLE_ROUND_TRIP),
    ("SYNC:goal-contract-satisfaction-loop", GOAL_CONTRACT),
    ("SYNC:trade-off-interrogation-gate", TRADE_OFF),
    ("SYNC:ui-ux-design-principles", UI_DESIGN_PRINCIPLES),
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

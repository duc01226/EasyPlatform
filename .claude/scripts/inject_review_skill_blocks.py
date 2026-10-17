"""Inject the P3 review-skill SYNC blocks into their adoption-matrix skills.

Tags propagated (each with its `:reminder` sibling):
  - SYNC:review-decision-autonomy       -> review/audit entrypoints and explicit review modes
  - SYNC:systematic-review-batching     -> 10 multi-file / diff reviewers
  - SYNC:severity-rubric                -> finding-emitting reviewers, scorecard/build gates, and review/fix loop orchestrators
  - SYNC:category-review-thinking        -> same 10 as batching (co-paired:
        the batching block names it as each batch agent's primary thinking model,
        so it must resolve wherever batching is adopted)
  - SYNC:goal-contract-satisfaction-loop -> converging review skills
        (save-goal-before-loop + check-goal-each-cycle; additive-safe)
  - SYNC:design-distinctiveness-gate    -> 13 visual-surface skills across FOUR roles
        (review / design-author / plan / build). Superset of the ui-ux-design-principles
        population -- see the DESIGN_DISTINCTIVENESS comment for why plan, scaffold and
        the build spine carry it while they do not carry the 40 UI-* clauses.
  - SYNC:ux-journey-gate                -> 6 skills that generate, plan or review a surface
        against its user journeys (see the UX_JOURNEY comment for the exclusions)
  - SYNC:ui-copywriting                 -> 7 skills that author or review interface STRINGS
        (strict subset of design-distinctiveness-gate; see the UI_COPYWRITING comment for the exclusions)
  - SYNC:design-review-checklist        -> 15 skills that review, author, plan or build a
        front-end surface. The executable review PROCEDURE (CL-1..CL-6) routing to the
        ~130-check catalog in .claude/docs/design-review-checklist.md. Superset of
        design-distinctiveness-gate by changes-review -- see the
        DESIGN_REVIEW_CHECKLIST comment for why this grade-anything skill carries a
        procedure but not the taste clauses. Every body is self-gating on "has a UI surface".
  - SYNC:e2e-visual-design-contract    -> the E2E/visual-review skill carriers
        (design authority + component/reuse + runtime/source ownership + baseline gates).
  - SYNC:ai-feature-framing-gate        -> ai-engineering-review ONLY
  - SYNC:ai-engineering-gate            -> ai-engineering-review ONLY
  - SYNC:ai-review-checklist            -> ai-engineering-review ONLY
        (every other skill holds one conditional pointer line; see the AI_* comment)
  - SYNC:trade-off-interrogation-gate    -> converging review skills
        (trade-off? worth it? material -> confirm with user; additive-safe,
         graders and loop-orchestrators included — see ALL_REVIEW_SKILLS comment)

Capacity guidance is adopted by the roles that design, implement, measure or validate
hot paths. Its body is scope-gated and its hook delivery is triggered by capacity work.

Idempotent. For each (skill, tag):
  TOP main block -> refreshed in place if drifted; left out when the skill carries
                    a guide entry for the tag (sync_blocks.has_guide_entry: the skill
                    was converted to guide lines); else inserted BEFORE
                    sync_blocks.find_sync_region_start (co-located with reminders,
                    after the skill's main authored content).
  REMINDER       -> refreshed in place if drifted, else inserted BEFORE
                    `## Closing Reminders` (else appended at EOF).

Bodies/reminders are loaded from the canonical source via load_wrapped_sync_block,
so they match canonical by construction. Run sync-update-blocks.py afterwards to
normalize main-block bodies to Operation A's exact output (guarantees --dry-run clean).

Usage:
    python inject_review_skill_blocks.py [--dry-run] [--skills=name1,name2]

Does NOT touch mirrors (.agents/, .codex/, AGENTS.md) — deferred per plan.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from line_endings import read_text, write_text
from sync_blocks import find_sync_region_start, has_guide_entry, load_wrapped_sync_block

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = PROJECT_ROOT / ".claude" / "skills"

BATCHING = [
    "changes-review", "code-quality-review",
    "security-audit", "ai-engineering-review",
    "performance-review", "production-readiness-review",
]
SEVERITY = [
    "code-quality-review", "changes-review",
    "security-audit",
    "ai-engineering-review",
    "performance-review", "production-readiness-review", "knowledge-review",
    "why-review", "code-simplifier",
    "feature-implement", "fix",
    # The main review workflow also emits and routes findings (and, in its optional `--fix-loop`
    # mode, classifies the findings its outer loop decides whether to fix); keep its local
    # round summaries pinned to the same canonical rubric as its child skills.
    "workflow-review-changes",
    # Workflow owners that summarize and route review findings must carry the same rubric as
    # their child skills; otherwise their local round summaries can silently drift.
    "workflow-bugfix", "workflow-feature", "workflow-integration-test",
]
CATEGORY = list(BATCHING)  # co-paired with batching

# Review skills that own convergence, grading, or a fix-loop. The single-pass `plan` review mode and
# `integration-test` review mode deliberately stay outside this full-body population and use only
# the targeted guides their one-pass contracts need. Declared ONCE
# because two tags below adopt this exact population, and maintaining the roster twice is
# how it drifts: GOAL_CONTRACT once fell a skill behind TRADE_OFF (missing
# a loop-orchestrator skill) and nothing detected it — verify-sync-adoption-parity.mjs compares
# declared carriers against injected blocks per tag, so two internally-consistent lists that
# disagree with EACH OTHER both pass. One roster makes that class of drift unrepresentable.
# Adding a review skill here adopts it into every ALL_REVIEW_SKILLS tag at once; a tag that
# must genuinely diverge replaces its alias below with its own literal list.
ALL_REVIEW_SKILLS = [
    "changes-review", "code-quality-review",
    # `integration-test --mode=verify --fix-loop` (Goal Contract + trade-off gated fixes) carries these bodies
    # inline in `integration-test/references/mode-verify.md`, so `integration-test` is not a roster member.
    "security-audit", "ai-engineering-review", "performance-review",
    "production-readiness-review", "knowledge-review",
    # `work-item --mode=review` converges the same way and carries its bodies inline in `work-item/references/mode-review.md`,
    # so `work-item` is not a roster member.
    "why-review",
    "workflow-review-changes",
]
# Save-goal-before-loop + read-goal-each-cycle + Goal-Satisfaction-matrix: every converging review skill
# anchors its loop to a persisted Goal Contract. verify-workflow-cycle-compliance.mjs is
# positive-only (no forbid rule for extra carriers), so this is additive-safe.
GOAL_CONTRACT = list(ALL_REVIEW_SKILLS)
# The 3-question trade-off gate (trade-off? worth it? material -> confirm with user).
# Every review skill, graders and loop-orchestrators included: a grader that scores a design
# without pricing what the design sacrifices is as incomplete as a finding-producer that
# recommends a fix without pricing it, and a fix-loop is exactly where an unpriced one-way
# door ships silently under convergence pressure. Additive-safe: no verifier forbids extra
# carriers of this tag (unlike retired convergence blocks, which graders must not carry per
# verify-review-validate-coverage.mjs).
TRADE_OFF = list(ALL_REVIEW_SKILLS)

# The UX-1..UX-11 journey-first gate (catalog: .claude/docs/ux-journey-process.md). It fixes the
# ORDER every design output follows -- report the main user journeys, read the project's design
# authority, only then generate -- so it binds the skills that GENERATE or COMMIT a user-facing
# surface (design, design-spec, `work-item --mode=mockup`) and the two that REVIEW such an artifact against
# its journeys (ui-design --mode=review walks the journeys on the built surface; `work-item --mode=review --type=design`
# checks the spec carries the Journey Report). The two `work-item` modes carry the body inline in
# `work-item/references/mode-mockup.md` and the UI section of `work-item/references/review-type-design.md`, so `work-item` is not a target. Deliberately NARROWER than DESIGN_DISTINCTIVENESS:
# the build spine (feature-implement, fix; plan --mode=execute keeps its UI guides in its mode reference) implements a design already derived from
# journeys upstream, and web-design-guidelines / scaffold / presentation skills do not derive a
# product surface from user journeys. Every body is self-gating on "has a user-facing surface".
UX_JOURNEY = [
    # design/author role — the Journey Report is the first deliverable
    "ui-design", "design-spec",
    # review role — walkthrough + traceability against the journeys (ui-design --mode=review is covered by the ui-design carrier above)
]

# The 40-clause UI/UX Design Principles. NOT an ALL_REVIEW_SKILLS tag — its carriers are the
# UI-surface skills across THREE roles (review · design/plan · build), which is a different
# population from "every review skill": most review skills never touch a user-facing surface,
# and two of these carriers (design and `work-item --mode=mockup`) are not review skills at all.
# Declared here so a canonical-body edit auto-propagates to every carrier and
# verify-sync-adoption-parity.mjs can sense drift; without the tag in MATRIX the bodies would
# silently fossilize at whatever they were on the day they were embedded.
UI_DESIGN_PRINCIPLES = [
    # review role — clauses are fail-conditions citing UI-<clause> + file:line (ui-design --mode=review reads the ui-design carrier)
    "web-design-guidelines",
    # design/plan role — clauses shape the artifact the skill authors
    "ui-design", "design-spec",
    # build role — `work-item --mode=mockup` emits real markup, so clauses are build constraints; it and
    # `work-item --mode=review --type=design` carry the body inline in `work-item/references/mode-*.md`.
]

# The DD-1..DD-8 design distinctiveness gate. A STRICT SUPERSET of UI_DESIGN_PRINCIPLES,
# because the two tags answer different questions and therefore bind different populations:
# the 40 UI-* clauses are a usability/accessibility FLOOR whose implementer gate already
# lives on the frontend agents plan --mode=execute routes UI work to, while DD-* asks whether the
# surface is THIS product's or any generator's -- a question that is decided upstream, in the
# scaffold and implementation planning, long before an agent renders a component. The lean
# `plan` skill references configured UI authority in its scope gate instead of loading three
# full visual protocols on every plan. So the extra carriers over
# UI_DESIGN_PRINCIPLES are the ones that COMMIT a visual direction without necessarily
# rendering it: `scaffold` (its golden-path frontend example sets the token and component
# defaults every later feature copies -- a generic example propagates further than a generic
# screen), `feature-implement` + `fix` (the build spine; `fix --target=ui`
# edits real surfaces), and `feature-presentation` (emits a standalone stakeholder deck, which
# is a designed artifact nobody else reviews). Each carries the block's own "Skip ONLY when
# there is no user-facing visual surface" clause, so backend-only runs cost one stated line.
DESIGN_DISTINCTIVENESS = [
    # review role — clauses are fail-conditions citing DD-<clause> + file:line
    "web-design-guidelines",
    # design/author role — the gate shapes the artifact the skill authors
    "ui-design", "design-spec", "feature-presentation", "presentation-builder",
    # foundation role — the golden-path frontend commits the initial visual direction
    "scaffold",
    # build role — emits real markup/styles, so the clauses are build constraints
    "feature-implement", "fix",
]

# Words-as-design-content. NARROWER than DESIGN_DISTINCTIVENESS on purpose: its body governs
# interface STRINGS (labels, CTAs, toasts, empty/error text), so it binds only skills that
# author or review such strings. Deliberately EXCLUDES `plan`/`scaffold` (they commit visual
# direction, not final copy), `work-item --mode=review` (it grades structure and a11y, not
# voice), and `feature-presentation` (slide prose is not interface copy -- only its rule 6
# would apply, and a block that is 5/6 inapplicable trains the reader to skim it).
UI_COPYWRITING = [
    "ui-design", "design-spec",
    "feature-implement",
    "web-design-guidelines",
]

# The CL-1..CL-6 front-end review checklist gate (catalog: .claude/docs/design-review-checklist.md).
# WIDER than DESIGN_DISTINCTIVENESS by the general `changes-review` carrier because this tag is
# the review PROCEDURE, not a taste rule. Single-pass `plan --mode=review` loads the checklist through
# its guide only when the plan contains UI work. Every full-body carrier is
# self-gating -- "N/A unless a user-facing front-end surface is present" -- so a backend-only
# review costs one skipped line, not a spurious section.
DESIGN_REVIEW_CHECKLIST = [
    # review role — the checklist IS the review protocol for any diff/artifact with a UI surface
    "web-design-guidelines",
    "changes-review",
    # design/author role — author against the checklist so the review finds nothing
    "ui-design", "design-spec",
    "feature-presentation", "presentation-builder",
    # foundation role — scaffold authors the reusable front-end example against the checklist
    "scaffold",
    # build role — emits real markup/styles, so the checks are build constraints
    "feature-implement", "fix",
]

# The E2E visual-design handoff. It is deliberately a separate bridge from the
# full UI/DD/CL populations: E2E skills need the same design authority, tier/reuse,
# runtime-vs-source ownership, and baseline gates, but most E2E invocations are
# non-visual and must remain explicitly N/A rather than carrying a visual review.
E2E_VISUAL_DESIGN = [
    "e2e-test", "workflow-e2e",
    "experience-review", "playwright-cli",
]

TEST_ARCHITECTURE_CONTRACT = [
    "scaffold", "harness-setup", "workflow-greenfield-init",
    "integration-test",
    "e2e-test", "workflow-e2e",
    "workflow-integration-test", "test",
    "seed-test-data",
]

# The AI-feature gate family (catalog: .claude/docs/ai-engineering-review-checklist.md). Three
# tags carry the AI-engineering clauses, and this injector adds them ONLY to the dedicated reviewer
# skill: a guide line makes the protocol hook deliver the full body on every load of the carrier, so a
# skill that plans, builds or reviews non-AI work would pay for a protocol it never applies. Every other
# skill holds ONE hand-written conditional pointer line at its routing point instead (see
# `ai-gate-zero-cost.test.cjs`). No skill holds a guide line for these protocols: the `plan` and
# `integration-test` review modes (`plan/references/mode-review.md`, `integration-test/references/mode-review.md`)
# hold a conditional pointer line instead. Do NOT add any other skill to these lists.
AI_FEATURE_FRAMING = ["ai-engineering-review"]
AI_ENGINEERING_FLOOR = ["ai-engineering-review"]
AI_REVIEW_PROCEDURE = ["ai-engineering-review"]

# Canonical apply order per skill (stable, cosmetic only).
# One adoption owner; the parity verifier parses this roster rather than maintaining
# a second list. Architecture owns full bodies in its selected mode references;
# agents adopt applicable quality bodies through agent_protocol_matrix.py.
MEASURED_CAPACITY = [
    "performance-review", "production-readiness-review",
    "plan", "tech-stack-research", "scaffold", "harness-setup",
    "feature-implement", "fix", "test", "integration-test", "e2e-test",
    "seed-test-data", "security-audit", "ai-engineering-review",
    "changes-review", "code-quality-review", "why-review", "workflow-review-changes",
    "workflow-greenfield-init", "workflow-big-feature",
]

# Review/audit entrypoints and explicit review modes; the body is inactive in non-review modes.
REVIEW_DECISIONS = [
    "ai-engineering-review",
    "architecture",
    "changes-review",
    "code-quality-review",
    "domain-analysis",
    "experience-review",
    "integration-test",
    "knowledge-review",
    "performance-review",
    "production-readiness-review",
    "security-audit",
    "ui-design",
    "web-design-guidelines",
    "why-review",
    "workflow-architecture-audit",
    "workflow-review-changes",
    "plan",
    "work-item",
    "spec",
    "seed-test-data",
    "e2e-test",
    "tech-spec",
    "scan-codebase-health",
    "presentation-builder",
    "design-spec",
    "code-simplifier",
    "custom-agent",
    "workflow-code-to-spec",
]

MATRIX = [
    ("SYNC:review-decision-autonomy", REVIEW_DECISIONS),
    ("SYNC:measured-capacity-engineering", MEASURED_CAPACITY),
    ("SYNC:systematic-review-batching", BATCHING),
    ("SYNC:severity-rubric", SEVERITY),
    ("SYNC:category-review-thinking", CATEGORY),
    ("SYNC:goal-contract-satisfaction-loop", GOAL_CONTRACT),
    ("SYNC:trade-off-interrogation-gate", TRADE_OFF),
    ("SYNC:ux-journey-gate", UX_JOURNEY),
    ("SYNC:ui-ux-design-principles", UI_DESIGN_PRINCIPLES),
    ("SYNC:design-distinctiveness-gate", DESIGN_DISTINCTIVENESS),
    ("SYNC:ui-copywriting", UI_COPYWRITING),
    ("SYNC:design-review-checklist", DESIGN_REVIEW_CHECKLIST),
    ("SYNC:e2e-visual-design-contract", E2E_VISUAL_DESIGN),
    ("SYNC:test-architecture-execution-contract", TEST_ARCHITECTURE_CONTRACT),
    ("SYNC:ai-feature-framing-gate", AI_FEATURE_FRAMING),
    ("SYNC:ai-engineering-gate", AI_ENGINEERING_FLOOR),
    ("SYNC:ai-review-checklist", AI_REVIEW_PROCEDURE),
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
    elif has_guide_entry(text, tag.removeprefix("SYNC:")):
        status["top"] = "guided"  # carried as a guide line; its reminder is still refreshed below
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


def resolve_targets(argv: list[str], available: set[str]) -> list[str]:
    """Resolve an optional comma-separated skill subset without changing matrix order."""
    requested: list[str] = []
    has_filter = False
    for arg in argv:
        if arg.startswith("--skills="):
            has_filter = True
            requested.extend(x.strip() for x in arg.split("=", 1)[1].split(",") if x.strip())

    if has_filter and not requested:
        raise SystemExit("--skills= requires at least one skill name")

    selected = requested if has_filter else sorted(available)
    unknown = [skill for skill in selected if skill not in available]
    if unknown:
        raise SystemExit(f"Unknown skill(s): {', '.join(sorted(set(unknown)))}")

    seen: set[str] = set()
    ordered: list[str] = []
    for skill in selected:
        if skill not in seen:
            seen.add(skill)
            ordered.append(skill)
    return ordered


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    known = ("--dry-run", "--skills=")
    unknown = [a for a in sys.argv[1:] if not any(a == k or a.startswith(k) for k in known)]
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
    targets = resolve_targets(sys.argv[1:], set(skill_tags))
    for skill in targets:
        path = find_skill_path(skill)
        if path is None:
            results.append((skill, "MISSING", {}))
            continue
        original, newline = read_text(path)
        text = original
        per_tag = {}
        for tag in skill_tags[skill]:
            text, st = inject_tag(text, tag)
            per_tag[tag] = st
        if text == original:
            results.append((skill, "NO-CHANGE", per_tag))
            continue
        if not dry_run:
            write_text(path, text, newline)
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
    missing = sum(1 for _, k, _ in results if k == "MISSING")
    print(f"\nFiles {'would change' if dry_run else 'changed'}: {changed}  (dry-run={dry_run})")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())

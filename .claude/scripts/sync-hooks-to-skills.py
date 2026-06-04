#!/usr/bin/env python3
"""
sync-hooks-to-skills.py
Inserts SYNC: blocks sourced from canonical (sync-inline-versions.md) into all
SKILL.md and agent .md files. Idempotent: skips files that already contain a block.

Tiered blocks (agents):
  Core-5 (every agent):
    - SYNC:critical-thinking-mindset
    - SYNC:ai-mistake-prevention
    - SYNC:sequential-thinking-protocol
    - SYNC:task-tracking-external-report
    - SYNC:project-reference-docs-guide
  Code-9 (Core-5 + 4, for code/review agents in CODE_AGENTS):
    - SYNC:understand-code-first
    - SYNC:evidence-based-reasoning
    - SYNC:cross-service-check
    - SYNC:fix-layer-accountability
Skills keep the original 2-block SKILL_BLOCK_ORDER (no skills regression).

Agent tier is set by explicit CODE_AGENTS / CORE_ONLY_AGENTS membership; an
unclassified or double-classified agent raises (no silent default).

Insertion point: after the first block of > lines (the [IMPORTANT] header), before ## headings.
Reminder lines: appended inside ## Closing Reminders if the section exists (only
for blocks that have a :reminder variant).
"""

import os
import sys
import glob as glob_module

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ─── Canonical block content ────────────────────────────────────────────────

BLOCKS = {
    "critical-thinking-mindset": """\
<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->""",

    "ai-mistake-prevention": """\
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
**Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->""",

    "sequential-thinking-protocol": """\
<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `/sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->""",

    "task-tracking-external-report": """\
<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->""",

    "project-reference-docs-guide": """\
<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->""",

    "understand-code-first": """\
<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->""",

    "evidence-based-reasoning": """\
<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->""",

    "cross-service-check": """\
<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->""",

    "fix-layer-accountability": """\
<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

<!-- /SYNC:fix-layer-accountability -->""",
}

REMINDERS = {
    "critical-thinking-mindset": """\
  <!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->""",

    "ai-mistake-prevention": """\
  <!-- SYNC:ai-mistake-prevention:reminder -->
**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->""",

    "sequential-thinking-protocol": """\
  <!-- SYNC:sequential-thinking-protocol:reminder -->
**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `/sequential-thinking` skill.
  <!-- /SYNC:sequential-thinking-protocol:reminder -->""",

    "task-tracking-external-report": """\
  <!-- SYNC:task-tracking-external-report:reminder -->
- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.
  <!-- /SYNC:task-tracking-external-report:reminder -->""",

    "project-reference-docs-guide": """\
  <!-- SYNC:project-reference-docs-guide:reminder -->
- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.
  <!-- /SYNC:project-reference-docs-guide:reminder -->""",

    "cross-service-check": """\
  <!-- SYNC:cross-service-check:reminder -->
**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.
  <!-- /SYNC:cross-service-check:reminder -->""",
}

# ─── Tier ordering ───────────────────────────────────────────────────────────
# Skills keep the original 2-block order (no skills regression).
SKILL_BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention"]

# Core-5: every agent. (critical-thinking + ai-mistake already present in agents.)
CORE_BLOCK_ORDER = [
    "critical-thinking-mindset",
    "ai-mistake-prevention",
    "sequential-thinking-protocol",
    "task-tracking-external-report",
    "project-reference-docs-guide",
]

# Code-9: Core-5 + 4 code-investigation blocks for agents that read/review code.
CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + [
    "understand-code-first",
    "evidence-based-reasoning",
    "cross-service-check",
    "fix-layer-accountability",
]

# Explicit tier membership by agent basename. find_target_files() raises on any
# agent in neither set (or both) — no silent default. Mirrors the regression
# test's completeness assertion so tooling + test enforce one invariant.
CODE_AGENTS = {
    "architect", "backend-developer", "code-reviewer", "code-simplifier",
    "database-admin", "debugger", "e2e-runner", "framework-maintainer", "frontend-developer",
    "fullstack-developer", "integration-tester", "performance-optimizer",
    "planner", "researcher", "scout", "scout-external", "security-auditor",
    "solution-architect", "spec-compliance-reviewer", "tester", "ui-ux-designer",
}
CORE_ONLY_AGENTS = {
    "business-analyst", "docs-manager", "git-manager", "journal-writer",
    "knowledge-worker", "product-owner", "project-manager", "qc-specialist",
}


# ─── File discovery ──────────────────────────────────────────────────────────

def find_target_files(agents_only=False):
    """Return [(path, block_order)] — skills get SKILL_BLOCK_ORDER; each agent is
    classified by explicit tier membership. Raises SystemExit on any agent that is
    unclassified or double-classified (no silent default).
    agents_only=True skips skills (scope a run to .claude/agents)."""
    skills_pattern = os.path.join(PROJECT_DIR, ".claude", "skills", "*", "SKILL.md")
    agents_pattern = os.path.join(PROJECT_DIR, ".claude", "agents", "*.md")

    targets = [] if agents_only else [
        (path, SKILL_BLOCK_ORDER) for path in sorted(glob_module.glob(skills_pattern))
    ]

    for path in sorted(glob_module.glob(agents_pattern)):
        name = os.path.splitext(os.path.basename(path))[0]
        in_code = name in CODE_AGENTS
        in_core = name in CORE_ONLY_AGENTS
        if in_code and in_core:
            raise SystemExit(
                f"Agent '{name}' is in BOTH CODE_AGENTS and CORE_ONLY_AGENTS - "
                f"put it in exactly one (edit {os.path.basename(__file__)})."
            )
        if not in_code and not in_core:
            raise SystemExit(
                f"Unclassified agent: '{name}' - add it to CODE_AGENTS or "
                f"CORE_ONLY_AGENTS (edit {os.path.basename(__file__)})."
            )
        targets.append((path, CODE_BLOCK_ORDER if in_code else CORE_BLOCK_ORDER))

    return targets


# ─── Insertion logic ─────────────────────────────────────────────────────────

def find_frontmatter_end(lines):
    """Return index of the line AFTER the closing --- of frontmatter. 0 if no frontmatter."""
    if not lines or lines[0].strip() != "---":
        return 0
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return i + 1
    return 0


def find_body_insert_point(lines, fm_end):
    """
    Find insertion point: after the first contiguous block of > lines past frontmatter.
    If no > block exists, return fm_end (insert right after frontmatter).
    """
    i = fm_end
    # Skip leading blank lines
    while i < len(lines) and not lines[i].strip():
        i += 1

    if i >= len(lines):
        return i

    # If first content is a > block, consume it (including interior blank lines)
    if lines[i].startswith(">"):
        # Walk forward through > lines and blank separators between > paragraphs
        j = i
        while j < len(lines):
            stripped = lines[j].strip()
            if stripped.startswith(">"):
                j += 1
            elif stripped == "":
                # Peek ahead — if next non-blank is also >, continue; else stop
                k = j + 1
                while k < len(lines) and not lines[k].strip():
                    k += 1
                if k < len(lines) and lines[k].startswith(">"):
                    j = k
                else:
                    break
            else:
                break
        return j  # insert after the > block

    # No > block — insert right at start of content
    return i


def find_closing_reminders_end(lines):
    """
    Return index just before the end of ## Closing Reminders section.
    Returns -1 if the section doesn't exist.
    """
    start = -1
    for i, line in enumerate(lines):
        if line.strip().startswith("## Closing Reminders"):
            start = i
            break
    if start == -1:
        return -1

    # Find end: next ## heading or EOF
    for i in range(start + 1, len(lines)):
        if lines[i].startswith("## ") or lines[i].startswith("# "):
            return i  # insert before this heading
    return len(lines)  # insert at EOF


def block_present(content, block_name):
    return f"<!-- SYNC:{block_name} -->" in content or f"<!-- SYNC:{block_name}:reminder -->" in content


def process_file(path, block_order, dry_run=False):
    with open(path, "r", encoding="utf-8") as f:
        original = f.read()

    lines = original.splitlines()

    missing_blocks = [name for name in block_order if not block_present(original, name)]
    # Reminder backfill is deliberately coupled to fresh main-block insertion.
    # A block qualifies only if (a) it HAS a reminder variant — the code blocks
    # beyond cross-service-check have none, KeyError otherwise — AND (b) its MAIN
    # block is also absent. The `main not in original` clause is an INTENTIONAL
    # retrofit guard, not dead code: the generator bootstraps brand-new files with
    # main+reminder together, but never retrofits a reminder onto a file that
    # already carries the main block and deliberately omits the reminder (e.g.
    # workflow-* orchestration skills). Do NOT drop the 3rd clause — verified:
    # removing it retrofits 32 reminders across 16 workflow/setup skills.
    missing_reminders = [name for name in block_order
                         if name in REMINDERS
                         and f"<!-- SYNC:{name}:reminder -->" not in original
                         and f"<!-- SYNC:{name} -->" not in original]

    if not missing_blocks and not missing_reminders:
        return "skip"

    fm_end = find_frontmatter_end(lines)
    insert_at = find_body_insert_point(lines, fm_end)

    # Build the block text to inject
    blocks_to_insert = []
    for name in block_order:
        if name in missing_blocks:
            blocks_to_insert.append(BLOCKS[name])

    if blocks_to_insert:
        insert_text = "\n\n" + "\n\n".join(blocks_to_insert) + "\n"
        insert_lines = insert_text.splitlines()
        lines = lines[:insert_at] + insert_lines + lines[insert_at:]

    # Re-compute content for reminder insertion (lines may have shifted)
    content_after_blocks = "\n".join(lines)

    if missing_reminders:
        lines2 = content_after_blocks.splitlines()
        closing_end = find_closing_reminders_end(lines2)
        if closing_end != -1:
            reminder_lines = []
            for name in block_order:
                if name in missing_reminders and f"<!-- SYNC:{name}:reminder -->" not in content_after_blocks:
                    reminder_lines.extend(REMINDERS[name].splitlines())
            if reminder_lines:
                lines2 = lines2[:closing_end] + reminder_lines + lines2[closing_end:]
        content_after_blocks = "\n".join(lines2)

    if not dry_run:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content_after_blocks)

    return "updated"


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    agents_only = "--agents-only" in sys.argv

    targets = find_target_files(agents_only=agents_only)
    if not targets:
        print("No target files found. Check PROJECT_DIR.")
        sys.exit(1)

    updated = 0
    skipped = 0
    errors = []

    for path, block_order in targets:
        rel = os.path.relpath(path, PROJECT_DIR)
        try:
            result = process_file(path, block_order, dry_run=dry_run)
            if result == "updated":
                updated += 1
                if verbose:
                    print(f"  [updated] {rel}")
            else:
                skipped += 1
                if verbose:
                    print(f"  [skip]    {rel}")
        except Exception as e:
            errors.append((rel, str(e)))
            print(f"  [ERROR]   {rel}: {e}")

    mode = "(dry-run) " if dry_run else ""
    print(f"\n{mode}Done: {updated} updated, {skipped} skipped, {len(errors)} errors / {len(targets)} total files")
    if errors:
        print("\nErrors:")
        for rel, msg in errors:
            print(f"  {rel}: {msg}")
        sys.exit(1)


if __name__ == "__main__":
    main()

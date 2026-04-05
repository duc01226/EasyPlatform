---
name: cook
version: 1.0.0
description: '[Implementation] Implement a feature [step by step]'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)
- `docs/test-specs/` — Test specifications by module (read existing TCs; generate/update test specs via `/tdd-spec` after implementation)

<!-- SYNC:plan-quality -->

> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
>
> 1. Add `## Test Specifications` section with TC-{FEAT}-{NNN} IDs to every phase file
> 2. Map every functional requirement to ≥1 TC (or explicit `TBD` with rationale)
> 3. TC IDs follow `TC-{FEATURE}-{NNN}` format — reference by ID, never embed full content
> 4. Before any new workflow step: call `TaskList` and re-read the phase file
> 5. On context compaction: call `TaskList` FIRST — never create duplicate tasks
> 6. Verify TC satisfaction per phase before marking complete (evidence must be `file:line`, not TBD)
>
> **Mode:** TDD-first → reference existing TCs with `Evidence: TBD`. Implement-first → use TBD → `/tdd-spec` fills after.

<!-- /SYNC:plan-quality -->

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

## Quick Summary

**Goal:** Implement a feature step-by-step with research, planning, execution, and verification.

**Workflow:**

1. **Question** — Clarify requirements via AskUserQuestion; challenge assumptions
2. **Research** — Use researcher subagents in parallel; scout codebase for patterns
3. **Plan** — Create implementation plan, get user approval
4. **Implement** — Execute with skill activation, code-simplifier, review-changes

**Key Rules:**

- Parent skill for all cook-\* variants (cook-auto, cook-fast, cook-hard, cook-parallel)
- Write research findings to `.ai/workspace/analysis/` for context preservation
- Always activate relevant skills from catalog during implementation
- Break work into small todo tasks; add final review task

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

<HARD-GATE>
Do NOT start coding until you have a plan (approved or self-created) and have searched
the codebase for 3+ similar implementations. This applies to EVERY feature regardless
of perceived simplicity. "Simple" features have hidden complexity.
</HARD-GATE>

## Pre-Implementation Granularity Gate (MANDATORY)

<HARD-GATE>

<!-- SYNC:plan-granularity -->

> **Plan Granularity** — Every phase must pass 5-point check before implementation:
>
> 1. Lists exact file paths to modify (not generic "implement X")
> 2. No planning verbs (research, investigate, analyze, determine, figure out)
> 3. Steps ≤30min each, phase total ≤3h
> 4. ≤5 files per phase
> 5. No open decisions or TBDs in approach
>
> **Failing phases →** create sub-plan. Repeat until ALL leaf phases pass (max depth: 3).
> **Self-question:** "Can I start coding RIGHT NOW? If any step needs 'figuring out' → sub-plan it."

<!-- /SYNC:plan-granularity -->

If ANY check fails → STOP. Ask user: "Phase needs more detail before implementation. Refine with /plan? [Y/n]"
DO NOT implement a phase that contains planning verbs, unnamed files, or unresolved decisions.
</HARD-GATE>

## Per-Phase Quality Cycle (MANDATORY)

<HARD-GATE>
<!-- SYNC:iterative-phase-quality -->

> **Iterative Phase Quality** — Score complexity BEFORE planning.
>
> **Complexity signals:** >5 files +2, cross-service +3, new pattern +2, DB migration +2
> **Score >=6 →** MUST ATTENTION decompose into phases. Each phase:
>
> - ≤5 files modified
> - ≤3h effort
> - Follows cycle: plan → implement → review → fix → verify
> - Do NOT start Phase N+1 until Phase N passes VERIFY
>
> **Phase success = all TCs pass + code-reviewer agent approves + no CRITICAL findings.**

<!-- /SYNC:iterative-phase-quality -->

Each plan phase = one quality cycle (plan→implement→review→fix→verify).
DO NOT start next phase until current phase passes VERIFY.
After each phase: re-assess remaining phases for scope changes.
</HARD-GATE>

## TC Satisfaction Verification (Per Phase)

After implementing each phase, before marking it complete:

1. Read the phase's `## Test Specifications` section
2. For each mapped TC: verify evidence exists (file:line, not TBD), grep-verify the file
3. If any TC lacks evidence → phase is NOT complete
4. Update phase file's TC table with actual evidence references

## Greenfield Mode

> **Auto-detected** when no code directories (`src/`, `app/`, `lib/`, `packages/`) or manifests (`package.json`/`*.sln`/`go.mod`) exist.

1. **Approved plan exists** in `plans/` → scaffold from plan
2. **No plan** → redirect: "Run /plan first to create a greenfield project plan."
3. Generate folder layout, starter files, build config, CI skeleton, CLAUDE.md
4. Skip codebase pattern search. After scaffolding, run `/project-config`.

## Variant Decision Guide

| If implementation needs...  | Use                   | Why                                     |
| --------------------------- | --------------------- | --------------------------------------- |
| Quick, straightforward      | `/cook-fast`          | Skip deep research, minimal planning    |
| Complex, multi-layer        | `/cook-hard`          | Maximum verification, subagent research |
| Backend + frontend parallel | `/cook-parallel`      | Parallel fullstack-developer agents     |
| Full autonomous execution   | `/cook-auto`          | Minimal user interaction                |
| Fast autonomous             | `/cook-auto-fast`     | Auto + skip deep research               |
| Parallel autonomous         | `/cook-auto-parallel` | Auto + parallel agents                  |
| General/interactive         | `/cook` (this skill)  | Step-by-step with user collaboration    |

Think harder to plan & start working on these tasks:
<tasks>$ARGUMENTS</tasks>

---

## Your Approach

- MUST ATTENTION use `AskUserQuestion` to clarify — NEVER assume requirements
- MUST ATTENTION be brutally honest — flag unrealistic/over-engineered approaches directly
- MUST ATTENTION present 2-3 alternatives with pros/cons for non-trivial decisions
- MUST ATTENTION challenge initial approach — the best solution often differs from first instinct

---

## Workflow

**IMPORTANT:** Analyze the skills catalog at `.claude/skills/*` and activate needed skills during the process.

### Research

- Parallel `researcher` subagents. Reports <=150 lines with citations.
- `/scout-ext` (preferred) or `/scout` (fallback) for codebase search.
- MUST ATTENTION write findings to `.ai/workspace/analysis/{task-name}.analysis.md`. Re-read ENTIRE file before planning.

### Plan

- `planner` subagent with progressive disclosure: `plan.md` (<=80 lines) + `phase-XX-name.md` per phase.
- Each phase: Context, Overview, Requirements, Architecture, Related Files, Steps, TCs, Success Criteria, Risks, Next Steps.

### Implementation

- `/code` to implement step by step. `/interface-design` for product UIs. `/frontend-design` for marketing/creative UIs.
- `ui-ux-designer` subagent for frontend per `./docs/design-guidelines.md`.
- MUST ATTENTION run type checking and compile after each change.

**Subagent Discipline:** Paste full task text (NEVER make subagent read plan file). Require "ask questions before starting". Require self-review before reporting.

### Batch Checkpoint (Large Plans)

For plans with 10+ tasks, execute in batches with human review:

1. **Execute batch** — Complete next 3 tasks (or user-specified batch size)
2. **Report** — Show what was implemented, verification output, any concerns
3. **Wait** — Say "Ready for feedback" and STOP. Do NOT continue automatically.
4. **Apply feedback** — Incorporate changes, then execute next batch
5. **Repeat** until all tasks complete

<HARD-GATE>
For plans with 10+ tasks, do NOT execute all tasks continuously without checkpoint.
Stop after every batch for human review. This prevents runaway execution where early
mistakes compound through later tasks.
</HARD-GATE>

### Testing

- Real tests: happy path, edge cases, error cases. NEVER fake data/mocks just to pass build.
- `tester` subagent → failures → `debugger` subagent → fix → repeat until green.

### Code Review

<!-- SYNC:two-stage-task-review -->

> **Two-Stage Task Review** — Both stages MUST ATTENTION complete before marking task done.
>
> **Stage 1: Self-review** — Immediately after implementation:
>
> - Requirements met? No regressions? Code quality acceptable?
>
> **Stage 2: Cross-review** — Via `code-reviewer` subagent:
>
> - Catches blind spots, convention drift, missed edge cases
>
> **NEVER skip Stage 2.** Self-review alone misses 40%+ of issues.

<!-- /SYNC:two-stage-task-review -->

(1) `spec-compliance-reviewer` first, (2) `code-reviewer` after spec passes.

- Critical issues → fix → re-run `tester`. Report summary to user for approval.

### PM, Docs & Final Report

- **Approved:** Parallel `project-manager` + `docs-manager` subagents. **Rejected:** Ask issues, fix, repeat.
- Final: summary of changes + next steps. Ask about commit/push via `git-manager`.

## Red Flags — STOP

| Evasion thought                     | Correct action                                         |
| ----------------------------------- | ------------------------------------------------------ |
| "Too simple for a plan"             | Plan anyway. Hidden complexity.                        |
| "I already know how"                | Check codebase patterns first. NEVER assume.           |
| "Code first, test later"            | Write test first. Or verify after EACH change.         |
| "Plan is close enough"              | Follow exactly or raise concerns. Drift compounds.     |
| "Commit after everything"           | Commit after each task. Frequent commits prevent loss. |
| "This refactor will improve things" | Only refactor what's in scope. YAGNI.                  |
| "Review is obvious, skip it"        | NEVER skip. Reviews catch what authors miss.           |

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

> After implementing, run `python .claude/scripts/code_graph connections <file> --json` on modified files to verify no related files need updates.

### Graph-Trace Before Implementation

MUST ATTENTION run BEFORE writing code when graph.db exists:

- `python .claude/scripts/code_graph trace <file-to-modify> --direction both --json` — callers + triggers
- `python .claude/scripts/code_graph trace <file-to-modify> --direction downstream --json` — all downstream consumers
- Prevents breaking implicit dependencies (bus consumers, event handlers) invisible in the file itself.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `feature` workflow** (Recommended) — scout → investigate → plan → cook → review → sre-review → test → docs
> 2. **Execute `/cook` directly** — run this skill standalone

---

## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (feature implemented). This ensures review, testing, and docs steps aren't skipped.
- **"/code-simplifier"** — Simplify and clean up implementation
- **"/workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

## Standalone Review Gate (Non-Workflow Only)

> **MANDATORY IMPORTANT MUST ATTENTION:** If this skill is called **outside a workflow** (standalone `/cook`), you MUST ATTENTION create a `TaskCreate` todo task for `/review-changes` as the **last task** in your task list. This ensures all changes are reviewed before commit even without a workflow enforcing it.
>
> If already running inside a workflow (e.g., `feature`, `bugfix`), skip this — the workflow sequence handles `/review-changes` at the appropriate step.

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

<!-- SYNC:plan-granularity:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** verify all phases pass 5-point granularity check. Failing phases → sub-plan. "Can I start coding RIGHT NOW?"
      <!-- /SYNC:plan-granularity:reminder -->

                    <!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
    <!-- /SYNC:understand-code-first:reminder -->
    <!-- SYNC:plan-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.
    <!-- /SYNC:plan-quality:reminder -->
    <!-- SYNC:rationalization-prevention:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** follow ALL steps regardless of perceived simplicity. "Too simple to plan" is an evasion, not a reason.
    <!-- /SYNC:rationalization-prevention:reminder -->
    <!-- SYNC:ui-system-context:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
    <!-- /SYNC:ui-system-context:reminder -->
    <!-- SYNC:iterative-phase-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** score complexity first. Score >=6 → decompose. Each phase: plan → implement → review → fix → verify. No skipping.
    <!-- /SYNC:iterative-phase-quality:reminder -->
    <!-- SYNC:graph-assisted-investigation:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
  <!-- /SYNC:graph-assisted-investigation:reminder -->

---
name: code
version: 1.0.0
description: '[Implementation] Start coding & testing an existing plan'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

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

- `docs/project-reference/frontend-patterns-reference.md` (content auto-injected by hook — check for [Injected: ...] header before reading)
- `docs/project-reference/scss-styling-guide.md` — Styling/BEM guide (read when task involves frontend/UI)
- `docs/project-reference/design-system/README.md` — Design system tokens (read when task involves frontend/UI)
- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Execute an existing implementation plan phase-by-phase with testing, code review, and user approval gates.

**Workflow:**

1. **Plan Detection** — Find latest plan or use provided path, select next incomplete phase
2. **Analysis & Tasks** — Extract tasks from phase file into TaskCreate
3. **Implementation** — Implement step-by-step, run type checks
4. **Testing** — Call tester subagent; must reach 100% pass before proceeding
5. **Code Review** — Call code-reviewer subagent; must reach 0 critical issues
6. **User Approval** — BLOCKING gate: wait for explicit user approval
7. **Finalize** — Update status, docs, and auto-commit

**Key Rules:**

- Tests must be 100% passing (Step 3 gate)
- Critical issues must be 0 (Step 4 gate)
- User must explicitly approve before finalize (Step 5 gate)
- One plan phase per command run

**MUST ATTENTION READ** `CLAUDE.md` then **THINK HARDER** to start working on the following plan:

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<plan>$ARGUMENTS</plan>

---

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

---

## Step 0: Plan Detection & Phase Selection

**If `$ARGUMENTS` is empty:**

1. Find latest `plan.md` in `./plans`
2. Parse plan for phases and status, auto-select next incomplete (prefer IN_PROGRESS or earliest Planned)

**If `$ARGUMENTS` provided:** Use that plan and detect which phase to work on.

**Output:** `✓ Step 0: [Plan Name] - [Phase Name]`

---

## Workflow Sequence

**Rules:** Follow steps 1-6 in order. Each step requires output marker `✓ Step N:`. Mark each complete in TaskCreate before proceeding. Do not skip steps.

---

## Step 1: Analysis & Task Extraction

Read plan file completely. Map dependencies. List ambiguities. Identify required skills and activate from catalog. If the plan references analysis files in `.ai/workspace/analysis/`, re-read them before implementation.

**TaskCreate Initialization:**

- Initialize TaskCreate with `Step 0: [Plan Name] - [Phase Name]` and all steps (1-6)
- Read phase file, look for tasks/steps/phases/sections/numbered/bulleted lists
- Convert to TaskCreate tasks with UNIQUE names:
    - Phase Implementation tasks → Step 2.X (Step 2.1, Step 2.2, etc.)
    - Phase Testing tasks → Step 3.X
    - Phase Code Review tasks → Step 4.X

**Output:** `✓ Step 1: Found [N] tasks across [M] phases - Ambiguities: [list or "none"]`

---

## Step 2: Implementation

Implement selected plan phase step-by-step following extracted tasks. Mark tasks complete as done. For UI work, call `ui-ux-designer` subagent. Run type checking and compile to verify.

**Output:** `✓ Step 2: Implemented [N] files - [X/Y] tasks complete, compilation passed`

---

## Step 3: Testing

Call `tester` subagent. If ANY tests fail: STOP, call `debugger` subagent, fix, re-run. Repeat until 100% pass.

**Testing standards:** Unit tests may use mocks. Integration tests use test environment. Forbidden: commenting out tests, changing assertions to pass, TODO/FIXME to defer fixes.

**Output:** `✓ Step 3: Tests [X/X passed] - All requirements met`

**Validation:** If X ≠ total, Step 3 INCOMPLETE - do not proceed.

---

## Step 4: Code Review

Call `code-reviewer` subagent. If critical issues found: STOP, fix, re-run `tester`, re-run `code-reviewer`. Repeat until no critical issues.

**Output:** `✓ Step 4: Code reviewed - [0] critical issues`

**Validation:** If critical issues > 0, Step 4 INCOMPLETE - do not proceed.

---

## Step 5: User Approval ⏸ BLOCKING GATE

Present summary (3-5 bullets): what implemented, tests passed, code review outcome.

**Ask user explicitly:** "Phase implementation complete. All tests pass, code reviewed. Approve changes?"

**Stop and wait** - do not proceed until user responds.

**Output:** `✓ Step 5: User approved - Ready to complete`

---

## Step 6: Finalize

**Prerequisites:** User approved in Step 5.

1. **STATUS UPDATE (PARALLEL):**
    - Call `project-manager` subagent to update plan status
    - Call `docs-manager` subagent to update documentation

2. **ONBOARDING CHECK:** Detect onboarding requirements + generate summary.

3. **AUTO-COMMIT:** Call `git-manager` subagent. Run only if Steps 1-2 successful + User approved + Tests passed.

**Output:** `✓ Step 6: Finalize - Status updated - Git committed`

---

## Critical Enforcement Rules

**Step output format:** `✓ Step [N]: [Brief status] - [Key metrics]`

**TaskCreate tracking required:** Initialize at Step 0, mark each step complete before next.

**Mandatory subagent calls:** Step 3: `tester` | Step 4: `code-reviewer` | Step 6: `project-manager` AND `docs-manager` AND `git-manager`

**Blocking gates:**

- Step 3: Tests must be 100% passing
- Step 4: Critical issues must be 0
- Step 5: User must explicitly approve

Do not skip steps. Do not proceed if validation fails. Do not assume approval without user response. One plan phase per command run.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `refactor` workflow** (Recommended) — scout → investigate → plan → code → review → sre-review → test → docs
> 2. **Execute `/code` directly** — run this skill standalone

---

## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (code implemented). This ensures review, testing, and docs steps aren't skipped.
- **"/code-simplifier"** — Simplify implementation
- **"/integration-test"** — Generate/update integration tests from test specs
- **"/workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

## Standalone Review Gate (Non-Workflow Only)

> **MANDATORY IMPORTANT MUST ATTENTION:** If this skill is called **outside a workflow** (standalone `/code`), you MUST ATTENTION create a `TaskCreate` todo task for `/review-changes` as the **last task** in your task list. This ensures all changes are reviewed before commit even without a workflow enforcing it.
>
> If already running inside a workflow (e.g., `feature`, `refactor`), skip this — the workflow sequence handles `/review-changes` at the appropriate step.

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

<!-- SYNC:plan-granularity:reminder -->

- **IMPORTANT MUST ATTENTION** verify all phases pass 5-point granularity check. Failing phases → sub-plan. "Can I start coding RIGHT NOW?"
      <!-- /SYNC:plan-granularity:reminder -->

                    <!-- SYNC:understand-code-first:reminder -->

- **IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
  <!-- /SYNC:understand-code-first:reminder -->
- **IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting

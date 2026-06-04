---
name: plan-execute
description: '[Implementation] Use when you need to start coding & testing an existing plan. Flags: --approval=off (auto/trust mode, no approval gate), --tests=off (skip the test step), --parallel (parallel phase execution via subagents).'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Land the selected plan phase as working, fully-tested, reviewed, user-approved code — executing it phase-by-phase through testing, code review, and approval gates — committed only after every quality gate (100% tests, 0 critical issues, explicit approval) passes — NEVER bypass a gate to declare done.

**Summary:**

- Consumes an EXISTING plan (Step 0 detects `plans/*.md`, selects the next incomplete phase, one phase per run) — use `$feature-implement` instead when no plan exists yet.
- Drives the 7-step spine with three BLOCKING gates that cannot be faked-green: Step 3 tests 100% pass (loop `tester`→`debugger`), Step 4 zero critical issues (`code-reviewer`), Step 5 explicit user approval before Step 6 Finalize/auto-commit.
- The Pre-Implementation Granularity Gate and bugfix Trace Gate STOP the run before coding — refuse phases with planning verbs / unnamed files / unresolved decisions, and require the End→Start debugger trace for bug/regression plans.
- Mode flags only add/remove a single step, never relax a running gate: `--approval=off` (auto/trust, skip Step 5, optional `$ALL_PHASES` loop), `--tests=off` (skip Step 3), `--parallel` (dispatch `fullstack-developer` subagents per file-owned phase).
- Standalone (no parent workflow via the current task list) → wrap in the plan → plan-review → proceed → `$review-changes` → `$why-review` quality loop.

> **Slash-command routing:** `/code`, `/code-auto`, `/code-no-test`, `/code-parallel` no longer resolve — use `$plan-execute` with the matching flag: `/code-auto` → `--approval=off`, `/code-no-test` → `--tests=off`, `/code-parallel` → `--parallel`.

**Workflow:**

1. **Plan Detection** — Find latest plan or use provided path, select next incomplete phase
2. **Analysis & Tasks** — Extract tasks from phase file into task tracking
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
- **Mode flags** (see [Mode Flags](#mode-flags)): `--approval=off` (auto/trust, no approval gate + optional all-phases loop), `--tests=off` (skip the test step), `--parallel` (dispatch parallel phases to subagents). No flags = full 7-step spine below.

**MUST ATTENTION READ** `CLAUDE.md` then **THINK HARDER** to start working on the following plan:

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<plan>$ARGUMENTS</plan>

---

> **plan-execute vs feature-implement:** `plan-execute` **executes an EXISTING plan** phase-by-phase (Step 0 detects `plans/*.md`) and owns the back of the pipeline — phase gates, auto-commit, and the `--parallel`/`--approval`/`--tests` flags. Use `$feature-implement` instead when you have only a feature description and need research + planning done first. feature-implement creates plans; plan-execute consumes them.

## Standalone Mode Pipeline (skip entirely if invoked inside a workflow)

> **MANDATORY — standalone `$plan-execute` only.** When this skill is invoked OUTSIDE a workflow, wrap the core spine (Steps 0-6) in this quality loop. Detect an active workflow via the current task list FIRST: if a parent `[Workflow]` row exists, SKIP this section — the surrounding workflow already sequences plan/review/why-review (e.g. `workflow-refactor`).
>
> Create these as task tracking tasks up front, in order, then execute them:
>
> 1. **`$plan`** — if Step 0 finds no plan for the request, author one first. If a plan already exists, record that and skip to step 2.
> 2. **`$plan-review`** — recursively review/validate the plan; fix validated findings before proceeding.
> 3. **Proceed** — run the core spine (Steps 0-6) against the approved plan.
> 4. **`$review-changes`** — review the diff before commit (the post-gate; see _Standalone Review Gate_ below).
> 5. **`$why-review`** — review rationale and change quality of the implementation.
>
> This is the single pre+post quality loop for standalone runs.

## Mode Flags

`$plan-execute` runs the full step spine below by default. Optional flags adapt the spine for the cases formerly served by dedicated skills — each flag only adds or removes a single step against the **host step numbering** (Step 3 Testing, Step 4 Code Review, Step 5 User Approval, Step 6 Finalize); the shared spine and every quality bar are otherwise unchanged.

| Flag                   | Default | Effect                                                                                                                                                                    |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--approval={on\|off}` | `on`    | `off` = **trust/auto mode**: skip the Step 5 user-approval blocking gate and finalize without waiting. Pair with `$ALL_PHASES` to run every incomplete phase in one pass. |
| `--tests={on\|off}`    | `on`    | `off` = skip the Step 3 Testing gate entirely (Implementation → Code Review → Approval → Finalize only). Use ONLY when the plan explicitly defers tests.                  |
| `--parallel`           | off     | In Step 2, dispatch `fullstack-developer` subagents per parallel phase with strict file-ownership boundaries instead of implementing sequentially in the main agent.      |

**`$ALL_PHASES` (only meaningful with `--approval=off`):** `Yes` (default in auto mode) processes ALL incomplete phases in one run, auto-looping to the next phase after each Finalize; `No` implements one phase then asks before continuing. With `--approval=on` (default), always one phase per run.

### Flag-modified step behavior

- **`--parallel` → Step 2 (Implementation):** First read the plan for a Dependency graph / Execution strategy / Parallelization info / File-ownership matrix. **If** the plan declares parallel-executable phases → launch multiple `fullstack-developer` subagents simultaneously, passing each its phase-file path, environment info, and exact file-ownership boundaries (no cross-boundary edits); wait for the parallel group, verify no file conflicts, then run any dependent sequential phases one agent at a time. **Else** → fall back to normal sequential main-agent implementation. All later steps (Testing, Review, Approval, Finalize) run unchanged on the merged result.
- **`--tests=off` → Step 3 (Testing):** Skip entirely. Proceed Implementation → Code Review. The Source/test drift check still applies to any tests that already exist. Keep existing tests real and genuinely passing — NEVER comment out tests, weaken assertions, or use fake data to make them pass — why: faked green hides the regression the test exists to catch.
- **`--approval=off` → Step 5 (User Approval):** Skip the blocking gate. Finalize (status, docs, auto-commit) runs once Steps 1-4 pass. When `$ALL_PHASES=Yes`, loop back to Step 0 for the next incomplete phase; on the last phase, generate the summary report and ask about `/preview`.

> **Behavior preserved:** the debugger-trace gate, granularity gate, testing/review quality bars, and all SYNC blocks apply in EVERY mode. Flags change _which gates run_, never _how rigorously a running gate is enforced_.

---

## Pre-Implementation Granularity Gate (MANDATORY)

<HARD-GATE>

If ANY check fails → STOP. Ask user: "Phase needs more detail before implementation. Refine with $plan? [Y/n]"
Implement only phases with named files, concrete actions, and resolved decisions — DO NOT implement a phase containing planning verbs, unnamed files, or unresolved decisions.
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

**Rules:** Follow steps 1-6 in order. Each step requires output marker `✓ Step N:`. Mark each complete in task tracking before proceeding. Do not skip steps.

---

## Step 1: Analysis & Task Extraction

Read plan file completely. Map dependencies. List ambiguities. Identify required skills and activate from catalog. If the plan references analysis files in `.ai/workspace/analysis/`, re-read them before implementation.

**Goal Contract read (BEFORE any code change):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the current request via `.claude/templates/goal-contract-template.md` — and read its saved success criteria. After implementation/verification (Step 3+), append an Iteration Log entry with evidence and remaining gaps.

**Pre-Implementation Trace Gate:** If the plan is for a bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix, MUST ATTENTION verify the plan or referenced analysis includes `Debugger Trace: End -> Start`, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof. If missing, STOP and report the missing trace links instead of implementing.

**task tracking Initialization:**

- Initialize task tracking with `Step 0: [Plan Name] - [Phase Name]` and all steps (1-6)
- Read phase file, look for tasks/steps/phases/sections/numbered/bulleted lists
- Convert to task tracking tasks with UNIQUE names:
    - Phase Implementation tasks → Step 2.X (Step 2.1, Step 2.2, etc.)
    - Phase Testing tasks → Step 3.X
    - Phase Code Review tasks → Step 4.X

**Output:** `✓ Step 1: Found [N] tasks across [M] phases - Ambiguities: [list or "none"]`

---

## Step 2: Implementation

Implement selected plan phase step-by-step following extracted tasks. Mark tasks complete as done. UI work → call `ui-ux-designer` subagent. Run type check + compile to verify.

**Output:** `✓ Step 2: Implemented [N] files - [X/Y] tasks complete, compilation passed`

---

## Step 3: Testing

Call `tester` subagent. ANY tests fail → STOP, call `debugger` subagent, fix, re-run. Repeat until 100% pass.

**Testing standards:** Unit tests may use mocks. Integration tests use test environment. Forbidden: commenting out tests, changing assertions to pass, TODO/FIXME to defer fixes.

**Output:** `✓ Step 3: Tests [X/X passed] - All requirements met`

**Validation:** If X ≠ total, Step 3 INCOMPLETE - do not proceed.

---

## Step 4: Code Review

Call `code-reviewer` subagent. Critical issues found → STOP, fix, re-run `tester`, re-run `code-reviewer`. Repeat until no critical issues.

**Output:** `✓ Step 4: Code reviewed - [0] critical issues`

**Validation:** If critical issues > 0, Step 4 INCOMPLETE - do not proceed.

---

## Spec-Loop Gate (applies in EVERY mode, standalone included)

> **A behavior change is not "done" until the spec-loop closes** (canonical: `SYNC:spec-loop-discipline` in `.claude/skills/shared/sync-inline-versions.md`). After implementing a behavior-bearing phase, the four rules gate completion: (1) every [HARD] §4 rule / §5 invariant the phase touched has a **universally-quantified property TC** ("for ALL inputs in {domain}, {invariant} holds") + boundary counter-case, not just an example; (2) the changed core-logic line is **mutation-killed** — a surviving mutant on a changed line is a missing invariant, write the killing test (MUTATION-SCORE bar, not line-coverage %); (3) the finding fed the **Dual-Feedback Ledger** into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only change. A phase with a behavior change but no property TC, no mutation-killed test, and no Dual-Feedback entry is **INCOMPLETE** — re-verify the whole package (spec + tests + code, not just the diff) before reporting success.

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

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Critical Enforcement Rules

**Step output format:** `✓ Step [N]: [Brief status] - [Key metrics]`

**task tracking tracking required:** Initialize at Step 0, mark each step complete before next.

**Mandatory subagent calls:** Step 3: `tester` | Step 4: `code-reviewer` | Step 6: `project-manager` AND `docs-manager` AND `git-manager`

**Blocking gates:**

- Step 3: Tests must be 100% passing
- Step 4: Critical issues must be 0
- Step 5: User must explicitly approve

Execute every step in declared order; proceed only when validation passes and the user has approved; run one plan phase per command. Do not skip steps, proceed on failed validation, or assume approval without a user response.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use a direct user question to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-refactor` workflow** (Recommended) — scout → investigate → plan → plan-execute → review → production-readiness-review → test → docs
> 2. **Execute `$plan-execute` directly** — run this skill standalone

---

## Next Steps (Standalone: MUST ATTENTION ask user via a direct user question. Skip if inside workflow.)

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (code implemented). This ensures review, testing, and docs steps aren't skipped.
- **"$code-simplifier"** — Simplify implementation
- **"$integration-test"** — Generate/update integration tests from test specs
- **"$workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

## Standalone Review Gate (Non-Workflow Only)

> **Post-gate of the [Standalone Mode Pipeline](#standalone-mode-pipeline-skip-entirely-if-invoked-inside-a-workflow).** Full standalone loop: plan → plan-review → proceed → `$review-changes` → `$why-review`; the two review steps below are its tail.
>
> **MANDATORY IMPORTANT MUST ATTENTION:** If this skill is called **outside a workflow** (standalone `$plan-execute`), you MUST ATTENTION create task tracking todo tasks for `$review-changes` then `$why-review` as the **last tasks** in your task list. This ensures all changes are reviewed before commit even without a workflow enforcing it.
>
> If already running inside a workflow (e.g., `workflow-feature`, `workflow-refactor`), skip this — the workflow sequence handles `$review-changes` at the appropriate step.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

- `docs/project-reference/frontend-patterns-reference.md`
- `docs/project-reference/scss-styling-guide.md` — Styling/BEM guide (read when task involves frontend/UI)
- `docs/project-reference/design-system/README.md` — Design system tokens (read when task involves frontend/UI)
- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

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

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- /SYNC:understand-code-first -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:plan-granularity:reminder -->

**IMPORTANT MUST ATTENTION** verify all phases pass 5-point granularity check. Failing phases → sub-plan. "Can I start coding RIGHT NOW?"

<!-- /SYNC:plan-granularity:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Land the selected plan phase as working, fully-tested, reviewed, user-approved code — executing it phase-by-phase through testing, code review, and approval gates — committed only after every quality gate (100% tests, 0 critical issues, explicit approval) passes — NEVER bypass a gate to declare done.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-To-Start Debugger Trace:** Trace observed end state backward through all feeders before fixing.
- **Plan Granularity:** Verify every phase passes the 5-point check; sub-plan failures.
- **Nested Task Creation:** Expand child phases and link the parent when nested.
- **Project Reference Docs Guide:** Read required project-reference docs (always `lessons.md`); cite them first.
- **Critical Thinking:** Apply critical + sequential thinking; traced proof, confidence >80% to act.
- **Understand Code First:** Search 3+ patterns and read code before any modification.
- **Source/Test Drift Check:** When behavior changes, reconcile affected tests from evidence.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** execute Steps 0-6 in declared order; the three BLOCKING gates — tests 100% (Step 3), critical issues 0 (Step 4), explicit user approval (Step 5) — cannot be faked-green: NEVER skip a step, proceed on failed validation, or assume approval — why: a faked-green gate ships the regression the test exists to catch.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim, finding, and recommendation with confidence % — >80% to act, <80% verify first, <60% do NOT recommend — why: speculation passed as fact is the root of every hallucinated fix.
**IMPORTANT MUST ATTENTION** break work into small task tracking todos BEFORE the first read/edit, keep exactly one `in_progress`, mark `completed` immediately after each step's evidence, add a final review todo — on context loss call the current task list first, never duplicate — why: long files exhaust context and silently lose findings.

**IMPORTANT MUST ATTENTION** Pre-Implementation Granularity Gate + Trace Gate STOP the run BEFORE coding — refuse phases with planning verbs / unnamed files / unresolved decisions (sub-plan instead), and require the End→Start `Debugger Trace` (final state → reader → storage → writer → producer → trigger, all feeder paths, hypothesis matrix, owning fix layer, forward convergence) for any bug/regression/behavior-changing plan — why: implementing a vague phase or fixing the symptom site wastes the run.
**IMPORTANT MUST ATTENTION** search 3+ existing patterns and READ target code (cite `file:line`) before writing — match local conventions over generic framework defaults, run a graph trace when `.code-graph/graph.db` exists; never invent a pattern when one exists — why: projects carry local conventions that framework defaults violate.
**IMPORTANT MUST ATTENTION** fix at the LOWEST owning layer (Entity/Model > Service > Component/Handler), never patch the symptom/crash site — trace "whose responsibility?" first — why: one fix at the invariant owner protects all downstream consumers.
**IMPORTANT MUST ATTENTION** a behavior change is NOT done until the Spec-Loop closes — universally-quantified property TC + boundary counter-case for every [HARD] rule touched, a mutation-killed test on each changed core-logic line, and a Dual-Feedback Ledger entry into BOTH spec AND tests — re-verify the whole package (spec + tests + code), not just the diff.
**IMPORTANT MUST ATTENTION** keep existing tests real and genuinely passing — NEVER comment out tests, weaken assertions, change assertions to pass, or use fake data; apply the source/test drift check when behavior changes — why: faked green hides the regression the test exists to catch.
**IMPORTANT MUST ATTENTION** mode flags add/remove ONE step, never relax a running gate — `--approval=off` skips Step 5, `--tests=off` skips Step 3, `--parallel` dispatches `fullstack-developer` subagents with strict file-ownership; debugger-trace + granularity + quality bars + all SYNC blocks apply in EVERY mode.
**IMPORTANT MUST ATTENTION** standalone (no parent `[Workflow]` row via the current task list) → wrap Steps 0-6 in plan → plan-review → proceed → `$review-changes` → `$why-review`, with `$review-changes` + `$why-review` as the LAST todos; validate decisions with the user via a direct user question — never auto-decide — why: standalone runs have no workflow enforcing review before commit.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` and the path-matched project-reference docs (frontend/scss/design-system for UI, domain-entities for models) before starting.
**IMPORTANT MUST ATTENTION** Easy to Change is the success metric — every finding, test, refactor, abstraction must make the NEXT change cheaper; name the real enemies (coupling, hidden state, duplicated knowledge, unclear intent) and reject anything that raises change cost.

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "Tests are basically passing"             | 100% or Step 3 is INCOMPLETE — loop `tester`→`debugger` until X/X — partial green ships the bug.         |
| "Code review found only minor issues"     | 0 critical or Step 4 is INCOMPLETE — fix, re-run `tester`, re-run `code-reviewer`.                       |
| "Obviously approved / they'll approve"    | Step 5 is BLOCKING — stop and wait for an explicit user response, never assume approval.                 |
| "Phase is clear enough to start"          | Run the Granularity Gate — planning verbs / unnamed files / open decisions → sub-plan, don't code.       |
| "It's a quick fix, skip the trace"        | Bug/regression plan needs the End→Start trace + hypothesis matrix BEFORE the fix.                        |
| "Code change is enough, spec/tests later" | Behavior change → property TC + mutation-killed test + Dual-Feedback into spec AND tests, or INCOMPLETE. |
| "Standalone, so skip review"              | No workflow = YOU add `$review-changes` + `$why-review` as the last todos.                               |

---

**IMPORTANT MUST ATTENTION** the three BLOCKING gates (tests 100% · 0 critical · explicit approval) cannot be faked-green — NEVER bypass a gate to declare done.
**IMPORTANT MUST ATTENTION** cite `file:line` + confidence % for every claim; search 3+ patterns and read code before writing.
**IMPORTANT MUST ATTENTION** break work into small task tracking todos BEFORE starting; add a final review todo; on context loss call the current task list first.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->

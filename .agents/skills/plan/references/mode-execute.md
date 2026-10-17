# `$plan --mode=execute` — execute an existing plan reference

> Loaded by `plan/SKILL.md`'s Mode Dispatch when invoked as `$plan --mode=execute [plan-path] [--approval=off] [--tests=off] [--parallel={auto|on|off}]`. This contract REPLACES default plan creation for the invocation: it consumes an EXISTING plan, one phase per run. Flags default off; with no flags the full 7-step spine runs sequentially. Below, `$ARGUMENTS` means the text after `--mode=execute` with the flags removed.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Contents

- [Quick Summary](#quick-summary)
- [Standalone Mode Pipeline (skip entirely only when `nested=true` — a `\[Workflow\]` row that merely exists in the current task list does not count)](#standalone-mode-pipeline-skip-entirely-only-when-nestedtrue--a-workflow-row-that-merely-exists-in-tasklist-does-not-count)
- [Workflow-Nested Mode](#workflow-nested-mode)
- [Mode Flags](#mode-flags)
- [Pre-Implementation Granularity Gate (MANDATORY)](#pre-implementation-granularity-gate-mandatory)
- [Step 0: Plan Detection & Phase Selection](#step-0-plan-detection--phase-selection)
- [Workflow Sequence](#workflow-sequence)
- [Step 1: Analysis & Task Extraction](#step-1-analysis--task-extraction)
- [Step 2: Implementation](#step-2-implementation)
- [Step 3: Code Review (static)](#step-3-code-review-static)
- [Step 4: Verify (tests + mutation check, once)](#step-4-verify-tests--mutation-check-once)
- [Checklist Walk (own step — standalone AND workflow-nested)](#checklist-walk-own-step--standalone-and-workflow-nested)
- [Spec-Loop Gate (applies in EVERY mode, standalone included)](#spec-loop-gate-applies-in-every-mode-standalone-included)
- [Step 5: User Approval ⏸ BLOCKING GATE](#step-5-user-approval--blocking-gate)
- [Step 6: Finalize](#step-6-finalize)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Critical Enforcement Rules](#critical-enforcement-rules)
- [Next Steps (Standalone: MUST ATTENTION ask user via `ask user question tool`. Skip only when `nested=true` — THIS run is a step of a `\[Workflow\]` row with its own linked phase tasks; a `\[Workflow\]` row that merely exists in the current task list does not count.)](#next-steps-standalone-must-attention-ask-user-via-ask-user-question-tool-skip-only-when-nestedtrue--this-run-is-a-step-of-a-workflow-row-with-its-own-linked-phase-tasks-a-workflow-row-that-merely-exists-in-tasklist-does-not-count)
- [Standalone Review Gate (Non-Workflow Only)](#standalone-review-gate-non-workflow-only)
- [Mode protocols](#mode-protocols)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Complete the selected plan phase as working, fully-tested, reviewed, user-approved code through its testing, code review, and approval gates. Git operations are optional and require an explicit user request — NEVER bypass a quality or authority gate to declare done.

**Summary:**

- **Purpose:** consume an EXISTING plan, one phase per run — Step 0 detects `*.md` plan files under the plans root (default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`) + selects the next incomplete phase (prefer IN_PROGRESS, else earliest Planned). Use `$feature-implement` instead when no plan exists yet — it creates plans, this consumes them.
- **Ordered execution anchor (run in declared order; emit `✓ Step N:` each):** Step 0 detect/select the plan → Step 1 read the plan fully, read the Goal Contract and Trace Gate, seed todo tracking 0–6 → Step 2 implement every phase step-by-step, code AND its tests written together (type-check + compile only, NO test run; UI → `ui-ux-designer`) → Step 3 static review (`code-reviewer` until the current severity bar is clear: round 1 zero open findings (LOW deferral), round 2 zero CRITICAL/HIGH/MEDIUM with LOW deferred; runs no tests) → Step 4 verify ONCE (`tester` full suite, then the main session's mutation check → `debugger` until 100% and every mutant killed; re-run Step 3 only if Step 4 edited anything) → **Checklist Walk (its own step — runs in standalone AND workflow-nested runs, see [Checklist Walk](#checklist-walk-own-step--standalone-and-workflow-nested))** → Step 5 explicit user approval (BLOCKING — stop and wait) → Step 6 finalize (main-session status update + `docs-manager`; optional `git-manager` only for an explicit user request).
- **Three BLOCKING gates cannot be faked-green:** Step 3 has no blocking finding under the current round bar (round 1: no open finding — LOW deferral; round 2: no CRITICAL/HIGH/MEDIUM; failed binary gates always block), Step 4 tests 100% pass with the mutation check clean and no edit after the last review, Step 5 explicit user approval before Finalize. These gates never grant Git authority. — why: quality acceptance and operation authority protect different boundaries.
- **Two STOP-before-coding gates:** Pre-Implementation Granularity Gate (refuse planning verbs / unnamed files / unresolved decisions → sub-plan with `$plan`) + bugfix Trace Gate (require the End→Start debugger trace for any bug/regression/behavior-changing plan). Also the Spec-Loop Gate (property TC + mutation-killed test + Dual-Feedback) closes any behavior change.
- **Step 2 is SEQUENTIAL by default; wave fan-out is OPT-IN.** `--parallel` / `--parallel=on` dispatches disjoint-write-set phases as one wave of `fullstack-developer` subagents in ONE message, barrier, then recomputes the next wave against the updated repo. `--parallel=auto` fans out ONLY when every in-scope phase carries the `## Parallel Execution` block (`PAR`/`SEQ` tag + declared write set) written by `$plan` — no block, no fan-out.
- **Verify-last order (`SYNC:verify-last-order`):** tests run ONCE, in Step 4, after the static Step 3 review — never per phase, per wave or inside the review. **Workflow-nested** (THIS run is a step of a `[Workflow]` row: its own phase tasks are linked to that parent row, `nested=true` — a `[Workflow]` row that merely exists in the current task list, such as an abandoned one, does not count): run Steps 0–2, the Checklist Walk and Step 6 only; the parent's review and verify steps are Steps 3–4 (see [Workflow-Nested Mode](#workflow-nested-mode)).
- **Mode flags** add/remove ONE step, never relax a running gate: `--approval=off` (auto/trust, skip Step 5, optional `$ALL_PHASES` loop over every incomplete phase), `--tests=off` (skip Step 4), `--parallel={auto|on|off}` (`off` default = sequential; bare `--parallel`/`on` opts in to wave dispatch; `auto` fans out only on plan-declared `PAR`/`SEQ` metadata). No flags = full 7-step spine, run sequentially.
- **Standalone** (not `nested=true`; a `[Workflow]` row that merely exists in the current task list does not make this run nested) → ensure a plan exists → Steps 0-3 → `$changes-review --defer=whole-target` → `$why-review` (it owns the rationale review; static, run BEFORE the Step 4 verify) → Steps 4-6. Plan review is never automatic; the user may request it separately.

> **Slash-command routing:** `/code`, `/code-auto`, `/code-no-test`, `/code-parallel` no longer resolve — use `$plan --mode=execute` with the matching flag: `/code-auto` → `--approval=off`, `/code-no-test` → `--tests=off`, `/code-parallel` → `--parallel`.

**Workflow:**

0. **Plan Detection** — Find latest plan or use provided path, select next incomplete phase
1. **Analysis & Tasks** — Read the phase file fully and extract tasks into todo tracking
2. **Implementation** — Implement step-by-step, code and its tests together; run type checks only (no test run)
3. **Code Review** — static: call code-reviewer subagent, no test run; must clear the current severity bar: Round 1 has zero open validated findings of any severity; Round 2 has zero validated CRITICAL/HIGH/MEDIUM findings, with LOW findings recorded/deferred. Failed binary gates always block.
4. **Verify** — call tester subagent once for the full suite, then run the mutation check in the main session; fix and re-run to 100%; re-run Step 3 only if Step 4 edited anything
5. **User Approval** — BLOCKING gate: wait for explicit user approval
6. **Finalize** — Update status/docs, report implementation complete; optionally handle an explicit Git request

**Key Rules:**

- Tests must be 100% passing with the mutation check clean, run ONCE after the static review (Step 4 gate)
- No blocking findings under the current Step 3 review bar (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; binary gates always block)
- User must explicitly approve before finalize (Step 5 gate)
- Implementation completion, review approval, and `--approval=off` never authorize staging, committing, or pushing. Dispatch Git only with `operation`, `scope`, and `sourceRequest` from an explicit user request; run `git commit --amend` only on an explicit amend request, never a pushed commit or one this task did not create.
- One plan phase per command run — a multi-phase run requires `--approval=off` with `$ALL_PHASES=Yes`
- Phases run sequentially unless fan-out is explicitly opted in; even then, two phases writing the same file NEVER share a wave
- **Mode flags** (see [Mode Flags](#mode-flags)): `--approval=off` (auto/trust, no approval gate + optional all-phases loop), `--tests=off` (skip the verify step), `--parallel={auto|on|off}` (default `off` = sequential; `on` = opt in to wave dispatch; `auto` = fan out only when the plan declares `PAR`/`SEQ` tags + write sets). No flags = full 7-step spine below, run sequentially.

**MUST ATTENTION READ** `CLAUDE.md` then **THINK HARDER** to start working on the following plan:

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<plan>$ARGUMENTS</plan> — the plan path and flags after `--mode=execute`.

---

> **plan --mode=execute vs feature-implement:** `plan --mode=execute` **executes an EXISTING plan** phase-by-phase (Step 0 detects `*.md` plan files under the plans root — default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`) and owns the back of the pipeline — phase gates, completion reporting, optional explicitly requested Git operations, and the `--parallel`/`--approval`/`--tests` flags. Use `$feature-implement` instead when you have only a feature description and need research + planning done first. feature-implement creates plans; `plan --mode=execute` consumes them.

## Standalone Mode Pipeline (skip entirely only when `nested=true` — a `[Workflow]` row that merely exists in the current task list does not count)

> **MANDATORY — standalone `$plan --mode=execute` only.** When this skill is invoked OUTSIDE a workflow, wrap the core spine (Steps 0-6) in this quality loop; every review here is STATIC and runs before the single Step 4 verify (`SYNC:verify-last-order`). Detect nesting via the current task list FIRST: if THIS run is a step of a `[Workflow]` row (its own phase tasks are linked to that parent row, `nested=true` — a `[Workflow]` row that merely exists in the current task list, such as an abandoned one, does not count), SKIP this section — the surrounding workflow already sequences plan/review/why-review (e.g. `workflow-refactor`).
>
> Create these as todo tracking tasks up front, in order, then execute them:
>
> 1. **`$plan`** — if Step 0 finds no plan for the request, author one first. If a plan already exists, record that and proceed.
> 2. **Proceed to Step 3** — run Steps 0-3 (implement code + tests, static code review) against the plan.
> 3. **`$changes-review --defer=whole-target`** — review the diff before commit, static (item 4, `$why-review`, owns the rationale review) (the post-gate; runs BEFORE Step 4 so its fixes are covered by the one verify).
> 4. **`$why-review`** — review rationale and change quality of the implementation, static.
> 5. **Steps 4-6** — verify once (tests + mutation check), the **Checklist Walk** (own task, after Step 4), approval, finalize; a fix made after the reviews re-runs them (Step 4 rule).
>
> This is the single pre+post quality loop for standalone runs.

## Workflow-Nested Mode

> **When THIS run is a step of a `[Workflow]` row (`nested=true`: its own phase tasks are linked to that parent row — a `[Workflow]` row that merely exists in the current task list, such as an abandoned one, does not count), the parent owns review and verification** — its later `workflow-review-changes` and test/verify steps ARE Steps 3–4 (`SYNC:verify-last-order`). Running them here too re-reviews and re-tests the same tree.
>
> - Run Steps 0–2 (detect, read, implement code + its tests), the [Checklist Walk](#checklist-walk-own-step--standalone-and-workflow-nested) (rows owned by a parent step are carried forward as `PENDING-PARENT`) and Step 6 (status update; record the phase as `implemented — review, verify and docs owned by the parent workflow`). The docs update is deferred to the parent's docs step — the nested `$workflow-review-changes` `docs-manager --mode=update`, or the workflow's own — recorded as `PENDING-PARENT: docs`, so it runs once, after the review settles the change.
> - SKIP Step 3 (`code-reviewer`), Step 4 (`tester`) and Step 5 (approval): the parent's `review-converged` and `tests-pass` gates prove quality, and the user's approval moves to `workflow-end` step 5a (one prompt on the final, verified result). Log each skip as `merged` in the deviation log, naming the parent step (`workflow-end` for Step 5); the log is evidence only, `workflow-end` step 5a reads the task list.
> - Everything before the code stays: Goal Contract, Trace Gate, granularity gate, Spec-Loop obligations (write the property TC and the killing test — the parent's verify runs them).
> - Standalone runs (no parent row) use the full spine.

## Mode Flags

`$plan --mode=execute` runs the full step spine below by default. Optional flags adapt the spine for the cases formerly served by dedicated skills — each flag only adds or removes a single step against the **host step numbering** (Step 3 Code Review, Step 4 Verify, Step 5 User Approval, Step 6 Finalize); the shared spine and every quality bar are otherwise unchanged.

| Flag | Default | Effect |
| ---- | ------- | ------ |
| `--approval={on\|off}` | `on` | `off` = **trust/auto mode**: skip the Step 5 implementation-approval blocking gate and finalize without waiting; never grants Git authority. Pair with `$ALL_PHASES` to run every incomplete phase in one pass. |
| `--tests={on\|off}` | `on` | `off` = skip the Step 4 Verify gate entirely (Implementation → Code Review → Approval → Finalize only). Use ONLY when the plan explicitly defers tests. |
| `--parallel={auto\|on\|off}` | `off` | `off` = **default**: implement every phase sequentially in the main agent. `on` (also bare `--parallel`) = **explicit opt-in**: Step 2 groups disjoint-write-set phases into waves of `fullstack-developer` subagents with strict file-ownership boundaries; the user has accepted the risk, and YOU must still name every phase's write set — including its cascade/generated writes — before grouping. `auto` = **metadata-gated**: fan out only when every in-scope phase carries a `## Parallel Execution` block (`PAR`/`SEQ` tag + declared write set) written by `$plan`; absent that block, fall back to sequential — NEVER derive write sets optimistically. |

**`$ALL_PHASES` (only meaningful with `--approval=off`):** `Yes` (default in auto mode) processes ALL incomplete phases in one run, auto-looping to the next phase after each Finalize; `No` implements one phase then asks before continuing. With `--approval=on` (default), always one phase per run — so cross-phase wave dispatch is only ever reachable in a multi-phase run (`--approval=off` + `$ALL_PHASES=Yes`) or on a phase whose sub-phases are independently implementable.

### Flag-modified step behavior

- **`--parallel=auto` → Step 2 (Implementation):** metadata-gated fan-out — dispatch waves ONLY when every in-scope phase carries a `## Parallel Execution` block written by `$plan`; the moment one phase lacks it, the whole run reverts to sequential. `auto` NEVER derives a write set from the plan's prose — see [Step 2 Wave Dispatch](#step-2-wave-dispatch-opt-in---parallelon).
- **`--parallel` / `--parallel=on` → Step 2:** the explicit opt-in — dispatch waves even when the plan declares no `PAR`/`SEQ` tags or `## Execution Waves` line. You MUST first derive each phase's write set yourself from its `Related Code Files` / Implementation Steps **and** from the generated/mirrored artifacts those edits cascade into; a phase whose write set you cannot name stays out of the wave. Colliding phases still go in different waves — opting in never authorizes co-scheduling two writers of one file.
- **`--parallel=off` (DEFAULT) → Step 2:** no wave dispatch; implement every phase sequentially in the main agent. This is the normal path and needs no justification — no flag is required to stay sequential. All gates and quality bars unchanged.
- **`--tests=off` → Step 4 (Verify):** Skip entirely. Proceed Implementation → Code Review → Approval. The Source/test drift check still applies to any tests that already exist. Keep existing tests real and genuinely passing — NEVER comment out tests, weaken assertions, or use fake data to make them pass — why: faked green hides the regression the test exists to catch.
- **`--approval=off` → Step 5 (User Approval):** Skip the implementation-approval blocking gate. Finalize (status, docs, completion report) runs once Steps 1-4 pass; this flag never grants Git authority. When `$ALL_PHASES=Yes`, each phase's running gate is compile only (no test run), then loop back to Step 0 for the next incomplete phase; after the last phase, run Step 3 and Step 4 once over the whole changeset, then generate the summary report and ask about `/preview`.

> **Behavior preserved:** the debugger-trace gate, granularity gate, testing/review quality bars, and all SYNC blocks apply in EVERY mode. Flags change *which gates run*, never *how rigorously a running gate is enforced*.

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

**Rules:** Follow steps 1-6 in order. Each step requires output marker `✓ Step N:`. Mark each complete in todo tracking before proceeding. Do not skip steps.

---

## Step 1: Analysis & Task Extraction

Read plan file completely. Map dependencies. List ambiguities. Read the plan's `Not yet specified` list: a phase that depends on an item still on it does not start — return that item to the user as an open question; phases that do not depend on it proceed. Identify required skills and activate from catalog. If the plan references analysis files in `tmp/analysis/`, re-read them before implementation.

**Goal Contract read (BEFORE any code change):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`) → create from the current request via `.claude/templates/goal-contract-template.md` — and read its saved success criteria. After implementation/verification (Step 3+), append an Iteration Log entry with evidence and remaining gaps.

**Domain work:** when a phase creates or updates entities/VOs/aggregates or their write/load paths, read `.claude/skills/domain-analysis/references/entity-quality.md`; check the plan's decisions and proof obligations before edits. Resolve missing material choices at their owner and retain normal invariant review for non-DDD models. Skip this depth for unrelated phases.

**Pre-Implementation Trace Gate:** If the plan is for a bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix, MUST ATTENTION verify the plan or referenced analysis includes `Debugger Trace: End -> Start`, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof. If missing, STOP and report the missing trace links instead of implementing.

**todo tracking Initialization:**

- Initialize todo tracking with `Step 0: [Plan Name] - [Phase Name]`, all steps (1-6) and the **Checklist Walk** task (between Step 4 and Step 5; seeded in standalone and workflow-nested runs alike)
- Read phase file, look for tasks/steps/phases/sections/numbered/bulleted lists
- Convert to todo tracking tasks with UNIQUE names:
    - Phase Implementation tasks (the code AND its tests) → Step 2.X (Step 2.1, Step 2.2, etc.)
    - Phase Code Review tasks → Step 3.X
    - Phase Verify tasks (one run, one mutation check) → Step 4.X

**Output:** `✓ Step 1: Found [N] tasks across [M] phases - Ambiguities: [list or "none"]`

---

## Step 2: Implementation

Implement selected plan phase step-by-step following extracted tasks. Mark tasks complete as done. Write each phase's tests in the same pass as its code (`SYNC:verify-last-order` step 1) — the test files belong to the phase's write set. UI work → call `ui-ux-designer` subagent. Run type check + compile only: NEVER a test suite, a mutation run or a review per phase. A plan's ONE final gate phase (`$plan`) holds docs/mirror tasks plus the static review and the single verify: Step 2 performs only its docs/mirror tasks; its review and verify tasks ARE Steps 3-4 (standalone) or are satisfied by the parent workflow's steps (nested), never a second run inside Step 2.

### Linked work during implementation and handoff

Read [the common integration guide](../../task-track/references/integration-guide.md) before intake/start, actual code/artifact saves, verification and final handoff. Inspect exact linked spec/task/subtask/plan/source concerns before dependent decisions and reread after relevant saved changes; preserve visible partial/unavailable scope and current criteria/source confidence. A changed governing source can stale proof while historical acceptance remains recorded.

Retain the actual parent producer, stable actor, session and current run/occurrence through nested calls. Only the primary saving owner observes public saved paths and records a checkpoint once; a nested helper returns its outcome to that owner instead of recording the same save again. Failed/interrupted work and read-only checks produce no saved checkpoint. Retry only the retained optional secondary request after a successful primary; never repeat the implementation save or publication to repair tracking.

The Checklist Walk and Step6 handoff reread exact owners after warranted authorized maintenance, disclose each saved/skipped/pending/refused result and carry parent review/verify proof as PENDING-PARENT. No checkpoint/diagnostic supplies readiness, trusted test/review proof or human acceptance. Preserve the existing nested/standalone spine and selection policy; no link means continue untracked.

**UI phases carry the design brief (`DD-1`–`DD-3`).** Before implementing — or briefing a sub-agent for — any phase that creates or reshapes a user-facing surface, read the phase file's `## UI Layout` → `### Design Plan` and the project's design-system / SCSS / token docs, and construct the surface to that plan: its palette, families, scale, alignment, and named memorable element. Pass the plan verbatim into any sub-agent brief (per `.claude/skills/shared/sub-agent-selection-guide.md`) — a leaf agent inherits nothing from this conversation. **If the phase has no Design Plan and the surface is new, do NOT improvise one silently:** state that the plan is missing, propose the four parts, and confirm before proceeding. Values land as tokens, never raw hex or magic numbers.

**AI surface?** Only if a phase creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md`, apply it and pass it verbatim into sub-agent briefs; otherwise skip this line.

### Step 2 Wave Dispatch (opt-in — `--parallel=on`)

Fan-out is OFF unless opted in. Run this section only when BOTH hold: (a) this run covers more than one phase (`$ALL_PHASES=Yes`, or a phase whose sub-phases are independently implementable), AND (b) the user passed `--parallel` / `--parallel=on`, or passed `--parallel=auto` and every in-scope phase carries a `## Parallel Execution` block. Either condition unmet → implement sequentially. Sequential is the safe default and needs no justification.

1. **Take the write set of every in-scope phase from the plan's declaration** — its `## Parallel Execution` block (Mode · Write set · Wave · SEQ dependency) written by `$plan`. Under `--parallel=auto` that block is MANDATORY: a plan lacking it falls back to sequential, and you NEVER reconstruct a write set from `Related Code Files` / Implementation Steps — why: a derived write set structurally cannot see cascade or generated writes, so two phases editing different source files can both write the same generated/mirrored/catalog/lockfile artifact that neither phase would ever name, and the wave corrupts it. Under `--parallel=on` the user has accepted that risk: derive the set yourself, then explicitly enumerate the generated, mirrored, and regenerated artifacts each phase's edits trigger and add them to that phase's write set before grouping. A phase whose write set still cannot be named is INELIGIBLE for a wave — implement it inline or send it back to `$plan`.
2. **Refuse to co-schedule two writers of the same file** — ANY path shared between two phases puts them in different waves. No "they only touch different functions" exception: the unit of ownership is the file. A phase tagged `SEQ`, or whose named dependency has not yet returned, never joins the current wave.
3. **Declare, then spawn in ONE message** — emit `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`, then spawn EVERY member of the wave in a single response as `fullstack-developer` subagents (UI-only phase → `ui-ux-designer`; route other specialties per `.claude/skills/shared/sub-agent-selection-guide.md`). Brief each with: its phase-file path, environment info, its EXCLUSIVE file-ownership boundary (cross-boundary edits forbidden — report the conflict instead), and its return contract.
4. **Barrier, then re-evaluate against the updated repo** — advance only after EVERY member returns. The barrier is YOUR accounting, not a signal you wait for: hold the wave's member list in the task tracker and mark each member by name as `returned` / `failed` / `timed-out` / `partial`. An unaccounted member is never dropped and never assumed successful. When every member is accounted for AND all returned cleanly, verify no file was written outside its owner's boundary, run type-check + compile on the merged result, THEN recompute the next wave against the repo as it now stands — never against the wave plan you computed before dispatch, because a returned phase can change what a later phase writes.
5. **Wave failure branch — the barrier does NOT advance on an incomplete wave.** If any member fails, times out, or returns partial work:
    - **Classify partial as FAILED.** A member reporting "mostly done", or whose evidence does not match its declared write set, counts as failed — not returned.
    - **Never let the survivors stand in for the missing member,** and never proceed to Step 3 (review) on a wave that is not fully accounted for.
    - **Quarantine the failed member's work** — inspect exactly what it wrote, and revert its partial edits if they leave the tree uncompilable. Record the files it touched.
    - **Fall back to sequential for that phase** — merge the clean returns, restore compile-green, then re-implement the failed phase INLINE in the main agent (never re-dispatch it into another wave). A phase that also fails sequentially → STOP and report; do not carry it into the next wave.
    - **A cross-boundary write fails the whole wave** — revert the out-of-boundary edits, re-run that phase sequentially, and drop fan-out for the remainder of the run: the write-set model that authorized the wave is proven wrong.
    - **In-flight early-dispatched phases are part of the failure** — before reverting or re-running anything, wait for every early-dispatched single-member wave that is still running to return, account for it by name like any other member, and apply this branch to it too; never revert or re-run around a phase that is still writing.
    - **Report the failure in the Step 2 output** — a wave that fell back is never reported as a clean fan-out.
6. **Do not dispatch when the gain is not there** — a single-phase run, a one-file phase, or a wave of one implements inline (dispatch overhead > gain).

**Gates are SEQ boundaries and are never parallelized away.** Step 3 Code Review, Step 4 Verify, and the Step 5 user-approval gate run AFTER the barrier on the merged result — never concurrently with the phases they gate, and a subagent's own self-check NEVER substitutes for the host gate.

**Multi-phase run** (`--approval=off` with `$ALL_PHASES=Yes`, or a wave dispatch): per phase, run only type-check/compile — no test run of any kind; Step 3 and Step 4 run ONCE after the last wave, over the whole changeset. **Early dispatch = its own single-member wave.** A phase whose declared dependencies have all returned, and whose write set is disjoint from every running member, may dispatch without waiting for the rest of its wave: it opens a new single-member wave with its own all-return barrier (item 4), so the per-wave barrier rule still holds — no member is ever advanced past, only started sooner. Steps 3 and 4 wait for every wave, early ones included. A one-phase run is unchanged.

**Output:** `✓ Step 2: Implemented [N] files - [X/Y] tasks complete, compilation passed` — when waves ran, append `- waves: [w1 members] → [w2 members]`, and name any member that failed/timed-out plus the phase that fell back to sequential

---

## Step 3: Code Review (static)

Call `code-reviewer` subagent (multi-phase run: once, after the last wave, over the whole changeset). The review is STATIC: it reads code and tests (TEST-GAP, WEAK-TEST by mutation thinking) and runs NO test suite (`SYNC:verify-last-order` step 2). If the current round has validated blocking findings, stop and fix them at the owning layer — a fix may write or amend tests but nothing runs them until Step 4 — and run a fresh full `code-reviewer` pass, unless the round-1 fix set holds only LOWs reviewed after the fix or deferred (LOW deferral). Round 1 blocks on every open validated severity; Round 2 blocks only CRITICAL/HIGH/MEDIUM, so LOW-only findings are recorded/deferred and do not reopen the cycle. Failed binary gates always block.

**Output:** `✓ Step 3: Code reviewed - blocking findings: Critical=[n] | High=[n] | Medium=[n] | Low deferred=[n] | binary gates=[n]`

**Validation:** Apply `.claude/scripts/lib/review-policy.cjs` before deciding whether to proceed. If the current round has any blocking finding, or any failed binary gate, Step 3 is INCOMPLETE — do not proceed. A Round 2 LOW-only result is complete only when the LOWs are listed as deferred; it does not reopen the fix/review cycle.

> **Severity classification (canonical `SYNC:severity-rubric`):** CRITICAL is immediate material security/safety/authority/data-loss risk or a failed binary gate; HIGH is material correctness, contract, privacy, or authority risk; MEDIUM is a bounded but consequential edge/resilience/maintainability gap; LOW is evidenced non-blocking polish with no credible present material impact. `NOT VERIFIABLE` is unresolved evidence, not LOW; if it could affect required behavior or a binary gate it remains blocking until proved or explicitly owner-accepted with residual risk. Classify by consequence and cite `file:line`, never by effort or proximity to the round cap.

---

## Step 4: Verify (tests + mutation check, once)

Call `tester` subagent ONCE over the whole changeset (multi-phase run: once, after Step 3) for the full affected suite. Then the main session runs the mutation check — `tester` is read-only — on every changed core-logic line and each new rule or regression test (`SYNC:verify-last-order` step 3; a bugfix's mutation check is its RED proof). ANY test fails or a mutant survives → record the provisional verdict (SOURCE-WRONG · TEST-WRONG · TEST-NOT-OPTIMAL · ENVIRONMENT-BLOCKED · AMBIGUOUS) before any edit, call `debugger` subagent, fix at the owning layer, re-run the failing set, then the whole set once. Repeat until 100% pass with every mutant killed. A surviving mutant is a missing test: write the killing test, then re-run.

**Re-review loop:** if fixing in this step edited ANY source or test file, re-run Step 3 over the settled tree; a re-review that applies a fix sends you back to Step 4. This alternation is capped at 3 turns; a fourth turn, or the same failure returning, escalates via `ask user question tool`. In a standalone run, `$changes-review --defer=whole-target` and `$why-review` re-run with Step 3 whenever it does. Step 4 is complete only when a verify run is green AND no edit followed the last Step 3. An edit after the last green run invalidates that run.

**Testing standards:** Unit tests may use mocks. Integration tests use test environment. Forbidden: commenting out tests, changing assertions to pass, TODO/FIXME to defer fixes.

**Output:** `✓ Step 4: Verified [X/X passed] - mutants killed [n/n] - re-review [not needed | round N clean]`

**Validation:** If X ≠ total, a mutant survives, or an edit followed the last review, Step 4 INCOMPLETE - do not proceed.

---

## Checklist Walk (own step — standalone AND workflow-nested)

The walk is its own step, never a clause of Step 4: it runs in EVERY run — after Step 4 in a standalone run, after Step 2 in a workflow-nested run (Steps 3–5 skipped) — and under `--tests=off`. **[BLOCKING]** read `references/plan-quality-checklist.md` in full before the walk; its Execute duty owns the rules.

Before reporting the phase or plan done, walk the rows of the plan's `## Quality Gates & Concerns Checklist` owned by the CURRENT or an EARLIER phase (phase-less and global rows only on the final phase) and record `PASS` / `FAIL` / `N/A` with the evidence observed (command output, test name, report path, `file:line`) for each applicable row; a row owned by a LATER phase is recorded `DEFERRED-BY-PLAN: phase <n>` (not a FAIL, not blocking), and the final phase finds none left unresolved.

- **Standalone:** the Step 3 review and the Step 4 verify supply most of the evidence. A FAIL, or an applicable row with no evidence, blocks completion: fix at the owner, re-prove, and re-run Step 3/4 if that fix edited anything. With `--tests=off`, rows whose proof is the skipped Step 4 are recorded `DEFERRED-BY-PLAN — tests deferred by --tests=off; evidence expected: <the row's evidence>` (no parent exists to close them).
- **Workflow-nested:** rows whose proof belongs to a parent step (tests, mutation check, review) are recorded `PENDING-PARENT: <step> — evidence expected: <the row's evidence>`, listed in the phase status and the completion report, and left open for the parent workflow's closing step: `workflow-end` step 0 reads the plan's checklist and closes each `PENDING-PARENT` row `PASS` with the parent's cited evidence, or `FAIL` (which blocks the close). Rows whose proof lives in this run (code, docs, spec, config) are walked to `PASS` / `FAIL` now, and a FAIL blocks Step 6.

The walk never relaxes another gate, never changes `--approval`/`--tests`/`--parallel`, and adds no per-phase test run.

---

## Spec-Loop Gate (applies in EVERY mode, standalone included)

> **A behavior change is not "done" until the spec-loop closes** (canonical: `SYNC:spec-loop-discipline` in `.claude/skills/shared/sync-inline-versions.md`). After implementing a behavior-bearing phase, the four rules gate completion: (1) every [HARD] §4 rule / §5 invariant the phase touched has a **universally-quantified property TC** ("for ALL inputs in {domain}, {invariant} holds") + boundary counter-case, not just an example; (2) the changed core-logic line is **mutation-killed** — a surviving mutant on a changed line is a missing invariant, write the killing test (MUTATION-SCORE bar, not line-coverage %); (3) the finding fed the **Dual-Feedback Ledger** into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only change. A phase with a behavior change but no property TC, no mutation-killed test, and no Dual-Feedback entry is **INCOMPLETE** — re-verify the whole package (spec + tests + code, not just the diff) before reporting success.

---

## Step 5: User Approval ⏸ BLOCKING GATE

Present summary (3-5 bullets): what implemented (name the waves when Step 2 fanned out), tests passed, code review outcome, checklist walk result (PASS/FAIL/N-A counts).

**This gate is a SEQ boundary** — it is never merged into a wave, never delegated to a subagent, and never satisfied by "the parallel phases all reported success". Only `--approval=off` removes it.

**Ask user explicitly:** "Phase implementation complete. All tests pass, code reviewed. Approve changes?"

This approval accepts the implementation; it does not authorize staging, committing, or pushing. A separate explicit Git request may already exist in the conversation; retain its exact operation and scope without asking for it again.

**Stop and wait** - do not proceed until user responds.

**Output:** `✓ Step 5: User approved - Ready to complete`

---

## Step 6: Finalize

**Prerequisites:** Running quality gates passed; the Checklist Walk has no FAIL or unverified applicable row (a `PENDING-PARENT` or `DEFERRED-BY-PLAN` row is carried, not unverified); user approved in Step 5 or `--approval=off` explicitly skips that implementation-approval gate.

1. **STATUS UPDATE:** the main session updates `plan.md` + phase status inline — this write is REQUIRED and is never delegated — and spawns `docs-manager` for documentation; barrier on its return before continuing. A workflow-nested run skips the spawn: the parent's docs step owns it (see Workflow-Nested Mode).

2. **ONBOARDING CHECK:** Detect onboarding requirements + generate summary.

3. **COMPLETION REPORT:** Report implementation status, validation and docs outcomes independently of Git. Ordinary finalization writes no grant file and does not stage, commit, or push.

4. **OPTIONAL GIT REQUEST (SEQ — after the barrier and all required reviews):** Dispatch `git-manager` only when the user explicitly requested the operation. Pass `operation`, `scope`, and `sourceRequest` (the actual user message/quote authorizing that operation and scope); apply the agent's Git Request Contract. Scope names the repository and authorized files, or the remote/branch for push. Generic implementation/review approval never grants this authority. Commit permits necessary staging of those files and a new commit; push requires its own explicit request and never follows commit implicitly. Stage-only and push-only requests retain those limits. If the request is absent, skip Git and finish; if scope or sourceRequest is missing/ambiguous, report the missing input and ask only about that Git operation. Required standalone/workflow reviews still precede any requested Git operation. Run `git commit --amend` only on an explicit amend request, never a pushed commit or one this task did not create.

**Output:** `✓ Step 6: Finalize - Implementation complete - Status/docs updated - No Git request (skipped)`; when Git was explicitly requested, replace the last field with the observed operation result (including blocked/failed), never a presumed commit. A blocked Git operation does not erase completed implementation work.

---

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

---

## Critical Enforcement Rules

**Step output format:** `✓ Step [N]: [Brief status] - [Key metrics]`

**todo tracking tracking required:** Initialize at Step 0, mark each step complete before next.

**Mandatory subagent calls:** Step 3: `code-reviewer` | Step 4: `tester` | Step 6: `docs-manager` (status updated inline; standalone only — a workflow-nested run defers docs to the parent)

**Conditional subagent call:** Step 6: `git-manager` only for an explicit user request with operation/scope/sourceRequest. No request means implementation can finish without Git.

**Blocking gates:**

- Step 3: No blocking findings under the current review round bar (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; binary gates always block)
- Step 4: Tests 100% passing, mutation check clean, no edit after the last Step 3 review
- Checklist Walk (own step; standalone and nested): every applicable Quality Gates & Concerns Checklist row PASS with evidence (FAIL or unverified blocks completion); a nested run carries parent-owned rows as `PENDING-PARENT` for the parent's closing step
- Step 5: User must explicitly approve

Execute every step in declared order; proceed only when validation passes and the user has approved; run one plan phase per command. Do not skip steps, proceed on failed validation, or assume approval without a user response.

---

## Next Steps (Standalone: MUST ATTENTION ask user via `ask user question tool`. Skip only when `nested=true` — THIS run is a step of a `[Workflow]` row with its own linked phase tasks; a `[Workflow]` row that merely exists in the current task list does not count.)

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `ask user question tool` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (code implemented). This ensures review, testing, and docs steps aren't skipped.
- **"$code-simplifier"** — Simplify implementation
- **"$integration-test"** — Generate/update integration tests from test specs
- **"$workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

## Standalone Review Gate (Non-Workflow Only)

> **Post-gate:** follow the [Standalone Mode Pipeline](#standalone-mode-pipeline-skip-entirely-only-when-nestedtrue--a-workflow-row-that-merely-exists-in-tasklist-does-not-count) above. It owns `$changes-review` → `$why-review` between Step 3 and the single Step 4 verify; their fixes must be covered by that verify.
>
> **MANDATORY IMPORTANT MUST ATTENTION:** If this skill is called **outside a workflow** (standalone `$plan --mode=execute`), you MUST ATTENTION create todo tracking todo tasks for `$changes-review --defer=whole-target` then `$why-review` between the Step 3 and Step 4 tasks (the last reviews before the verify). This ensures all changes are reviewed before commit even without a workflow enforcing it.
>
> If this run is a nested workflow step (`nested=true`, e.g., `workflow-feature`, `workflow-refactor`; a `[Workflow]` row that merely exists in the current task list does not count), skip this — the workflow sequence handles `$changes-review` at the appropriate step.

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

**Prerequisites:** **MUST ATTENTION READ** before executing — every filename below resolves inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- `frontend-patterns-reference.md`
- `configured styling reference` — Styling reference (read when task involves frontend/UI)
- `design-system/README.md` — Design system tokens (read when task involves frontend/UI)
- `domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained. The `plan` skill already carries `core-engineering-principles`, `plan-granularity` and `verify-last-order`. `design-distinctiveness-gate`, `design-review-checklist` and `ui-copywriting` are self-gating: they apply only when a phase creates or reshapes a user-facing surface.

<!-- SYNC:design-distinctiveness-gate -->

> **[BLOCKING] Design distinctiveness gate (`DD-1`–`DD-8`) — binds on ANY task that designs, plans, mocks up, implements, or reviews a user-facing visual surface.** Deep catalog: `.claude/docs/design-knowledge.md`. Cite findings as `DD-<clause>` + `file:line`.
>
> **Precedence (resolve in this order, never silently):** the **brief's own stated visual direction WINS outright** — including when it asks for one of the `DD-4` tells. Then the **project's design-system / SCSS / frontend-pattern docs and accepted ADRs** — a house style IS an intentional identity; re-deciding it per feature is incoherence. Then these clauses. A genuine conflict is SURFACED to the user with both sides, NEVER resolved silently.
>
> **Relationship to `UI-1.1`–`UI-9.4`:** the 40 clauses ask _"is this usable, accessible, consistent?"_ (a measurable floor); this gate asks _"is this THIS product's interface, or the one any generator would emit for any brief?"_. BOTH bind; where they touch (type scale, colour, motion timing) the clause sets the floor and this gate picks the value.
>
> - `DD-1` **Ground it in the subject matter.** Before designing, name the concrete subject, the audience, and the design's primary job — and CONFIRM with the user when the brief is silent. Distinctive choices come FROM the subject's industry, materials and vernacular, never taste applied on top. **Test: if the palette, type and layout would fit a different product unchanged, there is no identity yet.**
> - `DD-2` **Every choice carries a WHY.** "It's common", "it's clean", "users expect it" are not reasons; an unexplained decision is a default that arrived unnoticed. Defaults hide in infrastructure — typography, navigation, data display, and TOKEN NAMES. **Token-name test: someone reading only your CSS variables should be able to guess what product this is** (`--ink`/`--parchment` evoke a world; `--gray-700`/`--surface-2` evoke a template).
> - `DD-3` **Two passes, and the review pass is mandatory.** (1a) Write a compact **design plan** — Colour (4–6 named hex values) · Type (families + roles + scale) · Layout (one-sentence prose + ASCII wireframes to compare alternatives, including alignment: left/centre/justified) · Principles (what makes THIS page unique). (1b) **BLOCKING generic test — before any code:** work through a similar prompt and see whether you arrive somewhere similar; **any part that reads like the generic default for any comparable page rather than a choice for THIS brief gets REVISED, and you state what you changed and why.** Then (2a) build the REVISED plan, (2b) critique. — why: a plan taken straight to code reproduces the default it came from.
> - `DD-4` **Audit every FREE axis against the generated-design tell catalog** (`[model-knowledge]`, calibration not prohibition — each trait is legitimate for SOME brief): **T1** cream `#F4F1EA` + high-contrast serif + terracotta near `#D97757` (Anthropic's own interaction accent — on a user's brief it reads specifically as a tell) · **T2** near-black + one acid-green/vermilion accent · **T3** broadsheet hairline-rule pastiche, zero radius, dense columns · **T4** the SaaS-card kit: identical rounded cards, ONE radius regardless of hierarchy, the same `rgba(0,0,0,.1)` shadow under each, gradient washes as decoration · **T5** template chrome whatever the subject: tracked-out ALL-CAPS eyebrow above every heading, meta strings joined with middle dots (`A · B · C`), `WORD — fragment` labels with a spaced em dash, tinted near-black (`#0B0B0B`/`#111`) standing in for black, monospace for small data labels, `→` appended to link/button text. **A match is a HYPOTHESIS about a missed decision, never a defect** — promote it only by naming the axis, that the brief left it free, and what the subject suggested instead.
> - `DD-5` **Typography carries the personality.** One family, or two CLEARLY distinct ones — you do NOT need separate display and body faces. Choose deliberately, set a real scale with intentional weights, widths and spacing; a headline is an ACTIVE part of the design. Measure under ~80 characters; serifs tolerate slightly longer lines and want slightly more line-height than sans at the same size. Hierarchy needs weight/tracking/opacity, not size alone. **Avoid the three commonest tells: accenting a single word in a headline (italic/bold/colour) · ALL CAPS labels · an eyebrow label that names the section the heading already names.**
> - `DD-6` **Structure is information, not decoration.** Outlines, borders, numbering, eyebrows, dividers and labels must encode something about the content. **Before adding numbered markers (`01 / 02 / 03`), check the content really IS a sequence** — a stepped process, timeline or ranking. Every device must tell the reader something whitespace would not, or it goes. **Hero:** open with the most characteristic thing in the subject's world, in whatever form fits (headline, image, animation, live demo, interactive moment) — big-number-plus-small-label-plus-gradient is the DEFAULT treatment, so use it only when it is genuinely best here. **Composition:** rhythm over monotone (uniform card size, gap and density is no one deciding); articulable proportions; one dominant focal point.
> - `DD-7` **Motion sparingly and deliberately.** Non-user-triggered motion draws attention ONLY. One orchestrated moment — a single page-load sequence or one reveal — lands better than scattered effects; **fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as generated.** Motion that ANSWERS a person's action (opening, expanding, confirming) is welcome when it shows what changed. Honour `prefers-reduced-motion`.
> - `DD-8` **Spend boldness once, then remove one accessory.** Let ONE element be the memorable thing and keep everything around it quiet and disciplined; cut any decoration that does not serve the brief. **Critique the BUILT page, not just the plan** — composition, craft (density is a decision, not a constant), content coherence, and CSS honesty (negative margins undoing a parent's padding, workaround-only `calc()` values, and absolute positioning to escape layout flow are lies; the correct answer is simpler than the hack). Review screenshots where the environment supports it. Then ask "if they said this lacks craft, what would they point to?" and fix that. **Build the quality floor in silently** — responsive, visible keyboard focus, reduced-motion respected, measured contrast, tokens never raw hex or magic numbers — and watch CSS selector specificity, where a type-based selector (`.section`) and an element-based one (`.cta`) most often cancel each other's padding/margin.
>
> **Memory:** vary between briefs — light and dark, families, direction. NEVER converge on the same choice across generations (Space Grotesk, for example). Where the project already has a design system, tokens, or an `interface-system.md`, ADOPT and record it rather than re-deciding; write back any pattern used 2+ times with measurements worth remembering.
>
> **Skip ONLY** when the change has NO user-facing visual surface (backend-only, tooling, docs) — state that reason explicitly so the skip is auditable.

<!-- /SYNC:design-distinctiveness-gate -->

<!-- SYNC:design-review-checklist -->

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q` plus §R, ~155 checks with failure signals and default severities; worked calibration cases in `.claude/docs/design-review-calibration.md`): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (later) · `P4` note. Translate to other dialects (BLOCKED/WARN, Critical–Low, BLOCKING/ADVISORY) ONLY through the §0.3 severity map. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order — over whole SURFACES, not files (§0.5).** Map changed files to the pages/views/dialogs they render into, reconstruct each surface's composition (component tree + style origins; render when it can run, else `ENVIRONMENT-BLOCKED`), then sweep: §A core usability heuristics · §B cognitive load & surface complexity (B12–B15: surface load, progressive disclosure, one job per view, the project's complexity budget) · §C visual design & hierarchy · §D interaction and relevant product states · §E information architecture & container fit (E9–E11: dialog vs full view vs stepped flow vs side panel vs inline) · **§F web / §G mobile — conditional on platform; §H expert & data-heavy use — conditional on usage, not platform** · §I accessibility: use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, use the documented platform standard. Record the selected standard and its source; severity follows the governing release contract · §J content & UX writing · §K trust, ethics & privacy · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · **§R forms & data entry — conditional on input: fill the Field Necessity Matrix first** · §N edge-case probes. Make one focused pass per applicable section and record N/A with evidence for sections the surface does not support. Cluster a defect repeated across surfaces into ONE finding; calibrate against `.claude/docs/design-review-calibration.md`.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — use these prompts for applicable surfaces: (1) can a new user complete the primary task unaided · (2) is feedback timely against the project/platform expectation · (3) do relevant empty/loading/error states offer a forward path · (4) is the primary action obvious and reachable for supported inputs · (5) do contrast and focus meet the selected accessibility standard (WCAG 2.2 AA baseline for web) · (6) can users operate the surface with its supported input modes · (7) do interactive targets meet the platform's size/spacing guidance · (8) are destructive actions recoverable where appropriate · (9) does the surface work at its smallest supported size and required zoom/reflow · (10) are there deceptive or coercive patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Component architecture pass (§M6–§M9) when source code is in scope.** Verify the ownership model documented or demonstrated by the project, reuse/composition decisions, and whether shared behavior is duplicated without a reason. Do not require tiers, a base abstraction, or a particular test hierarchy unless the project uses one. Report applicable checklist IDs with `file:line` evidence; do not infer source architecture from a screenshot alone.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains UI work, bind applicable acceptance criteria to the target platform/surface, relevant user states, and the selected accessibility standard. Each UI phase MUST name, per new or reshaped view: its primary task, its container (E9), its information priority (what is shown now / later / never here), and — for input — the inputs required at creation vs deferred (§R1–R2). A plan review treats a UI phase missing these as a finding against the checklist IDs it leaves unbound. Use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, identify the documented platform standard. Identify conditional sections (§F/§G/§H, §L) that apply. Do not require every catalogued state; record the standard and its source, and keep unsupported checks N/A.

<!-- /SYNC:design-review-checklist -->

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and select the authoritative correction and enforcement points from traced contracts and the project's architecture. Keep validation at untrusted boundaries. Choose a shared point only when evidence shows it owns the invariant for those consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->


<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Use one consequence-based scale across reviews, skills, agents, workflows and hosts. Choose the highest credible tier supported by evidence; never lower it to pass a round. Effort, cost, preference, annoyance, frequency alone and round-budget pressure do not determine severity.
>
> **Finding vs observation:** admit a finding only with an affected user/system/data/contract, shipped consequence, reachable supported trigger (caller, input, state or event sequence), evidence location and confidence percentage. Assess exposure/likelihood and reversibility/detectability before assigning a tier.
>
> **Keep as observations:** advice, preference, duplicates, unsupported concerns, unreachable paths, issues already reported by this change’s compiler/type checker/linter/tests, intended behavior changes, reasoned suppressions predating the change, and pre-existing issues neither touched nor made reachable. Review newly added suppressions. Observations/INFO do not reopen loops.
>
> | Tier | Consequence and boundary examples | Action |
> | --- | --- | --- |
> | CRITICAL | Immediate material security, safety or authority harm; auth bypass; secrets/PII exposure; irreversible destruction; data loss/corruption; critical-path silent failure. | Block immediately; escalate. |
> | HIGH | Material supported-path correctness, invariant, privacy/authority, public-contract or compatibility failure; likely user/downstream harm; missing proof for a behavior-changing fix. | Fix before PASS/merge. |
> | MEDIUM | Bounded consequential edge, resilience, observability, testability, maintainability or architectural gap; credible future defect. | Clear this round; escalate decisions needing an owner. A follow-up is not a clean pass. |
> | LOW | Proven non-blocking polish with no credible present correctness, security, privacy, authority, availability or data-integrity impact: wording, formatting, minor docs/conventions, optional cleanup, cosmetics. | Record/defer; alone never opens another round from round 2 or increases the budget. |
>
> **Consequence decision tree:** check binary gates separately, then select the first evidenced tier from CRITICAL → HIGH → MEDIUM → LOW. Missing evidence is **NOT VERIFIABLE**, not a fifth tier or a LOW fallback: name the missing proof. Unsettled reachability is NOT VERIFIABLE for potential MEDIUM+ impact and an observation for polish. Claims potentially affecting required behavior, security, privacy, authority, availability, data integrity or a gate remain evidence blockers until proved or explicitly owner-accepted with scope, rationale and residual risk. Owner acceptance does not make an open MEDIUM a clean pass or a failed gate pass.
>
> **Hard gates and rounds:** failed tests, required artifacts, security must-fix checks, generated parity and policy compliance block every round, independently of finding severity. The executable helper carries failures as synthetic CRITICAL blockers; reports name the gate and failure evidence. Default review budget is three rounds; unresolved findings or failed required checks at the cap ask the user for a bounded extension under `SYNC:review-policy`. Failed checks never pass by severity deferral.
>
> **Domain-vocabulary normalization and scores:**
> - `BLOCKED`/`HARD FAIL`/`FAIL` are local blocking verdicts, not automatic CRITICAL; classify by consequence while preserving the owning gate. `WARN` can be any tier; `PASS`/compliant is not a finding. INFO/advisory remains observational unless material consequence is evidenced.
> - UI `P0/P1/P2/P3/P4` start at CRITICAL/HIGH/MEDIUM/LOW/LOW; raise only with evidence. P0/P1 accessibility or task-completion floors remain blocking gates.
> - Criterion `0/1/2` → CRITICAL or HIGH (unmet readiness)/MEDIUM (partial consequential gap)/pass; polish is LOW, never forced to `0`.
> - Impact × likelihood: high impact/exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact/exposure → LOW. Record both axes and justify the highest credible tier.
> - Aggregate scorecards and `/20` verdict bands stay separate; sub-80 areas prompt investigation, not automatic severity. Keep advisory deductions separate from blockers. Emit numeric SRE/readiness or impact/likelihood scores with consequence and normalized tier.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:ui-copywriting -->

> **Words are design content, not decoration** — binds whenever a task authors, changes, or reviews user-visible strings (labels, CTAs, headings, empty/error/loading text, toasts, placeholder content). Deep detail: `.claude/docs/design-knowledge.md` §8. Copy makes a design feel as templated as the visuals do.
>
> Before writing anything, ask what the design needs to SAY and how it can best be said to help the person navigate the experience. Then:
>
> 1. **Write from the end user's perspective.** Name things by what users will understand in simple language, not by how the system is built — a user manages **notifications**, not **webhook config**. Describe what something is or does in plain terms rather than selling it. Being specific and legible to a new user ALWAYS beats being clever.
> 2. **Active voice by default.** A CTA says exactly what happens when it is used: **"Save changes"**, NEVER "Submit".
> 3. **One name per action, across the whole flow.** The button that says **Publish** produces a toast that says **Published**. The vocabulary of an interface is the signposting for someone navigating the product — cohesion and consistency are how people learn their way around.
> 4. **Failure and emptiness give DIRECTION, not mood.** Explain what went wrong and how to fix it, in the interface's voice rather than a person's. **Errors do NOT apologize, and are NEVER vague about what happened.** An empty screen is an invitation to act.
> 5. **Conversational tone, one job per element.** Plain verbs, sentence case, no filler, tone matched to the brand and the audience; let each written element do exactly one job.
> 6. **Real content, never lorem.** When the brief supplies no copy, write plausible strings for the ACTUAL subject. **Coherence check — read every visible string as a user would, checking for truth, not typos:** could a real person at a real company be looking at exactly this data right now, or does the page title belong to one product, the body to another, and the sidebar metrics to a third? A beautifully designed interface with nonsensical content is a movie set with no script.
>
> **Skip ONLY** when the change surfaces no user-visible text — state that explicitly.

<!-- /SYNC:ui-copywriting -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Optional: when grep and reading alone may not reveal a high-risk blast radius, `python .claude/scripts/code_graph trace <file> --direction both --json` (when `.code-graph/graph.db` exists) can add callers and dependents — a hint that may be stale, verified by reading the files.
> 4. Map affected dependencies and callers with available repository tools (grep, reading); an absent, stale or unsupported graph never blocks or fails the task.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- SYNC:plan-granularity:reminder -->

**IMPORTANT MUST ATTENTION** use outcome phases with owners, boundaries, bounded discovery and acceptance gates. Split only for real dependencies, independent outcomes or disjoint ownership; avoid microtasks and recursive sub-plans.

<!-- /SYNC:plan-granularity:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** for non-trivial bugs, failed verification, regression fixes, behavior-changing code or unclear code flow, trace backward from the observed output through every feeder path before fixing. Establish hypotheses, the authoritative invariant owner and forward proof; retain validation at untrusted boundaries. Ordinary artifact review or graph lookup alone does not trigger a debugging workflow.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses


<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:ui-copywriting:reminder -->

- **MUST ATTENTION** treat user-visible words as design content: end-user vocabulary, not system vocabulary (notifications, not webhook config) · active-voice CTAs that say what happens ("Save changes", never "Submit") · ONE name per action across the whole flow (Publish → "Published") · errors explain what happened and how to fix it and NEVER apologize or stay vague, empty screens invite action · sentence case, plain verbs, no filler, one job per element · real subject-specific copy, never lorem — and read every string for TRUTH: one coherent story, not three products' content on one screen. Skip ONLY when no user-visible text changes, stated explicitly.

<!-- /SYNC:ui-copywriting:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete the selected plan phase as working, fully-tested, reviewed, user-approved code through its testing, code review, and approval gates. Git operations are optional and require an explicit user request — NEVER bypass a quality or authority gate to declare done.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-To-Start Debugger Trace:** Trace observed end state backward through all feeders before fixing.
- **Plan Granularity:** Verify every phase passes the 5-point check; sub-plan failures.
- **Nested Task Creation:** Expand child phases and link the parent when nested.
- **Understand Code First:** Search 3+ patterns and read code before any modification.
- **Source/Test Drift Check:** When behavior changes, reconcile affected tests from evidence.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** run the full step spine in declared order, emit `✓ Step N:` each: Step 0 detect plan + select next incomplete phase → Step 1 Analysis & Task Extraction (read plan, Goal-Contract read, Trace Gate, seed todo tracking) → Step 2 Implementation (code + its tests written together, type-check/compile only, no test run; UI → `ui-ux-designer`) → Step 3 Code Review (static, `code-reviewer` until the current severity bar is clear: round 1 zero open findings, round 2 zero CRITICAL/HIGH/MEDIUM with LOW deferred) → Step 4 Verify (`tester` once for the full suite, then the main session's mutation check, `debugger` until 100%; re-run Step 3 only if Step 4 edited anything) → Checklist Walk (own step, standalone and nested) → Step 5 User Approval (BLOCKING, wait) → Step 6 Finalize (main-session status update + `docs-manager`; optional `git-manager` only for an explicit user request).
**IMPORTANT MUST ATTENTION** execute Steps 0-6 in declared order; the three BLOCKING gates — no blocking findings under the current severity bar (Step 3), tests 100% with the mutation check clean and no edit after the last review (Step 4), explicit user approval (Step 5) — cannot be faked-green: NEVER skip a step, proceed on failed validation, or assume approval — why: a faked-green gate ships the regression the test exists to catch.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim, finding, and recommendation with confidence % — >80% to act, <80% verify first, <60% do NOT recommend — why: speculation passed as fact is the root of every hallucinated fix.
**IMPORTANT MUST ATTENTION** break work into small todo tracking todos BEFORE the first read/edit, keep exactly one `in_progress`, mark `completed` immediately after each step's evidence, add a final review todo — on context loss call the current task list first, never duplicate — why: long files exhaust context and silently lose findings.

**IMPORTANT MUST ATTENTION** Pre-Implementation Granularity Gate + Trace Gate STOP the run BEFORE coding — refuse phases with planning verbs / unnamed files / unresolved decisions (sub-plan instead), and require the End→Start `Debugger Trace` (final state → reader → storage → writer → producer → trigger, all feeder paths, hypothesis matrix, owning fix layer, forward convergence) for any bug/regression/behavior-changing plan — why: implementing a vague phase or fixing the symptom site wastes the run.
**IMPORTANT MUST ATTENTION** search 3+ existing patterns and READ target code (cite `file:line`) before writing — match local conventions over generic framework defaults (the code graph is optional advice for a high-risk blast radius); never invent a pattern when one exists — why: projects carry local conventions that framework defaults violate.
**IMPORTANT MUST ATTENTION** fix at the component that owns the invariant or responsibility, using project architecture, references, and source evidence to identify it; never patch the symptom/crash site — trace "whose responsibility?" first — why: one fix at the invariant owner protects all downstream consumers.
**IMPORTANT MUST ATTENTION** a behavior change is NOT done until the Spec-Loop closes — universally-quantified property TC + boundary counter-case for every [HARD] rule touched, a mutation-killed test on each changed core-logic line, and a Dual-Feedback Ledger entry into BOTH spec AND tests — re-verify the whole package (spec + tests + code), not just the diff.
**IMPORTANT MUST ATTENTION** keep existing tests real and genuinely passing — NEVER comment out tests, weaken assertions, change assertions to pass, or use fake data; apply the source/test drift check when behavior changes — why: faked green hides the regression the test exists to catch.
**IMPORTANT MUST ATTENTION** mode flags add/remove ONE step, never relax a running gate — `--approval=off` skips Step 5, `--tests=off` skips Step 4, `--parallel={auto|on|off}` controls Step 2 fan-out (`off` = default sequential, `on` = explicit opt-in, `auto` = fan out only on plan-declared `PAR`/`SEQ` metadata); debugger-trace + granularity + quality bars + all SYNC blocks apply in EVERY mode.
**IMPORTANT MUST ATTENTION** Step 2 is SEQUENTIAL by default — fan out only on the explicit `--parallel`/`--parallel=on` opt-in, or under `--parallel=auto` when EVERY in-scope phase carries a plan-declared `## Parallel Execution` block; `auto` with no such block falls back to sequential and NEVER derives write sets optimistically — why: a derived write set cannot see cascade/generated writes, so two "disjoint" phases silently collide on the same generated artifact.
**IMPORTANT MUST ATTENTION** when a wave does run — NEVER co-schedule two writers of the same file, declare the wave plan, spawn every member in ONE message, then hold the barrier until EVERY member is accounted for by name; a failed, timed-out, or partial member blocks the barrier, is never assumed successful, and its phase is re-implemented sequentially before the next wave — why: an advanced barrier on an incomplete wave ships half a phase as if it were whole.
**IMPORTANT MUST ATTENTION** gates are SEQ boundaries — Step 3 Code Review, Step 4 Verify, and the Step 5 approval gate run after the barrier on the merged result; a subagent's self-report NEVER substitutes for a host gate — why: parallelism may shorten the run, never the gate.
**IMPORTANT MUST ATTENTION** standalone (not `nested=true`; a `[Workflow]` row that merely exists in the current task list does not count) → ensure a plan exists → Steps 0-3 → `$changes-review --defer=whole-target` → `$why-review` (it owns the rationale review; static, BEFORE the Step 4 verify) → Steps 4-6, with a nested run (`nested=true`) instead running Steps 0-2 and 6 only (`SYNC:verify-last-order`); plan review remains user-selected, and material decisions still go to the user via `ask user question tool` — why: standalone runs need implementation review without silently adding plan --mode=review work.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` and the path-matched project-reference docs (frontend/scss/design-system for UI, domain-entities for models) before starting.
**IMPORTANT MUST ATTENTION** Easy to Change is the success metric — every finding, test, refactor, abstraction must make the NEXT change cheaper; name the real enemies (coupling, hidden state, duplicated knowledge, unclear intent) and reject anything that raises change cost.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| "Tests are basically passing"                    | 100% or Step 4 is INCOMPLETE — loop `tester`→`debugger` until X/X — partial green ships the bug.  |
| "Run the tests after each phase to be safe"      | No — tests run ONCE in Step 4 after the static review; per-phase runs re-test the same code and serialize the run (`SYNC:verify-last-order`). |
| "Code review found only minor issues"            | Every applied fix needs fresh full review; LOW may be deferred without edits. Round 1 clears every open validated severity; Round 2 defers LOW-only findings but still blocks on CRITICAL/HIGH/MEDIUM and failed binary gates. |
| "Obviously approved / they'll approve"           | Step 5 is BLOCKING — stop and wait for an explicit user response, never assume approval.           |
| "Phase is clear enough to start"                 | Run the Granularity Gate — planning verbs / unnamed files / open decisions → sub-plan, don't code. |
| "It's a quick fix, skip the trace"               | Bug/regression plan needs the End→Start trace + hypothesis matrix BEFORE the fix.                  |
| "Code change is enough, spec/tests later"        | Behavior change → property TC + mutation-killed test + Dual-Feedback into spec AND tests, or INCOMPLETE. |
| "Standalone, so skip review"                     | No workflow = YOU add `$changes-review --defer=whole-target` + `$why-review` as the last todos.                         |
| "The plan looks parallelizable — fan it out"     | Fan-out is OPT-IN: `--parallel`/`--parallel=on`, or `--parallel=auto` **plus** a plan-declared `## Parallel Execution` block. No opt-in, no metadata → sequential. |
| "I can infer the write sets from the plan"       | Not under `auto` — a derived set misses cascade/generated writes and collides on files no phase names. Fall back to sequential. |
| "Both phases only touch different functions"     | The unit of ownership is the FILE — any shared path splits the phases into different waves.        |
| "One wave member never came back, the rest passed" | The barrier does NOT advance — account for every member by name; failed/timed-out/partial → re-run that phase sequentially. |

---

**IMPORTANT MUST ATTENTION** the three BLOCKING gates (tests 100% · no blocking findings under the current review bar · explicit approval) cannot be faked-green — Round 1 blocks every validated severity, Round 2 defers LOW-only findings but still blocks CRITICAL/HIGH/MEDIUM and failed binary gates; NEVER bypass a gate to declare done.
**IMPORTANT MUST ATTENTION** implementation completion, review approval and `--approval=off` never authorize Git: require explicit user operation/scope/sourceRequest, report completion independently, and run `git commit --amend` only on an explicit amend request, never a pushed commit or one this task did not create.
**IMPORTANT MUST ATTENTION** cite `file:line` + confidence % for every claim; search 3+ patterns and read code before writing.
**IMPORTANT MUST ATTENTION** break work into small todo tracking todos BEFORE starting; add a final review todo; on context loss call the current task list first.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->

<!-- SYNC:verify-last-order:reminder -->

**IMPORTANT MUST ATTENTION** code-changing work runs tests ONCE, last: build all phases + write tests → static review fix-loop → verify once with mutation check → fix and re-run to green → re-review only if step 4 edited anything. No per-phase or in-review test runs.

<!-- /SYNC:verify-last-order:reminder -->

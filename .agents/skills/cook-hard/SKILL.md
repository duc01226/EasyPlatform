---
name: cook-hard
description: '[Implementation] Thorough implementation with maximum verification'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract — HARD-GATE** — Skill runs as workflow step? Parent `[Workflow] /{skill}` row = **container, NOT tracking**. MUST expand internal phases as child tasks. Workflow-step invocation = **MORE strict, not less**.
>
> **Why:** task tracking flat (no `parent_id`). Without expansion: hierarchy invisible, transitions batched, mid-skill compaction loses phase state, next agent cannot resume. `[N.M]` prefix + `addBlockedBy` restore visual hierarchy + structural ordering.
>
> ### Child skill contract (this skill, when nested)
>
> 1. **DETECT** — the current task list FIRST. Active `[Workflow] /{this-skill}` `in_progress`? Record `id` → `parentTaskId`, set `nested=true`. Else `nested=false` (standalone).
> 2. **EXPAND** — task tracking one task per declared phase. Never collapse, never lazy-create.
> 3. **PREFIX** (when nested) — `[N.M] $skill-name — phase` (N=workflow step #, M=phase #). Example parent step 1 = `$review-changes` → children `[1.1] $review-changes — Load references`, `[1.2] $review-changes — Run graph trace`, …. Standalone: omit prefix.
> 4. **LINK** (when nested) — immediately after creating children: `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`. Tool then blocks parent `completed` until children resolve.
> 5. **EXECUTE** — child `in_progress` BEFORE work, `completed` IMMEDIATELY after evidence. One `in_progress` at a time. Parent stays `in_progress` throughout.
> 6. **GATE** — parent → `completed` ONLY after ALL children `completed` (or `cancelled` with written reason). Skipping = workflow violation.
>
> ### Orchestrator contract (`workflow-*` skills)
>
> 1. **PRE-EXPAND** — before skill invocation/`spawn_agent` call, read child's phase list, task tracking rows with `[N.M] $skill-name — phase` prefix.
> 2. **LINK PARENT** — `TaskUpdate(workflowStepTaskId, addBlockedBy: [childIds])`.
> 3. **POST-VERIFY** — after child returns, the current task list. Any `[N.M] …` row still `pending`/`in_progress`? Child exited early → a direct user question BEFORE marking workflow row done.
> 4. **NEVER** let `[Workflow] /child-skill` row stand alone as "tracking complete".
>
> ### Standalone invocation
>
> Same phase expansion + one-`in_progress` discipline. Omit `[N.M] $skill-name —` prefix; omit `addBlockedBy` linkage (no parent).
>
> ### Anti-rationalization
>
> | Excuse                                        | Rebuttal                                                                                                           |
> | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
> | "Parent workflow task tracks this"            | Tracks workflow STEP, not phases                                                                                   |
> | "Children clutter the list"                   | Visible hierarchy IS the point — compaction wipes opaque rows                                                      |
> | "Skip task tracking for quick phases"         | Every phase = recovery anchor                                                                                      |
> | "I know what I'm doing, expansion = ceremony" | Expansion is for the NEXT agent post-compaction. Cognitive completion bias = the exact failure mode prevented here |
>
> **BLOCKED until:** `- [ ]` the current task list called, `nested` set `- [ ]` All phases expanded via task tracking `- [ ]` Children prefixed `[N.M] $skill-name — phase` when nested `- [ ]` `TaskUpdate(parentTaskId, addBlockedBy: [...])` when nested `- [ ]` First child `in_progress` BEFORE any other tool call

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs — HARD-GATE (Pre-Fetch Before First Task)** — `docs/project-reference/` carries project-specific conventions, patterns, rules, and lessons that override generic framework defaults. Skipping this gate = output that compiles but violates the project's actual architecture.
>
> ### MANDATORY MUST-DO (BEFORE first file read / grep / edit / task tracking decomposition)
>
> 1. **SCOPE EVALUATION:** Identify task scope — touched file types, domain area (backend handler, frontend component, styles, tests, specs, feature docs), and operation (read/write/review/refactor/migrate).
> 2. **MAP TO REQUIRED DOCS:** Use the canonical doc trigger table in `.claude/skills/shared/sync-inline-versions.md` → `SYNC:project-reference-docs-guide` to enumerate ALL docs whose "When to Read" trigger matches the scope. Enumerate every match — do NOT cherry-pick.
> 3. **CHECK INJECTED:** For each required doc, scan conversation for an `[Injected: <path>]` header from session hooks. If present → already in context, do NOT re-read.
> 4. **READ NON-INJECTED REQUIRED DOCS:** For every required doc NOT carrying `[Injected:]` → call `Read` now. No exceptions, no "I'll read it if I need to".
> 5. **ALWAYS READ `lessons.md`:** Hard-won project lessons apply to every task. If not `[Injected:]`, read it before first action.
> 6. **CITE EVIDENCE:** Before first execution step, state inline: `Reference docs read: <doc1>, <doc2>, ... | Already injected: <doc3>, ...`. Proves the gate ran; creates audit trail.
>
> **BLOCKED until:** `- [ ]` Scope evaluated `- [ ]` Required docs enumerated from table `- [ ]` `[Injected:]` headers checked `- [ ]` Non-injected required docs read `- [ ]` `lessons.md` confirmed in context `- [ ]` Citation line emitted
>
> **Note:** The doc list is the canonical fixed set initialized by session hooks. If a doc is absent from `docs/project-reference/`, it does not apply to the current project — skip it. Compaction wipes prior reads — re-fetch on resume if `[Injected:]` headers are absent.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — HARD-GATE for plan/review skills. Apply BEFORE any file read, grep, edit, or analysis step.
>
> 1. **BREAK BEFORE DO:** Decompose work into small tasks via task tracking BEFORE any execution. Every step (read file, grep, analyze, write) is a tracked task. On context loss → call the current task list FIRST, never duplicate.
> 2. **TRANSITION DISCIPLINE:** Mark `in_progress` BEFORE step starts; mark `completed` IMMEDIATELY after — never batch. One `in_progress` at a time.
> 3. **EXTERNAL REPORT (mandatory):** Create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` BEFORE first finding. Append result after EACH file/section/decision — NEVER hold synthesis in memory. Each disk write survives compaction.
> 4. **SYNTHESIZE FROM DISK:** At end of skill run, RE-READ the report file to compose final summary/conclusion. Never synthesize from in-memory recall — context may have been compacted, findings lost.
> 5. **HAND-OFF:** Final response cites `Full report: plans/reports/{filename}` so downstream skills/agents can resume.
>
> **Why:** Plan/review skills run long, span many files, and are prone to mid-execution compaction. Memory-only state = silent loss. Task tracker keeps execution recoverable; report file keeps findings recoverable.
>
> **BLOCKED until:** `- [ ]` task tracking called with full step breakdown `- [ ]` Report file path declared `- [ ]` First finding written to disk before second step begins

<!-- /SYNC:task-tracking-external-report -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (Codex has no hook injection — open this file directly before proceeding)
- `docs/specs/` — Test specifications by module (read existing TCs; generate/update test specs via `$tdd-spec` after implementation)

<!-- SYNC:plan-quality -->

> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
>
> 1. Add `## Test Specifications` section with TC-{FEAT}-{NNN} IDs to every phase file
> 2. Map every functional requirement to ≥1 TC (or explicit `TBD` with rationale)
> 3. TC IDs follow `TC-{FEATURE}-{NNN}` format — reference by ID, never embed full content
> 4. Before any new workflow step: call the current task list and re-read the phase file
> 5. On context compaction: call the current task list FIRST — never create duplicate tasks
> 6. Verify TC satisfaction per phase before marking complete (evidence must be `file:line`, not TBD)
>
> **Mode:** TDD-first → reference existing TCs with `Evidence: TBD`. Implement-first → use TBD → `$tdd-spec` fills after.

<!-- /SYNC:plan-quality -->

> **Skill Variant:** Variant of `$cook` — thorough implementation with maximum verification.

## Quick Summary

**Goal:** Implement features with deep research, comprehensive planning, and maximum quality verification.

**Workflow:**

1. **Research** — Deep investigation with multiple researcher subagents
2. **Plan** — Detailed plan with `$plan-hard`, user approval required
3. **Implement** — Execute with full code review and SRE review
4. **Verify** — Run all tests, review changes, update docs

**Key Rules:**

- Maximum thoroughness: research → plan → implement → review → test → docs
- User approval required at plan stage
- Break work into todo tasks; add final self-review task

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

**Ultrathink** to plan and implement these tasks with maximum verification:

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<tasks>$ARGUMENTS</tasks>

**Mode:** HARD - Extra research, detailed planning, mandatory reviews.

## Workflow

### 1. Deep Research Phase

- Launch 2-3 `researcher` subagents in parallel covering:
    - Technical approach validation
    - Edge cases and failure modes
    - Security implications
    - Performance considerations
- Use `$scout-ext` for comprehensive codebase analysis
- Generate research reports (max 150 lines each)
- **External Memory**: Write all research to `.ai/workspace/analysis/{task-name}.analysis.md`. Re-read ENTIRE file before planning.

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

When graph DB is available, BEFORE writing code, trace to understand the blast radius:

- `python .claude/scripts/code_graph trace <file-to-modify> --direction both --json` — see what calls this code AND what it triggers
- `python .claude/scripts/code_graph trace <file-to-modify> --direction downstream --json` — see all downstream consumers
- This prevents breaking implicit dependencies (bus message consumers, event handlers)

### 2. Comprehensive Planning

- Use `planner` subagent with all research reports
- Create full plan directory with:
    - `plan.md` - Overview with risk assessment
    - `phase-XX-*.md` - Detailed phase files
    - Success criteria for each phase
    - Rollback strategy

### 3. Verified Implementation

- Implement one phase at a time
- After each phase:
    - Run type-check and compile
    - Run relevant tests
    - Self-review before proceeding

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

### 4. Mandatory Testing

- Use `tester` subagent for full test coverage
- Write tests for:
    - Happy path scenarios
    - Edge cases from research
    - Error handling paths
- NO mocks or fake data allowed
- Repeat until all tests pass

### 5. Mandatory Code Review

- Use `code-reviewer` subagent
- Address all critical and major findings
- Re-run tests after fixes
- Repeat until approved

### 6. Documentation Update

- Use `docs-manager` to update relevant docs
- Use `project-manager` to update project status
- Record any architectural decisions

### 7. Final Report

- Summary of all changes
- Test coverage metrics
- Security considerations addressed
- Unresolved questions (if any)
- Ask user to review and approve

## When to Use

- Critical production features
- Security-sensitive changes
- Public API modifications
- Database schema changes
- Cross-service integrations

## Quality Gates

| Gate     | Criteria                  |
| -------- | ------------------------- |
| Research | 2+ researcher reports     |
| Planning | Full plan directory       |
| Tests    | All pass, no mocks        |
| Review   | 0 critical/major findings |
| Docs     | Updated if needed         |

---

## Next Steps (Standalone: MUST ATTENTION ask user via a direct user question. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (feature implemented). This ensures review, testing, and docs steps aren't skipped.
- **"$code-simplifier"** — Simplify and clean up implementation
- **"$workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — the workflow handles sequencing.

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
  <!-- /SYNC:understand-code-first:reminder -->
  <!-- SYNC:plan-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call the current task list before creating new tasks.
  <!-- /SYNC:plan-quality:reminder -->
  <!-- SYNC:ui-system-context:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
  <!-- /SYNC:ui-system-context:reminder -->
  <!-- SYNC:graph-assisted-investigation:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
  <!-- /SYNC:graph-assisted-investigation:reminder -->
  <!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY MUST ATTENTION** break work into tasks via task tracking BEFORE doing — `in_progress`/`completed` per step, never batch.
- **MANDATORY MUST ATTENTION** write findings to `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` incrementally; re-read at end to synthesize — never synthesize from memory.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY MUST ATTENTION** before first task: enumerate required docs from `SYNC:project-reference-docs-guide` table → check `[Injected:]` headers → `Read` every non-injected required doc → always include `lessons.md` → emit `Reference docs read: ...` citation line.
- **MANDATORY MUST ATTENTION** project-specific conventions in these docs override generic framework defaults — acting without them in context produces architecture violations regardless of how clean the code looks.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY MUST ATTENTION** a parent workflow task does NOT satisfy this skill's own task tracking — always expand internal phases via task tracking, even when nested.
- **MANDATORY MUST ATTENTION** when nested, prefix children `[N.M] $skill-name — phase` AND link the parent via `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` so the parent cannot complete until all children resolve.
- **MANDATORY MUST ATTENTION** orchestrator (workflow-\*) skills MUST pre-expand the child skill's manifest into the tracker BEFORE invoking the child — the workflow row is only the parent container, never a substitute for phase tracking.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via a direct user question — never auto-decide
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->

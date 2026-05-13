---
name: scan-ui-system
description: '[Documentation] Use when you need orchestrate all UI system scans in parallel: design system + SCSS styling + frontend patterns.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
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

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
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

## Quick Summary

**Goal:** Run all 3 UI scan skills in parallel → produce a consolidated summary of what was found and what's still missing. Single command for full UI system documentation refresh.

**Workflow:**

1. **Pre-Flight** — Verify frontend code exists; assess which docs need refresh
2. **Launch** — 3 sub-skills run simultaneously
3. **Verify** — Confirm each output doc has real content (not placeholder)
4. **Summarize** — Report findings and remaining gaps

**Key Rules:**

- Skip entirely if project has no frontend code
- All 3 scans run in PARALLEL for speed
- Does NOT modify application code — only populates `docs/project-reference/`
  **MUST ATTENTION** verify each sub-skill output doc after completion — never trust "it ran" without checking

---

# Scan UI System

## Phase 0: Pre-Flight Check

**[BLOCKING]** Before launching sub-skills, determine:

1. Detect frontend code presence:

| Signal                                                                         | Action                                                           |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `angular.json`, `package.json` with frontend framework, `src/Web*` directories | Proceed with all 3 scans                                         |
| No frontend code detected                                                      | **STOP** — report "Backend-only project; scan-ui-system skipped" |

2. Assess each reference doc freshness:

| Reference Doc                                           | Glob to Check                   | Stale If                       |
| ------------------------------------------------------- | ------------------------------- | ------------------------------ |
| `docs/project-reference/design-system/README.md`        | Check last-scanned date in file | >30 days old OR is placeholder |
| `docs/project-reference/scss-styling-guide.md`          | Check last-scanned date in file | >30 days old OR is placeholder |
| `docs/project-reference/frontend-patterns-reference.md` | Check last-scanned date in file | >30 days old OR is placeholder |

3. Determine which scans to run:

| Condition                                     | Decision                                           |
| --------------------------------------------- | -------------------------------------------------- |
| All 3 docs fresh (≤30 days, has real content) | Ask user: "All UI docs are recent. Force refresh?" |
| 1-2 docs stale/missing                        | Run only the stale/missing scans                   |
| All 3 stale/missing                           | Run all 3 in parallel                              |
| User explicitly ran `$scan-ui-system`         | Run all 3 regardless of freshness                  |

4. Read `docs/project-config.json` for `designSystem` section if available — pass config-driven paths to sub-skills.

**Evidence gate:** Confidence <60% on frontend code existence → ask user before proceeding.

## Phase 1: Plan

Create task tracking entries for each sub-skill that will run + one verification task per sub-skill + one summary task. **Do not start Phase 2 without tasks created.**

## Phase 2: Launch Parallel Scans

Run the applicable sub-skills simultaneously. Each sub-skill is FULLY self-contained — do NOT pass context between them.

### Scan 1: Design System

Activate `$scan-design-system` → populates `docs/project-reference/design-system/README.md`

Passes: detected `project-config.json` `designSystem` config to sub-skill if available.

### Scan 2: SCSS/Styling

Activate `$scan-scss-styling` → populates `docs/project-reference/scss-styling-guide.md`

### Scan 3: Frontend Patterns

Activate `$scan-frontend-patterns` → populates `docs/project-reference/frontend-patterns-reference.md`

## Phase 3: Verify Sub-Skill Outputs

**Do NOT proceed to Phase 4 until all 3 are verified.**

For each output doc:

1. Check file exists and has content beyond placeholder headings (Glob + Read first 20 lines)
2. Verify `<!-- Last scanned: -->` header was updated to today's date
3. If a sub-skill output is placeholder-only or missing: flag it as FAILED and re-run that sub-skill once

**If re-run also produces placeholder:** escalate to user — "scan-{name} produced no output. Please run it manually and check for errors."

## Phase 4: Summarize

After all 3 verified, produce a concise summary:

```
UI System Scan Complete ({date}):

Design System    → docs/project-reference/design-system/README.md
  Tokens:        {approach: token-first | figma-driven | ad-hoc}
  Components:    {library | none detected}
  Gaps:          {list or "none identified"}

SCSS Styling     → docs/project-reference/scss-styling-guide.md
  Approach:      {SCSS | Tailwind | CSS-in-JS | CSS Modules | hybrid}
  BEM:           {active | partial | none}
  Gaps:          {list or "none identified"}

Frontend Patterns → docs/project-reference/frontend-patterns-reference.md
  Framework:     {Angular | React | Vue | Svelte | multi-framework}
  State:         {store type detected}
  Gaps:          {list or "none identified"}
```

Replace `{placeholders}` with actual findings from verified output docs — NEVER fabricate.

---

## When to Use

- After `$scaffold` in greenfield-init workflow (design system just created)
- First time using Claude Code on an existing project (onboarding)
- Periodic refresh when UI system has changed significantly
- Manual: user runs `$scan-ui-system`
- Auto-triggered by `project-config` skill Phase 5 scan task creation

## When to Skip

- Backend-only project (no frontend code directories)
- All 3 reference docs are current and recent (≤30 days) — ask user to confirm

## Auto-Trigger Integration

This skill replaces 3 separate scan entries in the `project-config` scan table:

| Reference Docs                                                                         | Scan Skill        |
| -------------------------------------------------------------------------------------- | ----------------- |
| `design-system/README.md` + `scss-styling-guide.md` + `frontend-patterns-reference.md` | `$scan-ui-system` |

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> **Verify sub-skill results after completion.** Sub-skills may complete with partial output. Grep-verify each output doc has real content before declaring success.
> **Do NOT skip a sub-skill because the others found nothing.** Each scan is independent — one empty result does not imply others will be empty.
> **Surface ambiguity before coding.** NEVER pick silently.
> **Check downstream references before deleting.** Map referencing files before removal.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting — one per sub-skill, one per verification, one for summary
**IMPORTANT MUST ATTENTION** run pre-flight check in Phase 0 — never launch scans on backend-only projects
**IMPORTANT MUST ATTENTION** verify each sub-skill output doc has real content — "it ran" ≠ "it produced output"
**IMPORTANT MUST ATTENTION** summary must come from actual verified doc content — NEVER fabricate token counts or component names

**Anti-Rationalization:**

| Evasion                                        | Rebuttal                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| "Frontend code obvious, skip pre-flight check" | Phase 0 is BLOCKING — backend-only project wastes 3 sub-skill invocations      |
| "All docs are probably still fresh"            | Check last-scanned date with actual file read — never assume freshness         |
| "Sub-skills ran, so output must be there"      | Verify output doc content after each sub-skill — placeholder ≠ populated       |
| "Summary from memory is fine"                  | Summary must come from verified output docs — never fabricate findings         |
| "Only re-run needed sub-skills"                | If user ran `$scan-ui-system` explicitly, run all 3 — override freshness check |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using task tracking.

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

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. ALWAYS cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-05-09] **User name materialization MUST ATTENTION go through `User.UpdateName(firstName, middleName, lastName)`.** Domain method (`src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/User.cs:202-209`) recomputes `FullName` as single source of truth. Three sites still manually patch `user.FullName = user.GetFullName()` after assigning name fields — `src/Services/bravoTALENTS/Employee.Application/Factories/UserFactory.cs:50`, `src/Services/bravoSURVEYS/LearningPlatform.Application/ApplyPlatform/MessageBus/Consumers/AccountUserDeletedEventBusConsumer.cs:102`, `src/Services/bravoINSIGHTS/Analyze/Analyze.Application/MessageBus/Consumers/AccountUserDeletedEventBusConsumer.cs:66`. Next time touching any: replace manual patch with `user.UpdateName(...)` to maintain invariant.
- [2026-03-31] **ParallelAsync + repo/UoW MUST ATTENTION use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST ATTENTION include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) leaders. Feature services (Growth, Talents) sending to core MUST ATTENTION use `{CoreServiceName}...RequestBusMessage` — NEVER define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be bash PATH under those names. Check: `where python` / `where py`. ALWAYS prefer `py` (Windows Python Launcher) one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`
- **IMPORTANT MUST ATTENTION** every claim needs `file:line` evidence — confidence >80% to act, NEVER speculate

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->

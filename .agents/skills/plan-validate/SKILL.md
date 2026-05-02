---
name: plan-validate
description: '[Planning] Validate plan with critical questions interview'
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[BLOCKING]** MUST ATTENTION use a direct user question to interview user. Completing without asking ≥1 question = violation.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs** — `docs/project-reference/` initialized by session hooks. Many are auto-injected into context — check for `[Injected: ...]` header before reading manually.
>
> | Document                                   | When to Read                                                          | Auto-Injected?   |
> | ------------------------------------------ | --------------------------------------------------------------------- | ---------------- |
> | `backend-patterns-reference.md`            | Any `.cs` edit — CQRS, repositories, validation, events               | ✓ on `.cs` edits |
> | `frontend-patterns-reference.md`           | Any `.ts`/`.html` edit — base classes, stores, API services           | ✓ on `.ts` edits |
> | `domain-entities-reference.md`             | Task touches entities, models, or cross-service sync                  | ✓ via hook       |
> | `design-system/design-system-canonical.md` | Any `.html`/`.scss`/`.css` edit — tokens, BEM, components             | ✓ via hook       |
> | `integration-test-reference.md`            | Writing or reviewing integration tests                                | ✓ via hook       |
> | `code-review-rules.md`                     | Any code review — project-specific rules & checklists                 | ✓ via hook       |
> | `scss-styling-guide.md`                    | `.scss`/`.css` changes — BEM, mixins, variables                       | —                |
> | `design-system/README.md`                  | UI work — design system overview, component inventory                 | —                |
> | `feature-docs-reference.md`                | Updating `docs/business-features/**` docs                             | ✓ via hook       |
> | `spec-principles.md`                       | Writing TDD specs or test cases                                       | —                |
> | `e2e-test-reference.md`                    | E2E test work — page objects, framework architecture                  | —                |
> | `seed-test-data-reference.md`              | Seed/test data scripts — seeder patterns, DI scope safety             | —                |
> | `project-structure-reference.md`           | Unfamiliar service area — project layout, tech stack, module registry | ✓ via hook       |
> | `lessons.md`                               | Any task — project-specific hard-won lessons                          | ✓ via hook       |
> | `docs-index-reference.md`                  | Searching for docs — full keyword-to-doc lookup                       | —                |

<!-- /SYNC:project-reference-docs-guide -->

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

<!-- /SYNC:cross-service-check -->

> **External Memory:** Complex/lengthy work → write findings + results to `plans/reports/` — prevents context loss.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence % (>80% act, <80% verify first).

## Quick Summary

**Goal:** Interview user with critical questions to validate assumptions and surface issues in plan before coding begins.

**Workflow:**

1. **Detect Plan Type** — Classify plan (bugfix/feature/migration/refactor) to weight question categories
2. **Read Plan** — Parse plan.md + phase files for decisions, assumptions, risks
3. **Extract Topics** — Scan architecture, assumptions, tradeoffs, risks, scope keywords
4. **Generate Questions** — Formulate concrete questions with 2-4 options each
5. **Interview User** — Present questions using configured count range
6. **Document Answers** — Add Validation Summary section to plan.md

**Key Rules:**

- MUST ATTENTION use a direct user question — NEVER auto-decide on behalf of user
- NEVER ask about non-decision points — only genuine choices affecting implementation
- Bugfix plans ALWAYS trigger Preservation question (keywords: fix, bug, regression, broken, defect)
- NEVER modify phase files — only document what needs updating

## Phase 0: Detect Plan Type

Classify plan type BEFORE generating questions — drives question category weighting:

| Plan Type     | Detection                                                         | Mandatory Extra Categories            |
| ------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **Bugfix**    | Title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect` | Preservation (BLOCKING)               |
| **Feature**   | New capability, no fix keywords                                   | Architecture, Assumptions, Test Specs |
| **Migration** | Schema change, EF migration, data move                            | Risks, Preservation, Scope            |
| **Refactor**  | Restructure/clean up, no behavior change                          | Preservation, Tradeoffs               |
| **Other**     | None of above                                                     | Architecture, Scope                   |

**Bugfix detection is BLOCKING** — NEVER skip Preservation question when fix/bug/regression/broken/defect keywords present.

## Plan Resolution

1. `$ARGUMENTS` provided → use that path
2. Check `## Plan Context` section → use active plan path
3. No plan found → ask user to specify path or run `$plan-hard` first

## Configuration (from injected context)

Check `## Plan Context` section:

- `mode` — auto/prompt/off behavior
- `questions` — range like `3-8` (min-max)

Use as hard constraints.

## Workflow

### Step 1: Read Plan Files

Read plan directory:

- `plan.md` — overview + phases list
- `phase-*.md` — all phase files
- Flag: decision points, assumptions, risks, tradeoffs

### Step 2: Extract Question Topics

| Category         | Keywords                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **Architecture** | approach, pattern, design, structure, database, API                                        |
| **Assumptions**  | assume, expect, should, will, must, default                                                |
| **Tradeoffs**    | tradeoff, vs, alternative, option, choice, either/or                                       |
| **Risks**        | risk, might, could fail, dependency, blocker, concern                                      |
| **Scope**        | phase, MVP, future, out of scope, nice to have                                             |
| **New Tech/Lib** | install, add package, new dependency, npm install, dotnet add, unfamiliar framework names  |
| **Test Specs**   | TC-, test case, coverage, TDD, test specification                                          |
| **Preservation** | auto-trigger on bugfix keywords in title/frontmatter — scan Preservation Inventory section |

### Step 3: Generate Questions

**Format rules:**

- 2-4 concrete options per question
- Mark recommended with "(Recommended)" suffix
- "Other" option automatic — do NOT add
- Surface implicit decisions

**Examples:**

```
Category: Architecture
Question: "How should validation results be persisted?"
Options:
1. Save to plan.md frontmatter (Recommended) — updates existing plan
2. Create validation-answers.md — separate answers file
3. Don't persist — ephemeral validation only
```

```
Category: Assumptions
Question: "Plan assumes API rate limiting not needed. Correct?"
Options:
1. Yes, not needed for MVP
2. No, add basic rate limiting now (Recommended)
3. Defer to Phase 2
```

```
Category: Preservation (MANDATORY when title/frontmatter: fix, bug, regression, broken, defect)
Question: "List 2-3 inputs where CURRENT code is correct. Will fix change behavior on any?"
Options (multi-select):
1. "Current code correct on: {input A}. Fix preserves behavior." (Recommended)
2. "Current code correct on: {input B}. Fix CHANGES behavior because: {justification}"
3. "Current code has NO preserved-correctness inputs — every input was broken" (rare; requires confirmation)
4. "Unsure — need to investigate" (STOP: run $plan-hard preservation analysis)
```

**Follow-up rules:**

- Option 2 selected → `plan.md` Preservation Inventory MUST cite Preservation TC asserting new behavior is intended
- Option 4 selected → return BLOCKED status, recommend `$plan-hard` before proceeding
- Option 3 selected → a direct user question follow-up: "Confirm: current code has NO preserved invariant? [Yes, every input broken / No, missed some — re-investigate]"

### Step 4: Interview User

Use a direct user question — NEVER skip or auto-answer.

**Rules:**

- Use question count from `## Plan Context` → `Validation: mode=X, questions=MIN-MAX`
- Group related questions (max 4 per tool call)
- Focus: assumptions, risks, tradeoffs, architecture
- MANDATORY IMPORTANT MUST ATTENTION: if plan introduces new tech/packages, ask: "Plan uses {lib}. Were alternatives evaluated? Confirm choice or research more?"

### Step 5: Document Answers

Add `## Validation Summary` to `plan.md`:

```markdown
## Validation Summary

**Validated:** {date}
**Questions asked:** {count}

### Confirmed Decisions

- {decision 1}: {user choice}
- {decision 2}: {user choice}

### Action Items

- [ ] {changes needed based on answers}
```

NEVER modify phase files — only document what needs updating.

## Output

After validation:

- Questions asked count
- Key decisions confirmed
- Items flagged for plan revision
- Recommendation: proceed to implementation OR revise plan first

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use a direct user question to present:

- **"$cook (Recommended)"** — Begin implementation with validated plan
- **"$refine"** — If plan needs PBI refinement first
- **"Skip, continue manually"** — User decides

---

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->
<!-- SYNC:plan-quality:reminder -->

**IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call the current task list before creating new tasks.

<!-- /SYNC:plan-quality:reminder -->
<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->
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

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via a direct user question — NEVER auto-decide
- **MANDATORY IMPORTANT MUST ATTENTION** detect plan type (Phase 0) BEFORE generating questions — bugfix ALWAYS triggers Preservation
- **MANDATORY IMPORTANT MUST ATTENTION** add final review task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER modify phase files — document what needs updating only
- **MANDATORY IMPORTANT MUST ATTENTION** for bugfix plans, trigger Preservation question (keywords: fix, bug, regression, broken, defect)

**IMPORTANT MUST ATTENTION** for bugfix plans, trigger Preservation question (keywords: fix, bug, regression, broken, defect)

**Anti-Rationalization:**

| Evasion                           | Rebuttal                                                        |
| --------------------------------- | --------------------------------------------------------------- |
| "Plan is simple, skip validation" | Simple plans still have implicit decisions. Apply anyway.       |
| "Already know the answers"        | Show user responses as proof. No responses = no validation.     |
| "Preservation doesn't apply here" | If title has fix/bug/regression/broken/defect → ALWAYS applies. |
| "Phase 0 not needed"              | Detection drives Preservation gate. NEVER skip.                 |
| "Only ask a few questions"        | Use `questions` range from Plan Context. Never go below min.    |

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

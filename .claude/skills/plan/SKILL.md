---
name: plan
version: 1.0.0
description: '[Planning] Intelligent plan creation with prompt enhancement'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

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

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

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
<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Story Points (Modified Fibonacci) + Man-Days for 3-5yr dev (6 productive hrs/day, .NET + Angular stack). AI estimate assumes Claude Code with good project context (code graph, patterns, hooks active).
>
> | SP  | Complexity | Description                                    | Traditional (code + test) | AI-Assisted (code+rev + test+rev) |
> | --- | ---------- | ---------------------------------------------- | ------------------------- | --------------------------------- |
> | 1   | Low        | Trivial: single field, config flag, CSS fix    | 0.5d (0.3d+0.2d)          | 0.25d (0.15d+0.1d)                |
> | 2   | Low        | Small: simple CRUD endpoint OR basic component | 1d (0.6d+0.4d)            | 0.35d (0.2d+0.15d)                |
> | 3   | Medium     | Medium: form + API + validation                | 2d (1.3d+0.7d)            | 0.65d (0.4d+0.25d)                |
> | 5   | Medium     | Large: multi-layer feature (BE + FE)           | 4d (2.5d+1.5d)            | 1.0d (0.6d+0.4d)                  |
> | 8   | High       | Very large: complex feature + migration        | 6d (4d+2d)                | 1.5d (1.0d+0.5d)                  |
> | 13  | Critical   | Epic: cross-service — SHOULD split             | 10d (6.5d+3.5d)           | 2.0d (1.3d+0.7d)                  |
> | 21  | Critical   | MUST split — not sprint-ready                  | >15d                      | ~3d                               |
>
> **AI speedup grows with task size:** SP 1 ≈ 2x · SP 2-3 ≈ 3x · SP 5-8 ≈ 4x · SP 13+ ≈ 5x. Pattern-heavy CQRS/Angular boilerplate eliminated in hours at any scale. Fixed overhead: human review.
> **AI column breakdown:** `(code_gen × 1.3) + (test_gen × 1.3)` — each artifact adds 30% human review overhead. Test writing with AI = few hours generation + 30% review, same model as coding.
> Output `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter.

<!-- /SYNC:estimation-framework -->

- `docs/specs/` — Test specifications by module (read existing TCs to include test strategy in plan)

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

> Before routing, assess complexity score. Score >=3 → plan MUST ATTENTION produce multiple phases with per-phase quality cycles.

## Quick Summary

**Goal:** Intelligently create implementation plans by analyzing task complexity and routing to `/plan-fast` or `/plan-hard`.

**Workflow:**

1. **Analyze** — Surface ambiguity BEFORE planning (protocol below), then ask clarifying questions via `AskUserQuestion`.
2. **Route** — Decide `/plan-fast` (simple) or `/plan-hard` (complex) based on scope
3. **Create** — Execute chosen plan variant, write plan to `plans/` directory
4. **Validate** — Offer `/plan-review` and `/plan-validate` for quality assurance

> **Ambiguity Protocol — MUST ATTENTION run before writing any plan:**
>
> | Dimension       | Ask                                                                          |
> | --------------- | ---------------------------------------------------------------------------- |
> | **Scope**       | All records or filtered? What's included/excluded? Any privacy implications? |
> | **Format**      | File? API? Background job? UI change? What does "done" look like?            |
> | **Volume**      | How many entities/files affected? (drives approach: in-memory vs paged)      |
> | **Constraints** | Performance targets? Security boundaries? Patterns already in use?           |
>
> If multiple interpretations exist, present with effort estimates before planning:
>
> ```
> "[Request]" could mean:
> 1. [Interpretation A] — [approach] — ~[Nh] effort
> 2. [Interpretation B] — [approach] — ~[Nh] effort
> Simplest approach: [X]. Which direction?
> ```
>
> NEVER pick silently. If a simpler approach exists than implied, say so first.

**Key Rules:**

- PLANNING-ONLY: never implement, never use EnterPlanMode tool
- Parent skill for all plan-\* variants (plan-fast, plan-hard, plan-ci, plan-cro, plan-two, plan-parallel)
- Always collaborate with user; ask decision questions, present options
- Always add final `/plan-validate` and `/plan-review` tasks

## Greenfield Mode

> **Auto-detected:** If no existing codebase is found (no code directories like `src/`, `app/`, `lib/`, `server/`, `packages/`, etc., no manifest files like `package.json`/`*.sln`/`go.mod`, no populated `project-config.json`), this skill switches to greenfield mode automatically. Planning artifacts (docs/, plans/, .claude/) don't count — the project must have actual code directories with content.

**When greenfield is detected:**

1. **ALWAYS route to `/plan-hard`** — greenfield planning requires deep research, never fast plans
2. Skip reading project reference docs (they won't exist in a greenfield project)
3. Enable web research for tech landscape analysis (WebSearch + WebFetch)
4. Delegate architecture decisions to `solution-architect` agent
5. Increase user interview frequency (AskUserQuestion at each major decision)
6. If `/greenfield` workflow is not already active, suggest it via AskUserQuestion:
    - "Activate Greenfield Project Init workflow (Recommended)" — full waterfall inception
    - "Continue with standalone /plan-hard" — planning only, no full workflow

## Variant Decision Guide

| If the task is...                | Use                  | Why                                    |
| -------------------------------- | -------------------- | -------------------------------------- |
| Simple, clear scope (<5 files)   | `/plan-fast`         | Lightweight plan, faster output        |
| Complex, multi-layer, many files | `/plan-hard`         | Deep research, comprehensive plan      |
| CI/CD pipeline changes           | `/plan-ci`           | CI-specific context and validation     |
| Cross-cutting refactor           | `/plan-cro`          | Cross-service impact analysis          |
| Parallel implementation possible | `/plan-parallel`     | Splits plan into parallelizable phases |
| Two competing approaches         | `/plan-two`          | Creates 2 plans for comparison         |
| Analyzing existing plan          | `/plan-analysis`     | Reviews/critiques an existing plan     |
| Archiving completed plan         | `/plan-archive`      | Moves plan to archive                  |
| General/unknown                  | `/plan` (this skill) | Routes automatically                   |

## PLANNING-ONLY — Collaboration Required

> **DO NOT** use the `EnterPlanMode` tool — you are ALREADY in a planning workflow.
> **DO NOT** implement or execute any code changes.
> **COLLABORATE** with the user: ask decision questions, present options with recommendations.
> After plan creation, ALWAYS use `AskUserQuestion` tool to offer `/plan-review` validation.
> ASK user to confirm the plan before any next step.

## Your mission

<task>
$ARGUMENTS
</task>

## Pre-Creation Check (Active vs Suggested Plan Detection)

Check the `## Plan Context` section in the injected context:

- If "Plan:" shows a path → Active plan exists. Ask user: "Active plan found: {path}. Continue with this? [Y/n]"
- If "Suggested:" shows a path → Branch-matched plan hint only. Ask user if they want to activate it or create new.
- If "Plan: none" → Proceed to create new plan using naming pattern from `## Naming` section.

## Workflow

- Analyze the given task and use `AskUserQuestion` tool to ask for more details if needed.
- Decide to use `/plan-fast` or `/plan-hard` SlashCommands based on the complexity.
- Execute SlashCommand: `/plan-fast <detailed-instructions-prompt>` or `/plan-hard <detailed-instructions-prompt>`
- Activate `planning` skill.
- Note: `detailed-instructions-prompt` is **an enhanced prompt** that describes the task in detail based on the provided task description.

**MANDATORY FINAL TASKS** — After all planning tasks, ALWAYS add these final tasks:

1. **"Write test specifications for each phase"** — Add `## Test Specifications` with TC-{FEAT}-{NNN} IDs to every phase file. Use `/tdd-spec` if feature docs exist. `Evidence: TBD` for TDD-first mode.
2. **"Run /plan-validate"** — Interview user to validate plan assumptions
3. **"Run /plan-review"** — Auto-review plan for validity and best practices
4. **"Run /why-review (standalone only)"** — If NOT inside a workflow, trigger `/why-review` to validate design rationale, alternatives considered, and risk assessment in the plan. Skip if a workflow already includes `/why-review` in its sequence.

---

## Standalone Review Gate (Non-Workflow Only)

> **MANDATORY IMPORTANT MUST ATTENTION:** If this skill is called **outside a workflow** (standalone `/plan`), the generated plan MUST ATTENTION include `/review-changes` as a **final phase/task** in the plan. This ensures all implementation changes get reviewed before commit even without a workflow enforcing it.
>
> If already running inside a workflow (e.g., `feature`, `bugfix`), skip this — the workflow sequence handles `/review-changes` at the appropriate step.

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `pre-development` workflow** (Recommended) — quality-gate → plan → plan-review → plan-validate
> 2. **Execute `/plan` directly** — run this skill standalone

---

## Post-Plan Granularity Self-Check (MANDATORY)

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

## Preservation Inventory (MANDATORY for bugfixes)

<!-- SYNC:preservation-inventory -->

> **Preservation Inventory** — MANDATORY for bugfix plans. Trigger keywords in plan title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect`. Author MUST produce this table BEFORE writing implementation steps.
>
> **Columns:** `Invariant | file:line | Why (data consequence if broken) | Verification (TC-ID or grep)`
>
> **BLOCKED until:** ≥3 rows · every File cell has `file:line` · every Verification cell has TC-ID or grep (not "manually verify")

<!-- /SYNC:preservation-inventory -->

After creating all phase files, run the **recursive decomposition loop**:

1. Score each phase against the 5-point criteria (file paths, no planning verbs, ≤30min steps, ≤5 files, no open decisions)
2. For each FAILING phase → create task to decompose it into a sub-plan (with its own /plan → /plan-review → /plan-validate → fix cycle)
3. Re-score new phases. Repeat until ALL leaf phases pass (max depth: 3)
4. **Self-question:** "For each phase, can I start coding RIGHT NOW? If any needs 'figuring out' → sub-plan it."

## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (plan created). This ensures review, validation, implementation, and testing steps aren't skipped.
- **"/why-review"** — Validate design rationale in the plan before implementation (standalone only — skipped when workflow includes it)
- **"/plan-review"** — Auto-review plan for validity and best practices
- **"/plan-validate"** — Interview user to confirm plan decisions
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — the workflow handles sequencing.

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** include Test Specifications section and story_points in plan frontmatter
      <!-- SYNC:plan-granularity:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** verify all phases pass 5-point granularity check. Failing phases → sub-plan. "Can I start coding RIGHT NOW?"
      <!-- /SYNC:plan-granularity:reminder -->
      <!-- SYNC:understand-code-first:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
      <!-- SYNC:rationalization-prevention:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** follow ALL steps regardless of perceived simplicity. "Too simple to plan" is an evasion, not a reason.
      <!-- /SYNC:rationalization-prevention:reminder -->
      <!-- SYNC:estimation-framework:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter. Use SP table: SP 1=0.5d/0.25d, SP 2=1d/0.35d, SP 3=2d/0.65d, SP 5=4d/1.0d, SP 8=6d/1.5d · SP 13=10d/2.0d. SP 13 SHOULD split, SP 21 MUST split.
      <!-- /SYNC:estimation-framework:reminder -->
      <!-- SYNC:plan-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.
      <!-- /SYNC:plan-quality:reminder -->
      <!-- SYNC:iterative-phase-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** score complexity first. Score >=6 → decompose. Each phase: plan → implement → review → fix → verify. No skipping.
    <!-- /SYNC:iterative-phase-quality:reminder -->
    <!-- SYNC:cross-service-check:reminder -->
- **IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.
    <!-- /SYNC:cross-service-check:reminder -->
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

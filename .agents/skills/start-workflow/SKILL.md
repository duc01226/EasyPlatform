---
name: start-workflow
description: '[Skill Management] Use when starting a detected workflow, initializing workflow state, or activating a workflow sequence.'
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

- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Detect user intent → auto-select direct/skill/standard/custom path → activate with full task tracking plan.

**Workflow:**

1. **Detect** — Execute explicit `/workflow-*` or `$start-workflow <id>` directly; otherwise match prompt against workflow catalog and skill list
2. **Auto-select** — Choose direct execution, a skill, a standard workflow, or a custom pipeline without asking the user to pick the path
3. **Activate** — Create ALL task tracking items for chosen sequence; materialize every declared `parallelGroups` group as a wave in those tasks; mark first `in_progress`

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.

- MUST ATTENTION auto-select the best execution path for ordinary prompts. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
- Explicit `/workflow-*` or `$start-workflow <id>` invocation counts as the user choosing that workflow; execute it directly.
- Propose Custom Pipeline when no catalog workflow is a strong fit (>80% steps relevant = use catalog)
- `workflows.json` `workflows` field is an **OBJECT** — use `workflows[workflowId]`, NEVER `.find()` or `[index]`
- Create ALL task tracking items BEFORE marking the first task `in_progress` — batch creation, then execute
- Read `parallelGroups` at activation and tag its member tasks as one wave — 1:1 tasks still stand (a group never collapses members into one task)
- No `parallelGroups` = `sequence` is the order — surface only adjacent read-only steps as a `Candidate wave`, NEVER a wave that contradicts `sequence`
- NEVER mark a task `completed` without invoking its skill invocation, except when the selected canonical `preActions.injectContext` explicitly authorizes an evidence-backed conditional skip — use `in_progress` → cited comment → `completed`; never delete the task
- ALWAYS check context for `## Workflow Catalog` first (Tier 1). Tier 2 is mandatory before task creation only for `workflow-big-feature`, `workflow-bugfix`, and `workflow-feature` (to load their terminal refresh predicate), or when Tier 1 cannot supply required `parallelGroups` metadata — NEVER expose the full `workflows.json` to context
- If another workflow is active, it auto-switches (ends current, starts new) — no manual cleanup needed

**NOT for:** Manual step execution (follow task tracking items), workflow design (use `plan`), catalog management.

**Related:** `$start-workflow <workflowId>` | Catalog: host-specific static workflow-catalog surfaces derived from `.claude/workflows.json` (no router/tracker hooks)

---

## Custom Pipeline Option

When the prompt doesn't cleanly match a single catalog workflow — or combining steps from multiple workflows serves the request better — the AI MAY propose a **Custom Pipeline** alongside the catalog option.

### When to propose

| Condition                                    | Example                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| No catalog workflow matches well             | "Review hook changes and update skill docs" — spans review + docs                    |
| Best-match has significant unnecessary steps | Quick investigate + fix, but `workflow-bugfix` includes full TDD + integration cycle |
| Prompt combines 2+ workflow domains          | "Audit performance and write integration tests for the slow query"                   |
| User explicitly requests a step sequence     | "Just run scout, plan, and feature-implement — nothing else"                         |

**Do NOT propose** when a catalog workflow is a strong match (>80% of its steps are relevant). Catalog workflows encode validated best-practice sequences — prefer them.

### How to build

1. **Valid steps only** — Use only canonical step ids — those appearing in workflow `sequence` arrays in `workflows.json` (each maps to a real `.claude/skills/<step>/SKILL.md` and is invoked as `/<step>`). No invented step names.
2. **Logical order** — Investigate → Plan → Implement → Test. Never reverse dependency order.
3. **Minimal** — Include only steps the prompt needs. No "just in case" additions.
4. **Name it** — Short descriptive name: "Quick Fix + Docs", "Audit + Test Coverage".

### How to present (ask the user directly format)

Show full step sequences for ALL options so the user compares scope:

```
Option A — Activate "Bug Fix" workflow (Recommended)
  Steps: $scout → $investigate → $debug-investigate → $plan → $fix → $prove-fix → $test → ...

Option B — Custom Pipeline: "Quick Fix + Docs"
  Steps: $scout → $investigate → $fix → $docs-update
  Rationale: Prompt targets a known location — full TDD cycle is over-engineered here.

```

**Rules:**

- Always show full step list per option
- One-sentence AI rationale for the custom pipeline
- Catalog workflow = "(Recommended)" unless custom pipeline confidence is clearly higher
- NEVER present custom pipeline as the only option — always include the catalog option
- For project-specific architecture, test, documentation, naming, or workflow rules, read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; keep this reusable start-workflow protocol generic.

### Task creation for Custom Pipeline

Same 1:1 protocol — one task tracking per step. Use `[Custom]` prefix to distinguish from catalog tasks:

```
Task tracking: subject="[Custom] {step-name} — {brief description}", description="Custom pipeline step N/{total}.", activeForm="Executing {step-name}"
```

---

## Workflow Lookup — Tier 1 Selection, Tier 2 Execution

Use Tier 1 to select every route. For the three policy-bound delivery workflows (`workflow-big-feature`, `workflow-bugfix`, and `workflow-feature`), use Tier 2 before task tracking to materialize their execution contract because static catalogs omit the terminal-refresh pre-action. Other workflows retain their existing Tier-1 task materialization unless `parallelGroups` metadata is required.

### Tier 1: Context (FREE — no file reads)

The workflow catalog is already present in static host context — derived into `CLAUDE.md`, `AGENTS.md`, and Codex context rather than injected by a hook. Its headings and row grammar vary by host.

1. Search the available catalog surface for the exact workflow ID: `{workflowId}`.
2. Use its name and `whenToUse` summary only to confirm the route.
3. For `workflow-big-feature`, `workflow-bugfix`, and `workflow-feature`, do NOT parse a static catalog sequence or command syntax for task tracking; Tier 1 is route selection only. Other workflows retain their existing Tier-1 task materialization unless a Tier-2 `parallelGroups` read is required.

✅ Use Tier 1 for: route selection, and existing task materialization for workflows outside the policy-bound delivery set.
⚠️ Tier 2 is required immediately after selection and **before task tracking for only `workflow-big-feature`, `workflow-bugfix`, and `workflow-feature`**, plus any activation that needs canonical `parallelGroups`. The complete canonical entry loads `sequence`, `preActions.injectContext`, and `parallelGroups`.

### Tier 2: Complete Canonical Entry Read (JSON-aware)

After Tier 1 identifies a policy-bound delivery workflow or an activation needing `parallelGroups`, use this selected-entry read before creating tasks. For the three delivery workflows, the static catalog is a route-selection aid; the selected canonical entry remains the execution contract:

```
node .claude/scripts/codex/read-workflow-entry.mjs <workflowId>
```

This JSON-aware helper prints the complete `workflows[workflowId]` object only, including every sequence step even when the entry is long. It accepts the exact Tier-1-selected workflow ID as a data argument; it does not interpolate it into a shell command.
Parse: `sequence` array → step IDs, `preActions.injectContext`, and `parallelGroups` → invoke each with the active host's command syntax for that step.

### Tier 3: Missing Entry (stop)

If the JSON-aware lookup cannot return the exact selected entry, stop and report catalog drift or a missing canonical workflow. Do not fall back to a fixed-context grep, and do not expose the full file to context.

---

## After Activation — Task Creation Protocol (ZERO TOLERANCE)

**Active-goal resolution (BEFORE child task creation):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active plan `goal.md`, else `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, else create one from the current user request using `.claude/templates/goal-contract-template.md`. Record the resolved goal path and pass it to every child step/sub-agent so the whole workflow executes against the same saved success criteria. The workflow may end only when the goal's Goal Satisfaction matrix passes or a blocker is escalated.

FIRST action after activation: create EXACTLY one task tracking for EACH entry in the workflow's `sequence` array.

### How to read `workflows.json` — CRITICAL SCHEMA

**`workflows.json` is a JSON OBJECT, not an array.** Most common AI mistake.

```
{
  "settings":       { ... },
  "workflows":      { <workflowId>: WorkflowEntry }   ← OBJECT, keyed by ID
}
```

**Lookup algorithm:**

```
workflow = workflows[workflowId]           // key lookup — NOT .find(), NOT [index]
steps    = workflow.sequence               // array of step ID strings
invocation = resolveActiveHostSyntax(stepId) // e.g. the active host's syntax for "scout"
```

**WorkflowEntry fields:**

| Field            | Type     | Notes                                                                                      |
| ---------------- | -------- | ------------------------------------------------------------------------------------------ |
| `name`           | string   | Display name                                                                               |
| `sequence`       | string[] | Ordered step IDs — SOLE source of truth                                                    |
| `whenToUse`      | string   | Natural language intent matching                                                           |
| `preActions`     | object   | Optional `injectContext` / `readFiles`                                                     |
| `parallelGroups` | object[] | Optional all-return barrier groups — `{id, members[], barrier:true, conditionalMembers[]}` |

**FORBIDDEN (common mistakes):**

```
// ❌ WRONG
workflows.find(w => w.id === workflowId)
workflows[0]

// ✅ CORRECT
workflows[workflowId]
Object.keys(workflows)   // list all IDs
```

### Task creation steps

1. **Tier 1 first (no file read):** search the available static catalog surface for `{workflowId}`. For workflows outside the policy-bound delivery set, use its established active-host sequence to create tasks unless canonical `parallelGroups` metadata is required.
2. **Tier 2 required before task tracking only for `workflow-big-feature`, `workflow-bugfix`, and `workflow-feature`, or when `parallelGroups` metadata is required:** `node .claude/scripts/codex/read-workflow-entry.mjs <workflowId>` → treat the complete selected entry's `sequence`, `preActions.injectContext`, and `parallelGroups` as canonical. If the static preview differs, stop and report catalog drift rather than choosing one silently.
3. **Apply delivery-workflow pre-actions to task context:** preserve the selected entry's `preActions.injectContext` as workflow-level execution context. For every conditional step it governs, put the exact run condition and evidence-backed skip transition in that task's description; never infer or drop a predicate because the static catalog rendered only a step name.
4. Create one task tracking per selected sequence step IN ORDER

> See **Workflow Lookup — Token-Efficient (3-Tier Strategy)** above for full lookup rules and fallback chain.

**Task format:**

```
Task tracking: subject="[Workflow] {step-name} — {brief description}", description="Workflow step N/{total}. {conditional note}", activeForm="Executing {step-name}"
```

**Rules (NON-NEGOTIABLE):**

- **1:1 mapping** — each sequence entry = exactly one task. No consolidation, no invented tasks.
- **Conditional steps still get tasks** — add the exact canonical run condition and evidence-backed skip transition to the description; when the selected canonical `preActions.injectContext` authorizes that skip, it may complete without a Skill invocation after the cited comment. Never use a generic skip label.
- **Delivery-workflow pre-actions are mandatory execution input** — after Tier 1 selects `workflow-big-feature`, `workflow-bugfix`, or `workflow-feature`, Tier 2 must load `preActions.injectContext` before task tracking. A conditional step's task description must state its canonical run condition and evidence-backed skip transition.
- **Recursive self-calls get tasks** — e.g., `[Workflow] $workflow-review-changes — Recursive re-review (conditional)`
- **Count verification** — after creation: `task count == len(sequence)`. Fix mismatch before proceeding.

### Parallel waves from `parallelGroups` (compute at activation, BEFORE the first task runs)

A workflow MAY declare barrier groups in `parallelGroups` (schema: `.claude/workflows.schema.json` → `WorkflowEntry.parallelGroups`; live example: `workflow-review-changes`, groups `initial-reviews` and `reviewers`). Materialize each declared group as a wave IN THE TASK LIST, so the barrier is visible in the tasks and not only in prose.

1. **Read `parallelGroups` alongside `sequence`.** Tier 1 (`## Workflow Catalog` in `CLAUDE.md`) renders members FLAT and carries no group data. Tier 2's JSON-aware selected-entry lookup supplies `parallelGroups` with `sequence`.
2. **Expand any barrier token you were given.** The Codex mirrors (`AGENTS.md`, `.codex/CODEX_CONTEXT.md`) collapse a group into ONE `[parallel ⇉ all-return barrier: a, b*]` token (`*` = conditional member). That token is a barrier marker, NOT a step — expand it back to its member steps and create one task per member.
3. **Task count is still `len(sequence)`.** A group NEVER collapses its members into a single task; it only adds wave metadata to the member tasks.
4. **Tag each member task** — subject `[Workflow] [wave: {groupId}] /{step} — {brief description}`, description `Workflow step N/{total}. Parallel group '{groupId}' — spawned together with {other members}; barrier: advance only after ALL members return. {conditional note}`.
5. **Conditional members still get their own task** — add "Conditional — a skipped member still counts as returned for the barrier"; skip via `in_progress` → comment → `completed`, never delete.
6. **Execute a group as ONE wave** — spawn every member in ONE message, barrier on all returns, then advance to the first step after the group. That next step is a SEQ boundary: never start it — and never start any code-mutating step — while a member is still in flight.
7. **Malformed group → STOP, do not repair.** A member absent from `sequence`, a member in two groups, or `barrier ≠ true` means the workflow definition is broken: report it and run the sequence strictly in order rather than guessing the intended grouping.

### When a workflow declares NO `parallelGroups`

`sequence` is the source of truth. Absence of `parallelGroups` is NOT permission to invent groups.

- **NEVER** reorder, merge, drop, or co-schedule steps in any way that contradicts `sequence` — no self-authored wave may run a step ahead of a step that precedes it in `sequence`, and a workflow's fixed order overrides any independence you infer.
- **DO surface a candidate wave** when adjacent steps are obviously independent — ALL of: (a) contiguous in `sequence`, (b) read-only / report-producing (review, scan, investigation, research — each writes only its own `plans/reports/` file), (c) neither consumes the other's output. Announce it as `Candidate wave (not declared): [...]` and keep the 1:1 tasks unchanged.
- **NEVER** put in a candidate wave: any step that writes source files, any gate awaiting user approval, any step consuming a previous step's output, or any non-adjacent pair. When in doubt → run sequentially; a wrong wave silently reorders the workflow, a missed wave only costs time.
- **Persist what proves right** — if a candidate wave was correct, tell the user to add a `parallelGroups` entry to `.claude/workflows.json` (never edit it mid-run). An undeclared wave must never become the de-facto sequence.

Create ALL tasks first → then `TaskUpdate` first task to `in_progress`.

---

## Step Execution Protocol

Per required (non-skipped) step: `TaskUpdate in_progress` → **invoke skill invocation** → complete skill → `TaskUpdate completed`.

- Completing a task without invoking its skill invocation = **workflow violation**, except for a conditionally skipped task explicitly authorized by the selected canonical pre-action, which may complete without invoking its skill invocation after its cited comment
- Validation gates (`$plan-validate`, `$plan-review`, `$why-review`) MUST use explicit evidence and local project protocol — NEVER auto-approve inferred decisions. Explicit user approval in the prompt may satisfy the gate only when the gate's skill permits it.
- To skip a conditionally authorized step: `TaskUpdate in_progress` → cited comment "Skipped — {reason}" → `TaskUpdate completed` without invoking its skill invocation. Never delete.

---

## Workflow-in-Workflow Gate (HARD GATE)

Some workflow steps ARE themselves full workflows. The DEFAULT for a step that activates a multi-step workflow is sub-agent delegation — running it inline causes the parent session to absorb the entire nested workflow's tool calls, file reads, and sub-agent reports (context overflow on long sequences). The sub-agent runs the nested workflow in isolation and returns ONLY a `SYNC:subagent-return-contract` summary (full findings to `plans/reports/`).

**Default protocol (sub-agent delegation) for a nested-workflow step:**

1. NEVER invoke via inline skill invocation call
2. Spawn via `spawn_agent` tool with the appropriate `agent_type`
3. Agent prompt must include: current git diff context + feature/task description
4. Sub-agent runs the full nested workflow in its isolated context
5. Return ONLY SYNC:subagent-return-contract summary — write full findings to `plans/reports/`
6. Main agent reads `plans/reports/` file only when resolving specific blockers

**EXCEPTION — `workflow-review-changes` runs INLINE in the main session (never a sub-agent):**

| Step                       | Workflow activated        | Execution mode                  | Why                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$workflow-review-changes` | `workflow-review-changes` | **INLINE — main session agent** | Its Step 0 `/goal` gate binds the session Stop hook + its step-15 re-review is inline by design; a sub-agent cannot own the Stop hook, so delegating it silently breaks the unabandonable review→fix→re-review loop. Context stays bounded because its OWN step 2 and steps 4–10 reviewers are sub-agents writing to `plans/reports/`. |

When `$workflow-review-changes` appears in any workflow sequence (e.g. `workflow-feature`, `workflow-bugfix`, `workflow-refactor`), invoke it via the skill invocation INLINE — do NOT spawn it as an `spawn_agent` sub-agent.

> The ⚠️ **[WORKFLOW-IN-WORKFLOW GATE]** is model-driven: apply it (default sub-agent, or the `workflow-review-changes` inline exception) yourself whenever the next step activates a nested workflow — no hook emits this warning.

---

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> auto-select-execution-path -> activate-workflow -> create-task-tracking -> execute-sequence

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> auto-select-execution-path -> activate-workflow -> create-task-tracking -> execute-sequence

> **[MANDATORY]** task tracking FIRST — break every workflow into tasks before any action. NEVER skip.
> **[MANDATORY]** Auto-select the best path for auto-detected workflows; do not use ask the user directly for workflow-selection confirmation. Explicit workflow invocation executes directly.
> **[MANDATORY]** skill invocation REQUIRED for every non-skipped step. The sole exception is an evidence-backed conditional skip explicitly authorized by the selected canonical `preActions.injectContext`.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `plans/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof, confidence >80%; NEVER present guess as fact.
- **Incremental Persistence:** append findings to report per file; NEVER hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary only; NEVER inline full output.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**MUST ATTENTION** auto-select the best path for ordinary prompts; explicit `/workflow-*` or `$start-workflow <id>` invocation executes directly. Do not ask for workflow-selection confirmation.
**MUST ATTENTION** `workflows` is an OBJECT — `workflows[workflowId]`, NEVER `.find()` / `[index]` / `.forEach()`
**MUST ATTENTION** create ALL task tracking items for the full sequence BEFORE marking the first task `in_progress`
**MUST ATTENTION** never mark a task `completed` without invoking its skill invocation, except an evidence-backed conditional skip explicitly authorized by selected canonical `preActions.injectContext` — cite comment + completed, never delete
**MUST ATTENTION** custom pipeline steps must be canonical step ids (each maps to a real `.claude/skills/<step>/SKILL.md`) — never invent step names
**MUST ATTENTION** use Tier 1 context selection FIRST, then Tier 2 JSON-aware complete canonical-entry read before task tracking only for `workflow-big-feature`, `workflow-bugfix`, `workflow-feature`, or an activation needing `parallelGroups` — load `sequence`, `preActions.injectContext`, and `parallelGroups`; never use fixed-context grep output
**MUST ATTENTION** materialize every declared `parallelGroups` group as a wave in the task list — one task per member, wave-tagged, spawned in ONE message, all-return barrier before the next step — why: a barrier that lives only in prose gets executed one step at a time
**MUST ATTENTION** no `parallelGroups` → `sequence` IS the order — never invent a group that contradicts it; only adjacent read-only steps may be surfaced as a `Candidate wave (not declared)` — why: a self-authored wave silently reorders a validated workflow, and that costs more than the time it saves

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

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
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

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
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
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
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->

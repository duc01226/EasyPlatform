---
name: workflow-start
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

**Goal:** Detect user intent → present catalog/custom options → activate with full task tracking plan.

**Workflow:**

1. **Detect** — Match prompt against workflow catalog; identify best catalog workflow + optional custom pipeline
2. **Ask/Confirm** — Ask for auto-detected workflows; explicit `/workflow-*` or `$workflow-start <id>` invocation counts as confirmation when local protocol allows.
3. **Activate** — Create ALL task tracking items for chosen sequence; mark first `in_progress`

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.

- MUST ATTENTION **ALWAYS** call a direct user question before activating auto-detected workflows — NEVER auto-activate an inferred workflow. Explicit `/workflow-*` or `$workflow-start <id>` invocation counts as confirmation when local project protocol allows. — why: silent activation runs a multi-step plan the user never agreed to.
- Present the required standard-vs-custom choice: `A) Activate [Workflow] (Recommended)` | `B) Custom Pipeline: [step → ...]`
- Propose Custom Pipeline when no catalog workflow is a strong fit (>80% steps relevant = use catalog)
- `workflows.json` `workflows` field is an **OBJECT** — use `workflows[workflowId]`, NEVER `.find()` or `[index]`
- Create ALL task tracking items BEFORE marking the first task `in_progress` — batch creation, then execute
- NEVER mark a task `completed` without invoking its skill invocation — skip = `in_progress` + comment, not delete
- ALWAYS check context for `## Workflow Catalog` first (Tier 1) — NEVER read `workflows.json` directly when catalog is in context
- If another workflow is active, it auto-switches (ends current, starts new) — no manual cleanup needed

**NOT for:** Manual step execution (follow task tracking items), workflow design (use `planning`), catalog management.

**Related:** `$workflow-start <workflowId>` | Hook: `workflow-step-tracker.cjs` | Hook: `workflow-router.cjs`

---

## Custom Pipeline Option

When the prompt doesn't cleanly match a single catalog workflow — or combining steps from multiple workflows serves the request better — the AI MAY propose a **Custom Pipeline** alongside the catalog option.

### When to propose

| Condition                                    | Example                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| No catalog workflow matches well             | "Review hook changes and update skill docs" — spans review + docs           |
| Best-match has significant unnecessary steps | Quick investigate + fix, but `bugfix` includes full TDD + integration cycle |
| Prompt combines 2+ workflow domains          | "Audit performance and write integration tests for the slow query"          |
| User explicitly requests a step sequence     | "Just run scout, plan, and cook — nothing else"                             |

**Do NOT propose** when a catalog workflow is a strong match (>80% of its steps are relevant). Catalog workflows encode validated best-practice sequences — prefer them.

### How to build

1. **Valid steps only** — Use only keys from `commandMapping` in `workflows.json`. No invented step names.
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
- For project-specific architecture, test, documentation, naming, or workflow rules, read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; keep this reusable workflow-start protocol generic.

### Task creation for Custom Pipeline

Same 1:1 protocol — one task tracking per step. Use `[Custom]` prefix to distinguish from catalog tasks:

```
Task tracking: subject="[Custom] /{step-name} — {brief description}", description="Custom pipeline step N/{total}.", activeForm="Executing /{step-name}"
```

---

## Workflow Lookup — Token-Efficient (3-Tier Strategy)

ALWAYS try tiers in order — stop at first success.

### Tier 1: Context (FREE — no file reads)

The workflow catalog is already injected as `## Workflow Catalog` in your context (injected by `workflow-router.cjs` on every UserPromptSubmit).

1. Search your context for `## Workflow Catalog`
2. Find the line: `**{workflowId}** — {name}`
3. Read the NEXT line: `  Use: ... | Steps: /step1 → /step2 → ...`
4. Parse the `Steps:` value — these ARE the slash commands for task tracking

**Example:** `Steps: $scout → $plan → $cook → $test → $workflow-end`
→ Create 5 task tracking items for `$scout`, `$plan`, `$cook`, `$test`, `$workflow-end` in order.

✅ Use Tier 1 for: all standard task tracking creation (no file reads needed)
⚠️ Use Tier 2 if: catalog not in context, OR you need `preActions.injectContext`

### Tier 2: Targeted Grep (1 grep operation)

Use when catalog is absent from context OR `preActions.injectContext` is needed:

```
Grep: pattern='"<workflowId>":'  path='.claude/workflows.json'  context=35
```

Returns only that workflow's entry (~35 lines vs full file).
Parse: `sequence` array → step IDs → resolve via `commandMapping`.

### Tier 3: Minimal Read (last resort — avoid)

Only if Tier 1 and Tier 2 both fail:

```
Read '.claude/workflows.json' lines 1-15    ← commandMapping only
Then Grep '"<workflowId>":' context=30
```

**NEVER** read the full file — it is large and wastes tokens.

---

## After Activation — Task Creation Protocol (ZERO TOLERANCE)

FIRST action after activation: create EXACTLY one task tracking for EACH entry in the workflow's `sequence` array.

### How to read `workflows.json` — CRITICAL SCHEMA

**`workflows.json` is a JSON OBJECT, not an array.** Most common AI mistake.

```
{
  "commandMapping": { <stepId>: { "claude": "/cmd" } },
  "settings":       { ... },
  "workflows":      { <workflowId>: WorkflowEntry }   ← OBJECT, keyed by ID
}
```

**Lookup algorithm:**

```
workflow = workflows[workflowId]           // key lookup — NOT .find(), NOT [index]
steps    = workflow.sequence               // array of step ID strings
// resolve slash command:
slashCmd = commandMapping[stepId].claude   // commandMapping["scout"].claude → "$scout"
```

**WorkflowEntry fields:**

| Field                        | Type     | Notes                                   |
| ---------------------------- | -------- | --------------------------------------- |
| `name`                       | string   | Display name                            |
| `confirmFirst`               | boolean  | Prompt user before starting             |
| `sequence`                   | string[] | Ordered step IDs — SOLE source of truth |
| `whenToUse` / `whenNotToUse` | string   | Natural language intent matching        |
| `preActions`                 | object   | Optional `injectContext` / `readFiles`  |

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

1. **Tier 1 first (no file read):** Search context for `## Workflow Catalog` → find `**{workflowId}**` → parse `Steps:` line → slash commands are ready to use
2. **Tier 2 if needed:** `Grep .claude/workflows.json --pattern '"<workflowId>":'  --context 35` → parse `sequence` + `commandMapping`
3. Create one task tracking per step IN ORDER

> See **Workflow Lookup — Token-Efficient (3-Tier Strategy)** above for full lookup rules and fallback chain.

**Task format:**

```
Task tracking: subject="[Workflow] /{step-name} — {brief description}", description="Workflow step N/{total}. {conditional note}", activeForm="Executing /{step-name}"
```

**Rules (NON-NEGOTIABLE):**

- **1:1 mapping** — each sequence entry = exactly one task. No consolidation, no invented tasks.
- **Conditional steps still get tasks** — add to description: "Conditional — skip if reviews pass"
- **Recursive self-calls get tasks** — e.g., `[Workflow] $workflow-review-changes — Recursive re-review (conditional)`
- **Count verification** — after creation: `task count == len(sequence)`. Fix mismatch before proceeding.

Create ALL tasks first → then `TaskUpdate` first task to `in_progress`.

---

## Step Execution Protocol

Per step: `TaskUpdate in_progress` → **invoke skill invocation** → complete skill → `TaskUpdate completed`.

- Completing a task without invoking its skill invocation = **workflow violation**
- Validation gates (`$plan-validate`, `$plan-review`, `$why-review`) MUST use explicit evidence and local project protocol — NEVER auto-approve inferred decisions. Explicit user approval in the prompt may satisfy the gate only when the gate's skill permits it.
- To skip a conditional step: `TaskUpdate in_progress` → comment "Skipped — {reason}" → `TaskUpdate completed`. Never delete.

---

## Workflow-in-Workflow Gate (HARD GATE — NO EXCEPTIONS)

Some workflow steps ARE themselves full workflows. Running them inline causes the parent session to absorb the entire nested workflow's tool calls, file reads, and sub-agent reports — guaranteed context overflow on long sequences.

**Steps requiring sub-agent delegation (hard gate):**

| Step                       | Workflow activated | Step count source                           | Agent type      |
| -------------------------- | ------------------ | ------------------------------------------- | --------------- |
| `$workflow-review-changes` | `review-changes`   | `len(workflows["review-changes"].sequence)` | `code-reviewer` |
| `$workflow-review`         | `review`           | `len(workflows["review"].sequence)`         | `code-reviewer` |

**Protocol when these steps appear in the active workflow sequence:**

1. NEVER invoke via inline skill invocation call
2. Spawn via `spawn_agent` tool: `agent_type: "code-reviewer"`
3. Agent prompt must include: current git diff context + feature/task description
4. Sub-agent runs the full nested workflow in its isolated context
5. Return ONLY SYNC:subagent-return-contract summary — write full findings to `plans/reports/`
6. Main agent reads `plans/reports/` file only when resolving specific blockers

> The `workflow-step-tracker.cjs` PostToolUse hook injects the ⚠️ **[WORKFLOW-IN-WORKFLOW GATE]** warning automatically when the next step is one of the above.

---

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> ask-or-confirm-workflow-choice -> activate-workflow -> create-task-tracking -> execute-sequence

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> ask-or-confirm-workflow-choice -> activate-workflow -> create-task-tracking -> execute-sequence

> **[MANDATORY]** task tracking FIRST — break every workflow into tasks before any action. NEVER skip.
> **[MANDATORY]** a direct user question ALWAYS for auto-detected workflows — present the standard-vs-custom (A/B) choice; NEVER auto-activate inferred workflows. Explicit workflow invocation may satisfy confirmation when local protocol allows.
> **[MANDATORY]** skill invocation REQUIRED per step — NEVER mark a task `completed` without invoking it.

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

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**MUST ATTENTION** call a direct user question before activating auto-detected workflows; explicit `/workflow-*` or `$workflow-start <id>` invocation may satisfy confirmation when local protocol allows. Never auto-activate inferred workflows.
**MUST ATTENTION** `workflows` is an OBJECT — `workflows[workflowId]`, NEVER `.find()` / `[index]` / `.forEach()`
**MUST ATTENTION** create ALL task tracking items for the full sequence BEFORE marking the first task `in_progress`
**MUST ATTENTION** never mark a task `completed` without invoking its skill invocation — skip means comment + completed, not delete
**MUST ATTENTION** custom pipeline steps must be valid `commandMapping` keys — never invent step names
**MUST ATTENTION** use Tier 1 context parse FIRST — check `## Workflow Catalog` in context before any file read

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

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

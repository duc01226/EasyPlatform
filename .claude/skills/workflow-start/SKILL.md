---
name: workflow-start
version: 1.0.0
description: '[Skill Management] Use when starting a detected workflow, initializing workflow state, or activating a workflow sequence.'
---

## Quick Summary

**Goal:** Detect user intent → present catalog/custom options → activate with full TaskCreate plan.

**Workflow:**

1. **Detect** — Match prompt against workflow catalog; identify best catalog workflow + optional custom pipeline
2. **Ask/Confirm** — Ask for auto-detected workflows; explicit `/workflow-*` or `/workflow-start <id>` invocation counts as confirmation when local protocol allows.
3. **Activate** — Create ALL TaskCreate items for chosen sequence; mark first `in_progress`

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.

- MUST ATTENTION **ALWAYS** call `AskUserQuestion` before activating auto-detected workflows — NEVER auto-activate an inferred workflow. Explicit `/workflow-*` or `/workflow-start <id>` invocation counts as confirmation when local project protocol allows. — why: silent activation runs a multi-step plan the user never agreed to.
- Present the required standard-vs-custom choice: `A) Activate [Workflow] (Recommended)` | `B) Custom Pipeline: [step → ...]`
- Propose Custom Pipeline when no catalog workflow is a strong fit (>80% steps relevant = use catalog)
- `workflows.json` `workflows` field is an **OBJECT** — use `workflows[workflowId]`, NEVER `.find()` or `[index]`
- Create ALL `TaskCreate` items BEFORE marking the first task `in_progress` — batch creation, then execute
- NEVER mark a task `completed` without invoking its `Skill` tool — skip = `in_progress` + comment, not delete
- ALWAYS check context for `## Workflow Catalog` first (Tier 1) — NEVER read `workflows.json` directly when catalog is in context
- If another workflow is active, it auto-switches (ends current, starts new) — no manual cleanup needed

**NOT for:** Manual step execution (follow TaskCreate items), workflow design (use `planning`), catalog management.

**Related:** `/workflow-start <workflowId>` | Hook: `workflow-step-tracker.cjs` | Hook: `workflow-router.cjs`

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

### How to present (AskUserQuestion format)

Show full step sequences for ALL options so the user compares scope:

```
Option A — Activate "Bug Fix" workflow (Recommended)
  Steps: /scout → /investigate → /debug-investigate → /plan → /fix → /prove-fix → /test → ...

Option B — Custom Pipeline: "Quick Fix + Docs"
  Steps: /scout → /investigate → /fix → /docs-update
  Rationale: Prompt targets a known location — full TDD cycle is over-engineered here.

```

**Rules:**

- Always show full step list per option
- One-sentence AI rationale for the custom pipeline
- Catalog workflow = "(Recommended)" unless custom pipeline confidence is clearly higher
- NEVER present custom pipeline as the only option — always include the catalog option
- For project-specific architecture, test, documentation, naming, or workflow rules, read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; keep this reusable workflow-start protocol generic.

### Task creation for Custom Pipeline

Same 1:1 protocol — one `TaskCreate` per step. Use `[Custom]` prefix to distinguish from catalog tasks:

```
TaskCreate: subject="[Custom] /{step-name} — {brief description}", description="Custom pipeline step N/{total}.", activeForm="Executing /{step-name}"
```

---

## Workflow Lookup — Token-Efficient (3-Tier Strategy)

ALWAYS try tiers in order — stop at first success.

### Tier 1: Context (FREE — no file reads)

The workflow catalog is already injected as `## Workflow Catalog` in your context (injected by `workflow-router.cjs` on every UserPromptSubmit).

1. Search your context for `## Workflow Catalog`
2. Find the line: `**{workflowId}** — {name}`
3. Read the NEXT line: `  Use: ... | Steps: /step1 → /step2 → ...`
4. Parse the `Steps:` value — these ARE the slash commands for TaskCreate

**Example:** `Steps: /scout → /plan → /cook → /test → /workflow-end`
→ Create 5 TaskCreate items for `/scout`, `/plan`, `/cook`, `/test`, `/workflow-end` in order.

✅ Use Tier 1 for: all standard TaskCreate creation (no file reads needed)
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

FIRST action after activation: create EXACTLY one `TaskCreate` for EACH entry in the workflow's `sequence` array.

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
slashCmd = commandMapping[stepId].claude   // commandMapping["scout"].claude → "/scout"
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
3. Create one `TaskCreate` per step IN ORDER

> See **Workflow Lookup — Token-Efficient (3-Tier Strategy)** above for full lookup rules and fallback chain.

**Task format:**

```
TaskCreate: subject="[Workflow] /{step-name} — {brief description}", description="Workflow step N/{total}. {conditional note}", activeForm="Executing /{step-name}"
```

**Rules (NON-NEGOTIABLE):**

- **1:1 mapping** — each sequence entry = exactly one task. No consolidation, no invented tasks.
- **Conditional steps still get tasks** — add to description: "Conditional — skip if reviews pass"
- **Recursive self-calls get tasks** — e.g., `[Workflow] /workflow-review-changes — Recursive re-review (conditional)`
- **Count verification** — after creation: `task count == len(sequence)`. Fix mismatch before proceeding.

Create ALL tasks first → then `TaskUpdate` first task to `in_progress`.

---

## Step Execution Protocol

Per step: `TaskUpdate in_progress` → **invoke `Skill` tool** → complete skill → `TaskUpdate completed`.

- Completing a task without invoking its `Skill` tool = **workflow violation**
- Validation gates (`/plan-validate`, `/plan-review`, `/why-review`) MUST use explicit evidence and local project protocol — NEVER auto-approve inferred decisions. Explicit user approval in the prompt may satisfy the gate only when the gate's skill permits it.
- To skip a conditional step: `TaskUpdate in_progress` → comment "Skipped — {reason}" → `TaskUpdate completed`. Never delete.

---

## Workflow-in-Workflow Gate (HARD GATE — NO EXCEPTIONS)

Some workflow steps ARE themselves full workflows. Running them inline causes the parent session to absorb the entire nested workflow's tool calls, file reads, and sub-agent reports — guaranteed context overflow on long sequences.

**Steps requiring sub-agent delegation (hard gate):**

| Step                       | Workflow activated | Step count source                           | Agent type      |
| -------------------------- | ------------------ | ------------------------------------------- | --------------- |
| `/workflow-review-changes` | `review-changes`   | `len(workflows["review-changes"].sequence)` | `code-reviewer` |
| `/workflow-review`         | `review`           | `len(workflows["review"].sequence)`         | `code-reviewer` |

**Protocol when these steps appear in the active workflow sequence:**

1. NEVER invoke via inline `Skill` tool call
2. Spawn via `Agent` tool: `subagent_type: "code-reviewer"`
3. Agent prompt must include: current git diff context + feature/task description
4. Sub-agent runs the full nested workflow in its isolated context
5. Return ONLY SYNC:subagent-return-contract summary — write full findings to `plans/reports/`
6. Main agent reads `plans/reports/` file only when resolving specific blockers

> The `workflow-step-tracker.cjs` PostToolUse hook injects the ⚠️ **[WORKFLOW-IN-WORKFLOW GATE]** warning automatically when the next step is one of the above.

---

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> ask-or-confirm-workflow-choice -> activate-workflow -> create-task-tracking -> execute-sequence

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> ask-or-confirm-workflow-choice -> activate-workflow -> create-task-tracking -> execute-sequence

> **[MANDATORY]** `TaskCreate` FIRST — break every workflow into tasks before any action. NEVER skip.
> **[MANDATORY]** `AskUserQuestion` ALWAYS for auto-detected workflows — present the standard-vs-custom (A/B) choice; NEVER auto-activate inferred workflows. Explicit workflow invocation may satisfy confirmation when local protocol allows.
> **[MANDATORY]** `Skill` tool REQUIRED per step — NEVER mark a task `completed` without invoking it.

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

**MUST ATTENTION** call `AskUserQuestion` before activating auto-detected workflows; explicit `/workflow-*` or `/workflow-start <id>` invocation may satisfy confirmation when local protocol allows. Never auto-activate inferred workflows.
**MUST ATTENTION** `workflows` is an OBJECT — `workflows[workflowId]`, NEVER `.find()` / `[index]` / `.forEach()`
**MUST ATTENTION** create ALL `TaskCreate` items for the full sequence BEFORE marking the first task `in_progress`
**MUST ATTENTION** never mark a task `completed` without invoking its `Skill` tool — skip means comment + completed, not delete
**MUST ATTENTION** custom pipeline steps must be valid `commandMapping` keys — never invent step names
**MUST ATTENTION** use Tier 1 context parse FIRST — check `## Workflow Catalog` in context before any file read

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

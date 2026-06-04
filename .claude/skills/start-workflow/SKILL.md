---
name: start-workflow
version: 1.0.0
description: '[Skill Management] Use when starting a detected workflow, initializing workflow state, or activating a workflow sequence.'
---

## Quick Summary

**Goal:** Detect user intent → auto-select direct/skill/standard/custom path → activate with full TaskCreate plan.

**Workflow:**

1. **Detect** — Execute explicit `/workflow-*` or `/start-workflow <id>` directly; otherwise match prompt against workflow catalog and skill list
2. **Auto-select** — Choose direct execution, a skill, a standard workflow, or a custom pipeline without asking the user to pick the path
3. **Activate** — Create ALL TaskCreate items for chosen sequence; mark first `in_progress`

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.

- MUST ATTENTION auto-select the best execution path for ordinary prompts. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
- Explicit `/workflow-*` or `/start-workflow <id>` invocation counts as the user choosing that workflow; execute it directly.
- Propose Custom Pipeline when no catalog workflow is a strong fit (>80% steps relevant = use catalog)
- `workflows.json` `workflows` field is an **OBJECT** — use `workflows[workflowId]`, NEVER `.find()` or `[index]`
- Create ALL `TaskCreate` items BEFORE marking the first task `in_progress` — batch creation, then execute
- NEVER mark a task `completed` without invoking its `Skill` tool — skip = `in_progress` + comment, not delete
- ALWAYS check context for `## Workflow Catalog` first (Tier 1) — NEVER read `workflows.json` directly when catalog is in context
- If another workflow is active, it auto-switches (ends current, starts new) — no manual cleanup needed

**NOT for:** Manual step execution (follow TaskCreate items), workflow design (use `plan`), catalog management.

**Related:** `/start-workflow <workflowId>` | Catalog: static `## Workflow Catalog` baked into `CLAUDE.md` (no router/tracker hooks)

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
- For project-specific architecture, test, documentation, naming, or workflow rules, read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`; keep this reusable start-workflow protocol generic.

### Task creation for Custom Pipeline

Same 1:1 protocol — one `TaskCreate` per step. Use `[Custom]` prefix to distinguish from catalog tasks:

```
TaskCreate: subject="[Custom] /{step-name} — {brief description}", description="Custom pipeline step N/{total}.", activeForm="Executing /{step-name}"
```

---

## Workflow Lookup — Token-Efficient (3-Tier Strategy)

ALWAYS try tiers in order — stop at first success.

### Tier 1: Context (FREE — no file reads)

The workflow catalog is already present as the `## Workflow Catalog` section in your context — baked statically into `CLAUDE.md` (and the `AGENTS.md` mirror), not injected by any hook.

1. Search your context for `## Workflow Catalog`
2. Find the line: `**{workflowId}** — {name}`
3. Read the NEXT line: `  Use: ... | Steps: /step1 → /step2 → ...`
4. Parse the `Steps:` value — these ARE the slash commands for TaskCreate

**Example:** `Steps: /scout → /plan → /feature-implement → /test → /workflow-end`
→ Create 5 TaskCreate items for `/scout`, `/plan`, `/feature-implement`, `/test`, `/workflow-end` in order.

✅ Use Tier 1 for: all standard TaskCreate creation (no file reads needed)
⚠️ Use Tier 2 if: catalog not in context, OR you need `preActions.injectContext`

### Tier 2: Targeted Grep (1 grep operation)

Use when catalog is absent from context OR `preActions.injectContext` is needed:

```
Grep: pattern='"<workflowId>":'  path='.claude/workflows.json'  context=35
```

Returns only that workflow's entry (~35 lines vs full file).
Parse: `sequence` array → step IDs → invoke each as `/<stepId>`.

### Tier 3: Minimal Read (last resort — avoid)

Only if Tier 1 and Tier 2 both fail:

```
Grep '"<workflowId>":' context=30    ← that workflow's entry only
```

**NEVER** read the full file — it is large and wastes tokens.

---

## After Activation — Task Creation Protocol (ZERO TOLERANCE)

**Active-goal resolution (BEFORE child task creation):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active plan `goal.md`, else `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, else create one from the current user request using `.claude/templates/goal-contract-template.md`. Record the resolved goal path and pass it to every child step/sub-agent so the whole workflow executes against the same saved success criteria. The workflow may end only when the goal's Goal Satisfaction matrix passes or a blocker is escalated.

FIRST action after activation: create EXACTLY one `TaskCreate` for EACH entry in the workflow's `sequence` array.

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
// resolve slash command — step id IS the command:
slashCmd = "/" + stepId                     // "scout" → "/scout"
```

**WorkflowEntry fields:**

| Field        | Type     | Notes                                   |
| ------------ | -------- | --------------------------------------- |
| `name`       | string   | Display name                            |
| `sequence`   | string[] | Ordered step IDs — SOLE source of truth |
| `whenToUse`  | string   | Natural language intent matching        |
| `preActions` | object   | Optional `injectContext` / `readFiles`  |

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
2. **Tier 2 if needed:** `Grep .claude/workflows.json --pattern '"<workflowId>":'  --context 35` → parse `sequence`, invoke each step as `/<stepId>`
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

| Step                       | Workflow activated        | Step count source                                    | Agent type      |
| -------------------------- | ------------------------- | ---------------------------------------------------- | --------------- |
| `/workflow-review-changes` | `workflow-review-changes` | `len(workflows["workflow-review-changes"].sequence)` | `code-reviewer` |

**Protocol when these steps appear in the active workflow sequence:**

1. NEVER invoke via inline `Skill` tool call
2. Spawn via `Agent` tool: `subagent_type: "code-reviewer"`
3. Agent prompt must include: current git diff context + feature/task description
4. Sub-agent runs the full nested workflow in its isolated context
5. Return ONLY SYNC:subagent-return-contract summary — write full findings to `plans/reports/`
6. Main agent reads `plans/reports/` file only when resolving specific blockers

> The ⚠️ **[WORKFLOW-IN-WORKFLOW GATE]** is model-driven: apply it yourself whenever the next step is one of the above — no hook emits this warning.

---

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> auto-select-execution-path -> activate-workflow -> create-task-tracking -> execute-sequence

**IMPORTANT MANDATORY Steps:** detect-workflow -> analyze-best-match -> auto-select-execution-path -> activate-workflow -> create-task-tracking -> execute-sequence

> **[MANDATORY]** `TaskCreate` FIRST — break every workflow into tasks before any action. NEVER skip.
> **[MANDATORY]** Auto-select the best path for auto-detected workflows; do not use `AskUserQuestion` for workflow-selection confirmation. Explicit workflow invocation executes directly.
> **[MANDATORY]** `Skill` tool REQUIRED per step — NEVER mark a task `completed` without invoking it.

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

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof, confidence >80%; NEVER present guess as fact.
- **Incremental Persistence:** append findings to report per file; NEVER hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary only; NEVER inline full output.

**MUST ATTENTION** auto-select the best path for ordinary prompts; explicit `/workflow-*` or `/start-workflow <id>` invocation executes directly. Do not ask for workflow-selection confirmation.
**MUST ATTENTION** `workflows` is an OBJECT — `workflows[workflowId]`, NEVER `.find()` / `[index]` / `.forEach()`
**MUST ATTENTION** create ALL `TaskCreate` items for the full sequence BEFORE marking the first task `in_progress`
**MUST ATTENTION** never mark a task `completed` without invoking its `Skill` tool — skip means comment + completed, not delete
**MUST ATTENTION** custom pipeline steps must be canonical step ids (each maps to a real `.claude/skills/<step>/SKILL.md`) — never invent step names
**MUST ATTENTION** use Tier 1 context parse FIRST — check `## Workflow Catalog` in context before any file read

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

---
name: code-parallel
version: 1.0.0
description: '[Implementation] Execute parallel or sequential phases based on plan structure'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Skill Variant:** Variant of `/code` — parallel phase execution from a plan.

## Quick Summary

**Goal:** Execute implementation phases from an existing plan using parallel fullstack-developer subagents.

**Workflow:**

1. **Load** — Read the implementation plan and identify parallel phases
2. **Dispatch** — Launch subagents per phase with strict file ownership
3. **Merge** — Integrate results and verify

**Key Rules:**

- Requires an existing plan file as input
- Each subagent owns specific files; no cross-boundary edits
- Sequential phases must wait for dependencies

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Execute plan: <plan>$ARGUMENTS</plan>

**IMPORTANT:** Activate needed skills. Ensure token efficiency. Sacrifice grammar for concision.

## Workflow

### 1. Plan Analysis

- Read `plan.md` from given path
- **Check for:** Dependency graph, Execution strategy, Parallelization Info, File Ownership matrix
- **Decision:** IF parallel-executable → Step 2A, ELSE → Step 2B
- **External Memory**: Re-read any `.ai/workspace/analysis/` files referenced in the plan before dispatching to parallel agents.

### 2A. Parallel Execution

1. Parse execution strategy (which phases concurrent/sequential, file ownership)
2. Launch multiple `fullstack-developer` agents simultaneously for parallel phases
    - Pass: phase file path, environment info, file ownership boundaries
3. Wait for parallel group completion, verify no conflicts
4. Execute sequential phases (one agent per phase after dependencies)
5. Proceed to Step 3

### 2B. Sequential Execution

Follow `./.claude/workflows/primary-workflow.md`:

1. Use main agent step by step
2. Read `plan.md`, implement phases one by one
3. Use `project-manager` for progress updates
4. Use `ui-ux-designer` for frontend
5. Run type checking after each phase
6. Proceed to Step 3

### 3. Testing

- Use `tester` for full suite (NO fake data/mocks)
- If fail: `debugger` → fix → repeat

### 4. Code Review

- Use `code-reviewer` for all changes
- If critical: fix → retest

### 5. Project Management & Docs

- If approved: `project-manager` + `docs-manager` in parallel (update plans, docs, roadmap)
- If rejected: fix → repeat

### 6. Onboarding

- Guide user step by step (1 question at a time)

### 7. Final Report

- Summary, guide, next steps
- Ask to commit (use `git-manager` if yes)

**Examples:**

- Parallel: "Phases 1-3 parallel, then 4" → Launch 3 agents → Wait → Launch 1 agent
- Sequential: "Phase 1 → 2 → 3" → Main agent implements each phase

---

## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (code implemented). This ensures review, testing, and docs steps aren't skipped.
- **"/code-simplifier"** — Simplify implementation
- **"/workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — the workflow handles sequencing.

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
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

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

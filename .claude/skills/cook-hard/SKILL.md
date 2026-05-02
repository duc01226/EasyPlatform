---
name: cook-hard
version: 1.0.0
description: '[Implementation] Thorough implementation with maximum verification'
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
- `docs/specs/` — Test specifications by module (read existing TCs; generate/update test specs via `/tdd-spec` after implementation)

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

> **Skill Variant:** Variant of `/cook` — thorough implementation with maximum verification.

## Quick Summary

**Goal:** Implement features with deep research, comprehensive planning, and maximum quality verification.

**Workflow:**

1. **Research** — Deep investigation with multiple researcher subagents
2. **Plan** — Detailed plan with `/plan-hard`, user approval required
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
- Use `/scout-ext` for comprehensive codebase analysis
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

## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (feature implemented). This ensures review, testing, and docs steps aren't skipped.
- **"/code-simplifier"** — Simplify and clean up implementation
- **"/workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — the workflow handles sequencing.

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
      <!-- SYNC:plan-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.
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

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

---
name: plan-parallel
version: 1.0.0
description: '[Planning] Create detailed plan with parallel-executable phases'
disable-model-invocation: false
---

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

- `docs/specs/` — Test specifications by module (read existing TCs to include test strategy in plan)

## Quick Summary

**Goal:** Create a detailed implementation plan with phases optimized for parallel execution by multiple agents.

**Workflow:**

1. **Research** — Spawn up to 2 researcher agents in parallel for different aspects
2. **Analyze Codebase** — Read summary docs; scout if summary is stale (>3 days)
3. **Plan Creation** — Planner subagent creates parallel-optimized phases with exclusive file ownership
4. **User Review** — Present plan for confirmation; optionally validate via interview

**Key Rules:**

- Each phase MUST ATTENTION have exclusive file ownership -- no file modified by multiple phases
- Phases must be independently executable with clear dependency matrix
- Planning-only skill -- never implement code, always get user approval first

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Activate `planning` skill.

## PLANNING-ONLY — Collaboration Required

> **DO NOT** use the `EnterPlanMode` tool — you are ALREADY in a planning workflow.
> **DO NOT** implement or execute any code changes.
> **COLLABORATE** with the user: ask decision questions, present options with recommendations.
> After plan creation, ALWAYS run `/plan-review` to validate the plan.
> ASK user to confirm the plan before any next step.

## Your mission

<task>
$ARGUMENTS
</task>

## Workflow

1. Create a directory using naming pattern from `## Naming` section in injected context.
   Make sure you pass the directory path to every subagent during the process.
2. Follow strictly to the "Plan Creation & Organization" rules of `planning` skill.
3. Use multiple `researcher` agents (max 2 agents) in parallel to research for this task:
   Each agent research for a different aspect of the task and are allowed to perform max 5 tool calls.
4. Analyze the codebase by reading `backend-patterns-reference.md`, `frontend-patterns-reference.md`, and `project-structure-reference.md` file.
   **ONLY PERFORM THIS FOLLOWING STEP IF reference docs are placeholders or older than 3 days**: Use `/scout <instructions>` slash command to search the codebase for files needed to complete the task.
5. Main agent gathers all research and scout report filepaths, and pass them to `planner` subagent with the prompt to create a parallel-optimized implementation plan.
6. Main agent receives the implementation plan from `planner` subagent, and ask user to review the plan

## Post-Plan Validation (Optional)

After plan creation, offer validation interview to confirm decisions before implementation.

**Check `## Plan Context` -> `Validation: mode=X, questions=MIN-MAX`:**

| Mode     | Behavior                                                                         |
| -------- | -------------------------------------------------------------------------------- |
| `prompt` | Ask user: "Validate this plan with a brief interview?" -> Yes (Recommended) / No |
| `auto`   | Automatically execute `/plan-validate {plan-path}`                               |
| `off`    | Skip validation step entirely                                                    |

**If mode is `prompt`:** Use `AskUserQuestion` tool with options above.
**If user chooses validation or mode is `auto`:** Execute `/plan-validate {plan-path}` SlashCommand.

## Special Requirements for Parallel Execution

**CRITICAL:** The planner subagent must create phases that:

1. **Can be executed independently** - Each phase should be self-contained with no runtime dependencies on other phases
2. **Have clear boundaries** - No file overlap between phases (each file should only be modified in ONE phase)
3. **Separate concerns logically** - Group by architectural layer, feature domain, or technology stack
4. **Minimize coupling** - Phases should communicate through well-defined interfaces only
5. **Include dependency matrix** - Clearly document which phases must run sequentially vs in parallel

**Parallelization Strategy:**

- Group frontend/backend/database work into separate phases when possible
- Separate infrastructure setup from application logic
- Isolate different feature domains (e.g., auth vs profile vs payments)
- Split by file type/directory (e.g., components vs services vs models)
- Create independent test phases per module

**Phase Organization Example:**

```
Phase 01: Database Schema (can run independently)
Phase 02: Backend API Layer (can run independently)
Phase 03: Frontend Components (can run independently)
Phase 04: Integration Tests (depends on 01, 02, 03)
```

## Output Requirements

**Plan Directory Structure** (use `Plan dir:` from `## Naming` section)

```
{plan-dir}/
├── research/
│   ├── researcher-XX-report.md
│   └── ...
├── reports/
│   ├── XX-report.md
│   └── ...
├── scout/
│   ├── scout-XX-report.md
│   └── ...
├── plan.md
├── phase-XX-phase-name-here.md
└── ...
```

**Research Output Requirements**

- Ensure every research markdown report remains concise (<=150 lines) while covering all requested topics and citations.

**Plan File Specification**

- Every `plan.md` MUST ATTENTION start with YAML frontmatter:

    ```yaml
    ---
    title: '{Brief title}'
    description: '{One sentence for card preview}'
    status: pending
    priority: P2
    story_points: { 1-21 modified fibonacci }
    complexity: '{ Low | Medium | High | Critical }'
    man_days_traditional: '{ e.g., 4d (2.5d code + 1.5d test) }'
    man_days_ai: '{ e.g., 2d (1.3d code + 0.7d test) }'
    effort: { sum of phases, e.g., 4h }
    branch: { current git branch }
    tags: [relevant, tags]
    created: { YYYY-MM-DD }
    ---
    ```

- Save the overview access point at `{plan-dir}/plan.md`. Keep it generic, under 80 lines, and list each implementation phase with status, progress, parallelization group, and links to phase files.
- For each phase, create `{plan-dir}/phase-XX-phase-name-here.md` containing the following sections in order:
    - Context links (reference parent plan, dependencies, docs)
    - **Parallelization Info** (which phases can run concurrently, which must wait)
    - Overview (date, description, priority, implementation status, review status)
    - Key Insights
    - Requirements
    - Architecture
    - **Related code files** (MUST ATTENTION be exclusive to this phase - no overlap with other phases)
    - **File Ownership** (explicit list of files this phase owns/modifies)
    - Implementation Steps
    - Todo list
    - Success Criteria
    - **Conflict Prevention** (how this phase avoids conflicts with parallel phases)
    - Risk Assessment
    - Security Considerations
    - Next steps

**Main plan.md must include:**

- Dependency graph showing which phases can run in parallel
- Execution strategy (e.g., "Phases 1-3 parallel, then Phase 4")
- File ownership matrix (which phase owns which files)

## **IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these three final tasks:
    1. **Task: "Write test specifications for each phase"** — Add `## Test Specifications` with TC-{FEAT}-{NNN} IDs to every phase file. Use `/tdd-spec` if feature docs exist. Use `Evidence: TBD` for TDD-first mode.
    2. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
    3. **Task: "Run /plan-review"** — Trigger `/plan-review` skill to auto-review plan for validity, correctness, and best practices

## Important Notes

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** Ensure token efficiency while maintaining high quality.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.
**IMPORTANT:** Each phase MUST ATTENTION have exclusive file ownership - no file can be modified by multiple phases.

## REMINDER — Planning-Only Command

> **DO NOT** use `EnterPlanMode` tool.
> **DO NOT** start implementing.
> **ALWAYS** validate with `/plan-review` after plan creation.
> **ASK** user to confirm the plan before any implementation begins.
> **ASK** user decision questions with your recommendations when multiple approaches exist.

---

## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (plan created). This ensures review, validation, implementation, and testing steps aren't skipped.
- **"/plan-review"** — Auto-review plan for validity and best practices
- **"/plan-validate"** — Interview user to confirm plan decisions
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — the workflow handles sequencing.

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **IMPORTANT MUST ATTENTION** include Test Specifications section and story_points in plan frontmatter
    <!-- SYNC:understand-code-first:reminder -->
- **IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
      <!-- SYNC:estimation-framework:reminder -->
- **IMPORTANT MUST ATTENTION** include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter. Use SP table: SP 1=0.5d/0.25d, SP 2=1d/0.35d, SP 3=2d/0.65d, SP 5=4d/1.0d, SP 8=6d/1.5d · SP 13=10d/2.0d. SP 13 SHOULD split, SP 21 MUST split.
      <!-- /SYNC:estimation-framework:reminder -->
      <!-- SYNC:plan-quality:reminder -->
- **IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.
    <!-- /SYNC:plan-quality:reminder -->
    <!-- SYNC:iterative-phase-quality:reminder -->
- **IMPORTANT MUST ATTENTION** score complexity first. Score >=6 → decompose. Each phase: plan → implement → review → fix → verify. No skipping.
    <!-- /SYNC:iterative-phase-quality:reminder -->
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

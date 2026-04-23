---
name: plan-fast
version: 1.0.0
description: '[Planning] No research. Only analyze and create an implementation plan'
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

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)
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

<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

<!-- /SYNC:fix-layer-accountability -->

> Even for fast plans: assess complexity score. Score >=3 → MUST ATTENTION produce multiple phases with per-phase quality cycles.

## Quick Summary

**Goal:** Analyze codebase and create a structured implementation plan without writing any code.

**Workflow:**

1. **Check Plan Context** — Reuse active plan or create new directory per naming convention
2. **Analyze Codebase** — Read `backend-patterns-reference.md`, `frontend-patterns-reference.md`, `project-structure-reference.md`
3. **Create Plan** — Generate `plan.md` + `phase-XX-*.md` files with YAML frontmatter
4. **Validate** — Run `/plan-review` and ask user to confirm before implementation

**Key Rules:**

- Do NOT use `EnterPlanMode` tool; do NOT implement any code
- Collaborate with user: ask decision questions, present options with recommendations
- Always validate plan with `/plan-review` after creation

## Greenfield Mode

> **Auto-detected:** If no existing codebase is found (no code directories like `src/`, `app/`, `lib/`, `server/`, `packages/`, etc., no manifest files like `package.json`/`*.sln`/`go.mod`, no populated `project-config.json`), this skill redirects to `/plan-hard`. Planning artifacts (docs/, plans/, .claude/) don't count — the project must have actual code directories with content.

**When greenfield is detected:**

1. **REDIRECT to `/plan-hard`** — greenfield inception requires deep research, not quick plans
2. Inform user: "Greenfield project detected. Redirecting to /plan-hard for thorough research and planning."
3. Rationale: Fast planning skips research, but greenfield projects need market research, tech evaluation, and domain modeling — all impossible without deep analysis

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

## Pre-Creation Check (Active vs Suggested Plan)

Check the `## Plan Context` section in the injected context:

- If "Plan:" shows a path → Active plan exists. Ask user: "Continue with this? [Y/n]"
- If "Suggested:" shows a path → Branch-matched hint only. Ask if they want to activate or create new.
- If "Plan: none" → Create new plan using naming from `## Naming` section.

## Workflow

Use `planner` subagent to:

1. If creating new: Create directory using `Plan dir:` from `## Naming` section, then run `node .claude/scripts/set-active-plan.cjs {plan-dir}`
   If reusing: Use the active plan path from Plan Context.
   Make sure you pass the directory path to every subagent during the process.
2. Follow strictly to the "Plan Creation & Organization" rules of `planning` skill.
3. Analyze the codebase by reading `backend-patterns-reference.md`, `frontend-patterns-reference.md`, and `project-structure-reference.md` file.
   3.5. **External Memory**: Write analysis findings to `.ai/workspace/analysis/{task-name}.analysis.md`. Re-read this file before creating the plan.
4. Gathers all information and create an implementation plan of this task.
5. Ask user to review the plan.

## Output Requirements

**Plan Directory Structure** (use `Plan dir:` from `## Naming` section)

```
{plan-dir}/
├── reports/
│   ├── XX-report.md
│   └── ...
├── plan.md
├── phase-XX-phase-name-here.md
└── ...
```

**Plan File Specification**

- Every `plan.md` MUST ATTENTION start with YAML frontmatter:

    ```yaml
    ---
    title: '{Brief title}'
    description: '{One sentence for card preview}'
    status: pending
    priority: P2
    effort: { sum of phases, e.g., 4h }
    story_points: { sum of phase SPs, e.g., 8 }
    man_days_traditional: '{ total e.g., 6d (4d code + 2d test) }'
    man_days_ai: '{ total with AI e.g., 3d (2d code + 1d test) }'
    branch: { current git branch }
    tags: [relevant, tags]
    created: { YYYY-MM-DD }
    ---
    ```

- Save the overview access point at `{plan-dir}/plan.md`. Keep it generic, under 80 lines, and list each implementation phase with status and progress plus links to phase files.
- For each phase, create `{plan-dir}/phase-XX-phase-name-here.md` containing the following sections in order: Context links (reference parent plan, dependencies, docs), Overview (date, description, priority, implementation status, review status), Key Insights, Requirements, Architecture, **UI Layout** (see below), Related code files, Implementation Steps, Todo list, Success Criteria, Risk Assessment, Security Considerations, Next steps.
- **UI Layout**: For frontend-facing phases, include ASCII wireframe. Classify components by tier (common/domain-shared/page-app). For backend-only phases: `## UI Layout` → `N/A — Backend-only change.`

## **IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these three final tasks:
    1. **Task: "Write test specifications for each phase"** — Add `## Test Specifications` with TC-{FEAT}-{NNN} IDs to every phase file. Use `/tdd-spec` if feature docs exist. Use `Evidence: TBD` for TDD-first mode.
    2. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
    3. **Task: "Run /plan-review"** — Trigger `/plan-review` skill to auto-review plan for validity, correctness, and best practices

## Post-Plan Validation

After plan creation, use the `AskUserQuestion` tool to ask: "Want me to run `/plan-review` to validate, or proceed to implementation?" with options:

- "Run /plan-review (Recommended)" — Execute `/plan-review` to validate the plan
- "Proceed to implementation" — Skip validation and start implementing

## Important Notes

- **IMPORTANT:** Ensure token consumption efficiency while maintaining high quality.
- **IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
- **IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
- **IMPORTANT:** In reports, list any unresolved questions at the end, if any.

## REMINDER — Planning-Only Command

> **DO NOT** use `EnterPlanMode` tool.
> **DO NOT** start implementing.
> **ALWAYS** validate with `/plan-review` after plan creation.
> **ASK** user to confirm the plan before any implementation begins.
> **ASK** user decision questions with your recommendations when multiple approaches exist.

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
  <!-- SYNC:estimation-framework:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter. Use SP table: SP 1=0.5d/0.25d, SP 2=1d/0.35d, SP 3=2d/0.65d, SP 5=4d/1.0d, SP 8=6d/1.5d · SP 13=10d/2.0d. SP 13 SHOULD split, SP 21 MUST split.
  <!-- /SYNC:estimation-framework:reminder -->
  <!-- SYNC:plan-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.
  <!-- /SYNC:plan-quality:reminder -->
  <!-- SYNC:iterative-phase-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** score complexity first. Score >=6 → decompose. Each phase: plan → implement → review → fix → verify. No skipping.
      <!-- /SYNC:iterative-phase-quality:reminder -->
      <!-- SYNC:fix-layer-accountability:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.
      <!-- /SYNC:fix-layer-accountability:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

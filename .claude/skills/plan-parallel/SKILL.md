---
name: plan-parallel
version: 1.0.0
description: '[Planning] Create detailed plan with parallel-executable phases'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI may ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/understand-code-first-protocol.md` before executing.

## Quick Summary

**Goal:** Create a detailed implementation plan with phases optimized for parallel execution by multiple agents.

**Workflow:**

1. **Research** — Spawn up to 2 researcher agents in parallel for different aspects
2. **Analyze Codebase** — Read summary docs; scout if summary is stale (>3 days)
3. **Plan Creation** — Planner subagent creates parallel-optimized phases with exclusive file ownership
4. **User Review** — Present plan for confirmation; optionally validate via interview

**Key Rules:**

- Each phase MUST have exclusive file ownership -- no file modified by multiple phases
- Phases must be independently executable with clear dependency matrix
- Planning-only skill -- never implement code, always get user approval first

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
4. Analyze the codebase by reading `codebase-summary.md`, `code-standards.md`, `system-architecture.md` and `project-overview-pdr.md` file.
   **ONLY PERFORM THIS FOLLOWING STEP IF `codebase-summary.md` is not available or older than 3 days**: Use `/scout <instructions>` slash command to search the codebase for files needed to complete the task.
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

- Every `plan.md` MUST start with YAML frontmatter:

    ```yaml
    ---
    title: '{Brief title}'
    description: '{One sentence for card preview}'
    status: pending
    priority: P2
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
    - **Related code files** (MUST be exclusive to this phase - no overlap with other phases)
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

## **IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these two final tasks:
  1. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
  2. **Task: "Run /plan-review"** — Trigger `/plan-review` skill to auto-review plan for validity, correctness, and best practices

## Important Notes

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** Ensure token efficiency while maintaining high quality.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.
**IMPORTANT:** Each phase MUST have exclusive file ownership - no file can be modified by multiple phases.

## REMINDER — Planning-Only Command

> **DO NOT** use `EnterPlanMode` tool.
> **DO NOT** start implementing.
> **ALWAYS** validate with `/plan-review` after plan creation.
> **ASK** user to confirm the plan before any implementation begins.
> **ASK** user decision questions with your recommendations when multiple approaches exist.

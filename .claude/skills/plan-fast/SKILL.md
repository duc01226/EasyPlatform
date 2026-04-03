---
name: plan-fast
version: 1.0.0
description: '[Planning] No research. Only analyze and create an implementation plan'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

> **Estimation Framework** — SP scale: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large, high risk) → 13(epic, SHOULD split) → 21(MUST split). MUST provide `story_points` and `complexity` estimate after investigation.
> MUST READ `.claude/skills/shared/estimation-framework.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Plan Quality** — Every plan phase MUST include `## Test Specifications` section with TC-{FEAT}-{NNN} format. Verify TC satisfaction per phase before marking complete. Plans must include `story_points` and `effort` in frontmatter.
> MUST READ `.claude/skills/shared/plan-quality-protocol.md` for full protocol and checklists.

> **Iterative Phase Quality** — Assess complexity BEFORE planning (signals: >5 files +2, cross-service +3, new pattern +2). Score ≥6 → MUST decompose into phases. Each phase: plan → implement → review → fix → verify. No phase >5 files or >3h effort. DO NOT start next phase until current passes VERIFY.
> MUST READ `.claude/skills/shared/iterative-phase-quality-protocol.md` for full protocol and checklists.
> Even for fast plans: assess complexity score. Score ≥3 → MUST produce multiple phases with per-phase quality cycles.

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

- Every `plan.md` MUST start with YAML frontmatter:

    ```yaml
    ---
    title: '{Brief title}'
    description: '{One sentence for card preview}'
    status: pending
    priority: P2
    effort: { sum of phases, e.g., 4h }
    story_points: { sum of phase SPs, e.g., 8 }
    branch: { current git branch }
    tags: [relevant, tags]
    created: { YYYY-MM-DD }
    ---
    ```

- Save the overview access point at `{plan-dir}/plan.md`. Keep it generic, under 80 lines, and list each implementation phase with status and progress plus links to phase files.
- For each phase, create `{plan-dir}/phase-XX-phase-name-here.md` containing the following sections in order: Context links (reference parent plan, dependencies, docs), Overview (date, description, priority, implementation status, review status), Key Insights, Requirements, Architecture, **UI Layout** (see below), Related code files, Implementation Steps, Todo list, Success Criteria, Risk Assessment, Security Considerations, Next steps.
- **UI Layout**: For frontend-facing phases, include ASCII wireframe per `.claude/skills/shared/ui-wireframe-protocol.md`. Classify components by tier (common/domain-shared/page-app). For backend-only phases: `## UI Layout` → `N/A — Backend-only change.`

## **IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these two final tasks:
    1. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
    2. **Task: "Run /plan-review"** — Trigger `/plan-review` skill to auto-review plan for validity, correctness, and best practices

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

> Per `.claude/skills/shared/plan-granularity-protocol.md`

After creating all phase files, run the **recursive decomposition loop** from `plan-granularity-protocol.md`:

1. Score each phase against the 5-point criteria (file paths, no planning verbs, ≤30min steps, ≤5 files, no open decisions)
2. For each FAILING phase → create task to decompose it into a sub-plan (with its own /plan → /plan-review → /plan-validate → fix cycle)
3. Re-score new phases. Repeat until ALL leaf phases pass (max depth: 3)
4. **Self-question:** "For each phase, can I start coding RIGHT NOW? If any needs 'figuring out' → sub-plan it."

## Next Steps (Standalone: MUST ask user via `AskUserQuestion`. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST — NO EXCEPTIONS:** If this skill was called **outside a workflow**, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (plan created). This ensures review, validation, implementation, and testing steps aren't skipped.
- **"/plan-review"** — Auto-review plan for validity and best practices
- **"/plan-validate"** — Interview user to confirm plan decisions
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — the workflow handles sequencing.

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
- **MUST** include Test Specifications section and story_points in plan frontmatter
- **MUST** verify all phases pass granularity check per `plan-granularity-protocol.md`
  **MANDATORY IMPORTANT MUST** READ the following files before starting:
- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/estimation-framework.md` before starting
- **MUST** READ `.claude/skills/shared/plan-quality-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/iterative-phase-quality-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/plan-granularity-protocol.md` before starting

---
agent: agent
description: ⚡⚡⚡ Research, analyze, and create comprehensive implementation plan for new features or complex tasks
---

# Implementation Planning

Think harder.
Activate `planning` skill.

## Your Mission

<task>
$input
</task>

## Pre-Creation Check (Active vs Suggested Plan Detection)

Check the `## Plan Context` section in the injected context:

-   If "Plan:" shows a path → Active plan exists. Ask user: "Active plan found: {path}. Continue with this? [Y/n]"
-   If "Suggested:" shows a path → Branch-matched plan hint only. Ask user if they want to activate it or create new.
-   If "Plan: none" → Proceed to create new plan using naming pattern from `## Naming` section.

## Pre-Planning Checklist

Before creating a plan:

1. **Understand the request** - Parse requirements, identify scope
2. **Analyze for details** - Use tools to ask for more details if needed
3. **Assess complexity** - Simple (fast plan) vs Complex (comprehensive research)
4. **Search for existing patterns** - Check if similar implementations exist
5. **Identify affected areas** - Services, components, entities, APIs

## Planning Workflow

### Step 1: Plan Initialization

1. If creating new: Create directory using `Plan dir:` from `## Naming` section, then run `node .claude/scripts/set-active-plan.cjs {plan-dir}`
   If reusing: Use the active plan path from Plan Context.
   Make sure you pass the directory path to every subagent during the process.
2. Follow strictly to the "Plan Creation & Organization" rules of `planning` skill.

### Step 2: Research Phase

3. Use multiple `researcher` agents (max 2 agents) in parallel to research for this task:
   Each agent research for a different aspect of the task and are allowed to perform max 5 tool calls.

### Step 3: Codebase Analysis

4. Analyze the codebase by reading `codebase-summary.md`, `code-standards.md`, `system-architecture.md` and `project-overview-pdr.md` file.
   **ONLY PERFORM THIS FOLLOWING STEP IF `codebase-summary.md` is not available or older than 3 days**: Use `/scout <instructions>` slash command to search the codebase for files needed to complete the task.

### Step 4: Technical Research

-   Search codebase for similar implementations
-   Identify relevant platform patterns
-   Check existing entities, DTOs, services
-   Review related documentation in `docs/claude/`

### Step 5: Design Decisions

For Backend tasks:

-   [ ] Entity/DTO design following `PlatformEntityDto` pattern
-   [ ] Command/Query structure in `UseCaseCommands/` or `UseCaseQueries/`
-   [ ] Validation using `PlatformValidationResult` fluent API
-   [ ] Side effects via `UseCaseEvents/` (NOT in handlers)
-   [ ] Cross-service communication via message bus

For Frontend tasks:

-   [ ] Component hierarchy using `AppBaseComponent` or `AppBaseVmStoreComponent`
-   [ ] State management with `PlatformVmStore`
-   [ ] API service extending `PlatformApiService`
-   [ ] Form handling with `AppBaseFormComponent`

### Step 6: Plan Creation

5. Main agent gathers all research and scout report filepaths, and pass them to `planner` subagent with the prompt to create an implementation plan of this task.
6. Main agent receives the implementation plan from `planner` subagent, and ask user to review the plan

## Post-Plan Validation (Optional)

After plan creation, offer validation interview to confirm decisions before implementation.

**Check `## Plan Context` → `Validation: mode=X, questions=MIN-MAX`:**

| Mode     | Behavior                                                                        |
| -------- | ------------------------------------------------------------------------------- |
| `prompt` | Ask user: "Validate this plan with a brief interview?" → Yes (Recommended) / No |
| `auto`   | Automatically execute `/plan:validate {plan-path}`                              |
| `off`    | Skip validation step entirely                                                   |

**If mode is `prompt`:** Use `AskUserQuestion` tool with options above.
**If user chooses validation or mode is `auto`:** Execute `/plan:validate {plan-path}` SlashCommand.

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

-   Ensure every research markdown report remains concise (≤150 lines) while covering all requested topics and citations.

**Plan File Specification**

-   Every `plan.md` MUST start with YAML frontmatter:
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
-   Save the overview access point at `{plan-dir}/plan.md`. Keep it generic, under 80 lines, and list each implementation phase with status and progress plus links to phase files.
-   For each phase, create `{plan-dir}/phase-XX-phase-name-here.md` containing the following sections in order:
    -   Context links (reference parent plan, dependencies, docs)
    -   Overview (date, description, priority, implementation status, review status)
    -   Key Insights
    -   Requirements
    -   Architecture
    -   Related code files
    -   Implementation Steps
    -   Todo list
    -   Success Criteria
    -   Risk Assessment
    -   Security Considerations
    -   Next steps

**Plan Structure Template**

```markdown
## Executive Summary

[1-2 sentences describing the change]

## Requirements

-   [Requirement 1]
-   [Requirement 2]

## Technical Approach

[Describe the implementation strategy]

## Implementation Steps

### Phase 1: [Name]

-   [ ] Task 1 - `path/to/file.cs`
-   [ ] Task 2 - `path/to/file.ts`

### Phase 2: [Name]

-   [ ] Task 1
-   [ ] Task 2

## Files to Create/Modify

| File           | Action        | Purpose     |
| -------------- | ------------- | ----------- |
| `path/to/file` | Create/Modify | Description |

## Risk Assessment

| Risk   | Likelihood      | Mitigation |
| ------ | --------------- | ---------- |
| Risk 1 | High/Medium/Low | Strategy   |

## Testing Strategy

-   Unit tests for...
-   Integration tests for...

## Questions/Decisions Needed

-   [ ] Question 1?
```

## Principles

-   **YAGNI** - You Aren't Gonna Need It
-   **KISS** - Keep It Simple, Stupid
-   **DRY** - Don't Repeat Yourself

## Important Notes

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** Ensure token efficiency while maintaining high quality.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.
**IMPORTANT**: **Do not** start implementing.

ultrathink

Present the plan and **WAIT for explicit approval** before implementing.

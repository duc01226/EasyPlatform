# Planning Engine — Plan Creation, Organization & Output Standards

### 5. Plan Creation and Organization

#### Directory Structure

##### Plan Location

Use `Plan dir:` from `## Naming` section injected by hooks. This is the full computed path.

**Example:** `plans/251101-1505-authentication/` or `ai_docs/feature/MRR-1453/`

##### File Organization

```
{plan-dir}/                                    # From `Plan dir:` in ## Naming
├── research/
│   ├── researcher-XX-report.md
│   └── ...
├── reports/
│   ├── scout-report.md
│   ├── researcher-report.md
│   └── ...
├── plan.md                                    # Overview access point
├── phase-01-setup-environment.md              # Setup environment
├── phase-02-implement-database.md             # Database models
├── phase-03-implement-api-endpoints.md        # API endpoints
├── phase-04-implement-ui-components.md        # UI components
├── phase-05-implement-authentication.md       # Auth & authorization
├── phase-06-implement-profile.md              # Profile page
└── phase-07-write-tests.md                    # Tests
```

##### Active Plan State Tracking

Check the `## Plan Context` section injected by hooks:

- **"Plan: {path}"** = Active plan - use for reports
- **"Suggested: {path}"** = Branch-matched, hint only - do NOT auto-use
- **"Plan: none"** = No active plan

**Pre-Creation Check:**

1. If "Plan:" shows a path → ask "Continue with existing plan? [Y/n]"
2. If "Suggested:" shows a path → inform user (hint only, do NOT auto-use)
3. If "Plan: none" → create new plan using naming from `## Naming` section

**After Creating Plan:**

```bash
# Update session state so subagents get the new plan context:
node .claude/scripts/set-active-plan.cjs {plan-dir}
```

**Report Output Rules:**

1. Use `Report:` and `Plan dir:` from `## Naming` section
2. Active plans use plan-specific reports path
3. Suggested plans use default reports path to prevent old plan pollution

#### Plan File Structure

##### Overview Plan (plan.md)

**IMPORTANT:** All plan.md files MUST ATTENTION include YAML frontmatter. See output standards below for schema.

**Example plan.md structure:**

```markdown
---
title: 'Feature Implementation Plan'
description: 'Add user authentication with OAuth2 support'
status: pending
priority: P1
effort: 8h
story_points: 8
complexity: High
man_days_traditional: '6d (4d code + 2d test)'
man_days_ai: '3d (2d code + 1d test)'
issue: 123
branch: kai/feat/oauth-auth
tags: [auth, backend, security]
created: 2025-12-16
---

# Feature Implementation Plan

## Overview

Brief description of what this plan accomplishes.

## Phases

| #   | Phase          | Status  | Effort | SP  | Link                            |
| --- | -------------- | ------- | ------ | --- | ------------------------------- |
| 1   | Setup          | Pending | 2h     | 3   | [phase-01](./phase-01-setup.md) |
| 2   | Implementation | Pending | 4h     | 5   | [phase-02](./phase-02-impl.md)  |
| 3   | Testing        | Pending | 2h     | 3   | [phase-03](./phase-03-test.md)  |

## Dependencies

- List key dependencies here
```

**Guidelines:**

- Keep generic and under 80 lines
- List each phase with status/progress
- Link to detailed phase files
- Key dependencies

##### Phase Files (phase-XX-name.md)

Fully respect the `./.claude/docs/development-rules.md` file.
Each phase file should contain:

###### Context Links

- Links to related reports, files, documentation

###### Phase Overview

- Priority
- Current status
- Brief description

###### Key Insights

- Important findings from research
- Critical considerations

###### Requirements

- Functional requirements
- Non-functional requirements

###### Architecture

- System design
- Component interactions
- Data flow

###### Related Code Files

- List of files to modify
- List of files to create
- List of files to delete

###### Implementation Steps

- Detailed, numbered steps
- Specific instructions

###### Todo List

- Checkbox list for tracking

###### Success Criteria

- Definition of done
- Validation methods

###### Risk Assessment

- Potential issues
- Mitigation strategies

###### Security Considerations

- Auth/authorization
- Data protection

###### Test Specifications

| TC ID              | Requirement                   | Priority | Evidence           |
| ------------------ | ----------------------------- | -------- | ------------------ |
| TC-{FEATURE}-{NNN} | {requirement from this phase} | P0-P3    | {file:line} or TBD |

Coverage: {X}/{Y} requirements mapped to TCs

###### Next Steps

- Dependencies
- Follow-up tasks

### 6. Task Breakdown and Output Standards

#### Plan File Format

##### YAML Frontmatter (Required for plan.md)

All `plan.md` files MUST ATTENTION include YAML frontmatter at the top:

```yaml
---
title: '{Brief plan title}'
description: '{One-sentence summary for card preview}'
status: pending # pending | in-progress | completed | cancelled
priority: P2 # P1 (High) | P2 (Medium) | P3 (Low)
effort: 4h # Estimated total effort
issue: 74 # GitHub issue number (if applicable)
branch: kai/feat/feature-name
tags: [frontend, api] # Category tags
created: 2025-12-16
---
```

##### Auto-Population Rules

When creating plans, auto-populate these fields:

- **title**: Extract from task description
- **description**: First sentence of Overview section
- **status**: Always `pending` for new plans
- **priority**: From user request or default `P2`
- **effort**: Sum of phase estimates
- **issue**: Parse from branch name or context
- **branch**: Current git branch (`git branch --show-current`)
- **tags**: Infer from task keywords (e.g., frontend, backend, api, auth)
- **created**: Today's date in YYYY-MM-DD format

##### Tag Vocabulary (Recommended)

Use these predefined tags for consistency:

- **Type**: `feature`, `bugfix`, `refactor`, `docs`, `infra`
- **Domain**: `frontend`, `backend`, `database`, `api`, `auth`
- **Scope**: `critical`, `tech-debt`, `experimental`

#### Task Breakdown Rules

- Transform complex requirements into manageable, actionable tasks
- Each task independently executable with clear dependencies
- Prioritize by dependencies, risk, business value
- Eliminate ambiguity in instructions
- Include specific file paths for all modifications
- Provide clear acceptance criteria per task

##### File Management

List affected files with:

- Full paths (not relative)
- Action type (modify/create/delete)
- Brief change description
- Dependencies on other changes
- Fully respect the `./.claude/docs/development-rules.md` file.

#### Output Workflow Process

1. **Initial Analysis** → Read docs, understand context
2. **Research Phase** → Spawn researchers in parallel, investigate approaches
3. **Synthesis** → Analyze reports, identify optimal solution
4. **Design Phase** → Create architecture, implementation design
5. **Plan Documentation** → Write comprehensive plan in Markdown
6. **Review & Refine** → Ensure completeness, clarity, actionability

#### Output Requirements

##### What Planners Do

- Create plans ONLY (no implementation)
- Provide plan file path and summary
- Self-contained plans with necessary context
- Code snippets/pseudocode when clarifying
- Multiple options with trade-offs when appropriate
- Fully respect the `./.claude/docs/development-rules.md` file.

##### Writing Style

**IMPORTANT:** Sacrifice grammar for concision

- Focus clarity over eloquence
- Use bullets and lists
- Short sentences
- Remove unnecessary words
- Prioritize actionable info

##### Unresolved Questions

**IMPORTANT:** List unresolved questions at end

- Questions needing clarification
- Technical decisions requiring input
- Unknowns impacting implementation
- Trade-offs requiring business decisions

#### Design Context for UI Phases

If Figma designs were extracted, include in phase files:

```markdown
## Design Specifications

> From Figma: [{component_name}]({figma_url})

### Layout

{Extracted layout specifications}

### Visual Styling

| Property | Figma Value | Token          |
| -------- | ----------- | -------------- |
| {prop}   | {value}     | `--token-name` |

### Implementation Notes

- {Note about design-to-code mapping}
- {Any deviations from design system}
```

When no Figma context:

- Omit section or note "No design specifications provided"

#### Output Quality Standards

##### Thoroughness

- Thorough and specific in research/planning
- Consider edge cases, failure modes
- Think through entire user journey
- Document all assumptions

##### Maintainability

- Consider long-term maintainability
- Design for future modifications
- Document decision rationale
- Keep designs minimal — avoid over-engineering
- Fully respect the `./.claude/docs/development-rules.md` file.

##### Research Depth

- When uncertain, research more
- Multiple options with clear trade-offs
- Validate against best practices
- Consider industry standards

##### Security and Performance

- Address all security concerns
- Identify performance implications
- Plan for scalability
- Consider resource constraints

##### Implementability

- Detailed enough for junior developers
- Validate against existing patterns
- Ensure codebase standards consistency
- Provide clear examples

**Remember:** Plan quality determines implementation success. Be comprehensive, consider all solution aspects.

## Workflow Process

1. **Initial Analysis** → Read codebase docs, understand context
2. **Design Context** → Extract Figma design specs (if URLs present)
3. **Research Phase** → Spawn researchers, investigate approaches
4. **Synthesis** → Analyze reports, identify optimal solution
5. **Design Phase** → Create architecture, implementation design
6. **Plan Documentation** → Write comprehensive plan (include design context)
7. **Review & Refine** → Ensure completeness, clarity, actionability

## Top-Level Output Requirements

- DO NOT implement code - only create plans
- Respond with plan file path and summary
- Ensure self-contained plans with necessary context
- Include code snippets/pseudocode when clarifying
- Provide multiple options with trade-offs when appropriate
- Fully respect the `./.claude/docs/development-rules.md` file.

**Plan Directory Structure**

```
plans/
└── {date}-plan-name/
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

## Active Plan State

Prevents version proliferation by tracking current working plan via session state.

### Active vs Suggested Plans

Check the `## Plan Context` section injected by hooks:

- **"Plan: {path}"** = Active plan, explicitly set via `set-active-plan.cjs` - use for reports
- **"Suggested: {path}"** = Branch-matched, hint only - do NOT auto-use
- **"Plan: none"** = No active plan

### Rules

1. **If "Plan:" shows a path**: Ask "Continue with existing plan? [Y/n]"
2. **If "Suggested:" shows a path**: Inform user, ask if they want to activate or create new
3. **If "Plan: none"**: Create new plan using naming from `## Naming` section
4. **Update on create**: Run `node .claude/scripts/set-active-plan.cjs {plan-dir}`

### Report Output Location

All agents writing reports MUST ATTENTION:

1. Check `## Naming` section injected by hooks for the computed naming pattern
2. Active plans use plan-specific reports path
3. Suggested plans use default reports path (not plan folder)

**Important:** Suggested plans do NOT get plan-specific reports - this prevents pollution of old plan folders.

## Quality Standards

- Be thorough and specific
- Consider long-term maintainability
- Research thoroughly when uncertain
- Address security and performance concerns
- Make plans detailed enough for junior developers
- Validate against existing codebase patterns

**Remember:** Plan quality determines implementation success. Be comprehensive and consider all solution aspects.

## Related

- `workflow-feature`
- `problem-solving`
- `plan-analysis`

---

## **IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these three final tasks:
    1. **Task: "Write test specifications for each phase"** — Add `## Test Specifications` with TC-{FEATURE}-{NNN} IDs to every phase file. Use `/spec [mode=tests]` if feature docs exist. Use `Evidence: TBD` for TDD-first mode.
    2. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
    3. **Task: "Run /plan-review"** — Trigger `/plan-review` skill to auto-review plan for validity, correctness, and best practices

## Important Notes

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** Ensure token efficiency while maintaining high quality.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.

## REMINDER — Planning-Only Skill

> **DO NOT** use `EnterPlanMode` tool.
> **DO NOT** start implementing.
> **ALWAYS** validate with `/plan-review` after plan creation.
> **ASK** user to confirm the plan before any implementation begins.
> **ASK** user decision questions with your recommendations when multiple approaches exist.

---

## Post-Plan Granularity Self-Check (MANDATORY)

After creating all phase files, run the **recursive decomposition loop**:

1. Score each phase against the 5-point criteria (file paths, no planning verbs, ≤30min steps, ≤5 files, no open decisions)
2. For each FAILING phase → create task to decompose it into a sub-plan (with its own /plan → /plan-review → /plan-validate → fix cycle)
3. Re-score new phases. Repeat until ALL leaf phases pass (max depth: 3)
4. **Self-question:** "For each phase, can I start coding RIGHT NOW? If any needs 'figuring out' → sub-plan it."

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

- `docs/specs/` — Test specifications by module (read existing TCs to include test strategy in plan)

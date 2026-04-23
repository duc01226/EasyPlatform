---
name: story
version: 1.2.0
description: '[Project Management] Break PBIs into user stories using vertical slicing, SPIDR splitting, and INVEST criteria. Use when creating user stories from PBIs, slicing features, or breaking down requirements. Triggers on keywords like "user story", "create stories", "slice pbi", "story breakdown", "vertical slice", "split story".'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

## Quick Summary

**Goal:** Break Product Backlog Items into implementable user stories using vertical slicing, SPIDR splitting, and INVEST criteria.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference docs:
>
> - `project-structure-reference.md` -- project patterns and structure
>   <!-- SYNC:estimation-framework -->
>
>     > **Estimation** — SP→Man-Days: 1=0.5d/0.25d, 2=1d/0.35d, 3=2d/0.65d, 5=4d/1.0d, 8=6d/1.5d, 13=10d/2.0d (Traditional/AI-assisted, 6hr day). AI speedup grows with task size (~2x→5x). AI assumes Claude Code with good context. AI time = (code_gen × 1.3) + (test_gen × 1.3) — 30% human review per artifact. Output `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in frontmatter.
>
>                                       <!-- /SYNC:estimation-framework -->
>
> - `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)
> - `docs/specs/` — Test specifications by module (read existing TCs for related features; include test story/acceptance criteria for new stories)
>
> If file not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Read PBI** — Load PBI artifact, acceptance criteria, and domain context
2. **Vertical Slice** — Identify end-to-end slices of functionality
3. **SPIDR Split** — Apply Spike/Paths/Interfaces/Data/Rules splitting if effort >5
4. **Write Stories** — INVEST-validated stories with min 3 GIVEN/WHEN/THEN scenarios each
5. **Validate** — Interview user to confirm slicing, acceptance criteria, and effort estimates

**Key Rules:**

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

- Stories with SP >8 MUST ATTENTION be split; >5 SHOULD be split (see estimation-framework.md)
- All stories MUST ATTENTION include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` fields

## Greenfield Mode

> **Auto-detected:** If no existing codebase is found (no code directories like `src/`, `app/`, `lib/`, `server/`, `packages/`, etc., no manifest files like `package.json`/`*.sln`/`go.mod`, no populated `project-config.json`), this skill switches to greenfield mode automatically. Planning artifacts (docs/, plans/, .claude/) don't count — the project must have actual code directories with content.

**When greenfield is detected:**

1. Generate **foundation PBIs** instead of feature stories: infrastructure setup, project scaffold, CI/CD pipeline, first feature vertical slice
2. Add dependency ordering: infrastructure stories BEFORE feature stories
3. Skip "MUST ATTENTION READ project-structure-reference.md" (won't exist)
4. Include setup stories: dev environment, build tooling, deployment pipeline, monitoring
5. Priority order: infra → scaffold → first feature → remaining features
6. **[CRITICAL] Architecture Scaffolding Story:** FIRST story = "Architecture Scaffolding" — all OOP/SOLID base abstract classes, generic interfaces, infrastructure abstractions per chosen tech stack. AI self-investigates what base classes the project needs. All feature stories depend on this.
7. Scaffolding acceptance criteria: all base classes compile/type-check, DI/IoC registrations resolve, smoke test passes
8. **UI System Foundation Story:** If the project has a frontend, generate a "UI System Foundation" story (Sprint 0) with these sub-stories:

    | Sub-Story                                                                 | SP  | Priority  | Depends On               |
    | ------------------------------------------------------------------------- | --- | --------- | ------------------------ |
    | "Set up design token system"                                              | 2-3 | Must Have | Architecture Scaffolding |
    | "Create base layout and responsive grid"                                  | 2-3 | Must Have | Design tokens            |
    | "Create core UI components (loading, error, empty, toast, button, input)" | 3-5 | Must Have | Design tokens + layout   |

    **Dependency rule:** All UI feature stories MUST ATTENTION depend on "UI System Foundation" stories.

- Each story needs happy path, edge case, and error scenario (minimum)
- Use correct project domain vocabulary when available (check project docs for terminology)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# User Story Creation

Break Product Backlog Items into implementable user stories using vertical slicing and SPIDR patterns.

---

## Step 0: Locate Active Plan (if in workflow)

If running within a workflow (big-feature, greenfield-init, etc.):

1. **Search for active plan** — Glob `plans/*/plan.md` sorted by modification time, or check `TaskList` for plan context
2. **Read `plan.md`** — understand project scope, architecture decisions, domain model, implementation plan
3. **Read existing research** — `{plan-dir}/research/*.md` and `{plan-dir}/phase-*.md` for domain model, tech stack, architecture
4. **Read `docs/project-reference/domain-entities-reference.md`** (if exists) — understand existing domain entities for accurate story scoping
5. Use plan context to inform story slicing (architecture decisions affect how stories are split)

---

## When to Use

- PBI ready for story breakdown
- Feature needs vertical slicing
- Creating sprint-ready work items
- Story too large (effort >8)

---

## Quick Reference

### Workflow

1. Read PBI artifact and acceptance criteria
2. **Load domain context** (if project module detected)
3. Identify vertical slices (end-to-end functionality)
4. **Apply SPIDR splitting** if stories too large
5. Apply INVEST criteria to each story
6. Create user stories with GIVEN/WHEN/THEN (min 3 scenarios)
7. Save to `team-artifacts/pbis/stories/`
8. **Validate stories** (MANDATORY) - Interview user to confirm slicing, acceptance criteria, and effort
9. Suggest next: `/tdd-spec` or `/design-spec`

### Output

- **Path:** `team-artifacts/pbis/stories/{YYMMDD}-us-{pbi-slug}.md`
- **Format:** Single file with all stories (use ## headers per story)

---

## Project Domain Context Loading

When slicing domain-related PBIs, automatically load business context.

### Step 1: Detect Module

**From PBI frontmatter:**

1. Check `module` field
2. If missing, detect module from `docs/business-features/` directory names

### Step 2: Load Feature Context

```
Glob("docs/business-features/{module}/detailed-features/*.md")
```

1. Read module README (first 200 lines)
2. Identify related feature from `related_features` list
3. Extract existing business rules (BR-{MOD}-XXX)
4. Note entity names from feature docs

### Step 3: Apply Domain Vocabulary

Read `docs/project-config.json` modules[] and `docs/business-features/` to detect domain vocabulary per module. Use entity names from feature docs — avoid ambiguous synonyms.

### Step 4: Include in Story

```markdown
## Domain Context

**Module:** {detected module}
**Feature:** {related feature}
**Entities:** {Entity1}, {Entity2}
**Business Rules:** BR-{MOD}-XXX (from feature docs)
```

---

## INVEST Criteria

| Criterion       | Definition                       | Validation Question                  |
| --------------- | -------------------------------- | ------------------------------------ |
| **I**ndependent | No dependencies on other stories | Can this be developed in any order?  |
| **N**egotiable  | Details can change               | Is the "how" open for discussion?    |
| **V**aluable    | Delivers user value              | Does user get observable benefit?    |
| **E**stimable   | Can estimate story points        | Can team size this? (Fibonacci 1-21) |
| **S**mall       | Completable in sprint            | SP ≤8? (prefer ≤5)                   |
| **T**estable    | Clear acceptance criteria        | Can we write pass/fail tests?        |

---

## SPIDR Splitting Checklist

**When to apply:** Story SP >8 MUST ATTENTION split. SP >5 SHOULD split. SP 13 = SHOULD split into 2-3 stories. SP 21 = MUST ATTENTION split (epic-level).

| Pattern        | Question                     | Split Strategy                            |
| -------------- | ---------------------------- | ----------------------------------------- |
| **S**pike      | Unknown complexity?          | Create research spike first, then stories |
| **P**aths      | Multiple workflow branches?  | One story per path/choice                 |
| **I**nterfaces | Multiple UIs or APIs?        | One story per interface                   |
| **D**ata       | Multiple data formats/types? | One story per data variation              |
| **R**ules      | Multiple business rules?     | One story per rule variation              |

### Splitting Examples

**Paths:** "User can pay by card OR PayPal" → Story A: Card payment, Story B: PayPal payment

**Data:** "Import CSV, Excel, JSON" → Story A: CSV import, Story B: Excel import, Story C: JSON import

**Rules:** "Different approval flows by amount" → Story A: <$1000 auto-approve, Story B: >$1000 manager approval

### Size Validation

```
SP 1-5:   ✅ Good size
SP 6-8:   ⚠️ Consider splitting (apply SPIDR)
SP 13:    ❌ SHOULD split into 2-3 stories
SP 21:    ❌ MUST ATTENTION split — epic-level, not sprint-ready
```

---

## Scenario Templates

### Minimum 3 scenarios per story:

### 1. Happy Path (Positive)

```gherkin
Scenario: User successfully {completes action}
  Given {user has required permissions/state}
  And {required data exists}
  When user {performs valid action}
  Then {primary expected outcome}
  And {secondary verification if needed}
```

### 2. Edge Case (Boundary)

```gherkin
Scenario: System handles {boundary condition}
  Given {edge state: empty list, max items, zero value}
  When user {attempts action at boundary}
  Then {appropriate handling: pagination, warning, default}
```

### 3. Error Case (Negative)

```gherkin
Scenario: System prevents {invalid action}
  Given {precondition}
  When user {provides invalid input OR unauthorized action}
  Then error message "{specific error message}"
  And {system remains in valid state}
  And {no partial changes saved}
```

### 4. Authorization (MANDATORY per story)

```gherkin
Scenario: Unauthorized user cannot {perform action}
  Given user has role {unauthorized role}
  When user attempts to {action}
  Then system rejects with "Forbidden" or "Unauthorized"
  And no data is modified
```

### Additional Scenario Types

**Performance:** Response time under load
**Concurrency:** Simultaneous user actions
**Integration:** External service unavailable

---

## Story Artifact Template

````markdown
---
id: US-{YYMMDD}-{NNN}
parent_pbi: '{PBI-ID}'
title: '{Brief story title}'
persona: '{User persona}'
priority: P1 | P2 | P3
story_points: 1 | 2 | 3 | 5 | 8 | 13
complexity: Low | Medium | High | Very High
man_days_traditional: '{ Xd (Yd code + Zd test) — from SP table }'
man_days_ai: '{ Xd (Yd code + Zd test) — from SP table with AI }'
sprint: 0 | 1 | 2 | ...
status: draft | ready | in_progress | done
module: '{ServiceA | ServiceB | ServiceC | ServiceD}'
---

# User Stories for {PBI Title}

## Story 1: {Title}

**As a** {user role}
**I want** {goal}
**So that** {benefit}

### Acceptance Criteria

#### Scenario 1: {Happy path title}

```gherkin
Given {context}
When {action}
Then {outcome}
```
````

#### Scenario 2: {Edge case title}

```gherkin
Given {edge state}
When {action}
Then {handling}
```

#### Scenario 3: {Error case title}

```gherkin
Given {context}
When {invalid action}
Then error "{message}"
```

---

## Story 2: {Title}

{Repeat structure...}

---

## Out of Scope

- {Explicitly excluded items}

## Story Dependencies

| Story    | Depends On | Type         | Reason                            |
| -------- | ---------- | ------------ | --------------------------------- |
| US-{NNN} | -          | independent  | First slice, no dependencies      |
| US-{NNN} | US-{NNN}   | must-after   | Needs entity/API from prior story |
| US-{NNN} | US-{NNN}   | can-parallel | Independent feature slice         |
| US-{NNN} | US-{NNN}   | blocked-by   | Requires external service/infra   |

## Domain Context

**Module:** {module}
**Related Feature:** {feature doc path}
**Entities:** {Entity1}, {Entity2}
**Business Rules:** {BR-XXX references}

## UI Wireframe

<!-- SYNC:ui-wireframe -->

> **UI Wireframe** — For UI artifacts: include ASCII wireframe (box-drawing chars), component tree with EXISTING/NEW classification and tier (common | domain-shared | page/app), interaction flow (user action → system response → UI update), states table (default/loading/empty/error), and responsive breakpoint behavior. Process Figma URLs or screenshots BEFORE wireframing. Search existing component libs before proposing new components. Backend-only changes: `N/A — Backend-only change. No UI affected.`

<!-- /SYNC:ui-wireframe -->

### Layout

{ASCII wireframe showing this story's UI slice — see UI wireframe protocol}

### Components

- **{ComponentName}** — {behavior for this story} _(tier: common | domain-shared | page/app)_

> Classify per **Component Hierarchy** in `UI wireframe protocol` — search existing libs before proposing new components.

### Interaction Flow

1. User {action} on {component}
2. System {response/feedback}
3. UI updates to show {result}

### States

| State   | Behavior                   |
| ------- | -------------------------- |
| Default | {what user sees initially} |
| Loading | {spinner/skeleton}         |
| Empty   | {empty state message}      |
| Error   | {error handling}           |

> If backend-only: `## UI Wireframe` → `N/A — Backend-only change. No UI affected.`

## Technical Notes

- {Implementation hints if needed}

## Validation Summary

**Validated:** {date}

### Confirmed

- {decision}: {user choice}

### Action Items

- [ ] {follow-up if any}

````

---

## Sprint 0 / Foundation Stories (Production Readiness)

When the PBI includes a "Production Readiness Concerns" table with "Required" items, automatically generate Sprint 0 / foundation stories for each concern:

| PBI Concern | Story Title | Story Points | Priority |
|-------------|-------------|-------------|----------|
| Code linting/analyzers = Required | "Set up code linting and formatting" | 1-2 SP | Must Have |
| Error handling setup = Required | "Set up error handling foundation" | 2-3 SP | Must Have |
| Loading indicators = Required | "Set up loading indicator infrastructure" | 1-2 SP | Must Have |
| Docker integration = Required | "Set up Docker development environment" | 2-3 SP | Must Have |
| CI/CD quality gates = Required | "Set up CI/CD quality gates" | 2-3 SP | Must Have |
| Seed data = Required | "Set up seed data / data seeder" | 2-3 SP | Must Have |
| Data migration = Required | "Create data migration for schema changes" | 1-3 SP | Must Have |

### Rules
- Foundation stories MUST ATTENTION be completed before feature stories begin
- Mark as `sprint: 0` or `sprint: foundation` in story metadata
- Each foundation story references the specific protocol section for implementation guidance
- If PBI concern = "Existing", skip story generation (already set up)
- If PBI concern = "No", skip story generation (explicitly opted out)

---

## Anti-Patterns to Avoid

| Anti-Pattern       | Problem                                           | Correct Approach                              |
| ------------------ | ------------------------------------------------- | --------------------------------------------- |
| Horizontal slicing | "Backend story" + "Frontend story" = delays value | Vertical slice: thin end-to-end functionality |
| Single scenario    | Missing edge/error cases                          | Minimum 3 scenarios: happy, edge, error       |
| Vague criteria     | "Fast", "user-friendly" untestable                | Quantify: "< 200ms", "≤ 3 clicks"             |
| Solution-speak     | "Use Redis cache" constrains team                 | Outcome: "Results return within 200ms"        |
| Effort >8          | Won't fit sprint, hard to estimate                | Apply SPIDR, split until ≤8                   |
| No error scenario  | Missing negative test coverage                    | Always include invalid input handling         |
| Generic persona    | "As a user" too vague                             | Specific: "As a hiring manager"               |

---

## Key Rules

- **Every story set MUST ATTENTION include a Story Dependencies table** — with types: `must-after`, `can-parallel`, `blocked-by`, `independent`. This enables `/prioritize` and `/plan` to respect implementation ordering.
- **SPIDR splits MUST ATTENTION include dependency chains** — When splitting a story, declare which split stories depend on others.
- **No orphan stories** — Every story must appear in the dependency table, even if independent.

## Quality Checklist

Before completing user stories:

- [ ] Each story follows "As a... I want... So that..." format
- [ ] SPIDR splitting applied (effort ≤8, prefer ≤5)
- [ ] At least 3 scenarios per story: happy, edge, error
- [ ] All scenarios use GIVEN/WHEN/THEN format
- [ ] Effort estimated in Fibonacci (1, 2, 3, 5, 8)
- [ ] Stories independent (can develop in any order)
- [ ] Out of scope explicitly listed
- [ ] Story Dependencies table included with all stories listed
- [ ] Dependency types correct (must-after, can-parallel, blocked-by, independent)
- [ ] Parent PBI linked in frontmatter
- [ ] Domain vocabulary used correctly (if the project)
- [ ] Authorization scenario included per story (unauthorized access rejection)
- [ ] Seed data story included if PBI has seed data requirements
- [ ] Data migration story included if PBI has schema changes
- [ ] Validation interview completed

---

## Validation Step (MANDATORY)

After creating user stories, validate with user.

### Question Categories

| Category         | Example Question                                    |
| ---------------- | --------------------------------------------------- |
| **Slicing**      | "Are the story slices independent enough?"          |
| **Size**         | "Any story >8 effort that needs further splitting?" |
| **Scenarios**    | "Any acceptance criteria missing for edge cases?"   |
| **Dependencies** | "Are there hidden dependencies between stories?"    |
| **Scope**        | "Should anything be explicitly excluded?"           |

### Process

1. Generate 2-4 questions focused on slicing quality, scenarios, and dependencies
2. Use `AskUserQuestion` tool to interview
3. Document in story artifact under `## Validation Summary`
4. Update stories based on answers (split if needed)

**This step is NOT optional.**

---

## Related

| Type           | Reference                                   |
| -------------- | ------------------------------------------- |
| **Role Skill** | `business-analyst`                          |
| **Command**    | `/story`                                    |
| **Input**      | `/refine` output (PBI)                      |
| **Next Steps** | `/tdd-spec`, `/design-spec`, `/prioritize` |

---

## MANDATORY: Systematic Task Breakdown for Stories

**MANDATORY IMPORTANT MUST ATTENTION** break down ALL stories into small, systematic todo tasks using `TaskCreate` BEFORE starting implementation. Each story MUST ATTENTION have its own set of tasks that cover:

1. **Read & understand story** — Load story artifact, acceptance criteria, domain context
2. **Identify vertical slice layers** — Backend entity/command/query, frontend component/store/API, integration points
3. **Create implementation subtasks per layer** — One task per file or logical unit (entity, command handler, DTO, component, service, test)
4. **Include spec tasks** — Each story MUST ATTENTION have corresponding test specifications (unit, integration, or E2E as appropriate)
5. **Include validation task** — Verify story against acceptance criteria GIVEN/WHEN/THEN after implementation
6. **Include review task** — Final quality check per story

### Task Naming Convention

```

[Story US-{ID}] {Layer}: {Description}

```

Example for a "Create Goal" story:
```

[Story US-001] Entity: Create Goal entity with validation rules
[Story US-001] Command: CreateGoalCommand + Handler
[Story US-001] DTO: GoalDto with mapping
[Story US-001] API: POST /api/goals endpoint
[Story US-001] Component: GoalCreateFormComponent
[Story US-001] Store: GoalVmStore with create action
[Story US-001] Test: Integration test for CreateGoalCommand
[Story US-001] Test: E2E test for goal creation flow
[Story US-001] Review: Verify against AC scenarios

```

**Why:** Without systematic task breakdown, stories become monolithic — leading to missed edge cases, incomplete specs, and context loss during implementation.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:
- **"/tdd-spec (Recommended)"** — Generate test specifications from stories
- **"/pbi-mockup"** — Generate HTML mockup report from PBI and stories
- **"/plan-validate"** — If stories need validation against plan
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
````

**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

<!-- SYNC:estimation-framework:reminder -->

- **IMPORTANT MUST ATTENTION** estimate story points using Modified Fibonacci (1-21). Output `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`. SP 13 SHOULD split, SP 21 MUST split.
      <!-- /SYNC:estimation-framework:reminder -->
      <!-- SYNC:ui-system-context:reminder -->
- **IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
      <!-- /SYNC:ui-system-context:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

# `$work-item --mode=story` — user-story slicing reference

> Loaded by `work-item/SKILL.md`'s Mode Dispatch when invoked as `$work-item --mode=story [task path]`. This contract is the whole invocation: slice a task into user stories. It works called directly with no workflow; every rule, flag, output and gate below is the contract of that mode.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Contents

- [Quick Summary](#quick-summary)
- [Greenfield Mode](#greenfield-mode)
- [User Story Creation](#user-story-creation)
- [Step 0: Locate Active Plan (if in workflow)](#step-0-locate-active-plan-if-in-workflow)
- [When to Use](#when-to-use)
- [Quick Reference](#quick-reference)
- [Project Domain Context Loading](#project-domain-context-loading)
- [INVEST Criteria](#invest-criteria)
- [SPIDR Splitting Checklist](#spidr-splitting-checklist)
- [Scenario Templates](#scenario-templates)
- [AI-SDD Mandate Gate (M1-M5 and M7) — BLOCKING](#ai-sdd-mandate-gate-m1-m5-and-m7--blocking)
- [Story Artifact Template](#story-artifact-template)
- [Foundation Stories (Production Readiness)](#foundation-stories-production-readiness)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Key Rules](#key-rules)
- [Quality Checklist](#quality-checklist)
- [Validation Step (MANDATORY)](#validation-step-mandatory)
- [Related](#related)
- [MANDATORY: Systematic Task Breakdown for Stories](#mandatory-systematic-task-breakdown-for-stories)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Produce ready-to-start, INVEST-valid user stories — tech-agnostic, testable GWT criteria, evidence-cited estimates, dependency-mapped — by breaking tasks into implementable stories via vertical slicing and SPIDR splitting, so a team with zero codebase knowledge can implement on any stack.

**Summary:**

- **Main steps (the pipeline):** (1) read task + active plan, load domain context — module, entities, BR-IDs; (2) identify VERTICAL end-to-end slices; (3) SPIDR-split anything EP >8 (MUST) / >5 (SHOULD) until INVEST-valid; (4) write each story with min 3 GWT scenarios + 1 authorization scenario; (5) estimate bottom-up (Blast-Radius pre-pass → phase-hours → days; EP DERIVED) and emit full estimate frontmatter; (6) emit Story Dependencies table (no orphans); (7) run MANDATORY `ask user question tool` validation; (8) save to `tasks/stories/{YYMMDD}-ba-story-{slug}.md` under the team-artifacts root (default `team-artifacts/`; path from `docsRoots.teamArtifacts.path` in `docs/project-config.json`); (9) suggest `$spec [mode=tests]` next.
- Slice VERTICALLY (thin end-to-end), NEVER horizontally (backend/frontend split) — apply SPIDR (Spike/Paths/Interfaces/Data/Rules) until each story is INVEST-valid — why: horizontal slices delay deliverable user value.
- Every story is tech-agnostic + rebuild-from-scratch + demoable (AI-SDD M1-M5 and M7): no framework/class/file names in prose, carry the inherited `FR-`/`BR-` logical ID plus a `[Source: namespace/service/id]` abstract anchor (NEVER `file:line`), and every criterion states an outcome a stakeholder could SEE — reject and rework on any STOP condition.
- Stories collectively MUST cover the parent task's releasable outcome from entry through result and exit; do not turn a task into disconnected technical-layer stories. Enabling work stays attached to a vertical outcome slice.
- Min 3 GIVEN/WHEN/THEN scenarios (happy + edge + error) PLUS a mandatory authorization scenario per story; every criterion has exactly ONE observable interpretation.
- Estimate bottom-up (phase-hours → days × productivity factor; EP DERIVED, never the driver) with explicit `test_count` and Blast-Radius pass; emit full `man_days_*` / `risk_*` / `blast_radius` / `estimate_reasoning` frontmatter — why: EP-first anchors to a guess, downstream `$prioritize`+`$plan` read these fields.
- Story Dependencies table is mandatory (no orphan stories) and the `ask user question tool` validation interview runs before handoff — NEVER auto-decide slicing/scope/effort.
- Read `.claude/skills/shared/releasable-task-contract.md`; preserve the parent task's actor, outcome, non-goals, full-flow pages/views, and applicable UI surface when slicing.
- Stories inherit the parent task/spec's applicability branch. When `isLargeIdea=true`, preserve the owning slice ID and the complete `large_idea_decomposition` context (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`); when all signals are false, do not add roadmap or milestone fields. An explicit roadmap branch may carry its selected milestone; a supplied roadmap is read-only context. Missing or conflicting scope is BLOCKED, not resolved by slicing.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference docs:
>
> - `project-structure-reference.md` -- project patterns and structure
> - `domain-entities-reference.md`, in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)
> - The business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — Test specifications by module (read existing TCs for related features; include test story/acceptance criteria for new stories)
>
> If file not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Read task** — Load task artifact, acceptance criteria, and domain context
2. **Vertical Slice** — Identify end-to-end slices of functionality
3. **SPIDR Split** — Apply Spike/Paths/Interfaces/Data/Rules splitting if effort >5
4. **Write Stories** — INVEST-validated stories with min 3 GIVEN/WHEN/THEN scenarios each
5. **Validate** — Interview user to confirm slicing, acceptance criteria, and effort estimates

**Key Rules:**

- Slice VERTICALLY (thin end-to-end); NEVER horizontally (backend/frontend split) — why: a horizontal slice ships no user-visible value on its own.
- EP >8 MUST ATTENTION be split; >5 SHOULD be split — apply SPIDR until each story is INVEST-valid.
- Every story MUST ATTENTION carry `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai` — plus the `risk_*` / `blast_radius` / `estimate_reasoning` fields `$prioritize` and `$plan` read downstream.
- EP is DERIVED from bottom-up phase-hours → days × productivity factor — NEVER the driver.
- Min 3 GIVEN/WHEN/THEN scenarios (happy + edge + error) PLUS a mandatory authorization scenario; each criterion has exactly ONE observable interpretation.
- Tech-agnostic prose ONLY — no framework/class/file names; anchor with `[Source: namespace/service/id]`, NEVER `file:line`.
- Story Dependencies table is mandatory — NEVER leave an orphan story.
- Run the `ask user question tool` validation interview before handoff — NEVER auto-decide slicing, scope, or effort.

### Frontend/UI Context (if applicable)

> When the task involves frontend or UI changes, read:

Each file below sits in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path:

- Component patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`
- Design system tokens: `design-system/README.md`

## Greenfield Mode

> **Auto-detected:** no existing codebase (no discovered source directories, no manifest files, no populated `project-config.json`) → greenfield mode switches on automatically. Planning artifacts (`docs/`, `plans/`, `.claude/`) do NOT count — the repository needs actual code directories with content.

**When greenfield is detected:**

1. Generate the first **releasable vertical-slice story set**; capture infrastructure setup, project scaffold, CI/CD pipeline, and similar work as enabling foundation stories attached to that outcome, not as standalone technical tasks
2. Dependency ordering: infrastructure stories BEFORE feature stories
3. Skip the `project-structure-reference.md` read — it will not exist
4. Include setup stories: dev environment, build tooling, deployment pipeline, monitoring
5. Priority order: infra → scaffold → first feature → remaining features
6. **[CRITICAL] Architecture Scaffolding enabling story:** Attach the required OOP/SOLID base abstractions and infrastructure setup to the first releasable vertical-slice outcome as foundation enabling work; do not emit a standalone technical task. AI self-investigates which foundation is truly required; feature stories depend on the enabling work — why: features built on an unreviewed foundation encode the wrong abstractions permanently without pretending the foundation itself is user value.
7. Scaffolding acceptance criteria: base classes compile/type-check, DI/IoC registrations resolve, smoke test passes
8. **UI System Foundation Story:** If the project has a frontend, generate a "UI System Foundation" story (a foundation story) with these sub-stories:

    | Sub-Story                                                                 | EP  | Priority  | Depends On               |
    | ------------------------------------------------------------------------- | --- | --------- | ------------------------ |
    | "Set up design token system"                                              | 2-3 | Must Have | Architecture Scaffolding |
    | "Create base layout and responsive grid"                                  | 2-3 | Must Have | Design tokens            |
    | "Create core UI components (loading, error, empty, toast, button, input)" | 3-5 | Must Have | Design tokens + layout   |

**Dependency rule:** All UI feature stories MUST ATTENTION depend on "UI System Foundation" stories.

- Each story needs happy path, edge case, and error scenario (minimum)
- Use correct project domain vocabulary when available (check project docs for terminology)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# User Story Creation

Break tasks into implementable user stories using vertical slicing and SPIDR patterns.

---

## Step 0: Locate Active Plan (if in workflow)

If running within a workflow (big-feature, greenfield-init, etc.):

1. **Search for active plan** — Glob `*/plan.md` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) sorted by modification time, or check the current task list for plan context
2. **Read `plan.md`** — understand project scope, architecture decisions, domain model, implementation plan
3. **Read existing research** — `{plan-dir}/research/*.md` and `{plan-dir}/phase-*.md` for domain model, tech stack, architecture
4. **Read the parent scope chain** — the task/spec, its `large_idea_decomposition` block when present, and any conditional `{plan-id}/scenario-analysis.md` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path); confirm each story stays inside its owning slice, non-goals, dependencies, and evidence boundary. Read the product-roadmap artifact (default `docs/product-roadmap.md`; path from `docsRoots.productRoadmap.path` in `docs/project-config.json`) only when the parent explicitly uses the roadmap branch.
5. **Read `domain-entities-reference.md`** in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path), if it exists — understand existing domain entities for accurate story scoping
6. Use plan context to inform story slicing (architecture decisions affect how stories are split)

---

## When to Use

- Task ready for story breakdown
- Feature needs vertical slicing
- Creating ready-to-start work items
- Story too large (effort >8)

---

## Quick Reference

### Workflow

Follow the ordered first-screen workflow and detailed steps below; user validation and the next-step handoff remain mandatory.

### Output

- **Path:** `tasks/stories/{YYMMDD}-us-{task-slug}.md` under the team-artifacts root — default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path
- **Format:** Single file with all stories (use ## headers per story)
- **Work record (owner: `$task-track`):** the story file is one work record, identified by its frontmatter `id`; the `## Story N` sections are parts of it, not separate records. Read [Records another skill authors](../../task-track/references/integration-guide.md#records-another-skill-authors) before writing it; that section owns `id`, `title`, `intent`, `status`, `priority`, `assigned_to` and the `tracking` block. Choose an `id` no other record uses, write `status: draft` and no assignee, and keep `P1`/`P2`/`P3` in `priority_label`. On a file that already has a `tracking` block, change those fields only through `$task-track`. After the save, follow that section's hand-off with the parent task as a `parent` link.

> **Artifact Path (canonical convention)** — Command `$work-item --mode=story` → base path `tasks/stories/` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), role token `ba`, type `story`. General filename pattern: `{YYMMDD}-{role}-{type}-{slug}.md` → e.g. `260119-ba-story-invoice-approval.md`. Slug = lowercased basename, non-alphanumeric → `-`, trimmed, max 50 chars.

---

## Project Domain Context Loading

When slicing domain-related tasks, automatically load business context.

### Step 1: Detect Module

**From task frontmatter:**

1. Check `module` field
2. If missing, detect module from the directory names under the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path)

### Step 2: Load Feature Context

Glob `{module}/*.md` under the business spec root — default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path.

1. Read module README (first 200 lines)
2. Identify related feature from `related_features` list
3. Extract existing business rules (BR-{MOD}-XXX)
4. Note entity names from feature docs

### Step 3: Apply Domain Vocabulary

Read `docs/project-config.json` modules[] and `docs/specs/` to detect domain vocabulary per module. Use entity names from feature docs — avoid ambiguous synonyms.

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
| **E**stimable   | Can estimate effort points        | Can team size this? (Fibonacci 1-21) |
| **S**mall       | One independently verifiable slice            | EP ≤8? (prefer ≤5)                   |
| **T**estable    | Clear acceptance criteria        | Can we write pass/fail tests?        |

---

## SPIDR Splitting Checklist

**When to apply:** Story EP >8 MUST ATTENTION split. EP >5 SHOULD split. EP 13 = SHOULD split into 2-3 stories. EP 21 = MUST ATTENTION split (too large for one story).

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
EP 1-5:   ✅ Good size
EP 6-8:   ⚠️ Consider splitting (apply SPIDR)
EP 13:    ❌ SHOULD split into 2-3 stories
EP 21:    ❌ MUST ATTENTION split — too large for one story, not ready to start
```

---

## Scenario Templates

**Minimum 3 scenarios per story:**

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

## AI-SDD Mandate Gate (M1-M5 and M7) — BLOCKING

**MUST ATTENTION READ `.claude/skills/shared/m1-m7-gates.md`** (criteria M1-M5 + M7, carrier exemption, M1-vs-M7 rule, authoring rules) and `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)". Every generated story MUST satisfy M1-M5 and M7 or be reworked before it is emitted. Story-specific application:

- **Separate intent from implementation (M1/M2):** the story narrative and acceptance criteria stay tech-agnostic; optional hints go in `## Technical Notes`, source references in evidence carriers as stack-portable abstract anchors (`[Source: namespace/service/id]`, never `file:line`). Prose follows `spec-principles.md` §3, in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path).
- **Logical ID (M3):** each story inherits its parent task's logical requirement ID (`FR-`/`BR-`) as the PRIMARY citation spine and keeps the `[Source: namespace/service/id]` anchor as the SECONDARY carrier.
- **Testable GWT/EARS criteria (M4)** and **rebuild-from-scratch (M5)** per the shared criteria; **demo test (M7)** on every criterion's BODY — drop TECHNICAL-ONLY criteria from the story, and never derive the story or scenario count from an architecture inventory.

> **[STOP — rework before emitting]** Reject and rework a story when ANY shared criterion fails: tech-specific prose · source code in prose · missing logical ID or abstract-anchor evidence (or explicit `TBD (pre-implementation)` marker) · vague criteria · not implementable from the artifact alone · not demoable (M7).

---

## Story Artifact Template

An existing story may carry the earlier key `parent_pbi`; it is read as the same parent link as `parent_task`, and migration does not rewrite authored keys.

````markdown
---
id: US-{YYMMDD}-{NNN}
title: '{Brief story title}'
intent: '{One sentence: what the persona can do after these stories}'
status: draft
parent_task: '{TASK-ID}'
persona: '{User persona}'
priority_label: P1 | P2 | P3
effort_points: 1 | 2 | 3 | 5 | 8 | 13
complexity: Low | Medium | High | Very High
man_days_traditional: '{ Xd (Yd code + Zd test) — from EP table }'
man_days_ai: '{ Xd (Yd code + Zd test) — from EP table with AI }'
delivery_wave: foundation | 1 | 2 | ...
module: '{ServiceA | ServiceB | ServiceC | ServiceD}'
---

# User Stories for {Task Title}

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
**Requirement IDs (M3 — inherited from task):** {FR-XXX / BR-XXX — primary citation spine}
**Business Rules:** {BR-XXX references}
**Evidence (secondary, stack-portable):** {`[Source: namespace/service/id]` abstract anchor per requirement, or `TBD (pre-implementation)`}

## UI Wireframe

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

## Foundation Stories (Production Readiness)

When the task includes a "Production Readiness Concerns" table with "Required" items, automatically generate foundation stories for each concern:

| Task Concern | Story Title | Effort points | Priority |
|-------------|-------------|-------------|----------|
| Code linting/analyzers = Required | "Set up code linting and formatting" | 1-2 EP | Must Have |
| Error handling setup = Required | "Set up error handling foundation" | 2-3 EP | Must Have |
| Loading indicators = Required | "Set up loading indicator infrastructure" | 1-2 EP | Must Have |
| Docker integration = Required | "Set up Docker development environment" | 2-3 EP | Must Have |
| CI/CD quality gates = Required | "Set up CI/CD quality gates" | 2-3 EP | Must Have |
| Seed data = Required | "Set up seed data / data seeder" | 2-3 EP | Must Have |
| Data migration = Required | "Create data migration for schema changes" | 1-3 EP | Must Have |

### Rules
- Foundation stories MUST ATTENTION be completed before feature stories begin
- Mark as `delivery_wave: foundation` in story metadata
- Each foundation story references the specific protocol section for implementation guidance
- If task concern = "Existing", skip story generation (already set up)
- If task concern = "No", skip story generation (explicitly opted out)

---

## Anti-Patterns to Avoid

| Anti-Pattern       | Problem                                           | Correct Approach                              |
| ------------------ | ------------------------------------------------- | --------------------------------------------- |
| Horizontal slicing | "Backend story" + "Frontend story" = delays value | Vertical slice: thin end-to-end functionality |
| Single scenario    | Missing edge/error cases                          | Minimum 3 scenarios: happy, edge, error       |
| Vague criteria     | "Fast", "user-friendly" untestable                | Quantify: "< 200ms", "≤ 3 clicks"             |
| Solution-speak     | "Use Redis cache" constrains team                 | Outcome: "Results return within 200ms"        |
| Effort >8          | Too large to verify as one slice                | Apply SPIDR, split until ≤8                   |
| No error scenario  | Missing negative test coverage                    | Always include invalid input handling         |
| Generic persona    | "As a user" too vague                             | Specific: "As a warehouse operator"           |

---

## Key Rules

- **Every story set MUST ATTENTION include a Story Dependencies table** — with types: `must-after`, `can-parallel`, `blocked-by`, `independent`. This enables `$prioritize` and `$plan` to respect implementation ordering.
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
- [ ] Parent task linked in frontmatter
- [ ] Domain vocabulary used correctly (if the project)
- [ ] Authorization scenario included per story (unauthorized access rejection)
- [ ] Seed data story included if task has seed data requirements
- [ ] Data migration story included if task has schema changes
- [ ] Validation interview completed

---

## Validation Step (MANDATORY)

> **Decision log:** inside a workflow, read the run's `## Decisions` first (`$start-workflow` → Step Execution Protocol, Decision log): ask only what it leaves open or new evidence reopened, cite reused answers instead of asking again, and append every new answer.

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
2. Use `ask user question tool` tool to interview
3. Document in story artifact under `## Validation Summary`
4. Update stories based on answers (split if needed)

**This step is NOT optional.**

---

## Related

| Type           | Reference                                   |
| -------------- | ------------------------------------------- |
| **Command**    | `$work-item --mode=story`                                    |
| **Input**      | `$work-item --mode=refine` output (task)                      |
| **Next Steps** | `$spec [mode=tests]`, `$design-spec`, `$prioritize` |

---

## MANDATORY: Systematic Task Breakdown for Stories

**MANDATORY IMPORTANT MUST ATTENTION** break down ALL stories into small, systematic todo tasks using todo tracking BEFORE starting implementation. Each story MUST ATTENTION have its own set of tasks that cover:

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

Example for a "Create Invoice" story:
```

[Story US-001] Entity: Create Invoice entity with validation rules
[Story US-001] Command: CreateInvoiceCommand + Handler
[Story US-001] DTO: InvoiceDto with mapping
[Story US-001] API: POST /api/invoices endpoint
[Story US-001] Component: InvoiceCreateFormComponent
[Story US-001] Store: InvoiceVmStore with create action
[Story US-001] Test: Integration test for CreateInvoiceCommand
[Story US-001] Test: E2E test for invoice creation flow
[Story US-001] Review: Verify against AC scenarios

```

**Why:** Without systematic task breakdown, stories become monolithic — missed edge cases, incomplete specs, context loss during implementation.

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `ask user question tool` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:
- **"$spec [mode=tests] (Recommended)"** — Generate test specifications from stories
- **"$work-item --mode=mockup"** — Generate HTML mockup report from task and stories
- **"$plan --mode=validate"** — If stories need validation against plan
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Bottom-up; derive EP; min-max range at likely ≥3d. Stack-agnostic baseline: 3-5yr dev, 6 productive hrs/day; AI assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** below — code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Range at `likely_days ≥3`; point allowed `<3`; always record margin
> 7. `man_days_ai` = same range × AI speedup
> 8. Derive `effort_points` from `likely_days` via EP-Days; NEVER driver. >50% disagreement → trust bottom-up
>
> **Existing estimates:** Read `effort_points` first; when absent, reuse an existing authored `story_points` value. Preserve historical metadata and commits. New artifacts write `effort_points` and use EP labels.
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost driver (BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier | Cost |
> | --- | --- |
> | Reuse component on existing screen | 0.1-0.3d |
> | Add control/column to existing screen | 0.3-0.8d |
> | Compose components into NEW screen | 1-2d |
> | NEW screen, custom layout/states/validation | 2-4d |
> | NEW shared/common component (themed, tested) | 3-6d+ |
>
> | Backend tier | Cost |
> | --- | --- |
> | Reuse query/handler from new place | 0.1-0.3d |
> | Small update existing handler/entity | 0.3-0.8d |
> | NEW query on existing repo/model | 0.5-1d |
> | NEW command/handler on existing aggregate (additive) | 1-2d |
> | NEW aggregate/entity (repo, validation, events) | 2-4d |
> | NEW cross-service contract OR schema migration | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule | 3-5d |
>
> **Rule:** Sum UI+backend+test tiers; apply productivity factor; call out reuse shortcuts.
>
> **Test scope:** Compute `test_count` explicitly by driver; never hand-wave "+tests".
>
> | Driver | Count |
> | --- | --- |
> | Happy-path journeys | 1 per story / AC main flow |
> | State-machine transitions | reachable transitions × allowed actors |
> | Multi-entity state combos | state(A) × state(B) — REACHABLE only, not Cartesian |
> | Authorization matrix | (owner, non-owner, elevated, unauth) × each mutation |
> | Validation rules | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only |
> | Negative paths / invariants | 1 per violatable business rule |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost |
> | --- | --- |
> | 1-5 cases, fixtures reused | 0.3-0.5d |
> | 6-12 cases, 1 new fixture | 0.5-1d |
> | 13-25 cases, multi-entity setup | 1-2d |
> | 26-50 cases OR new state-machine coverage | 2-3d |
> | >50 cases OR full E2E journey | 3-5d |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory; code AND tests):**
>
> 1. Count directly modified files/components
> 2. Count complex touches (>500 LOC, multi-handler, central, frequently-modified)
> 3. List downstream callers, event subscribers, cross-service consumers
> 4. Shared/common multi-app touch — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → `risk_factors`; each downstream consumer → +1-3 regression cases; >5 areas OR >2 complex → reconsider SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days | Base margin |
> | --- | --- |
> | <1d trivial | +10% |
> | 1-2d small additive | +20% |
> | 3-4d real feature | +35% |
> | 5-7d large | +50% |
> | 8-10d very large | +75% |
> | >10d | +100% AND **flag SHOULD SPLIT** |
>
> **Additive risk factors — enumerate in `risk_factors`:**
>
> | Factor | +margin |
> | --- | --- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20% |
> | `cross-service-contract` change | +25% |
> | `schema-migration-on-populated-data` | +25% |
> | `new-tech-or-unfamiliar-pattern` | +30% |
> | `regression-fan-out` (≥3 downstream areas re-test) | +20% |
> | `performance-or-latency-critical` | +20% |
> | `concurrency-race-event-ordering` | +25% |
> | `shared-common-code` (multi-consumer/multi-app) | +25% |
> | `unclear-requirements-or-design` | +30% |
>
> **Collapse:** margin >100% → STOP/split, never pad past 2x. Margin <15% at `likely_days ≥5` → widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max EP | Max likely |
> | --- | --- | --- |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Beyond | 21 | MUST split |
>
> **EP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** EP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> effort_points: <n>
> complexity: low | medium | high | critical
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> man_days_ai: '<min>-<max>d'
> risk_margin_pct: <n> # base + add-ons
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> blast_radius:
>     touched_areas: <n>
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     shared_common_code: yes | no
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_reasoning: |
>     5-7 lines covering:
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
> ```
>
> **Reject/fix estimates failing these checks:**
>
> - `likely_days ≥3d` single-point → use range
> - Margin <15% at `likely_days ≥5d` → widen
> - Margin >100% → STOP/split
> - Complex touch without regression budget in `(c)` → reject
> - Blast `>5` areas OR `>2` complex without split discussion → reject
> - Additive existing model AND UI → cap EP 3 unless tests >1.5d
> - NEW page/complex form/dashboard → EP 5+ even with one backend endpoint
> - Cross-service/migration/multi-aggregate backend → EP 8+ regardless of UI
> - `bottom_up_hours / 6` vs EP-Days >50% disagreement → trust bottom-up, downgrade EP
> - Without tests EP drops ≥1 bucket → state tests dominate
> - Reasoning must cover UI/backend/blast/risk factors; add omissions

<!-- /SYNC:estimation-framework -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <70% on any critical decision → stop and escalate via ask user question tool (70-80% → verify first) · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:ui-system-context -->

> **UI System Context** — Apply only to a user-interface surface; `.ts`, `.html`, `.scss`, or `.css` alone does not establish one.
>
> 1. Resolve applicable paths/conventions from `docs/project-config.json`, configured project-reference docs, accepted decisions, and code. Read only relevant frontend, styling, component, design, accessibility, or platform references.
> 2. Respect absent UI and explicit N/A. Require BEM, SCSS, tokens, component tiers, base classes, stores, API wrappers, or teardown helpers only when documented or demonstrated.
> 3. Follow configured/observed styling and component conventions. Use configured `componentSystem.layerClassification`; otherwise describe actual owners without imposing Common/Domain-Shared/Page tiers.
> 4. Before planning, implementing or changing frontend UI, find and read the current project's design system, tokens, shared components and UI controls plus related usage examples. Reuse/compose what fits the contract and platform; document the searched paths and any gap before adding a new control. Do not create shared bases/wrappers to satisfy a checklist.
>
> Config customization: `contextGroups[].rules`, `workflowPatterns`, `styling`, `componentSystem`, and configured reference docs.

<!-- /SYNC:ui-system-context -->

<!-- SYNC:ui-wireframe -->

> **UI Wireframe** — Inspect supplied designs with available tools; state access gaps. Choose sketch, text layout, diagram, prototype, or ASCII to fit the task. Use project component ownership or observed boundaries without imposing tiers. Reuse components when behavior/platform fit; explain deviations. Include scope-relevant states, tokens, and supported layouts. Detail: idea=rough, story=full decomposition.

<!-- /SYNC:ui-wireframe -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); EP DERIVED. UI cost usually dominates — bump EP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap EP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. EP 13 SHOULD split, EP 21 MUST split.

<!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:ui-system-context:reminder -->

**IMPORTANT MUST ATTENTION** Before planning, implementing or changing frontend UI, find and read the current project's design system, tokens, shared components/UI controls and related usage examples; follow house conventions and reuse what fits. Start with project config and selected UI references, then inspect the actual component owners. Record searched paths and any gap before adding a control; honor explicit N/A. A reminder is not proof of discovery.

<!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce ready-to-start, INVEST-valid user stories — tech-agnostic, testable GWT criteria, evidence-cited estimates, dependency-mapped — by breaking tasks into implementable stories via vertical slicing and SPIDR splitting, so a team with zero codebase knowledge can implement on any stack.

**IMPORTANT MUST ATTENTION Main steps (execute in order, NEVER skip):** read task + active plan + domain context → identify VERTICAL slices → SPIDR-split (EP >8 MUST / >5 SHOULD) → write INVEST stories with min 3 GWT + 1 auth scenario → estimate bottom-up (Blast-Radius pre-pass, EP DERIVED) + full frontmatter → emit Story Dependencies table (no orphans) → MANDATORY `ask user question tool` validation → save to `tasks/stories/` under the team-artifacts root (default `team-artifacts/`; path from `docsRoots.teamArtifacts.path` in `docs/project-config.json`) → suggest `$spec [mode=tests]`.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor each canonical body, NEVER skip one:**

- **Estimation Framework:** Bottom-up phase hours drive man-days; EP DERIVED; UI usually dominates.
- **UI System Context:** Read frontend-patterns, scss-styling, design-system before any UI change.
- **UI Wireframe:** Box-ASCII layout; classify each component into one tier; reuse before new.
- **Sequential Thinking:** Multi-step Thought N/M with revision/branch/hypothesis markers; confidence closer.

**IMPORTANT MUST ATTENTION** preserve the parent task's Releasable Outcome Gate: stories MUST collectively cover entry → action → result → exit, and UI stories MUST cover the parent's required views, navigation, components, and states; enabling work is attached to the vertical outcome, never a standalone technical-only task/story.
**IMPORTANT MUST ATTENTION** apply `.claude/skills/shared/releasable-task-contract.md`; a story set that cannot demonstrate the parent outcome is BLOCKED for re-slicing.
**IMPORTANT MUST ATTENTION** every story MUST satisfy AI-SDD mandates M1-M5 and M7 — tech-agnostic prose, `FR-`/`BR-` logical ID + `[Source: namespace/service/id]` abstract anchor (NEVER `file:line` in story prose), testable GWT criteria, rebuild-from-scratch, demoable business outcomes — reject and rework on any STOP condition — why: stories drive implementation on any stack, so a leaked framework/class name breaks portability.
**IMPORTANT MUST ATTENTION** apply the M7 demo test to every criterion's BODY — _"what would a stakeholder SEE change?"_; no answer → TECHNICAL-ONLY, drop it. FAIL a `WHEN` that is an invocation (handler runs, consumer receives, job fires, data syncs) or a `THEN` asserting schema/type/nullability/call-count; NEVER derive the story/scenario count from an architecture inventory — why: M1 governs vocabulary, M7 governs subject matter — a technical story in tech-free prose passes M1 and still rots the business tree.
**IMPORTANT MUST ATTENTION** the story file is one work record owned by `$task-track`: unused `id`, `status: draft`, no assignee, label in `priority_label`; on a tracked file change `title`/`intent`/`status`/`priority` only through `$task-track` — why: a second status or priority vocabulary makes the tracker refuse the record
**IMPORTANT MUST ATTENTION** every story set includes a Story Dependencies table with no orphan stories; EP >8 MUST split, >5 SHOULD split via SPIDR — why: ordering feeds `$prioritize` and `$plan` and oversized stories delay delivery.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using todo tracking BEFORE starting; mark one `in_progress` and `completed` immediately — why: long story files exhaust context and lose findings without external tracking.
**MANDATORY IMPORTANT MUST ATTENTION** estimation is bottom-up — phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`), EP DERIVED never the driver; run the Blast Radius pre-pass and compute `test_count` explicitly per driver — NEVER hand-wave "+tests" (the #1 failure) — why: EP-first estimates anchor to a guess, not the work.
**MANDATORY IMPORTANT MUST ATTENTION** emit the full estimate frontmatter — `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `risk_margin_pct`, `risk_factors`, `blast_radius`, `estimate_scope_*`, `estimate_reasoning` (UI vs backend cost driver) — why: downstream `$prioritize` and `$plan` read these fields, blanks block them.
**MANDATORY IMPORTANT MUST ATTENTION** write min 3 GWT scenarios (happy + edge + error) PLUS a mandatory authorization scenario per story; every criterion has exactly ONE observable interpretation — why: a vague or single-scenario story ships untested edge/error/auth paths.
**MANDATORY IMPORTANT MUST ATTENTION** slice VERTICALLY (thin end-to-end), NEVER horizontally (backend/frontend split) — why: horizontal slices delay deliverable user value.
**MANDATORY IMPORTANT MUST ATTENTION** search existing component libraries and domain vocabulary BEFORE proposing new components/entities (>=80% match = reuse); use the project's own entity names — why: duplicate UI/domain code = wrong tier and fragments the codebase.
**MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` (or grep/graph) evidence with a confidence % for every claim about existing code/entities — >80% to act, <80% verify first — why: AI hallucinates entity/API names; unverified scoping mis-slices the story.
**MANDATORY IMPORTANT MUST ATTENTION** validate stories with the user via `ask user question tool` before handoff — NEVER auto-decide slicing/scope/effort — why: silent assumptions on ambiguous scope ship the wrong stories.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify every story against its AC scenarios, the dependency table, and the Quality Checklist.

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| "Story is small, skip SPIDR/estimate"     | EP >8 MUST split, >5 SHOULD — and EP is DERIVED from bottom-up hours, not eyeballed. Estimate. |
| "Tech notes need the class name"          | Source identifiers belong only in evidence carriers as `[Source: namespace/service/id]` — never in prose (M1/M2). |
| "Happy path is enough"                    | Min 3 scenarios + a mandatory authorization scenario per story. Edge + error + auth are NOT optional. |
| "+tests covers the test cost"             | Compute `test_count` explicitly per driver (auth matrix, validation, states). Hand-wave is the #1 estimate failure. |
| "Independent story, skip the dep table"   | No orphan stories — every story appears in the dependency table, even if `independent`.        |
| "Slicing is obvious, skip validation"     | `ask user question tool` validation is MANDATORY, not optional. The user confirms slicing/scope/effort. |

**IMPORTANT MUST ATTENTION** AI-SDD M1-M5/M7 (tech-agnostic + demoable) + dependency table + bottom-up estimate are the three rules this skill must never skip — re-anchored here (recency) and in the Quick Summary (primacy).
**IMPORTANT MUST ATTENTION** embedded large-idea stories must carry the parent slice ID, preserve the complete decomposition context or a traceable reference to it, and repeat slice non-goals/deferred owners; never grow a story into deferred work. Only an explicit roadmap branch carries roadmap/milestone references.

**MANDATORY IMPORTANT MUST ATTENTION** READ the project-reference docs named in the Quick Summary blockquote BEFORE starting — `project-structure-reference.md` and `domain-entities-reference.md` (business entities/models) in the project-reference docs root, plus the business spec root's existing TCs for related features (defaults `docs/project-reference/` and `docs/specs/`; `docsRoots.projectReference.path` / `specRoots.business.path` in `docs/project-config.json` override them) — plus the Frontend/UI Context docs when the task touches UI. File not found → search for the project's documentation, coding standards, and architecture docs instead — why: story scoping that guesses at entity names and module structure mis-slices the work.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.

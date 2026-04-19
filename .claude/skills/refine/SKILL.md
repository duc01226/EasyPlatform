---
name: refine
version: 2.2.0
description: "[Project Management] Transform ideas into Product Backlog Items using BA best practices, hypothesis validation, and domain research. Use when converting ideas to PBIs, validating problem hypotheses, adding acceptance criteria, or refining requirements. Triggers on "create pbi", "refine idea", "convert to pbi", "acceptance criteria", "make actionable", "validate hypothesis"."
---

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

- `docs/test-specs/` — Test specifications by module (read existing TCs for related features; recommend test spec generation for new PBIs)

## Quick Summary

**Goal:** Transform raw ideas into actionable Product Backlog Items using BA best practices, hypothesis validation, and domain research.

**Workflow:**

1. **Idea Intake** — Load artifact, detect project module
2. **Domain Research** — WebSearch for market/competitor context
3. **Problem Hypothesis** — Validate problem exists before building
4. **Elicitation** — Apply BABOK techniques to extract requirements
5. **Acceptance Criteria** — Write BDD GIVEN/WHEN/THEN scenarios (min 3)
6. **Prioritization** — Apply RICE/MoSCoW scoring
7. **Validation Interview** — MANDATORY user interview to confirm assumptions
8. **PBI Generation** — Save artifact to `team-artifacts/pbis/`

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

- Component patterns: `docs/project-reference/frontend-patterns-reference.md` (content auto-injected by hook — check for [Injected: ...] header before reading)
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

- Never skip hypothesis validation for new features
- Validation interview is NOT optional — always ask 3-5 questions
- Use project domain-specific vocabulary when available
- MUST ATTENTION include `story_points` and `complexity` in PBI output
- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)
    <!-- SYNC:scaffold-production-readiness -->

> **Scaffold Production Readiness** — Every scaffolded project MUST ATTENTION include 5 foundations:
>
> 1. **Code Quality Tooling** — linting, formatting, pre-commit hooks, CI gates. Specific tool choices → `docs/project-reference/` or `project-config.json`.
> 2. **Error Handling Foundation** — HTTP interceptor, error classification (4xx/5xx taxonomy), user notification, global uncaught handler.
> 3. **Loading State Management** — counter-based tracker (not boolean toggle), skip-token for background requests, 300ms flicker guard.
> 4. **Docker Development Environment** — compose profiles (`dev`/`test`/`infra`), multi-stage Dockerfile, health checks on all services, non-root production user.
> 5. **Integration Points** — document each outbound boundary; configure retry + circuit breaker + timeout; integration tests for happy path and failure path.
>
> **BLOCK `/cook` if any foundation is unchecked.** Present 2-3 options per concern via `AskUserQuestion` before implementing.

<!-- /SYNC:scaffold-production-readiness -->

- <!-- SYNC:cross-cutting-quality -->

    > **Cross-Cutting Quality** — Check across all changed files:
    >
    > 1. **Error handling consistency** — same error patterns across related files
    > 2. **Logging** — structured logging with correlation IDs for traceability
    > 3. **Security** — no hardcoded secrets, input validation at boundaries, auth checks present
    > 4. **Performance** — no N+1 queries, unnecessary allocations, or blocking calls in async paths
    > 5. **Observability** — health checks, metrics, tracing spans for new endpoints

                                  <!-- /SYNC:cross-cutting-quality -->

    — for Authorization, Seed Data, Data Migration concerns in PBI output

## Greenfield Mode

> **Auto-detected:** If no existing codebase is found (no code directories like `src/`, `app/`, `lib/`, `server/`, `packages/`, etc., no manifest files like `package.json`/`*.sln`/`go.mod`, no populated `project-config.json`), this skill switches to greenfield mode automatically. Planning artifacts (docs/, plans/, .claude/) don't count — the project must have actual code directories with content.

**When greenfield is detected:**

1. Skip existing backlog item refinement (no backlog exists yet)
2. Enable DDD domain modeling: bounded contexts, aggregates, entities, value objects
3. Enable constraint capture: team skills, expected scale, hosting preferences, budget — as input signals for later tech stack research
4. Use WebSearch for market research and competitor analysis
5. Output domain model artifact alongside PBI artifact
6. Increase AskUserQuestion frequency — validate domain boundaries, entity relationships, business rules
7. **[CRITICAL] DO NOT ask about tech stack during refinement.** Tech stack is a research-driven decision that comes in a dedicated phase after business analysis. Capture team skills and scale expectations as input signals only.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Idea Refinement to PBI

Transform captured ideas into actionable Product Backlog Items using Business Analysis best practices, Hypothesis-Driven Development, and domain research.

## When to Use

- Idea artifact ready for refinement
- Need to validate problem hypothesis before building
- Converting concept to implementable item
- Adding acceptance criteria to requirements
- Researching domain/market context for new features

## Workflow Overview

| Phase | Name                | Key Activity                 | Output                 |
| ----- | ------------------- | ---------------------------- | ---------------------- |
| 1     | Idea Intake         | Load artifact, detect module | Context loaded         |
| 2     | Domain Research     | WebSearch market/competitors | Research summary       |
| 3     | Problem Hypothesis  | Validate problem exists      | Confirmed hypothesis   |
| 4     | Elicitation         | Apply BABOK techniques       | Requirements extracted |
| 5     | Acceptance Criteria | Write BDD scenarios          | GIVEN/WHEN/THEN        |
| 6     | Prioritization      | Apply RICE/MoSCoW            | Priority assigned      |
| 7     | Validation          | Interview user (MANDATORY)   | Assumptions confirmed  |
| 8     | PBI Generation      | Create artifact              | PBI file saved         |

### Output

- **Path:** `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md`
- **ID Pattern:** `PBI-{YYMMDD}-{NNN}`

---

## Phase 0: Locate Active Plan (if in workflow)

If running within a workflow (big-feature, greenfield-init, etc.):

1. **Search for active plan** — Glob `plans/*/plan.md` sorted by modification time, or check `TaskList` for plan context
2. **Read `plan.md`** — understand project scope, goals, architecture decisions, domain model
3. **Read existing research** — `{plan-dir}/research/*.md` for business evaluation, domain analysis, architecture design
4. **Read `docs/project-reference/domain-entities-reference.md`** (if exists) — understand existing domain entities
5. Use plan context to inform PBI refinement (don't re-ask questions already answered in prior steps)

## Phase 1: Idea Intake & Context Loading

1. Read idea artifact from path or find by ID in `team-artifacts/ideas/`
2. Extract: problem statement, value proposition, target users, scope
3. Check `module` field for project domain; if absent, detect via keywords or prompt user

---

## Phase 2: Domain Research

**Trigger:** New domain, unclear competitors, `--research` flag.
**Skip:** Internal tooling, well-understood domain, time-constrained.

Use WebSearch with domain terms. Summarize in max 3 bullets (market context, competitors, best practices).

---

## Phase 3: Problem Hypothesis Validation

Draft and validate hypothesis with user via AskUserQuestion. 42% of startups fail due to no market need - validate before building.

**Skip:** `--skip-hypothesis`, validated hypothesis exists, bug fix/tech debt.

### Problem Hypothesis Template

```markdown
**We believe** [target users/persona]
**Experience** [specific problem]
**Because** [root cause]
**We'll know this is true when** [validation metric/evidence]
```

### Value Hypothesis Template

```markdown
**We believe** [feature/solution]
**Will deliver** [value/benefit]
**To** [target users]
**We'll know we're right when** [success metric]
```

### Validation Process

1. Draft hypothesis from idea content
2. Use AskUserQuestion to validate:
    - "Is this the core problem we're solving?"
    - "Who exactly experiences this? How often?"
    - "What evidence do we have this problem exists?"
3. If validated, proceed to elicitation
4. If invalidated, return idea for clarification

---

## Phase 4: Requirements Elicitation (BABOK Core 5)

Select technique based on context:

### 1. Interviews

**When:** Deep individual insights needed, stakeholder perspectives vary
**Process:** Prepare open-ended questions (why, how, what-if) → active listening → follow-up on unexpected answers → document verbatim quotes
**Output:** Stakeholder needs, pain points, constraints

### 2. Workshops

**When:** Group consensus needed, complex requirements, multiple stakeholders
**Process:** Define agenda + timebox (90 min max) → neutral facilitator → capture all voices (round-robin, silent voting) → document decisions and dissent
**Output:** Prioritized requirements, consensus decisions

### 3. Document Analysis

**When:** Existing systems/processes to understand, regulatory requirements
**Process:** Gather artifacts (specs, manuals, code) → extract implicit requirements → note gaps → cross-reference with stakeholder input
**Output:** As-is state, compliance requirements, gaps

### 4. Observation (Job Shadowing)

**When:** Understand real workflow, users can't articulate needs
**Process:** Shadow users → note workarounds/pain points → don't interrupt → ask clarifying questions afterward
**Output:** Actual vs stated workflow, hidden requirements

### 5. Prototyping

**When:** Visual validation needed, UI/UX requirements unclear
**Process:** Start low-fidelity (sketches, wireframes) → iterate on feedback → increase fidelity as requirements stabilize → document design decisions
**Output:** Validated UI requirements, interaction patterns

---

## Phase 5: Acceptance Criteria (BDD Format)

Write GIVEN/WHEN/THEN scenarios. Minimum 3: happy path, edge case, error case.

### Standard BDD Format

```gherkin
Scenario: {Descriptive title}
  Given {precondition/context}
    And {additional context}
  When {action/trigger}
    And {additional action}
  Then {expected outcome}
    And {additional verification}
```

### Best Practices

| Practice                  | Description                       |
| ------------------------- | --------------------------------- |
| Single trigger            | "When" clause has ONE action      |
| 3 scenarios minimum       | Happy path, edge case, error case |
| No implementation details | Focus on behavior, not how        |
| Testable outcomes         | "Then" must be verifiable         |
| Stakeholder language      | No technical jargon               |

### Example Scenarios

```gherkin
Scenario: Employee creates goal with valid data
  Given employee has permission to create goals
    And employee is on the goal creation page
  When employee submits goal form with all required fields
  Then goal is created with status "Draft"
    And goal appears in employee's goal list

Scenario: Goal creation fails with missing required field
  Given employee is on the goal creation page
  When employee submits form without title
  Then validation error "Title is required" is displayed
    And goal is not created

Scenario: Manager reviews subordinate goal
  Given manager has direct reports
    And subordinate has submitted goal for review
  When manager opens goal review page
  Then subordinate's goal is visible with "Pending Review" status
```

### Project Test Case Format

- **Format:** `TC-{FEATURE}-{NNN}` (e.g., TC-GM-001)
- **Evidence:** `file:line` format
- See `business-analyst` skill for detailed patterns

---

### Phase 5.5: Testability Assessment

Use `AskUserQuestion` with 2-3 questions:

1. "Which testing approach fits this PBI?"
    - TDD-first: Write test specs before implementation (Recommended for complex features)
    - Implement-first: Build feature, then create test specs
    - Parallel: Spec and implement simultaneously

2. "What test levels are needed?"
    - Integration tests only (Recommended for backend CQRS)
    - Integration + E2E
    - Unit + Integration + E2E

For EACH acceptance criterion, generate a corresponding test case outline:

| AC                         | Test Outline                                            | Priority |
| -------------------------- | ------------------------------------------------------- | -------- |
| AC-1: User can create goal | TC: Create goal with valid data → verify persisted      | P0       |
| AC-2: Goal requires title  | TC: Create goal without title → verify validation error | P1       |

This table becomes the seed for `/tdd-spec` if the user chooses TDD-first.

Document in PBI under `## Testability Assessment`.

---

## Phase 6: Prioritization & Estimation

<!-- SYNC:estimation-framework -->

> **Estimation** — Modified Fibonacci: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large) → 13(epic, SHOULD split) → 21(MUST ATTENTION split). Output `story_points` and `complexity` in plan frontmatter. Complexity auto-derived: 1-2=Low, 3-5=Medium, 8=High, 13+=Critical.

<!-- /SYNC:estimation-framework -->

Apply RICE score or MoSCoW for priority. Estimate using **Story Points (Modified Fibonacci 1-21)** for complexity measurement.

### Story Points (Primary Estimation)

Use SP reference table from estimation framework (already embedded above).

### Quick RICE Score

```
Score = (Reach x Impact x Confidence) / Effort

Reach: Users affected per quarter (100, 500, 1000+)
Impact: 0.25 (minimal) | 0.5 (low) | 1 (medium) | 2 (high) | 3 (massive)
Confidence: 0.5 (low) | 0.8 (medium) | 1.0 (high)
Effort: Story points (1, 2, 3, 5, 8, 13, 21)
```

### MoSCoW Categories

| Category        | Meaning                  | Action              |
| --------------- | ------------------------ | ------------------- |
| **Must Have**   | Critical, non-negotiable | Include in MVP      |
| **Should Have** | Important but not vital  | Plan for release    |
| **Could Have**  | Nice to have, low effort | If time permits     |
| **Won't Have**  | Out of scope this cycle  | Document for future |

---

## Phase 7: Validation Interview (MANDATORY)

Generate 3-5 questions covering assumptions, scope, dependencies, edge cases. Use AskUserQuestion. Document in PBI. This step is NOT optional.

### Question Categories

| Category            | Example Question                                                            |
| ------------------- | --------------------------------------------------------------------------- |
| **Assumptions**     | "We assume X is true. Correct?"                                             |
| **Scope**           | "Should Y be included or explicitly excluded?"                              |
| **Dependencies**    | "This requires Z. Is that available?"                                       |
| **Edge Cases**      | "What happens when data is empty/null?"                                     |
| **Business Impact** | "Will this affect existing reports/workflows?"                              |
| **Entities**        | "Create new entity or extend existing X?"                                   |
| **Prod Readiness**  | "Does this feature need linting, error handling, loading, or Docker setup?" |
| **Authorization**   | "Who can perform this action? What roles/permissions are needed?"           |
| **Seed Data**       | "Does this feature need reference/lookup data to function?"                 |
| **Data Migration**  | "Does this change entity schema? Is data transformation needed?"            |

### Process

1. Generate 3-5 questions from assumptions, scope, dependencies
2. Use `AskUserQuestion` tool to interview
3. Document in PBI under `## Validation Summary`
4. Update PBI based on answers

### Validation Output Format

```markdown
## Validation Summary

**Validated:** {date}

### Confirmed Decisions

- {decision}: {user choice}

### Assumptions Confirmed

- {assumption}: Confirmed/Modified

### Open Items

- [ ] {follow-up items}
```

---

## Phase 8: PBI Artifact Generation

Save to `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md`.

### PBI Template

```markdown
---
id: PBI-{YYMMDD}-{NNN}
title: '{Brief descriptive title}'
module: '{ModuleName — detect from project-config.json modules[]}'
priority: Must Have | Should Have | Could Have | Won't Have
story_points: 1 | 2 | 3 | 5 | 8 | 13 | 21
complexity: Low | Medium | High | Very High
status: draft | refined | ready | in_progress | done
rice_score: { calculated }
created: '{YYYY-MM-DD}'
source_idea: '{idea artifact path or ID}'
---

# {PBI Title}

## Description

**As a** {user role}
**I want** {capability}
**So that** {business value}

## Business Value

- {Quantified benefit 1}
- {Quantified benefit 2}

## Problem Hypothesis

**We believe** {target users}
**Experience** {specific problem}
**Because** {root cause}
**We'll know this is true when** {validation metric}

## Business Rules

- BR-{MOD}-XXX: {Rule description}

## Acceptance Criteria

### AC-1: {Title}

Scenario: {Happy path}
Given {context}
When {action}
Then {outcome}

### AC-2: {Title}

Scenario: {Edge case}
Given {edge state}
When {action}
Then {handling}

### AC-3: {Title}

Scenario: {Error case}
Given {context}
When {invalid action}
Then error "{message}"

## Testability Assessment

| AC   | Test Outline       | Priority |
| ---- | ------------------ | -------- |
| AC-1 | {test description} | P0       |
| AC-2 | {test description} | P1       |

## Out of Scope

- {Explicitly excluded item 1}
- {Explicitly excluded item 2}

## Dependencies

| Dependency            | Type         | Description                    |
| --------------------- | ------------ | ------------------------------ |
| {PBI/service/feature} | must-before  | {Why this must be done first}  |
| {PBI/service/feature} | can-parallel | {Why this can run in parallel} |
| {PBI/service/feature} | blocked-by   | {What blocks this PBI}         |
| -                     | independent  | {No dependencies — first item} |

## Production Readiness Concerns

| Concern                | Required        | Notes                                   |
| ---------------------- | --------------- | --------------------------------------- |
| Code linting/analyzers | Yes/No/Existing | {tool preference or "scaffold default"} |
| Error handling setup   | Yes/No/Existing | {pattern: toast/inline/error-page}      |
| Loading indicators     | Yes/No/Existing | {pattern: spinner/skeleton/progress}    |
| Docker integration     | Yes/No/Existing | {scope: infra-only/full/none}           |
| CI/CD quality gates    | Yes/No/Existing | {coverage threshold, lint enforcement}  |
| Security scanning      | Yes/No/Existing | {dependency audit, SAST}                |

## Authorization & Access Control

| Role   | Can Create | Can Read | Can Update | Can Delete | Notes         |
| ------ | ---------- | -------- | ---------- | ---------- | ------------- |
| {Role} | ✅/❌      | ✅/❌    | ✅/❌      | ✅/❌      | {scope notes} |

**New permissions needed:** {Yes/No — list if yes}
**Multi-tenant isolation:** {Yes/No}

## Seed Data Requirements

| Data Type          | Description                          | Owner        | Required |
| ------------------ | ------------------------------------ | ------------ | -------- |
| Reference data     | {lookups, statuses, types}           | Application  | Yes/No   |
| Configuration data | {default settings}                   | Application  | Yes/No   |
| Test seed data     | {entities for integration tests}     | Test project | Yes/No   |
| Performance data   | {large-volume data for load testing} | Test tooling | Yes/No   |

> If no seed data needed: `N/A — no seed data required for this feature.`

## Data Migration

| Change                      | Type                                   | Backward Compatible | Reversible |
| --------------------------- | -------------------------------------- | ------------------- | ---------- |
| {schema change description} | Add field / Remove field / Type change | Yes/No              | Yes/No     |

> If no schema changes: `N/A — no schema changes required.`

## Domain Context

**Entities:** {Entity1}, {Entity2}
**Related Features:** {feature doc paths}

## UI Layout

<!-- SYNC:ui-wireframe -->

> **UI Wireframe** — For UI artifacts: include ASCII wireframe (box-drawing chars), component tree with EXISTING/NEW classification and tier (common | domain-shared | page/app), interaction flow (user action → system response → UI update), states table (default/loading/empty/error), and responsive breakpoint behavior. Process Figma URLs or screenshots BEFORE wireframing. Search existing component libs before proposing new components. Backend-only changes: `N/A — Backend-only change. No UI affected.`

<!-- /SYNC:ui-wireframe -->

### Wireframe

{ASCII wireframe using box-drawing characters}

**Layout:** {description with approximate proportions/dimensions}

### Components

- **{ComponentName}** — {behavior description} _(tier: common | domain-shared | page/app)_

> Classify per **Component Hierarchy** in UI wireframe protocol — search existing libs before proposing new components.

### States

| State   | Behavior                   |
| ------- | -------------------------- |
| Default | {what user sees initially} |
| Loading | {spinner/skeleton}         |
| Empty   | {empty state message}      |
| Error   | {error handling}           |

> If backend-only: `## UI Layout` → `N/A — Backend-only change. No UI affected.`

## Validation Summary

**Validated:** {date}

### Confirmed Decisions

- {decision}: {user choice}

### Assumptions Confirmed

- {assumption}: Confirmed/Modified

### Open Items

- [ ] {follow-up items}
```

---

## Anti-Patterns to Avoid

| Anti-Pattern                   | Better Approach                     |
| ------------------------------ | ----------------------------------- |
| Refining vague ideas           | Return to `/idea` for clarification |
| Skipping hypothesis validation | Always run Phase 3 for new features |
| Solution-first thinking        | Start with problem, not solution    |
| Generic acceptance criteria    | Use GIVEN/WHEN/THEN with specifics  |
| Ignoring domain context        | Load project docs if applicable     |
| Too large PBI (XL+)            | Break into smaller items            |
| Missing "Out of Scope"         | Explicitly list exclusions          |
| Assuming instead of asking     | Run validation interview            |

---

## Key Rules

- **Every PBI MUST ATTENTION include a Dependencies table** — with types: `must-before`, `can-parallel`, `blocked-by`, `independent`. This enables `/prioritize` and `/plan` to respect ordering.
- **No vague dependency descriptions** — Each dependency must specify the concrete PBI, service, or feature and WHY the relationship exists.

## Definition of Ready (INVEST)

| Criterion           | Check                        |
| ------------------- | ---------------------------- |
| **I**ndependent     | No blocking dependencies     |
| **N**egotiable      | Details can be refined       |
| **V**aluable        | Clear user/business value    |
| **E**stimable       | Team can estimate (XS-XL)    |
| **S**mall           | Single sprint                |
| **T**estable        | 3+ GIVEN/WHEN/THEN scenarios |
| Problem Validated   | Hypothesis confirmed         |
| Domain Context      | BR/entity context loaded     |
| Stakeholder Aligned | Validation interview done    |
| Prod Readiness      | Concerns documented          |

---

## Project Integration

For domain PBIs: detect module from `docs/business-features/` directory names, extract business rules from `docs/business-features/{module}/`, load entity context from feature doc. Target 8-12K tokens for feature context.

---

## Related

- **Role Skill:** `business-analyst` (detailed patterns)
- **Input:** `/idea` output
- **Next Step:** `/story`, `/tdd-spec` (Recommended for TDD), `/test-spec`, `/design-spec`
- **Prioritization:** `/prioritize`
- **Production Readiness:** See `SYNC:scaffold-production-readiness` block for foundation requirements referenced in Production Readiness Concerns table.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/why-review (Recommended)"** — Validate design rationale, alternatives considered, and risk assessment in the PBI before moving to story or implementation
- **"/domain-analysis"** — If PBI creates/modifies domain entities, model bounded contexts and aggregates before writing stories
- **"/story"** — Break PBI into implementable user stories
- **"/pbi-mockup"** — Generate HTML mockup report from PBI
- **"/tdd-spec"** — If using TDD approach
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** add a final todo task: **"Run /why-review"** — validate PBI design rationale (Problem Hypothesis, alternatives, risk) before proceeding to /story or /tdd-spec.
**MANDATORY IMPORTANT MUST ATTENTION** add a final todo task: **"Run /pbi-challenge"** — Dev BA PIC collaborative review of the drafted PBI (challenge prompts, AC quality, feasibility) before proceeding to /dor-gate or /story.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

<!-- SYNC:ui-system-context:reminder -->

- **IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
      <!-- /SYNC:ui-system-context:reminder -->
      <!-- SYNC:scaffold-production-readiness:reminder -->
- **IMPORTANT MUST ATTENTION** verify 4 production-readiness foundations (code quality, error handling, loading state, Docker) for scaffold PBIs.
    <!-- /SYNC:scaffold-production-readiness:reminder -->
    <!-- SYNC:cross-cutting-quality:reminder -->
- **IMPORTANT MUST ATTENTION** check error handling, logging, security, performance, and observability across changed files.
    <!-- /SYNC:cross-cutting-quality:reminder -->
    <!-- SYNC:estimation-framework:reminder -->
- **IMPORTANT MUST ATTENTION** estimate story points using Modified Fibonacci (1-21). SP >8 MUST ATTENTION split, >5 SHOULD split.
    <!-- /SYNC:estimation-framework:reminder -->
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->

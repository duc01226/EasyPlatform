---
name: refine
version: 2.3.0
description: '[Project Management] Transform ideas into Product Backlog Items using BA best practices, hypothesis validation, and domain research. Use when converting ideas to PBIs, validating problem hypotheses, adding acceptance criteria, or refining requirements. Triggers on "create pbi", "refine idea", "convert to pbi", "acceptance criteria", "make actionable", "validate hypothesis".'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Simple tasks: ask user whether to skip.

> **External Memory:** Complex/lengthy work → write findings to `plans/reports/` — prevents context loss.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence, confidence >80% to act.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Transform raw ideas into actionable PBIs using BA best practices, hypothesis validation, domain research.

**Workflow:**

| Phase | Name                | Key Activity                     | Output                 |
| ----- | ------------------- | -------------------------------- | ---------------------- |
| 1     | Idea Intake         | Load artifact, detect module     | Context loaded         |
| 2     | Domain Research     | WebSearch market/competitors     | Research summary       |
| 3     | Problem Hypothesis  | Validate problem exists          | Confirmed hypothesis   |
| 4     | Elicitation         | Apply BABOK techniques           | Requirements extracted |
| 5     | Acceptance Criteria | Write BDD scenarios              | GIVEN/WHEN/THEN        |
| 6     | Prioritization      | Apply RICE/MoSCoW + Story Points | Priority + estimate    |
| 7     | Validation          | Interview user (MANDATORY)       | Assumptions confirmed  |
| 8     | PBI Generation      | Create artifact                  | PBI file saved         |

**Key Rules:**

- NEVER skip hypothesis validation for new features
- Validation interview NOT optional — always ask 3-5 questions
- Use project domain-specific vocabulary when available
- MUST ATTENTION include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in PBI frontmatter
- Every PBI MUST ATTENTION include Dependencies table — types: `must-before` | `can-parallel` | `blocked-by` | `independent`
- `docs/specs/` — read existing TCs for related features; recommend test spec generation for new PBIs
- `docs/project-reference/domain-entities-reference.md` — read when task involves business entities/models

---

## Frontend/UI Context (if applicable)

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

---

## Greenfield Mode

> **Auto-detected:** No code directories (`src/`, `app/`, `lib/`, `server/`, `packages/`, etc.) and no manifest files (`package.json`/`*.sln`/`go.mod`) found. Planning artifacts (docs/, plans/, .claude/) don't count.

**When greenfield detected:**

1. Skip existing backlog refinement (no backlog exists)
2. Enable DDD domain modeling: bounded contexts, aggregates, entities, value objects
3. Capture constraints: team skills, expected scale, hosting preferences, budget — as input signals only
4. Use WebSearch for market research + competitor analysis
5. Output domain model artifact alongside PBI artifact
6. Increase AskUserQuestion frequency — validate domain boundaries, entity relationships, business rules
7. **[CRITICAL] NEVER ask about tech stack during refinement.** Tech stack decided after business analysis. Capture team skills + scale expectations as signals only.

**Be skeptical. Every claim needs traced proof, confidence >80%.**

---

## Phase 0: Locate Active Plan (if in workflow)

If running in workflow (big-feature, greenfield-init, etc.):

1. Glob `plans/*/plan.md` sorted by modification time, or check `TaskList` for plan context
2. Read `plan.md` — project scope, goals, architecture decisions, domain model
3. Read existing research — `{plan-dir}/research/*.md` for business evaluation, domain analysis
4. Read `docs/project-reference/domain-entities-reference.md` (if exists) — existing domain entities
5. Use plan context — don't re-ask questions already answered in prior steps

## Phase 1: Idea Intake & Context Loading

1. Read idea artifact from path or find by ID in `team-artifacts/ideas/`
2. Extract: problem statement, value proposition, target users, scope
3. Check `module` field; if absent, detect via keywords or prompt user

---

## Phase 2: Domain Research

**Trigger:** New domain, unclear competitors, `--research` flag.
**Skip:** Internal tooling, well-understood domain, time-constrained.

Use WebSearch with domain terms. Summarize in max 3 bullets (market context, competitors, best practices).

---

## Phase 3: Problem Hypothesis Validation

Validate hypothesis with user via AskUserQuestion. 42% of startups fail due to no market need — validate before building.

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
3. Validated → proceed to elicitation
4. Invalidated → return idea for clarification

---

## Phase 4: Requirements Elicitation (BABOK Core 5)

**Think:** What information gaps exist? Which technique fills them with least effort + highest confidence?

| Technique             | When to Choose                                      | What to Extract                                 |
| --------------------- | --------------------------------------------------- | ----------------------------------------------- |
| **Interviews**        | Deep insights needed, stakeholder perspectives vary | Stakeholder needs, pain points, constraints     |
| **Workshops**         | Group consensus needed, multiple stakeholders       | Prioritized requirements, consensus decisions   |
| **Document Analysis** | Existing systems/processes, regulatory requirements | As-is state, compliance requirements, gaps      |
| **Observation**       | Users can't articulate needs, workflow unclear      | Actual vs stated workflow, hidden requirements  |
| **Prototyping**       | Visual validation needed, UI/UX requirements vague  | Validated UI requirements, interaction patterns |

**Technique notes:**

- Interviews: Open-ended questions (why, how, what-if) → active listening → follow-up on unexpected → document verbatim quotes
- Workshops: Define agenda + 90 min timebox → neutral facilitator → round-robin/silent voting → document decisions AND dissent
- Observation: Shadow users → note workarounds/pain points → don't interrupt → ask clarifying questions afterward

---

## Phase 5: Acceptance Criteria (BDD Format)

Write GIVEN/WHEN/THEN scenarios. Minimum 3: happy path, edge case, error case.

```gherkin
Scenario: {Descriptive title}
  Given {precondition/context}
    And {additional context}
  When {action/trigger}
    And {additional action}
  Then {expected outcome}
    And {additional verification}
```

| Practice                  | Rule                              |
| ------------------------- | --------------------------------- |
| Single trigger            | "When" clause has ONE action      |
| 3 scenarios minimum       | Happy path, edge case, error case |
| No implementation details | Behavior, not how                 |
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

For EACH acceptance criterion, generate corresponding test case outline:

| AC   | Test Outline                                            | Priority |
| ---- | ------------------------------------------------------- | -------- |
| AC-1 | TC: Create goal with valid data → verify persisted      | P0       |
| AC-2 | TC: Create goal without title → verify validation error | P1       |

Seed for `/tdd-spec` if user chooses TDD-first. Document in PBI under `## Testability Assessment`.

---

## Phase 6: Prioritization & Estimation

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

Apply RICE score or MoSCoW for priority. Estimate using **Story Points (Modified Fibonacci 1-21)**.

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

Generate 3-5 questions covering assumptions, scope, dependencies, edge cases. Use AskUserQuestion. Document in PBI. **NOT optional.**

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

1. Generate 3-5 questions from assumptions, scope, dependencies
2. Use `AskUserQuestion` to interview
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

## Cross-Cutting & Production Readiness

> Capture in PBI template sections: Production Readiness Concerns, Authorization & Access Control, Seed Data, Data Migration.

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

<!-- SYNC:cross-cutting-quality -->

> **Cross-Cutting Quality** — Check across all changed files:
>
> 1. **Error handling consistency** — same error patterns across related files
> 2. **Logging** — structured logging with correlation IDs for traceability
> 3. **Security** — no hardcoded secrets, input validation at boundaries, auth checks present
> 4. **Performance** — no N+1 queries, unnecessary allocations, or blocking calls in async paths
> 5. **Observability** — health checks, metrics, tracing spans for new endpoints

<!-- /SYNC:cross-cutting-quality -->

---

## Phase 8: PBI Artifact Generation

**Path:** `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md` | **ID Pattern:** `PBI-{YYMMDD}-{NNN}`

### PBI Template

```markdown
---
id: PBI-{YYMMDD}-{NNN}
title: '{Brief descriptive title}'
module: '{ModuleName — detect from project-config.json modules[]}'
priority: Must Have | Should Have | Could Have | Won't Have
story_points: 1 | 2 | 3 | 5 | 8 | 13 | 21
complexity: Low | Medium | High | Very High
man_days_traditional: '{ Xd (Yd code + Zd test) — from SP table }'
man_days_ai: '{ Xd (Yd code + Zd test) — from SP table with AI }'
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

- **Every PBI MUST ATTENTION include Dependencies table** — types: `must-before`, `can-parallel`, `blocked-by`, `independent`. Enables `/prioritize` and `/plan` to respect ordering.
- **No vague dependency descriptions** — Each dependency must specify concrete PBI, service, or feature and WHY relationship exists.

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
- **Next Step:** `/story`, `/tdd-spec` (Recommended for TDD), `/design-spec`
- **Prioritization:** `/prioritize`

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION** after completing this skill, use `AskUserQuestion` to present these options. NEVER skip because task seems "simple" or "obvious":

- **"/why-review (Recommended)"** — Validate design rationale, alternatives, risk assessment before `/story` or implementation
- **"/domain-analysis"** — If PBI creates/modifies domain entities, model bounded contexts before writing stories
- **"/story"** — Break PBI into implementable user stories
- **"/pbi-mockup"** — Generate HTML mockup from PBI
- **"/tdd-spec"** — If using TDD approach
- **"Skip, continue manually"** — user decides

---

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:ui-system-context:reminder -->

**IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.

<!-- /SYNC:ui-system-context:reminder -->
<!-- SYNC:scaffold-production-readiness:reminder -->

**IMPORTANT MUST ATTENTION** verify 5 production-readiness foundations (code quality, error handling, loading state, Docker, integration points) for scaffold PBIs.

<!-- /SYNC:scaffold-production-readiness:reminder -->
<!-- SYNC:cross-cutting-quality:reminder -->

**IMPORTANT MUST ATTENTION** check error handling, logging, security, performance, and observability across changed files.

<!-- /SYNC:cross-cutting-quality:reminder -->
<!-- SYNC:estimation-framework:reminder -->

**IMPORTANT MUST ATTENTION** estimate story points using Modified Fibonacci (1-21). Output `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`. SP 13 SHOULD split, SP 21 MUST split.

<!-- /SYNC:estimation-framework:reminder -->
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

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small tasks via `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — NEVER auto-decide
- **MANDATORY IMPORTANT MUST ATTENTION** add final review task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** add task: run `/why-review` — validate PBI design rationale before `/story` or `/tdd-spec`
- **MANDATORY IMPORTANT MUST ATTENTION** add task: run `/pbi-challenge` — Dev BA PIC review before `/dor-gate` or `/story`

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| "Simple PBI, skip hypothesis validation"  | Wrong assumption wastes more time than validation check. Apply always.         |
| "Validation interview is optional here"   | NEVER optional — user decides assumptions, AI doesn't                          |
| "Skip Dependencies table, no blockers"    | Unknown blockers exist. Always fill table — even if `independent`              |
| "Skip story points, just write ACs"       | `story_points`, `man_days_traditional`, `man_days_ai` mandatory in frontmatter |
| "Domain context not needed for small PBI" | Small PBIs touch entities. Read domain-entities-reference first                |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

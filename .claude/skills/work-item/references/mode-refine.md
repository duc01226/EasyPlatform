# `/work-item --mode=refine` — initiative refinement to tasks reference

> Loaded by `work-item/SKILL.md`'s Mode Dispatch when invoked as `/work-item --mode=refine [initiative | task | requirement text]`. This contract is the whole invocation: refine an initiative (or raw request) into one or more tasks: problem-hypothesis validation, the interview, acceptance criteria, estimates. It works called directly with no workflow; every rule, flag, output and gate below is the contract of that mode.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Contents

- [Quick Summary](#quick-summary)
- [Frontend/UI Context (if applicable)](#frontendui-context-if-applicable)
- [Greenfield Mode](#greenfield-mode)
- [Phase 0: Locate Active Plan (if in workflow)](#phase-0-locate-active-plan-if-in-workflow)
- [Phase 0.5: Applicability and Large-Idea Decomposition Gate](#phase-05-applicability-and-large-idea-decomposition-gate)
- [Phase 1: Initiative Intake & Context Loading](#phase-1-initiative-intake--context-loading)
- [Phase 2: Domain Research](#phase-2-domain-research)
- [Phase 3: Problem Hypothesis Validation](#phase-3-problem-hypothesis-validation)
- [Phase 4: Requirements Elicitation (BABOK Core 5)](#phase-4-requirements-elicitation-babok-core-5)
- [Phase 5: Acceptance Criteria (BDD Format)](#phase-5-acceptance-criteria-bdd-format)
- [Phase 6: Prioritization & Estimation](#phase-6-prioritization--estimation)
- [Phase 7: Validation Interview (MANDATORY)](#phase-7-validation-interview-mandatory)
- [Cross-Cutting & Production Readiness](#cross-cutting--production-readiness)
- [Phase 7.5: Re-evaluate Estimation (MANDATORY — runs after Validation Interview)](#phase-75-re-evaluate-estimation-mandatory--runs-after-validation-interview)
- [Phase 7.6: Releasable Outcome Gate (BLOCKING)](#phase-76-releasable-outcome-gate-blocking)
- [Phase 8: Task Artifact Generation](#phase-8-task-artifact-generation)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Key Rules](#key-rules)
- [BA Team Refinement Context (canonical)](#ba-team-refinement-context-canonical)
- [Readiness check (INVEST)](#readiness-check-invest)
- [Project Integration](#project-integration)
- [Related](#related)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Transform raw ideas into a task that passes the readiness check using BA best practices, hypothesis validation, and domain research — problem-validated, tech-agnostic, with testable acceptance criteria, estimates, and a Dependencies table — so a team can build it without re-asking what or why.

**Summary:**

- **Purpose:** turn a raw idea into a ready-to-plan task that passes the readiness check (`--mode=dor`) and that a team can build without re-asking what or why.
- **Main steps — run in order, track EACH (AI keeps forgetting sub-phases):** Phase 0 locate active plan → 0.5 applicability and large-idea decomposition gate → 1 idea intake + module detect → 2 domain research → 3 problem-hypothesis validation (GATE) → 4 BABOK elicitation → 5 BDD acceptance criteria → 5.1 AI-SDD M1-M5/M7 gate (BLOCKING) → 5.5 testability assessment → 6 prioritization + draft estimate → 7 validation interview (GATE, 3-5 Qs) → 7.5 RE-DERIVE estimate vs locked scope → 7.6 RELEASABLE OUTCOME gate → 8 task artifact generation.
- Two gates are NON-OPTIONAL: validate the problem hypothesis (Phase 3) before building, and run the 3-5 question validation interview (Phase 7) before writing the task — the user decides assumptions, scope, and dependencies, never the AI. From a governing spec, Phase 3 cites the spec and Phase 7 asks only what the spec and decision log leave open.
- Acceptance criteria are BDD GIVEN/WHEN/THEN (min 3: happy/edge/error) and MUST satisfy the AI-SDD M1-M5 and M7 gate (Phase 5.1): tech-agnostic Business Intent, logical FR-/BR- IDs first, observable single-interpretation ACs, rebuild-from-scratch validity, and every AC demoable as a business outcome (M7).
- Estimate twice: Phase 6 drafts effort points/man-days against draft scope, then Phase 7.5 RE-DERIVES them against the locked post-interview scope (per SYNC:estimation-framework) — shipping stale Phase 6 numbers is the cardinal failure.
- The task frontmatter MUST carry `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai`, and every task MUST include a complete Dependencies table with Dependency, Type (`must-before`/`can-parallel`/`blocked-by`/`independent`) and Status columns.
- Apply `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedTaskThatMustSplit` before elicitation. When true, the owning task MUST carry the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`) and every slice must be independently releasable. Do not create the product-roadmap artifact (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) by default; use the standalone roadmap branch only for an explicit roadmap request. All-false ideas omit roadmap/milestone placeholders. An existing roadmap is read-only context.
- Every generated task MUST be one independently releasable, actor-facing business outcome with a complete demonstrable journey. Technical-only, foundation-only, migration-only, or setup-only work belongs as enabling subtasks/dependencies under a releasable task, never as a standalone task. Read `.claude/skills/shared/releasable-task-contract.md`.
- For UI tasks, the outcome MUST include the page/view inventory, navigation map, component inventory, applicable states, and full-flow demo journey required for a mock app outcome; one isolated screen is insufficient.

**Workflow:**

| Phase | Name                | Key Activity                     | Output                 |
| ----- | ------------------- | -------------------------------- | ---------------------- |
| 0     | Locate Active Plan  | Load `plan.md` if in workflow    | Plan context           |
| 0.5   | Applicability / Decomposition (GATE) | Evaluate large-idea signals and capture embedded slices when needed | Embedded decomposition or ordinary isolated boundary |
| 1     | Initiative Intake         | Load artifact, detect module     | Context loaded         |
| 2     | Domain Research     | WebSearch market/competitors     | Research summary       |
| 3     | Problem Hypothesis (GATE) | Validate problem exists       | Confirmed hypothesis   |
| 4     | Elicitation         | Apply BABOK techniques           | Requirements extracted |
| 5     | Acceptance Criteria | Write BDD scenarios              | GIVEN/WHEN/THEN        |
| 5.1   | AI-SDD Gate (M1-M5/M7) | Tech-agnostic, FR/BR IDs first, demoable | Mandate-compliant ACs  |
| 5.5   | Testability         | Test approach + per-AC outlines  | Test seed for `/spec`  |
| 6     | Prioritization      | RICE/MoSCoW + DRAFT Effort points | Priority + draft est.  |
| 7     | Validation (GATE)   | Interview user (MANDATORY, 3-5Q) | Assumptions confirmed  |
| 7.5   | Re-estimate         | RE-DERIVE vs LOCKED scope        | Final estimate         |
| 7.6   | Releasable Outcome (GATE) | Confirm actor-facing outcome and full-flow surface | Releasable outcome gate |
| 8     | Task Generation      | Create artifact                  | Task file saved         |

**Key Rules:**

- **AI surface?** Only if the initiative or task adds or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-feature-framing-gate.md` and put its job-fit, quality bar and autonomy limit in the acceptance criteria; otherwise skip this line.
- NEVER skip hypothesis validation for new features
- Validation interview NOT optional — always ask 3-5 questions
- Use project domain-specific vocabulary when available
- MUST ATTENTION include `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai` in task frontmatter
- Every task MUST ATTENTION include Dependencies table — columns Dependency, Type, Status; types: `must-before` | `can-parallel` | `blocked-by` | `independent`
- Every generated task MUST ATTENTION pass the Releasable Outcome Gate: one actor-facing outcome, complete entry-to-result journey, observable evidence, and no standalone technical/foundation scope.
- UI tasks MUST ATTENTION define the full-flow surface: all required pages/views, navigation, reusable/domain/page components, applicable states, and a demo journey. A single screen is not a releasable UI task.
- The business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — read existing TCs for related features; recommend test spec generation for new tasks
- `domain-entities-reference.md`, in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — read when task involves business entities/models
- `.claude/skills/shared/product-roadmap-contract.md` — read for applicability, the embedded decomposition schema, and the explicit roadmap handoff contract
- `.claude/skills/shared/releasable-task-contract.md` — read for the task outcome and UI full-flow contract

---

## Frontend/UI Context (if applicable)

Each file below sits in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path:

- Component patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`
- Design system tokens: `design-system/README.md`

---

## Greenfield Mode

> **Auto-detected:** No discovered source directories and no manifest files found. Planning artifacts don't count — the docs tree, `.claude/`, and the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path).

**When greenfield detected:**

1. Skip existing planned-work refinement (no planned work exists)
2. Enable DDD domain modeling: bounded contexts, aggregates, entities, value objects
3. Capture constraints: team skills, expected scale, hosting preferences, budget — as input signals only
4. Use WebSearch for market research + competitor analysis
5. Output domain model artifact alongside task artifact
6. Increase ask user question tool frequency — validate domain boundaries, entity relationships, business rules
7. **[CRITICAL] NEVER ask about tech stack during refinement.** Tech stack decided after business analysis. Capture team skills + scale expectations as signals only.

**Be skeptical. Every claim needs traced proof, confidence >80%.**

---

## Phase 0: Locate Active Plan (if in workflow)

If running in workflow (big-feature, greenfield-init, etc.):

1. Glob `*/plan.md` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) sorted by modification time, or check `TaskList` for plan context
2. Read `plan.md` — project scope, goals, architecture decisions, domain model
3. Read existing research — `{plan-dir}/research/*.md` for business evaluation, domain analysis
4. Read `domain-entities-reference.md` in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path), if it exists — existing domain entities
5. Use plan context — don't re-ask questions answered in prior steps

## Phase 0.5: Applicability and Large-Idea Decomposition Gate

Read `.claude/skills/shared/product-roadmap-contract.md` before eliciting task details. Evaluate the shared four-operand `isLargeIdea` rule:

1. If any signal is true, capture the complete `large_idea_decomposition` block in the owning task handoff. Include stable slice IDs, independently releasable outcomes, dependency order, non-goals with owners, risks/evidence with owners and statuses, and deferred-work owners. Ask the owner about material ambiguity; do not invent boundaries.
2. If all signals are false, omit the decomposition block and all roadmap/milestone/scope-brief placeholders. Preserve the actor, outcome, in-scope behavior, non-goals, lifecycle terms, source-of-truth state, persistence expectation, and evidence directly in the task.
3. If the user explicitly requests a product roadmap, route to `/product-roadmap`; only that explicit branch may require the product-roadmap artifact (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path), a selected milestone, and a scope brief. An existing roadmap supplied by the user is read-only context.
4. For a framework/library change, use the shared `FRAMEWORK-LIBRARY` technical branch. For an isolated brownfield change, use the explicit EXEMPT branch. Neither branch creates a product roadmap.
5. Use `ask user question tool` for mismatches or material ambiguity. Do not infer whether “ready,” “published,” “delivered,” or equivalent means reviewable, sellable, visible, or accessible.

## Phase 1: Initiative Intake & Context Loading

1. Read initiative artifact from path or find by ID in `initiatives/` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)
2. Extract: problem statement, value proposition, target users, scope — and, when the initiative artifact carries them, its `## Discovery Interview` and `## Validation Summary` answers (Phase 7 reuses them)
3. Check `module` field; if absent, detect via keywords or prompt user

---

## Phase 2: Domain Research

**Trigger:** New domain, unclear competitors, `--research` flag.
**Skip:** Internal tooling, well-understood domain, time-constrained, or an evidence artifact from `web-research` / `source-deep-dive` was passed as input (cite it instead of searching again).

Use WebSearch with domain terms. Summarize in max 3 bullets (market context, competitors, best practices).

---

## Phase 3: Problem Hypothesis Validation

Validate hypothesis with user via ask user question tool. 42% of startups fail from no market need — validate before building.

**Skip:** `--skip-hypothesis`, validated hypothesis exists, bug fix/tech debt.

**From a governing spec:** when the task derives from a canonical spec that was clarified in this run (`spec [mode=clarify]`) or supplied as the governing spec, that spec is the validated hypothesis: cite its path and the sections that state the problem, users and success signal (§1 and §3 under the strict default) in the task, and ask no hypothesis question. A spec section marked unresolved or open still goes through the validation process below.

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

1. Draft hypothesis from initiative content
2. Use ask user question tool to validate:
    - "Is this the core problem we're solving?"
    - "Who exactly experiences this? How often?"
    - "What evidence do we have this problem exists?"
3. Validated → proceed to elicitation
4. Invalidated → return the initiative for clarification

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
Scenario: User creates invoice with valid data
  Given user has permission to create invoices
    And user is on the invoice creation page
  When user submits invoice form with all required fields
  Then invoice is created with status "Draft"
    And invoice appears in user's invoice list

Scenario: Invoice creation fails with missing required field
  Given user is on the invoice creation page
  When user submits form without title
  Then validation error "Title is required" is displayed
    And invoice is not created

Scenario: Approver reviews a submitted invoice
  Given approver has invoices awaiting approval
    And an invoice has been submitted for approval
  When approver opens the invoice review page
  Then the invoice is visible with "Pending Review" status
```

### Project Test Case Format

- **Format:** `TC-{FEATURE}-{NNN}` (e.g., TC-GM-001)
- **Evidence:** `[Source: namespace/service/id]` abstract-anchor format (never `file:line`)

---

### Phase 5.1: AI-SDD Mandate Gate (M1-M5 and M7) — BLOCKING

**MUST ATTENTION READ `.claude/skills/shared/m1-m7-gates.md`** (criteria M1-M5 + M7, carrier exemption, M1-vs-M7 rule, authoring rules) and `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)". The generated task MUST satisfy M1-M5 and M7 or be reworked before Phase 8 writes it. Task-specific application:

- **Business Intent vs Implementation Notes (M1/M2):** keep a tech-agnostic **Business Intent** narrative (Description, Business Value, Acceptance Criteria); put optional implementation hints in a clearly separated **Implementation Notes** block and source references only in evidence carriers (`[Source: namespace/service/id]`, `**Evidence**`). Prose follows `spec-principles.md` §3 in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path).
- **Logical ID first (M3):** assign each requirement a logical ID (`FR-`/`BR-`) as the PRIMARY citation spine; keep the `[Source: namespace/service/id]` abstract anchor as a SECONDARY carrier in a separate evidence column/section.
- **Rebuild-from-scratch (M5):** before emitting, confirm a competent team with zero codebase knowledge could re-implement identical business behavior on ANY stack from the task alone; if a reader would guess a rule, limit, role or failure mode, add it as a clarification — never guess.
- **Demo test (M7):** apply it to each acceptance criterion's BODY; drop TECHNICAL-ONLY criteria from the task, and never derive the AC count from an architecture inventory.

---

### Phase 5.5: Testability Assessment

Use `ask user question tool` with 2-3 questions:

1. "Which testing approach fits this task?"
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
| AC-1 | TC: Create invoice with valid data → verify persisted      | P0       |
| AC-2 | TC: Create invoice without title → verify validation error | P1       |

Seed for `/spec [mode=tests]` if user chooses TDD-first. Document in task under `## Testability Assessment`.

---

## Phase 6: Prioritization & Estimation

Apply RICE score or MoSCoW for priority. Estimate using **Effort points (Modified Fibonacci 1-21)**.

### Quick RICE Score

```
Score = (Reach x Impact x Confidence) / Effort

Reach: Users affected per quarter (100, 500, 1000+)
Impact: 0.25 (minimal) | 0.5 (low) | 1 (medium) | 2 (high) | 3 (massive)
Confidence: 0.5 (low) | 0.8 (medium) | 1.0 (high)
Effort: Effort points (1, 2, 3, 5, 8, 13, 21)
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

> **Decision log:** inside a workflow, read the run's `## Decisions` first (`/start-workflow` → Step Execution Protocol, Decision log): ask only what it leaves open or new evidence reopened, cite reused answers instead of asking again, and append every new answer.

Generate 3-5 questions covering assumptions, scope, dependencies, edge cases. Use ask user question tool. Document in task. **NOT optional.**

**Reuse the initiative interview:** when the input initiative artifact carries a `## Discovery Interview` (Phase 1), do NOT re-ask a category its answers already settle (scope boundaries, business impact, constraints, persona) — record those answers in the Validation Summary as `(from initiative Discovery Interview)` and spend the 3-5 questions on the categories it never asks (Assumptions, Dependencies, Edge Cases, Entities, Prod Readiness, Authorization, Seed Data, Data Migration). With no initiative artifact and no governing spec, or an initiative without that section (standalone `/work-item --mode=refine` on a raw request), run the full interview below.

**From a governing spec** (Phase 3): the spec and the run's decision log are the settled sources. Record what they answer as `(from {spec path})` or `(from decision log)` and ask only the categories both leave open for this task, often Dependencies, Entities, Prod Readiness, Seed Data and Data Migration. With fewer open decisions, ask those and say so; with none, record `Validation interview: nothing open — {cited sources}`.

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
2. Use `ask user question tool` to interview
3. Document in task under `## Validation Summary`
4. Update task based on answers

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

> Capture in task template sections: Production Readiness Concerns, Authorization & Access Control, Seed Data, Data Migration.

---

## Phase 7.5: Re-evaluate Estimation (MANDATORY — runs after Validation Interview)

> **Why this phase exists:** Phase 6 estimation runs against a draft scope. Phase 7 (Validation Interview) and Cross-Cutting capture often resolve unknowns, add constraints, or trim/expand scope. The numbers in `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai` MUST be re-derived against the locked scope BEFORE Phase 8 writes them into the task frontmatter. Estimating once at draft and forgetting is the #1 source of estimation drift in tasks.

### Inputs (locked by end of Phase 7)

- Confirmed assumptions, scope inclusions/exclusions
- Authorization, seed data, migration, prod-readiness decisions
- Newly discovered dependencies or edge cases
- Any rescoping the user requested during validation

### Re-derive (per `SYNC:estimation-framework`)

1. Walk the **locked** scope acceptance criteria + cross-cutting concerns; assign hours per slice.
2. `bottom_up_hours = Σ slice_hours` (use the EP table mapping in Phase 6, not eyeballing).
3. `likely_days = ceil(bottom_up_hours / 6)` × productivity factor for the team/AI mode.
4. Recompute `risk_margin_pct` based on remaining unknowns AFTER Phase 7 (margin should usually shrink because validation removed unknowns; rises only if new risks surfaced).
5. Recompute `min-max range` from the new likely_days ± margin.
6. Re-pick the closest Fibonacci `effort_points` and `complexity` bucket from the re-derived likely_days.

### Compare against Phase 6 draft estimate

Compute `delta_pct = (new_likely_days - draft_likely_days) / draft_likely_days × 100`.

| Delta             | Action                                                                                                                                                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `\|delta\| ≤ 20%` | Keep draft estimate. Note `reestimate_delta_pct: <signed>` + `reestimate_reason: "within tolerance, no change"` in task frontmatter for transparency.                                                                                                                                                                         |
| `\|delta\| > 20%` | UPDATE `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai`. Add `reestimate_delta_pct: <signed>` + 1-line `reestimate_reason` explaining what changed (e.g., "auth scope confirmed wider", "seed data dropped per validation").                                                                              |
| `\|delta\| > 50%` | UPDATE values AND flag `SHOULD-RESCOPE`. Surface to user via `ask user question tool` BEFORE Phase 8 writes the task: "Re-estimate is +/-X% vs original. Options: (a) accept new estimate as-is, (b) split into 2 tasks, (c) trim scope back to original estimate, (d) defer." Record the user's decision in `## Validation Summary`. |

### Output

- Updated estimation values (carry into Phase 8 frontmatter)
- New frontmatter fields: `reestimate_delta_pct`, `reestimate_reason` (always populate even when within tolerance — creates a paper trail for retrospective comparison against actual implementation time)
- If rescoped: updated acceptance criteria/scope sections reflecting the user's choice

> **Run this re-estimation phase against the locked scope — never skip it.** A task that ships with stale Phase 6 estimates is the source of unreliable velocity data. The whole point is to make the post-validation numbers — not the pre-validation guesses — the ones the team commits to.

---

## Phase 7.6: Releasable Outcome Gate (BLOCKING)

Read `.claude/skills/shared/releasable-task-contract.md` and evaluate the locked scope before writing the task. This gate prevents a technical work package from being presented as a releasable task.

The task is **BLOCKED** unless all of the following are true:

1. A named primary actor can achieve one observable business outcome independently within the task boundary.
2. The journey is complete: entry/context → action/input → validation or decision → success/result → resulting visible or persisted truth → exit or next action.
3. Applicable authorization, persistence, refresh/duplicate-submit, loading, empty, error, and recovery behavior is explicit; use `N/A` only with a reason.
4. Technical-only, foundation-only, migration-only, and setup-only work is attached as enabling work to this outcome or explicitly excluded; it is never emitted as the task's sole outcome.
5. For UI work, the task defines every required page/view, navigation path, common/domain/page component, applicable state, and full-flow demo journey. Do not reduce a multi-step outcome to one screen.
6. The owner has approved any trade-off that changes the outcome, release boundary, or required surface.

If the scope fails this gate, ask the owner to reframe the outcome or attach the enabling work to a releasable task. Do not continue to Phase 8 with a “technical task” or an assumed UI flow.

Record the gate in the task inputs before generation:

```markdown
## Releasable Outcome Gate
- Status: PASS | BLOCKED
- Actor and observable outcome: { ... }
- Full-flow journey: {entry → action → result → exit}
- Persistence/access/error/recovery coverage: { ... | N/A with reason}
- Technical-only work: {attached enabling subtasks | none}
- UI surface: {page/view inventory + navigation + components + states | N/A — backend-only with reason}
- Evidence: {AC/test/demo/mockup references}
```

---

## Phase 8: Task Artifact Generation

**Path:** `tasks/{YYMMDD}-task-{slug}.md` under the team-artifacts root — default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path | **ID Pattern:** `TASK-{YYMMDD}-{NNN}`

> **Artifact Path (canonical convention)** — Command `/work-item --mode=refine` → base path `tasks/` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), role token `ba`, type `task`. General filename pattern: `{YYMMDD}-{role}-{type}-{slug}.md` → e.g. `260119-ba-task-invoice-approval.md`. Slug = lowercased basename, non-alphanumeric → `-`, trimmed, max 50 chars.

> **Work record (owner: `/task-track`)** — The task file is a work record. Read [Records another skill authors](../../task-track/references/integration-guide.md#records-another-skill-authors) before writing it; that section owns `id`, `title`, `intent`, `status`, `priority`, `assigned_to` and the `tracking` block. Choose an `id` no other record uses, write `status: draft` and no assignee, and keep the MoSCoW label in `priority_label`. On a task that already has a `tracking` block, leave those fields as they are and change them only through `/task-track`. After the save, follow that section's hand-off: offer tracking once, then acceptance criteria go in under their `AC-NN` IDs and the source initiative as an `initiative` tag. Refinement, review and the readiness check never mark the task ready or assign it.

### Task Template

An existing task may carry the earlier key `source_idea`; it is read as the same source link as `source_initiative`, and migration does not rewrite authored keys.

```markdown
---
id: TASK-{YYMMDD}-{NNN}
title: '{Brief descriptive title}'
intent: '{One sentence: the releasable outcome}'
status: draft
priority: { integer 1-999, lower comes first — written by /prioritize during cross-task ranking; leave the key out until ranked }
priority_label: Must Have | Should Have | Could Have | Won't Have
module: '{ModuleName — detect from project-config.json modules[]}'
effort_points: 1 | 2 | 3 | 5 | 8 | 13 | 21
complexity: Low | Medium | High | Very High
man_days_traditional: '{ Xd (Yd code + Zd test) — from EP table }'
man_days_ai: '{ Xd (Yd code + Zd test) — from EP table with AI }'
rice_score: { calculated }
created: '{YYYY-MM-DD}'
source_initiative: '{initiative artifact path or ID}'
scope_mode: ORDINARY | DECOMPOSITION-EMBEDDED | EXPLICIT-ROADMAP | EXEMPT | FRAMEWORK-LIBRARY
large_idea_decomposition: {complete block when any isLargeIdea signal is true; omit when all signals are false}
---

# {Task Title}

> **Business Intent (tech-agnostic — M1/M2):** Description, Business Value, Business Rules, and Acceptance Criteria below describe observable business behavior only — no framework/product/language/design-pattern names, no source identifiers. Keep implementation hints in `## Implementation Notes` and source references in evidence carriers.

## Requirement IDs (M3 — logical-IDs-first)

| Logical ID | Statement (tech-agnostic)   | Evidence (secondary, re-anchorable)        |
| ---------- | --------------------------- | ------------------------------------------- |
| FR-{MOD}-XXX | {functional requirement}  | `[Source: path:line]` or `TBD (pre-impl)`   |
| BR-{MOD}-XXX | {business rule}           | `[Source: path:line]` or `TBD (pre-impl)`   |

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

## Releasable Outcome

- **Gate status:** PASS | BLOCKED
- **Primary actor:** {role}
- **Observable outcome:** {what the actor can achieve and recognize as complete}
- **Complete journey:** {entry/context → action/input → validation/decision → success/result → visible or persisted truth → exit/next action}
- **Applicable states and recovery:** {access, loading, empty, error, duplicate-submit, refresh, persistence, recovery behavior | N/A with reason}
- **Technical/enabling work:** {attached subtasks/dependencies | none}; standalone technical/foundation/migration/setup work is not a task
- **Evidence:** {ACs, test outline, demo journey, or linked artifact}

## Full-Flow Coverage

- **Entry/context view:** {role and purpose}
- **Action/input view(s):** {role and purpose}
- **Result/confirmation view:** {role and purpose}
- **Exit/next view:** {role and purpose}
- **Navigation map:** {entry → transitions → outcome → exit}
- **State coverage:** {default/loading/empty/error/success/permission states as applicable}

## UI Surface (UI tasks only)

| Surface type | Inventory | Purpose in the releasable flow |
| ------------ | --------- | ------------------------------ |
| Page/view    | {all required views; add rows as needed} | {why the flow needs it} |
| Common component | {reusable component} | {where it appears} |
| Domain component | {domain-specific component} | {business behavior it conveys} |
| Page component | {page-level composition} | {view responsibility} |

> Backend-only task: `N/A — backend-only change; the observable business outcome is {outcome} and no user-facing surface is required.`

## Scope and Large-Idea Decomposition

- Applicability: `ORDINARY | DECOMPOSITION-EMBEDDED | EXPLICIT-ROADMAP | EXEMPT | FRAMEWORK-LIBRARY`
- In scope: {behaviors owned by this task}
- Non-goals: {behaviors deliberately deferred}
- Evidence gate: {observable completion proof}

When `isLargeIdea=true`, include the complete shared `large_idea_decomposition` block here. It MUST contain `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`; repeat the owning slice ID in this task and link enabling work to that outcome. Do not add `docs/product-roadmap.md` or a fabricated milestone. For `EXPLICIT-ROADMAP`, record the user-supplied roadmap/milestone references in the explicit branch only. For `ORDINARY`, omit the block.

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

| Dependency            | Type         | Status           | Description                    |
| --------------------- | ------------ | ---------------- | ------------------------------ |
| {task/service/feature} | must-before  | done             | {Why this must be done first}  |
| {task/service/feature} | can-parallel | refined, same PR | {Why this can run in parallel} |
| {task/service/feature} | blocked-by   | not started      | {What blocks this task}         |
| -                     | independent  | n/a              | {No dependencies — first item} |

> **Status** = the dependency's current state, e.g. `done` · `in progress` · `not started` · `refined, same PR`; `n/a` only for an `independent` row. `/work-item --mode=dor` criterion 8 requires Dependency, Type and Status.

## Production Readiness Concerns

| Concern                | Required        | Notes                                   |
| ---------------------- | --------------- | --------------------------------------- |
| Code linting/analyzers | Yes/No/Existing | {tool preference or "scaffold default"} |
| Error handling setup   | Yes/No/Existing | {pattern: toast/inline/error-page}      |
| Loading indicators     | Yes/No/Existing | {pattern: spinner/skeleton/progress}    |
| Docker integration     | Yes/No/Existing | {scope: infra-only/full/none}           |
| CI/CD quality gates    | Yes/No/Existing | {mutation-score gate (line-coverage diagnostic only), lint enforcement} |
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

## Implementation Notes

> Optional, clearly separated from Business Intent. Implementation hints / source identifiers may appear here and in evidence carriers only — never in the tech-agnostic sections above. If none: `N/A — no implementation hints; rebuild from Business Intent + Requirement IDs.`

## UI Layout

**Design Spec:** {link to the `/design-spec` artifact — or inline UI specs ref — that owns this task's screen/component design. REQUIRED for any task with UI work. Produce it AFTER inventorying existing UI + connected flows (per `SYNC:existing-ui-research`) so it faithfully matches the current UI system. If backend-only: `N/A — Backend-only change. No UI affected.`}

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
| Refining vague initiatives           | Return to `/initiative` for clarification |
| Skipping hypothesis validation | Always run Phase 3 for new features |
| Solution-first thinking        | Start with problem, not solution    |
| Generic acceptance criteria    | Use GIVEN/WHEN/THEN with specifics  |
| Ignoring domain context        | Load project docs if applicable     |
| Too large task (XL+)            | Break into smaller items            |
| Missing "Out of Scope"         | Explicitly list exclusions          |
| Assuming instead of asking     | Run validation interview            |

---

## Key Rules

- **Every task MUST ATTENTION include Dependencies table** — columns Dependency, Type, Status; types: `must-before`, `can-parallel`, `blocked-by`, `independent`. Status records the dependency's current state (`done` / `in progress` / `not started` / `refined, same PR`). Enables `/prioritize` and `/plan` to respect ordering.
- **No vague dependency descriptions** — Each dependency must specify concrete task, service, or feature and WHY relationship exists.
- **Every generated task MUST ATTENTION be a releasable actor-facing outcome** with a complete entry-to-result journey and evidence. Technical-only, foundation-only, migration-only, and setup-only work is enabling work under a releasable task, never a standalone task.
- **UI tasks MUST ATTENTION include the full-flow surface** — all required pages/views, navigation, common/domain/page components, applicable states, and the demo journey. One screen or a disconnected screen set is not enough.
- **Read and apply** `.claude/skills/shared/releasable-task-contract.md`; if its gate is `BLOCKED`, do not write the task.

## BA Team Refinement Context (canonical)

> Applies to Writes/Edits under `tasks/`, `stories/`, and `initiatives/` in the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path). Mirrored for Codex via `SYNC:ba-team-decision-model` / `SYNC:refinement-dor-checklist` in AGENTS.md (do not hand-edit the mirror).

**Decision Model:** 2/3 majority vote (UX BA + Designer BA + Dev BA PIC). Dev BA PIC has technical veto.
**Disagree-and-Commit:** Once decided, everyone commits. No re-litigating.
**Planning Override:** BA team decision changes only if >75% remaining team votes to override.

**Role Scopes:**

- **UX BA:** UI/UX flows, wireframes, interaction AC, user research
- **Designer BA:** Design feasibility, product thinking, visual design, equal vote
- **Dev BA PIC:** Technical feasibility review, AI pre-review, DoR gate, planning presentation

**DoR Gate (ALL must pass before planning):**

- [ ] User story template (As a... I want... So that...)
- [ ] AC testable (GIVEN/WHEN/THEN, no vague language)
- [ ] Wireframes attached (UX BA) + UI design ready (Designer BA)
- [ ] (UI tasks) Design spec linked — `/design-spec` artifact or inline UI specs present in `## UI Layout`; backend-only tasks exempt (`N/A — Backend-only`)
- [ ] AI pre-review passed (`/work-item --mode=review --type=task` or `/work-item --mode=challenge`)
- [ ] Effort points estimated by AI
- [ ] Dependencies table complete (Dependency · Type · Status)
- [ ] Releasable Outcome Gate passed — one actor-facing outcome, complete journey, no standalone technical-only scope
- [ ] (UI tasks) Full-flow surface complete — page/view inventory, navigation, components, states, and demo journey; backend-only records an explicit reason

**Refinement Cadence:** Refine before selecting the next delivery tasks; use the team's agreed review cadence and available capacity.
**Skills:** Use `/work-item --mode=challenge` for collaborative review, `/work-item --mode=dor` before planning.

## Readiness check (INVEST)

| Criterion           | Check                        |
| ------------------- | ---------------------------- |
| **I**ndependent     | No blocking dependencies     |
| **N**egotiable      | Details can be refined       |
| **V**aluable        | Clear user/business value    |
| **E**stimable       | Team can estimate (XS-XL)    |
| **S**mall           | One independently verifiable slice                |
| **T**estable        | 3+ GIVEN/WHEN/THEN scenarios |
| Problem Validated   | Hypothesis confirmed         |
| Domain Context      | BR/entity context loaded     |
| Stakeholder Aligned | Validation interview done    |
| Prod Readiness      | Concerns documented          |

---

## Project Integration

For domain tasks: detect module from the directory names under the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path), extract business rules from that root's `{module}/` subtree, load entity context from feature doc. Target 8-12K tokens for feature context.

---

## Related

- **Input:** `/initiative` output
- **Next Step:** `/work-item --mode=story`, `/spec [mode=tests]` (Recommended for TDD), `/design-spec`
- **Prioritization:** `/prioritize`

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`/start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION** after completing this skill, use `ask user question tool` to present these options. NEVER skip because task seems "simple" or "obvious":

- **"/why-review (Recommended)"** — Validate design rationale, alternatives, risk assessment before `/work-item --mode=story` or implementation
- **"/domain-analysis"** — If task creates/modifies domain entities, model bounded contexts before writing stories
- **"/work-item --mode=story"** — Break task into implementable user stories
- **"/work-item --mode=mockup"** — Generate HTML mockup from task
- **"/spec [mode=tests]"** — If using TDD approach
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.

> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/` — prevents context loss.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence, confidence >80% to act.

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

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Transform raw ideas into a task that passes the readiness check using BA best practices, hypothesis validation, and domain research — problem-validated, tech-agnostic, with testable acceptance criteria, estimates, and a Dependencies table — so a team can build it without re-asking what or why.
- **IMPORTANT MUST ATTENTION — run + track EVERY step (AI forgets sub-phases):** Phase 0 locate active plan → 0.5 applicability / large-idea decomposition GATE → 1 idea intake + module detect → 2 domain research → 3 problem-hypothesis GATE → 4 BABOK elicitation → 5 BDD acceptance criteria → 5.1 AI-SDD M1-M5/M7 BLOCKING gate → 5.5 testability → 6 prioritization + DRAFT estimate → 7 validation interview GATE → 7.5 RE-DERIVE estimate vs locked scope → 7.6 RELEASABLE OUTCOME GATE → 8 task generation — NEVER skip, reorder, or merge a phase without explicit user approval.
- **IMPORTANT MUST ATTENTION Boundary anchor:** when any large-idea signal is true, carry the complete five-field decomposition and stable slice ID into the task; when all signals are false, omit roadmap fields; only an explicit roadmap request can use the product-roadmap artifact (default `docs/product-roadmap.md`; path from `docsRoots.productRoadmap.path` in `docs/project-config.json`).

**Protocols in force — MUST ATTENTION (concise digest of the SYNC/shared blocks this skill carries):**

- **UI System Context:** ALWAYS read frontend-patterns, scss-styling-guide, design-system before any UI change.
- **Estimation Framework:** bottom-up hours drive man-days; EP derived; UI cost usually dominates.
- **UI Wireframe:** ASCII layout, classify every component into ONE tier, reuse before creating.
- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers, confidence-% closer.

- **IMPORTANT MUST ATTENTION** Phase 3 problem-hypothesis validation + Phase 7 validation interview (3-5 questions) are NON-OPTIONAL for new features — user decides assumptions/scope/dependencies, AI NEVER auto-decides — why: 42% of products fail from no market need; a silent AI assumption ships an unvalidated build
- **IMPORTANT MUST ATTENTION** Phase 7.5 RE-DERIVES `effort_points`/`complexity`/`man_days_traditional`/`man_days_ai` against the LOCKED post-interview scope (per `SYNC:estimation-framework`) — NEVER ship stale Phase 6 draft numbers — why: pre-validation guesses are the #1 source of unreliable velocity data
- **IMPORTANT MUST ATTENTION** every generated task MUST pass the Releasable Outcome Gate: one actor-facing outcome, complete entry-to-result journey, observable evidence, and no standalone technical/foundation/migration/setup scope — read `.claude/skills/shared/releasable-task-contract.md`
- **IMPORTANT MUST ATTENTION** UI tasks MUST include all pages/views, navigation, reusable/domain/page components, applicable states, and a full-flow demo journey; one static screen is NOT a releasable UI outcome
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small tasks via `TaskCreate` BEFORE starting; mark one `in_progress`, complete it before the next; on context loss `TaskList` first — why: compaction wipes prior-work memory, resume don't duplicate
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `ask user question tool` — NEVER auto-decide
- **MANDATORY IMPORTANT MUST ATTENTION** apply the shared four-signal `isLargeIdea` rule before task elicitation; when true, require and propagate the complete five-field `large_idea_decomposition` block and stable slice IDs, then run conditional scenario analysis where needed. Only an explicit roadmap request uses the product-roadmap artifact (default `docs/product-roadmap.md`; path from `docsRoots.productRoadmap.path` in `docs/project-config.json`); ordinary ideas must not create it, and ambiguous product intent is BLOCKED rather than inferred.
- **IMPORTANT MUST ATTENTION** acceptance criteria are BDD GIVEN/WHEN/THEN (min 3: happy/edge/error) and MUST satisfy the Phase 5.1 AI-SDD M1-M5 and M7 gate — tech-agnostic Business Intent, logical `FR-`/`BR-` IDs first, observable single-interpretation ACs, rebuild-from-scratch validity, every AC demoable as a business outcome — why: a reader who must guess a rule/limit/role re-implements the wrong behavior
- **IMPORTANT MUST ATTENTION** apply the M7 demo test to every AC's BODY — _"what would a stakeholder SEE change?"_; no answer → TECHNICAL-ONLY, drop it. FAIL a `WHEN` that is an invocation (handler runs, consumer receives, job fires, data syncs) or a `THEN` asserting schema/type/nullability/call-count; NEVER derive the AC count from an architecture inventory — why: M1 governs vocabulary, M7 governs subject matter — a technical AC in tech-free prose passes M1 and still rots the task
- **IMPORTANT MUST ATTENTION** the task file is a work record owned by `/task-track`: unused `id`, `status: draft`, no assignee, integer `priority` only after ranking, label in `priority_label`; on a tracked task change `title`/`intent`/`status`/`priority` only through `/task-track` — why: a second status or priority vocabulary makes the tracker refuse the record
- **IMPORTANT MUST ATTENTION** every task MUST include `effort_points`, `complexity`, `man_days_traditional`, `man_days_ai` frontmatter AND a complete Dependencies table with Dependency, Type (`must-before`/`can-parallel`/`blocked-by`/`independent`) and Status columns — fill even when `independent`
- **IMPORTANT MUST ATTENTION** keep task Business Intent prose tech-agnostic — NO framework/product/language/design-pattern names; implementation hints go ONLY in `## Implementation Notes`, source refs ONLY in `[Source: namespace/service/id]` evidence carriers — why: a tech-leaked spec is not rebuildable on another stack (M1/M2)
- **IMPORTANT MUST ATTENTION** greenfield mode: NEVER ask about tech stack during refinement — capture team skills/scale as signals only; tech decided after business analysis
- **MANDATORY IMPORTANT MUST ATTENTION** before refining domain tasks, read existing TCs in the business spec root and `domain-entities-reference.md` in the project-reference docs root (defaults `docs/specs/` and `docs/project-reference/`; `specRoots.business.path` / `docsRoots.projectReference.path` in `docs/project-config.json` override them); grep 3+ existing tasks/specs for local conventions before authoring — why: project vocabulary and patterns override generic BABOK/INVEST defaults
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` (or `[Source: ...]`) evidence for every claim, confidence >80% to act, <60% DO NOT recommend — NEVER present a guess as fact
- **IMPORTANT MUST ATTENTION** complex/lengthy work → persist findings to `tmp/reports/` incrementally — why: prevents silent loss of all findings on context exhaustion
- **MANDATORY IMPORTANT MUST ATTENTION** add final review todo to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** add todo: run `/why-review` — validate task design rationale before `/work-item --mode=story` or `/spec [mode=tests]`
- **MANDATORY IMPORTANT MUST ATTENTION** add todo: run `/work-item --mode=challenge` — Dev BA PIC review before `/work-item --mode=dor` or `/work-item --mode=story`

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| "Simple task, skip hypothesis validation"  | Wrong assumption wastes more time than validation check. Apply Phase 3 always. |
| "Validation interview is optional here"   | NEVER optional — Phase 7 user decides assumptions, AI doesn't                  |
| "Phase 6 estimate is fine, skip re-derive"| Phase 7.5 is MANDATORY — interview changed scope; stale numbers corrupt velocity |
| "Skip Dependencies table, no blockers"    | Unknown blockers exist. Always fill table (Dependency · Type · Status) — even if `independent` |
| "Skip effort points, just write ACs"       | `effort_points`, `man_days_traditional`, `man_days_ai` mandatory in frontmatter |
| "Add a stack hint, it clarifies the AC"   | Business Intent stays tech-agnostic (M1/M2) — hints go to `## Implementation Notes` only |
| "Domain context not needed for small task" | Small tasks touch entities. Read domain-entities-reference first                |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION** Phase 3 hypothesis + Phase 7 interview are NON-OPTIONAL — user decides, AI never auto-decides.
**IMPORTANT MUST ATTENTION** Phase 7.5 re-derives estimates against locked scope — never ship stale Phase 6 numbers.
**IMPORTANT MUST ATTENTION** keep Business Intent tech-agnostic; cite `file:line`/`[Source:]` evidence, confidence >80% to act.

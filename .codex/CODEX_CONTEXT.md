<!-- PROMPT-PROTOCOLS:START -->

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

## Prompt Protocol Mirror (Auto-Synced, Primacy Anchor)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
  <!-- PROMPT-PROTOCOLS:END -->

# Codex Context (Hookless Parity)

Purpose: provide Codex with the same core principles and lessons normally injected by Claude hooks.

Source hooks:

- `.claude/hooks/lib/prompt-injections.cjs`
- `.claude/hooks/code-patterns-injector.cjs`
- `.claude/hooks/mindset-injector.cjs`
- `.claude/hooks/lessons-injector.cjs`
- `docs/project-reference/lessons.md`

Last synced: 2026-04-22

## Critical Thinking Mindset

- Apply critical thinking and sequential thinking.
- Every claim needs traced proof.
- Confidence threshold: >80% to act; <80% verify first.
- Anti-hallucination principle: never present a guess as fact.
- Cite sources for claims, admit uncertainty, self-check output, cross-reference independently, and remain skeptical of your own confidence.

## Root Cause Principle

- Never patch symptoms.
- Trace full call chain to find who is responsible.
- Fix at the correct layer (Entity > Service > Handler).
- If a fix feels like a workaround, it is likely not the root cause.

## Common AI Mistake Prevention

- Re-read files after context compaction; edit requires prior read in current context.
- Grep for old terms after bulk replacements; verify docs/config/catalog references.
- Check downstream references before deleting files or components.
- After memory loss, inspect existing state before creating new artifacts.
- Verify AI-generated API/class/method references against real code.
- Trace full dependency chains after edits.
- When renaming, grep all consumer file types.
- Trace all code paths, including early exits and error branches.
- Update docs that embed canonical data when sources change.
- Verify sub-agent results after context recovery.
- Cross-check complete target lists against parallel sub-agent splits.
- Use custom agent types with explicit instructions; do not rely on implicit tool behavior.
- Persist sub-agent findings incrementally, not only at the end.
- Ask "whose responsibility?" before fixing; repair the responsible layer.
- Grep all removed symbols after refactors/extractions.
- Assume existing values may be intentional; inspect comments/blame/context before changing.
- Verify all affected outputs, not only the first successful one.
- Do not copy nearby patterns blindly; verify matching preconditions.
- Use holistic-first debugging: verify config/env/DB/endpoints/DI/data prerequisites before deep code hypotheses.
- Keep changes surgical: bugfix changes should map directly to the bug unless explicitly announcing enhancement scope.
- Surface ambiguity before coding; do not silently choose one interpretation.
- Activate a suitable workflow/skill before substantial execution.
- Use adversarial review mindset: test assumptions, alternatives, and failure modes.
- Front-load report writing for long reviews; append findings per section/file.
- After compaction, re-verify claimed completed steps against real current state.
- For OOM triage, validate row-count/unbounded-query causes before row-size micro-optimizations.

## Lessons Learned (Project)

Top rules:

- Verify all preconditions (config, env vars, DB names, DI registrations) before code-layer hypotheses.
- Fix responsible layer; never patch symptom sites.
- For parallel async with repo/UoW: use `ExecuteInjectScopedAsync`, never `ExecuteUowTask`.
- Name by purpose, not content-membership lists.
- Persist sub-agent findings incrementally, not only as final batch.
- On Windows shell, verify Python alias (`where python` / `where py`) before assuming command names.

Debugging and root-cause reasoning:

- Holistic-first debugging: list all preconditions first (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites), verify each with evidence, then form hypotheses.
- Ask "whose responsibility?" before fixing: caller vs callee responsibility must be explicit.
- Trace data lifecycle (creation -> transformation -> consumption), not only error site.
- Keep code caller-agnostic; do not encode caller-specific assumptions into business logic.

Architecture invariants:

- Parallel async + repo/UoW MUST use `ExecuteInjectScopedAsync` (new UoW + new DI scope per iteration).
- Bus message naming must reflect schema ownership with service prefix; feature services should use request messages for core services.

Naming and abstraction:

- Use purpose-driven names. If adding/removing a member forces renaming, abstraction is content-driven and likely wrong.

Environment and tooling:

- Windows bash: do not assume `python` or `python3` resolves; verify aliases first and prefer `py` on Windows when appropriate.

## Workflow and Learning Protocol

- Break substantial work into small tasks before execution.
- Maintain evidence-first decisions and report unresolved questions explicitly.
- At end of tasks, extract reusable failure-mode lessons (root-cause level, not symptom level).
- Only retain lessons that are broadly reusable and likely to recur without reminders.

<!-- WORKFLOWS:START -->

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

## Workflow Protocol (Hookless)

Use this protocol for workflow execution in Codex (no hook dependency):

1. Detect: match request against workflow catalog.
2. Analyze: choose best-fit workflow and evaluate custom combination if needed.
3. Confirm: if workflow requires confirmation or ambiguity exists, ask user before activation.
4. Activate: execute selected workflow sequence.
5. Tasking: create tasks for each workflow step.
6. Execute: run steps in order, validate outputs, and report completion.

Workflow source: `.claude/workflows.json` (37 workflows).

## Workflow Catalog

### batch-operation — Batch Operation

- Description: Multi-file batch operations requiring progress tracking
- Confirm First: no
- When To Use: User wants to modify multiple files at once: bulk rename, find-and-replace across codebase, update all instances
- When Not To Use: Test-only operations, documentation
- Sequence: `plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> code -> tdd-spec -> why-review -> tdd-spec-review -> tdd-spec [direction=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> sre-review -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
BATCH OPERATION PROTOCOL:
1. Plan: List ALL files to modify, define change pattern
2. Validate plan  --  get user approval before bulk changes
3. Why-review: Challenge whether batch change is necessary (vs per-file solutions)
4. Implement: Apply changes file-by-file with progress tracking
5. Update test specs for bulk changes with $tdd-spec update mode. Review with $tdd-spec-review. Sync dashboard with $tdd-spec [direction=sync].
6. Code-simplifier: KISS/DRY/YAGNI pass on all changed files
7. Review changes for correctness and completeness
8. SRE-review: Assess blast radius of bulk changes
9. Run tests after batch to catch regressions
10. Summary report with file count and change summary

SAFETY:
- ALWAYS list all affected files in plan before modifying
- Use find-and-replace patterns, not manual edits
- Checkpoint progress every 10 files
- If any file fails, STOP and report before continuing
```

### big-feature — Big Feature (Research + Implement)

- Description: Research-driven feature development for large, complex, or ambiguous features in an existing project — includes idea refinement, market research, business evaluation, domain analysis, tech stack research, and full implementation
- Confirm First: yes
- When To Use: User wants to implement a large, complex, or ambiguous feature that needs research, market analysis, business evaluation, domain modeling, or tech stack analysis before implementation. Big new module, major enhancement, cross-cutting capability, or feature where scope is unclear
- When Not To Use: Small/well-defined features (use feature), new project from scratch (use greenfield-init), bug fixes, documentation, test-only tasks
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> why-review -> plan -> why-review -> plan-review -> why-review -> refine -> why-review -> refine-review -> story -> why-review -> story-review -> pbi-challenge -> dor-gate -> pbi-mockup -> tdd-spec -> why-review -> tdd-spec-review -> plan -> why-review -> plan-review -> why-review -> scaffold -> plan-validate -> why-review -> cook -> review-domain-entities -> integration-test -> integration-test-review -> integration-test-verify -> tdd-spec [direction=sync] -> workflow-review-changes -> sre-review -> security -> changelog -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
BIG FEATURE PROTOCOL (Research-Driven):
For large/ambiguous features in an existing codebase that need research before implementation.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY research stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. Present 2-4 options for every major decision with confidence %
4. New Tech/Lib Gate: evaluate top 3 alternatives before adding any new dependency

STEP SELECTION GATE:
After user confirms workflow activation, present the full step list and let user deselect irrelevant ones:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [x] Domain Analysis & ERD (domain-analysis)
- [x] Tech Stack Research (tech-stack-research)
- [x] User Stories (story)
- [x] Test Specifications (tdd-spec)
- [x] Test Spec Review (tdd-spec-review)
- [x] Implementation Plan (plan)
- [x] Plan Review (plan-review)
- [x] Plan Validation (plan-validate)
- [x] Design Rationale Review (why-review)
- [x] Implementation (cook)
- [x] Domain Entity Review (review-domain-entities) — CONDITIONAL: skip if no domain entity files changed
- [x] Integration Tests (integration-test)
- [x] Review Changes (workflow-review-changes) — consolidated review + fix loop
- [x] SRE Review (sre-review)
- [x] Changelog (changelog)
- [x] Tests (test)
- [x] Documentation (docs-update)
- [x] Summary (watzup)

User can deselect steps (e.g., skip market research for internal features, skip business-evaluation for tech-only features).
Skipped steps should be marked as completed immediately.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, component boundaries, data flow, tech choices. Based on: research findings + domain analysis.
- PLAN₂ (after tdd-spec-review): Sprint-ready implementation plan. Scope: concrete tasks, file changes, test infrastructure, phased steps. Based on: stories + test specs + dependency tables.
The two plans serve different purposes — PLAN₁ is strategic, PLAN₂ is tactical.

SECOND PLANNING ROUND:
After stories + reviews are complete, a second $plan-hard + $plan-review cycle runs.
The first $plan-hard (after architecture-design) is high-level architecture based on research + domain analysis.
The second $plan-hard (after tdd-spec-review) incorporates the concrete stories, test specifications, dependency tables, and refinement details into a sprint-ready implementation plan with phased steps.
This ensures the implementation plan reflects all discovered requirements, test strategy, and story dependencies.

TEST SPECIFICATIONS (after story-review, BEFORE second plan):
After stories are reviewed, write TDD specs ($tdd-spec) based on story acceptance criteria.
Review specs ($tdd-spec-review) for coverage and correctness.
The second $plan-hard then incorporates test strategy alongside implementation tasks.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
For existing projects adding a new module, adapt scaffolding to extend existing base classes rather than creating duplicates.
MANDATORY SPEC-DRIVEN BIG-FEATURE GATES:
- Read docs/project-reference/spec-principles.md before $story and $tdd-spec to lock intent and non-negotiable invariants.
- $tdd-spec + $tdd-spec-review MUST map each invariant to Section 15 TC IDs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine flows, tests MUST assert persisted state transitions and invalid-transition rejection.
- Before $workflow-end, enforce three-way sync: spec docs ↔ TDD docs ↔ test code via $tdd-spec + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update.
```

### bugfix — Bug Fix

- Description: Systematic debugging and fix workflow with investigation-first approach
- Confirm First: no
- When To Use: User reports a bug, error, crash, failure, regression, or something not working; wants to fix/debug/troubleshoot an issue
- When Not To Use: New feature implementation, code improvement/refactoring, investigation-only (no fix), documentation updates
- Sequence: `scout -> investigate -> debug-investigate -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> tdd-spec -> why-review -> tdd-spec-review -> integration-test -> fix -> prove-fix -> integration-test -> integration-test-review -> integration-test-verify -> tdd-spec [direction=sync] -> workflow-review-changes -> changelog -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
BUG FIX PROTOCOL (TDD-FIRST):
1. Scout: Find files related to the reported issue
2. Investigate: Understand current vs expected behavior
   IMPORTANT: When analyzing 'unused' code during investigation:
   - Follow Investigation Protocol (CLAUDE.md)
   - Require grep evidence, confidence >=80%, cross-module/service checks (see docs/project-config.json → workflowPatterns.crossModuleValidation)
   - Use $investigate skill for removal/refactoring decisions
3. Debug: Identify root cause with evidence (file:line)
4. Plan fix with minimal blast radius
5. Validate plan before implementing
6. Validate fix rationale with $why-review
6b. SPEC-BUG GATE — Run BEFORE writing regression TCs:
   Ask: "Is this a Code Bug or a Spec Bug?"
   • CODE BUG (code doesn't match spec — most common): Spec correctly describes expected behavior. Code diverged. Proceed to step 7.
   • SPEC BUG (spec documented wrong behavior; code implemented the spec faithfully): Do NOT write regression TCs yet. First: (a) $spec-discovery [update] to correct engineering spec. (b) $feature-docs [update] on affected sections. Then return to step 7.
   • AMBIGUOUS: Ask user: "Did the spec ever correctly document this behavior?"
   SIGNAL: Spec MATCHES buggy code → Spec Bug. Spec says X but code does Y → Code Bug.
7. Write test specs ($tdd-spec REGRESSION mode): Create TC specs asserting the CORRECT (fixed) expected behavior — not the buggy behavior. These become the regression guard.
8. Review test specs with $tdd-spec-review
9. WRITE INTEGRATION TEST — RED phase: Implement integration test(s) based on the bug reproduction spec. Run the test(s) — they MUST FAIL. A passing test means it does NOT actually catch the bug. Never proceed to fix until the test(s) fail.
10. Fix the identified issue
11. PROVE FIX: Build code proof traces per change, confidence scores, stack-trace-style evidence. MANDATORY — never skip.
12. RE-RUN INTEGRATION TESTS — GREEN phase: Run integration tests again — expect all to PASS. This confirms the fix resolves the bug AND regression guard is in place.
13. Review integration tests with $integration-test-review — verify tests have real assertion value, not just smoke/existence checks.
14. Code review for quality and regression risk
15. Update changelog
16. Run full test suite to verify fix and no regressions
17. Summary report of fix and verification results

PERFORMANCE EXCEPTION: If this bug fix is performance-related (latency, throughput, memory, query speed), skip steps 7-9 (tdd-spec REGRESSION mode, tdd-spec-review, integration-test RED phase) and steps 12-13 (integration-test GREEN phase, integration-test-review, integration-test-verify). Integration tests cannot measure performance. Run $test only to confirm no functional regressions. Use workflow-performance instead when the primary goal is performance optimization.
MANDATORY INVARIANT-PRESERVING BUGFIX LOOP:
- Do not encode buggy behavior into specs/tests. Confirm intended invariant from spec docs first.
- $tdd-spec REGRESSION mode MUST capture preserved invariants and newly-fixed invariants explicitly.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): regression tests MUST assert entity state before/after transitions and invalid transition rejection.
- RED/GREEN harness proof is mandatory: first $integration-test must fail on the bug, second $integration-test must pass after fix.
- $workflow-end is BLOCKED until specs, TCs, and test code are synchronized via $tdd-spec + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update (except documented PERFORMANCE EXCEPTION routes where those steps are intentionally skipped).
```

### deployment — Deployment & Infrastructure

- Description: Deployment and CI/CD pipeline management
- Confirm First: no
- When To Use: User wants to set up or modify deployment, infrastructure, CI/CD pipelines, Docker configuration, Kubernetes setup, or deploy to environments
- When Not To Use: Explaining deployment concepts, checking deployment status/history, infrastructure investigation only
- Sequence: `scout -> investigate -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> code -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> sre-review -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
Role: DevOps Engineer
DEPLOYMENT WORKFLOW:
1. Review infrastructure requirements
2. Plan deployment strategy (Docker, K8s, CI/CD)
3. Implement configuration changes
4. Review changes before deployment review
5. Verify deployment readiness

GUARDRAILS:
- Always verify rollback strategy exists
- Never modify production configs without explicit approval
- Check the host project's infrastructure directory for existing deployment helpers
```

### design-workflow — Design Workflow

- Description: Designer workflow: create design specification and implement UI (product, marketing, creative) from requirements or screenshots
- Confirm First: no
- When To Use: User wants to create a UI/UX design spec, mockup, wireframe, or component specification, design a product interface (dashboard, admin panel, SaaS app), build a landing page, create a marketing page, replicate a screenshot/design, or build a creative/distinctive frontend interface
- When Not To Use: Implementing an existing design in code
- Sequence: `design-spec -> why-review -> interface-design -> frontend-design -> workflow-review-changes -> docs-update -> workflow-end`

Protocol:

```text
Role: UX Designer
DESIGN WORKFLOW:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → designSystem.docsPath to find design system documentation. Read docs/project-config.json → workflowPatterns.cssMethodology for project CSS conventions.
1. Read requirements/PBI
2. Create design spec with component inventory, states, tokens, accessibility
3. DESIGN IMPLEMENTATION GATE (pick ONE, skip the other):
   - Product UIs (dashboards, admin panels, SaaS apps, data interfaces) → $interface-design (skip frontend-design)
   - Marketing pages, landing pages, creative UIs, screenshot replication → $frontend-design (skip interface-design)
   Mark the skipped step as completed immediately.
4. Review with code-review agent
```

### documentation — Documentation Update

- Description: Documentation creation and update workflow with plan validation
- Confirm First: no
- When To Use: User wants to create, update, or improve documentation, READMEs, or code comments
- When Not To Use: Feature implementation, bug fixes, test writing
- Sequence: `scout -> investigate -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> docs-update -> workflow-review-changes -> review-post-task -> watzup -> workflow-end`

Protocol:

```text
IMPORTANT: For project feature docs (path from docs/project-config.json → workflowPatterns.featureDocPath), use feature-docs workflow instead.

DOCUMENTATION UPDATE PROTOCOL:
1. Scout: Identify all documentation files affected by recent changes
2. Investigate: Read existing docs, understand current structure and content
3. Plan: List all files and sections to update with specific changes
4. Validate plan via $plan-review before making any edits
5. Execute updates following existing doc conventions and templates
6. Review changes before finalizing
7. Summary report of all documentation changes

RULES:
- For business feature docs (17-section format), use feature-docs workflow instead
- Match existing style and formatting of target documents
- Update table of contents and cross-references if structure changes
- Never create new doc files when existing ones should be updated
```

### e2e-from-changes — E2E from Changes

- Description: Update E2E tests based on code or spec changes
- Confirm First: no
- When To Use: User updated test specifications or source code and needs to sync E2E tests
- When Not To Use: New recordings (use e2e-from-recording), visual-only changes (use e2e-update-ui)
- Sequence: `scout -> e2e-test -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
E2E FROM CHANGES PROTOCOL:
1. Detect change type from git diff:
   - Test spec changes in feature docs -> Generate new test cases
   - Code changes -> Update existing test assertions
   - API changes -> Update test data and API mocks
2. Load affected test specifications (TC-{FEATURE}-{NNN})
3. Update or generate test implementations
4. Ensure traceability: each TC has corresponding test
5. Run tests to verify changes work
6. Report updated test coverage
```

### e2e-from-recording — E2E from Recording

- Description: Generate Playwright E2E tests from Chrome DevTools recordings
- Confirm First: no
- When To Use: User has a Chrome DevTools recording JSON and wants to generate a Playwright E2E test file
- When Not To Use: Updating existing tests, writing tests from scratch, running existing tests
- Sequence: `scout -> e2e-test -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
E2E FROM RECORDING PROTOCOL:
1. Validate recording file exists (JSON format)
2. Identify target app and feature from user context
3. Run convert-recording.ts to generate initial test file
4. Load test specifications from feature docs Section 15
5. Map TC-{FEATURE}-{NNN} test cases to recording steps
6. Enhance generated code with project CSS conventions (from docs/project-config.json → workflowPatterns.cssMethodology)
7. Add screenshot assertions at key states
8. Generate Page Object if complex flow
9. Run test to verify it passes
10. Report generated files and any manual steps needed
```

### e2e-update-ui — E2E Update UI

- Description: Update E2E screenshot baselines after UI changes
- Confirm First: no
- When To Use: User made UI changes and needs to update E2E screenshot baselines
- When Not To Use: Generating new tests, fixing test logic, non-visual changes
- Sequence: `scout -> e2e-test -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
E2E UPDATE UI PROTOCOL:
1. Identify visual changes from git diff (SCSS, HTML, TS)
2. Map changed files to affected page objects
3. Find E2E specs using those page objects
4. Run affected tests to generate new screenshots
5. Update screenshot baselines with --update-snapshots
6. Visual review: diff old vs new baselines
7. Confirm changes are intentional with user
8. Report updated files and visual changes
```

### feature — Feature Implementation

- Description: Full feature development workflow with search-first approach, planning, implementation, testing, and documentation
- Confirm First: no
- When To Use: User wants to implement a well-defined feature, add a component, build a capability, develop a module, implement/execute an existing plan, create a new API endpoint, or design an API contract
- When Not To Use: Bug fixes, documentation, test-only tasks, feature requests/ideas (no implementation), PBI/story creation, design specs, large/ambiguous features needing research (use big-feature)
- Sequence: `scout -> investigate -> domain-analysis -> why-review -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> tdd-spec -> why-review -> tdd-spec-review -> plan -> why-review -> plan-review -> why-review -> cook -> review-domain-entities -> tdd-spec -> why-review -> tdd-spec-review -> tdd-spec [direction=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> sre-review -> security -> changelog -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
FEATURE IMPLEMENTATION PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns for project-specific architecture rules, code hierarchy, naming conventions, and CSS methodology.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar features, patterns, and implementation examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
2b. Domain Analysis — CONDITIONAL: if feature creates/modifies domain entities, run $domain-analysis after investigate to model bounded contexts and ERD before planning.
3. Plan: Design solution following discovered project patterns (architecture, state management, CSS — see docs/project-config.json → workflowPatterns)
4. Validate plan via $plan-review before any code changes
5. Validate design rationale with $why-review (features/refactors)
6. Write test specifications with $tdd-spec CREATE mode (before implementation). Review with $tdd-spec-review.
7. Update plan with test strategy via $plan-hard (re-plan cycle). Review with $plan-review.
8. Implement with $cook (backend + frontend) — guided by test specs
8b. Domain Entity Review — CONDITIONAL: if domain entity files created/modified, run $review-domain-entities before updating test specs to catch DDD quality issues early.
9. Update test specs to catch implementation gaps with $tdd-spec UPDATE mode. Review with $tdd-spec-review. Sync dashboard with $tdd-spec [direction=sync].
10. Generate/update integration tests with $integration-test — creates actual test files from TC specifications.
11. Simplify code for readability and consistency
12. Code review for quality, security, patterns compliance
13. SRE review for production readiness
14. Update changelog with feature entry
15. Run tests to verify no regressions
16. Update documentation if feature impacts business docs
17. Summary report of all changes

PLAN PHASES:
- PLAN₁ (after investigate): Feature design plan. Scope: architecture, file changes, implementation approach.
- PLAN₂ (after tdd-spec-review): Updated plan incorporating test strategy. Scope: refine PLAN₁ with test infrastructure, test data setup, spec coverage gaps.

GUARDRAIL: Provide file:line evidence of pattern search in plan. Follow project conventions over generic docs.

PERFORMANCE EXCEPTION: If this feature is a performance enhancement (query optimization, caching, throughput improvement, latency reduction), skip tdd-spec (both occurrences), tdd-spec-review (both occurrences), the PLAN2 re-plan cycle, tdd-spec [direction=sync], integration-test, integration-test-review, and integration-test-verify. Do NOT skip $cook — implementation still runs. Integration tests cannot measure performance. Run $test only to confirm no functional regressions. Use workflow-performance instead.
MANDATORY SPEC-DRIVEN + INVARIANT + TEST HARNESS LOOP:
- Read docs/project-reference/spec-principles.md before $plan-hard and lock feature intent + non-negotiable invariants.
- $tdd-spec MUST map every invariant to TC IDs in Section 15.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle behavior, tests MUST assert persisted entity state transitions and invalid-transition rejection.
- $workflow-end is BLOCKED until spec docs, TDD docs, and test code are synchronized via $tdd-spec + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update (except documented PERFORMANCE EXCEPTION routes where those steps are intentionally skipped).
- If mismatch exists (spec vs code vs tests), run $spec-discovery [update] + $feature-docs [update] + $tdd-spec [update] before closure.
```

### feature-docs — Business Feature Documentation

- Description: Business feature documentation with 17-section template enforcement, plan validation, and mandatory test coverage
- Confirm First: no
- When To Use: User wants to create or update business feature documentation in docs/business-features/
- When Not To Use: Bug fixes, feature implementation, test writing, debugging, refactoring
- Sequence: `scout -> investigate -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> docs-update -> workflow-review-changes -> review-post-task -> watzup -> workflow-end`

Protocol:

```text
Role: Documentation Specialist
BUSINESS FEATURE DOC PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns.featureDocTemplate to find and read the feature doc template — follow its section requirements exactly. Read workflowPatterns.featureDocPath for the docs directory.
- TC-{FEATURE}-{NNN} test case format with GIVEN/WHEN/THEN
- Evidence field with file:line format
- Cross-reference parent features if sub-feature

MANDATORY UPDATE CHECKLIST (when updating existing docs):
- ALWAYS update the Test Specifications section when documenting new functionality
- ALWAYS update CHANGELOG.md with feature entry
- ALWAYS update Version History section with new version entry
- Plan MUST ATTENTION include all impacted sections identified from diff analysis
- Plan MUST ATTENTION be validated via $plan-review and $plan-validate before any edits begin

OUTPUT: Complete feature README following template sections.
```

### full-feature-lifecycle — Full Feature Lifecycle

- Description: Complete feature from idea to PO acceptance — PO→BA→Designer→Dev→QA→PO with formal role handoffs at every stage
- Confirm First: yes
- When To Use: Full end-to-end feature delivery requiring idea → PBI → stories → design → implementation → testing → PO acceptance with all formal role handoffs
- When Not To Use: PBI-only work (use idea-to-pbi), implementation-only work (use feature or big-feature), research-heavy new product (use big-feature or greenfield-init), bug fixes (use bugfix)
- Sequence: `idea -> refine -> why-review -> refine-review -> domain-analysis -> why-review -> story -> why-review -> story-review -> pbi-challenge -> dor-gate -> pbi-mockup -> design-spec -> why-review -> interface-design -> frontend-design -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> cook -> review-domain-entities -> tdd-spec -> why-review -> tdd-spec-review -> integration-test -> integration-test-review -> integration-test-verify -> tdd-spec [direction=sync] -> workflow-review-changes -> sre-review -> quality-gate -> docs-update -> watzup -> acceptance -> workflow-end`

Protocol:

```text
FULL FEATURE LIFECYCLE PROTOCOL:
End-to-end feature delivery with formal role handoffs: idea capture → PBI refinement → story creation → Dev BA PIC challenge → DoR gate → design → implementation → testing → acceptance.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. Each step must invoke its skill invocation — never batch-complete or skip steps
2. pbi-challenge requires Dev BA PIC (different person from drafter)
3. dor-gate must pass (PASS or WARN) before design steps
4. plan-validate confirms implementation plan with user before cook
4b. domain-analysis (after refine-review) — CONDITIONAL: skip if feature has no domain entity changes. Run to model bounded contexts, aggregates, ERD before story writing.
4c. review-domain-entities (after cook) — CONDITIONAL: skip if no domain entity files in changeset. Reviews DDD quality of created/modified entities before integration tests.
5. workflow-review-changes is the consolidated review + fix loop (code-simplifier → review-changes → review-architecture → code-review → performance, recursive until PASS)
6. acceptance is PO final sign-off — must have test evidence and docs-update completed first
7. Save artifacts at every step to plans/ and team-artifacts/
MANDATORY FULL-LIFECYCLE SYNC GATES:
- Read docs/project-reference/spec-principles.md before planning and test-spec updates to keep intent/invariants explicit across role handoffs.
- Keep three-way sync explicit throughout the lifecycle: spec docs ↔ Section 15 TCs ↔ test code.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state transitions, tests MUST assert persisted transitions and invalid-transition rejection.
- Before $workflow-end, enforce sync chain: $tdd-spec + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update.
```

### greenfield-init — Greenfield Project Init

- Description: Full waterfall project inception from idea through implementation with integration testing
- Confirm First: yes
- When To Use: User wants to start a new project from scratch, init a greenfield project, plan a new application, research and plan before coding, bootstrap a new codebase, build something new
- When Not To Use: Existing codebase with code, bug fixes, feature implementation, refactoring existing code
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> why-review -> plan -> why-review -> security -> performance -> plan-review -> why-review -> refine -> why-review -> refine-review -> story -> why-review -> story-review -> pbi-challenge -> dor-gate -> pbi-mockup -> plan-validate -> why-review -> tdd-spec -> why-review -> tdd-spec-review -> plan -> why-review -> plan-review -> why-review -> scaffold -> linter-setup -> harness-setup -> why-review -> cook -> review-domain-entities -> tdd-spec -> why-review -> tdd-spec-review -> plan -> why-review -> plan-review -> why-review -> integration-test -> integration-test-review -> integration-test-verify -> test -> workflow-review-changes -> sre-review -> security -> changelog -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
GREENFIELD PROJECT INCEPTION PROTOCOL:
You are acting as a Solution Architect for a brand-new project.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. All tech recommendations include confidence % and evidence
4. Present 2-4 options for every major decision
5. Delegate architecture decisions to solution-architect agent
6. After confirmFirst, present ALL steps and let user deselect irrelevant ones
7. NEVER ask tech stack upfront — business analysis first, tech stack research after domain analysis
8. Domain analysis produces ERD + bounded contexts BEFORE tech stack research
9. Tech stack research compares top 3 options per layer with detailed pros/cons

STEP SELECTION GATE:
After user confirms workflow activation, immediately present the full step list and ask which steps to include. Example:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [x] Domain Analysis & ERD (domain-analysis) — NEW
- [x] Tech Stack Research (tech-stack-research) — NEW
- [x] Implementation Plan (plan)
- [x] Plan Validation (plan-validate)
- [x] Test Strategy (tdd-spec) — includes integration test strategy
- [x] User Stories (story)
- [x] Final Review (plan-review)

User can deselect steps that don't apply (e.g., skip market research for internal tools).
Skipped steps should be marked as completed immediately in the workflow.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, layer boundaries, component responsibilities, tech choices. Followed by $security + $performance review of the architecture.
- PLAN₂ (after tdd-spec-review): Sprint-ready implementation plan. Scope: concrete tasks, file changes, scaffolding needs, test infrastructure. Based on: stories + test specs from TDD-SPEC₁.
- PLAN₃ (after TDD-SPEC₂ post-implementation): Integration test architecture plan. Scope: test file structure, test data setup, CI integration. Based on: implementation code + updated test specs.
The three plans serve progressively detailed purposes — architecture → implementation → test infrastructure.

SECOND PLANNING ROUND:
After stories + TDD specs are generated and reviewed, a second $plan-hard + $plan-review cycle runs.
This second plan incorporates the concrete stories, test specs, and dependency tables into a detailed implementation plan.
The first plan is high-level architecture; the second plan is sprint-ready with phased implementation steps.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
The scaffolded project should be copy-ready as a starter template for similar projects.

IMPLEMENTATION & INTEGRATION TESTING (after scaffold):
After scaffolding, the workflow continues with full implementation and integration testing:
1. $why-review validates design rationale before coding
2. $cook implements the feature (backend + frontend)
3. $review-domain-entities reviews domain entity DDD quality — CONDITIONAL: skip if no domain entity files in changeset. Detects anemic model, missing invariants, VO misclassification before integration tests are written.
4. $tdd-spec writes test specifications (feature doc Section 15)
5. $tdd-spec-review validates spec coverage and correctness
6. Third $plan-hard + $plan-review cycle plans integration test architecture
7. $integration-test generates integration tests from specs
8. $test runs all tests to verify TCs pass
9. $workflow-review-changes for quality (consolidated review: code-simplifier + review-changes + review-architecture + code-review + performance, then plan + fix + re-review recursively)
10. $sre-review + $security for production readiness
11. $changelog + final $test + $docs-update + $watzup to close
This ensures greenfield projects ship with integration test coverage from day one.
```

### idea-to-pbi — Idea to PBI

- Description: PO/BA workflow: capture or review idea/artifact, optional PO→BA handoff, refine to PBI, create user stories, generate TDD test specs, challenge review, DoR gate, mockup, prioritize
- Confirm First: yes
- When To Use: PO or BA wants to take a raw idea — OR PO is handing off an existing artifact/ticket/brief to BA — through to a grooming-ready PBI with user stories, TDD test specifications, Dev BA PIC challenge review, DoR validation, wireframes, and backlog prioritization
- When Not To Use: Already have a drafted PBI (use pbi-challenge standalone), implementing a feature (use feature or big-feature)
- Sequence: `idea -> review-artifact -> handoff -> refine -> why-review -> refine-review -> why-review -> story -> why-review -> story-review -> tdd-spec -> why-review -> tdd-spec-review -> pbi-challenge -> dor-gate -> pbi-mockup -> prioritize -> docs-update -> watzup -> workflow-end`

Protocol:

```text
IDEA TO PBI PROTOCOL:
Capture and refine a raw idea — or a handed-off artifact/ticket/brief — into a grooming-ready PBI with stories, TDD test specifications, challenge review, DoR validation, and wireframe.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. Each step must invoke its skill invocation — never batch-complete or skip steps
2. review-artifact and handoff are CONDITIONAL — skip both if no existing artifact or no formal handoff needed; proceed straight to refine
3. why-review runs after refine-review to validate the PBI design rationale (WHY this solution, WHY these constraints, WHY this scope) BEFORE writing stories. This is the adversarial gate: Steel-Man rejected alternatives, Pre-mortem, Assumption Stress Test.
4. tdd-spec and tdd-spec-review run after story-review so acceptance criteria and stories are mapped into testable TC specifications before challenge and DoR gates
5. pbi-challenge is run by a reviewer different from the drafter — confirm reviewer identity before that step
6. dor-gate must pass (PASS or WARN) before pbi-mockup is finalized
7. Save artifacts at every step to plans/, docs/specs/, or team-artifacts/pbis/
8. Write output IMMEDIATELY after each step — never batch
9. Run docs-update after prioritize and before watzup so specs, feature docs, and TDD/spec docs stay synchronized

STEP SELECTION GATE:
After workflow activation, present the full step list and let user deselect irrelevant ones:
- [x] Idea capture (idea)
- [ ] Review existing artifact (review-artifact) — CONDITIONAL: only if PO artifact/ticket exists
- [ ] PO → BA handoff (handoff) — CONDITIONAL: only if formal handoff is needed
- [x] Refine to PBI (refine) — hypothesis, AC, RICE, GIVEN/WHEN/THEN
- [x] PBI review (refine-review)
- [x] Design rationale review (why-review) — validates WHY before stories are written
- [x] User stories (story)
- [x] Story review (story-review)
- [x] Test specifications (tdd-spec)
- [x] Test specification review (tdd-spec-review)
- [x] Dev BA PIC challenge (pbi-challenge)
- [x] Definition of Ready gate (dor-gate)
- [x] PBI mockup/wireframe (pbi-mockup) — CONDITIONAL: skip for backend-only PBIs
- [x] Backlog prioritization (prioritize)
- [x] Documentation synchronization (docs-update) — near-final sync for specs, feature docs, and TDD/spec docs

WHY-REVIEW GATE (after refine-review):
Before writing user stories, challenge the PBI design rationale:
- Is this the right solution to the stated problem? What was rejected and why?
- Are the acceptance criteria constraints justified? What breaks if they change?
- Pre-mortem: if this PBI ships and fails in 3 months, what breaks?
- Are there simpler alternatives the team has not considered?
Output: Why-Review checklist with PASS/WARN/FAIL + adversarial analysis section.
FAIL blocks story writing — PBI must be revised first.

TDD-SPEC GATE (after story-review):
Before pbi-challenge and DoR, map reviewed stories and acceptance criteria into TC specifications:
- Each material acceptance criterion should map to at least one TC ID
- Cover happy path, validation failure, authorization/permission, and important edge cases where applicable
- Review specs with tdd-spec-review before pbi-challenge so reviewers evaluate a testable PBI

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: PBI created, test specs created/reviewed, docs sync completed, DoR result (PASS/WARN/FAIL), any blocking items
- Recommended next workflow: $feature, /tdd-feature, or /big-feature (if PBI is ready to implement)
- Any DoR failures: list specific blocking criteria that must be resolved
```

### investigation — Code Investigation

- Description: Codebase exploration and understanding workflow
- Confirm First: no
- When To Use: User wants to understand how code works, find where logic lives, explore architecture, trace code paths, or get explanations
- When Not To Use: Any action that modifies code (implement, fix, create, refactor, test, review, document, design, plan)
- Sequence: `scout -> investigate -> workflow-end`

Protocol:

```text
INVESTIGATION PROTOCOL:
1. Scout: Find relevant files, entry points, and related code
2. Investigate: Trace code paths, understand architecture and data flow
- Output findings as structured analysis with file:line references
- Include architecture diagrams where helpful
- Identify patterns, dependencies, and potential concerns

GUARDRAIL: This is a READ-ONLY workflow. DO NOT modify any files. Only read, analyze, and report.
```

### migration — Database Migration

- Description: Database schema and data migration workflow
- Confirm First: no
- When To Use: User wants to create or run database migrations: schema changes, data migrations, EF migrations, adding/removing/altering columns or tables
- When Not To Use: Explaining migration concepts, checking migration history/status, schema investigation only
- Sequence: `scout -> investigate -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> db-migrate -> code -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> sre-review -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
Role: Database Administrator
DATABASE MIGRATION PROTOCOL:
1. Analyze current schema and identify breaking changes
2. Plan rollback strategy before implementation
3. Use project data migration executor for data migrations
4. Use EF migrations for schema changes
5. Review changes before code review
6. Verify migration is idempotent (safe to re-run)

GUARDRAILS:
- Always provide rollback path
- Never delete data without backup strategy
- Test migration on dev data before production
```

### package-upgrade — Package Upgrade

- Description: Package dependency upgrade with regression verification
- Confirm First: no
- When To Use: User wants to upgrade packages, update dependencies, npm update, NuGet upgrade, version bump
- When Not To Use: Adding new packages (use feature), removing packages (use refactor)
- Sequence: `scout -> investigate -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> code -> integration-test -> integration-test-review -> integration-test-verify -> test -> workflow-review-changes -> docs-update -> watzup -> workflow-end`

Protocol:

```text
Role: Dependency Manager
PACKAGE UPGRADE PROTOCOL:
1. Scout: Identify current versions, check for breaking changes
2. Investigate: Read changelogs, migration guides for target versions
3. Plan: List all packages to upgrade, identify breaking changes
4. Implement: Upgrade packages one at a time or in compatible groups
5. Test: Run full test suite after each upgrade group
6. Review: Check for deprecated API usage

GUARDRAILS:
- One major version bump at a time
- Read changelog for EVERY package upgraded
- Run tests after each upgrade, not just at the end
- Check peer dependency compatibility
- Keep lockfile changes in separate commit
```

### pbi-to-tests — PBI to Test Specs

- Description: Spec-only workflow: generate TC specs from PBI, review quality, run quality gate — no integration test code generation
- Confirm First: no
- When To Use: Generate test specs from PBI/story, spec-only with no code generation needed
- When Not To Use: Integration test code generation needed (use write-integration-test), specs already exist (use test-to-integration)
- Sequence: `tdd-spec -> why-review -> tdd-spec-review -> quality-gate -> workflow-end`

Protocol:

```text
No injectContext protocol defined.
```

### performance — Performance Optimization

- Description: Performance investigation and optimization workflow
- Confirm First: no
- When To Use: User reports slow performance, latency issues, optimization needed, bottleneck investigation, query optimization
- When Not To Use: Bug fixes (use bugfix), feature implementation, refactoring without performance goals
- Sequence: `scout -> investigate -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> code -> test -> workflow-review-changes -> sre-review -> docs-update -> watzup -> workflow-end`

Protocol:

```text
Role: Performance Engineer
PERFORMANCE PROTOCOL:
1. Scout: Identify slow endpoints/components
2. Investigate: Profile, measure baseline metrics
3. Plan: Design optimization with expected improvement targets
4. Implement: Apply optimizations
5. Test: Verify improvements with before/after metrics — run $test to confirm no functional regressions
6. SRE: Validate production readiness
7. Summary: Report metrics improvement

GUARDRAILS:
- Measure BEFORE and AFTER — no optimization without metrics
- Focus on p95/p99 latency, not just average
- Consider query plans for DB optimizations
- Check all services for cross-service performance impact

PERFORMANCE EXCEPTION — NO INTEGRATION TESTS:
Integration tests verify functional correctness — they cannot measure latency, throughput, or resource consumption. Do NOT run tdd-spec, tdd-spec-review, tdd-spec [direction=sync], integration-test, or integration-test-review in this workflow. Run $test only to confirm no functional regressions were introduced by the optimization.
MANDATORY PERFORMANCE INVARIANT GUARDS:
- Keep spec-defined behavior and invariants unchanged while optimizing performance.
- Performance exception skips integration/TDD spec generation steps, but $test regression checks remain mandatory.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): if optimization touches lifecycle/state logic, verify no invariant break with persisted-state transition assertions and invalid-transition rejection in available functional tests.
- $docs-update still runs to keep performance rationale and affected spec/test docs consistent with code changes.
```

### product-discovery — Product Discovery | ⚠️ Confirm

- Description: Product discovery: raw vision or problem → structured brainstorm → prioritized opportunity map → N PBIs with stories, challenge review, DoR gate, and wireframes → cross-PBI ranked backlog ready for sprint planning
- Confirm First: yes
- When To Use: PO/BA wants to go from a raw product idea, vision, or problem statement through structured brainstorming into a prioritized backlog of multiple PBIs with stories, challenge review, DoR validation, wireframes, and cross-PBI ranking — full product discovery sprint output without implementation
- When Not To Use: Single well-defined feature (use feature or idea-to-pbi), implementation-only work (use feature or big-feature), bug fixes (use bugfix), research-only without PBI output (use investigation or deep-research)
- Sequence: `brainstorm -> web-research -> domain-analysis -> why-review -> idea -> refine -> why-review -> refine-review -> story -> why-review -> story-review -> pbi-challenge -> dor-gate -> pbi-mockup -> review-changes -> prioritize -> watzup -> workflow-end`

Protocol:

```text
PRODUCT DISCOVERY PROTOCOL:
Converts a raw product vision or problem statement into a grooming-ready backlog of multiple PBIs through structured PO/BA discovery techniques.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY research stage requires ask the user directly validation before proceeding
2. Save ALL artifacts to team-artifacts/ and plans/ at EVERY step — write IMMEDIATELY after each task, never batch
3. $brainstorm output MUST produce a scored opportunity map (RICE) before any $idea step
4. TASK DECOMPOSITION GATE: After user selects opportunities, call task tracking for EVERY task (N opportunities x 8 steps = Nx8 tasks min) BEFORE processing any opportunity — do NOT start the loop without a complete task list
5. The idea-to-pbi loop (steps 4-11) repeats for EACH opportunity selected from the map — NOT just once
6. pbi-challenge requires Dev BA PIC (not the drafter) — confirm reviewer identity before that step
7. dor-gate must pass (PASS or WARN) before pbi-mockup
8. $prioritize at the end is cross-PBI — ranks ALL PBIs from this session together
9. This workflow produces a BACKLOG only — no implementation. Hand off to sprint-planning or feature workflow.
10. SCALE MANAGEMENT: For 6+ opportunities, spawn one sub-agent per opportunity (each gets brainstorm context + task list); main context runs $prioritize at end. After every 3 opportunities, update session summary table.

STEP SELECTION GATE:
After user confirms workflow activation, present the full step list and let user deselect irrelevant ones:
- [x] Brainstorm — Double Diamond: problem frame, HMW, SCAMPER, opportunity map (RICE-scored)
- [x] Market Research (web-research) — CONDITIONAL: skip for internal tools or when domain is well-understood
- [x] Domain Analysis (domain-analysis) — CONDITIONAL: skip if no new domain entities involved
- [x] Idea capture (idea) — REPEATS per opportunity
- [x] PBI refinement (refine) — REPEATS per opportunity: hypothesis, AC, RICE, GIVEN/WHEN/THEN
- [x] PBI review (refine-review) — REPEATS per opportunity
- [x] User stories (story) — REPEATS per opportunity
- [x] Story review (story-review) — REPEATS per opportunity
- [x] Dev BA PIC challenge (pbi-challenge) — REPEATS per opportunity
- [x] Definition of Ready gate (dor-gate) — REPEATS per opportunity
- [x] PBI mockup/wireframe (pbi-mockup) — CONDITIONAL per opportunity: skip for backend-only PBIs
- [x] Cross-PBI prioritization (prioritize)

MULTI-OPPORTUNITY LOOP (core mechanic):
The $brainstorm step produces a scored opportunity map — typically 3–8 opportunities ranked by RICE.
For EACH opportunity the team selects to develop:
  1. Run $idea to capture as structured artifact → team-artifacts/ideas/
  2. Run $refine to create PBI with hypothesis, AC, RICE, GIVEN/WHEN/THEN → team-artifacts/pbis/
  3. Run $refine-review — BA quality check
  4. Run $story — user stories per PBI
  5. Run $story-review — story quality check
  6. Run $pbi-challenge — Dev BA PIC review (challenge prompts, AC quality, feasibility)
  7. Run $dor-gate — INVEST check, DoR pass/fail
  8. Run $pbi-mockup — wireframe (SKIP for backend-only PBIs)
After ALL opportunities are processed: run $prioritize across all PBIs.

BRAINSTORM STEP REQUIREMENTS:
- Detect scenario: problem-solving vs new product vs enhancement
- Apply Double Diamond: problem framing (5 Whys/HMW/JTBD) → opportunity framing (OST/Lean Canvas) → ideation (SCAMPER/Crazy 8s) → convergence (RICE/Kano/2x2)
- Output: opportunity map with 3–8 scored items
- Present map to user: 'Which opportunities should we develop into PBIs?' (ask the user directly, multiSelect: true)
- Document in plans/{plan-dir}/brainstorm-opportunity-map.md

CROSS-PBI PRIORITIZE STEP:
- Aggregate all PBIs produced in this session
- Apply cross-PBI RICE scoring and dependency graph
- Produce a sprint-ready ranked backlog
- Flag Must-Have vs Should-Have vs Could-Have per release scope
- Output: team-artifacts/backlog/product-discovery-{date}-backlog.md

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: N PBIs created, X passed DoR, Y need rework
- Recommended next workflow: /sprint-planning (if backlog is ready) OR /big-feature (if single large PBI needs deep research + implementation)
- Any PBIs that failed DoR gate: list blocking items

AUTO-SKIP RULES:
- web-research: skip if user says 'internal tool', 'well-understood domain', or 'no market research needed'
- domain-analysis: skip if no new entities/aggregates — ask: 'Does this product involve new domain entities?'
- pbi-mockup: skip per-PBI if PBI is backend-only (no UI changes)

WHY-REVIEW GATE (after domain-analysis, before per-opportunity loop):
Before committing to the per-PBI loop, validate the opportunity map rationale:
- Are the top-ranked opportunities truly the right problems to solve? What was deprioritized and why?
- Are RICE scores well-founded or speculative? Challenge Reach and Impact estimates.
- Pre-mortem: if these opportunities are built and miss in 6 months, what was the root cause?
- Are there systemic alternatives (e.g., platform change, process change) that make these opportunities unnecessary?
Output: Why-Review checklist with PASS/WARN/FAIL per opportunity.
FAIL on a high-ranked opportunity → remove from selection or revisit brainstorm framing.
WARN → document risk and proceed with user acknowledgment.
```

### quality-audit — Quality Audit

- Description: Quality audit: review artifacts for best practices, identify flaws and enhancements, fix if needed
- Confirm First: no
- When To Use: User wants to audit code quality, review skills/commands/hooks for best practices, find flaws and suggest enhancements
- When Not To Use: Bug fixes, feature implementation, investigation-only, reviewing uncommitted changes, PR reviews
- Sequence: `workflow-review-changes -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> code -> tdd-spec -> why-review -> tdd-spec-review -> integration-test -> integration-test-review -> integration-test-verify -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
QUALITY AUDIT WORKFLOW:
1. Review Changes (workflow-review-changes): Consolidated review (code-simplifier + review-changes + review-architecture + code-review + performance), then plan + fix + re-review recursively until clean
2. Plan: Document additional findings, propose fixes and enhancements
3. Plan Review: Validate fix plan before implementation
4. Code: Implement approved fixes
5. Update test specs if fixes changed behavior with $tdd-spec update mode. Review with $tdd-spec-review.
6. Test: Verify fixes don't break anything
7. Watzup: Summarize all changes made

CRITICAL GATE after workflow-review-changes:
- Report findings to user with severity (Critical/Major/Minor/Suggestion)
- ASK: 'Found N issues. Should I proceed to fix?'
- If user approves  ->  continue with plan  ->  plan-review  ->  code  ->  test  ->  watzup
- If user declines  ->  mark remaining steps completed
- If multilingual UI text changes are detected without translation updates, ASK user to run translation sync updates first or explicitly accept the risk before code fixes proceed.
```

### refactor — Code Refactoring

- Description: Code improvement and restructuring workflow with search-first approach
- Confirm First: no
- When To Use: User wants to restructure, reorganize, clean up, or improve existing code without changing behavior; technical debt
- When Not To Use: Bug fixes, new feature development
- Sequence: `scout -> investigate -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> code -> tdd-spec -> why-review -> tdd-spec-review -> tdd-spec [direction=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> sre-review -> changelog -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
Role: Refactoring Specialist
REFACTORING PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns for project-specific architecture patterns, code hierarchy, and naming conventions.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar refactoring patterns, identify target architecture examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
3. Plan: Identify code smells, define target architecture following discovered project patterns
4. Validate plan  --  ensure no behavioral changes, only structural
5. Validate design rationale with $why-review (features/refactors)
6. Implement incrementally  --  small, verifiable steps
7. Verify test specs still match after refactoring with $tdd-spec update mode. Review with $tdd-spec-review. Sync dashboard with $tdd-spec [direction=sync].
8. Verify/update integration tests with $integration-test — ensures tests reflect refactored code paths.
9. Simplify: Remove dead code, flatten nesting, extract duplicates
   CRITICAL: Before removing any code:
   - Use $investigate skill for 'unused' code verification
   - Require evidence: grep results + confidence ≥80% + cross-module/service validation
   - See Investigation Protocol (CLAUDE.md)
10. Code review: Verify no functional regressions
11. SRE review for production readiness
12. Update changelog with refactoring summary
13. Run tests  --  all existing tests MUST ATTENTION pass
14. Summary report of structural improvements

GUARDRAILS:
- Refactoring MUST ATTENTION NOT change observable behavior
- Follow project patterns from docs/project-config.json → workflowPatterns (architecture, code hierarchy, naming)
- Apply project code responsibility hierarchy from docs/project-config.json → workflowPatterns.codeHierarchy
- Provide file:line evidence of pattern search in plan

PERFORMANCE EXCEPTION: If this refactor is performance-driven (query optimization, caching, reducing allocations, improving throughput), skip tdd-spec update mode, tdd-spec-review, tdd-spec [direction=sync], integration-test, integration-test-review, and integration-test-verify. Integration tests cannot measure performance. Run $test only to confirm no functional regressions. Use workflow-performance instead.
MANDATORY REFACTOR INVARIANT SAFETY GATES:
- Preserve existing intent/invariants; refactor MUST NOT change observable behavior unless explicitly approved.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine logic, tests MUST assert persisted transitions and invalid-transition rejection.
- Before $workflow-end, maintain three-way sync: spec docs ↔ TDD docs ↔ test code via $tdd-spec + $tdd-spec-review + $tdd-spec [direction=sync] + $integration-test + $integration-test-review + $integration-test-verify + $docs-update (except documented performance-exception routes).
```

### release-prep — Release Preparation

- Description: Pre-release quality gate with SRE review and status verification
- Confirm First: no
- When To Use: User wants to verify release readiness, run pre-release quality gate, or check if ready to deploy/ship
- When Not To Use: Rollbacks, hotfixes, release notes writing, release branch operations
- Sequence: `sre-review -> quality-gate -> status -> docs-update -> workflow-end`

Protocol:

```text
Role: QC Specialist
RELEASE PREPARATION PROTOCOL:
1. SRE review for production readiness (service-layer/API changes)
2. Run pre-release quality gate  --  check:
   - Open PRs awaiting merge
   - Failing tests or builds
   - Code review completeness
   - CHANGELOG.md up-to-date
   - No known critical/major bugs
3. Generate status report with pass/fail per criterion
4. Output: PASS (clear to release) or FAIL with blocking items listed
```

### review — Code Review

- Description: Code review and quality check, plan and fix issues, then re-review recursively until clean
- Confirm First: no
- When To Use: User wants a code review, PR review, codebase quality audit, or code quality check
- When Not To Use: Reviewing uncommitted changes (use review-changes), reviewing plans/designs/specs/docs
- Sequence: `review-architecture -> code-simplifier -> code-review -> performance -> integration-test-review -> integration-test-verify -> plan -> why-review -> plan-validate -> why-review -> cook -> workflow-review -> docs-update -> watzup -> workflow-end`

Protocol:

```text
CODE REVIEW PROTOCOL (RECURSIVE):
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns for project-specific architecture rules, code hierarchy, and naming conventions. Read workflowPatterns.reviewRulesDoc for project code review rules.
1. Review code for quality, patterns compliance, security, and performance
2. Apply project standards from docs/project-config.json → workflowPatterns (architecture, code hierarchy, naming conventions, CSS methodology)
3. Check project code review rules doc from docs/project-config.json → workflowPatterns.reviewRulesDoc
4. Report findings with severity (Critical/Major/Minor) and file:line references
5. Summarize with actionable recommendations
6. If ISSUES FOUND: plan fixes, validate plan, implement fixes, then RE-REVIEW
7. RECURSIVE: After cook, re-run review. Loop until PASS or max 3 iterations.
- LOGIC REVIEW: Verify changes match their stated intention. Trace business logic paths. Clean code can be wrong code.
- BUG DETECTION: Check for null safety, boundary conditions, resource leaks, concurrency issues per bug-detection-protocol.
- TEST SPEC VERIFICATION: Cross-reference changes against TC-{FEAT}-{NNN} test specifications. Flag untested code paths.
- MULTILINGUAL UI SYNC CHECK: For frontend/UI text changes in multilingual projects (`localization.enabled` and `supportedLocales.length > 1`), verify translation updates or require an explicit user decision before proceeding.
MANDATORY REVIEW GATES:
- SPEC/TDD/TEST THREE-WAY SYNC: verify code behavior aligns with specs and Section 15 TCs; stale layer = FAIL.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-transition logic, require data-state assertions in tests (not smoke/no-exception checks).
- If drift detected, require sync chain before PASS: $spec-discovery [update] + $feature-docs [update] + $tdd-spec [update] + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update.
```

### review-changes — Review Current Changes

- Description: Review uncommitted changes, plan and fix issues, then re-review recursively until clean
- Confirm First: no
- When To Use: User wants to review current uncommitted, staged, or unstaged changes before committing
- When Not To Use: PR reviews, codebase reviews, branch comparisons
- Sequence: `review-changes -> review-architecture -> review-domain-entities -> performance -> integration-test-review -> security -> code-simplifier -> code-review -> integration-test-verify -> plan -> why-review -> plan-validate -> why-review -> cook -> workflow-review-changes -> docs-update -> watzup -> workflow-end`

Protocol:

```text
PRE-COMMIT REVIEW (RECURSIVE):

[BLOCKING] SEQUENCING RULE — review-changes (step 1) MUST run FIRST and complete before any other reviewer.
- Step 1 (`review-changes`) establishes the baseline: surface analysis (BE/FE/SCSS file counts), review mode (DIMENSIONAL/BE-ONLY/FE-ONLY/FE-SPLIT/TOOLING), integration test sync gaps, multilingual translation gaps. Steps 2–6 depend on this baseline summary.
- Steps 2–6 (`review-architecture`, `review-domain-entities`, `performance`, `integration-test-review`, `security`) form a PARALLEL BATCH and MUST be spawned together in a single message via `spawn_agent` tool calls (agent_type=code-reviewer). They are read-only and independent — no shared mutable state, no ordering dependency between them.
- NEVER start steps 2–6 before step 1 completes. NEVER serialize steps 2–6 (burns 50K+ tokens absorbing five inline reports). NEVER start `code-simplifier` (step 7) until ALL parallel sub-agents return — step 7 modifies code and must operate on the consolidated review snapshot.
- After parallel batch returns: TaskUpdate steps 2–6 to completed, read all sub-agent reports, synthesize Critical/High findings into a consolidation summary, then proceed to step 7 sequentially.

- Review all staged and unstaged changes
- Check for: security issues, debug artifacts (console.log, debugger), incomplete code, style violations
- Verify no sensitive files (.env, credentials) are staged
- Check architecture compliance, naming, patterns
- DOMAIN ENTITY REVIEW: If domain entity files in changeset (Domain/, Entities/, ValueObjects/ directories), run $review-domain-entities to check DDD quality (anemic model, VO immutability, invariant enforcement). Skip entirely if no entity files changed.
- Report findings with file:line references
- Output: PASS (safe to commit) or ISSUES FOUND (with list)
- If ISSUES FOUND: plan fixes, validate plan, implement fixes, then RE-REVIEW
- RECURSIVE: After cook, re-run review-changes. Loop until PASS or max 3 iterations.
- LOGIC REVIEW: Verify changes match their stated intention. Trace business logic paths. Clean code can be wrong code.
- BUG DETECTION: Check for null safety, boundary conditions, resource leaks, concurrency issues per bug-detection-protocol.
- TEST SPEC VERIFICATION: Cross-reference changes against TC-{FEAT}-{NNN} test specifications. Flag untested code paths.
- INTEGRATION TEST SYNC: Identify changed business logic files (handlers, services, controllers, commands, queries, resolvers — infer from project conventions). For each, verify a corresponding test file exists. If missing, surface to user via ask the user directly — mandatory, not advisory.
- MULTILINGUAL UI SYNC CHECK: If UI-facing files changed and project localization is multilingual (`localization.enabled` + `supportedLocales.length > 1`), verify translation file updates. If missing, surface via ask the user directly — mandatory, not advisory.
- DOC SYNC DEFERRAL: DO NOT update feature docs, engineering specs, or test spec TCs during review steps. The dedicated docs-update step (step 14) handles all of this: $feature-docs (business feature docs) + $spec-discovery [mode=update] (engineering spec bundle) + $tdd-spec (test spec update) + $tdd-spec [direction=sync] (QA dashboard sync). TEST SPEC VERIFICATION above is READ-ONLY cross-reference only — flag gaps, do not write.
MANDATORY REVIEW-CHANGES GATES:
- SPEC/TDD/TEST THREE-WAY SYNC is blocking: changed behavior must match specs + TCs + test code.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-transition changes, verify persisted-state assertions and invalid-transition rejection tests.
- Missing or stale docs/tests are blocking findings; route fixes through $tdd-spec + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update.
```

### security-audit — Security Audit

- Description: Security review and vulnerability assessment
- Confirm First: no
- When To Use: User wants a security audit: vulnerability assessment, OWASP check, security review, penetration test analysis, or security compliance check
- When Not To Use: Implementing new security features, fixing known security bugs (use bugfix workflow)
- Sequence: `scout -> security -> watzup -> workflow-end`

Protocol:

```text
Role: Security Architect
SECURITY AUDIT WORKFLOW:
1. Scan for OWASP Top 10 vulnerabilities
2. Review authentication and authorization patterns
3. Check input validation and sanitization
4. Assess data protection and encryption
5. Report findings with severity ratings

GUARDRAILS:
- Read-only analysis unless fix is approved
- Use CVSS scoring for severity
- Check both frontend and backend attack surfaces
```

### spec-discovery — Spec Discovery | ⚠️ Confirm

- Description: Reverse-engineer a complete, tech-agnostic specification bundle from an existing codebase — scout holistically first, plan a per-module task breakdown, investigate each module deeply, then assemble a reimplementation-ready spec set for any AI agent or engineering team.
- Confirm First: yes
- When To Use: Re-implementing the same product on a new tech stack, onboarding a new team with zero codebase knowledge, compliance documentation of system behavior, tech migration spec generation, generating a backlog from an existing system, verifying a system matches its intended design, briefing an AI agent to build a clone or fork
- When Not To Use: Understanding one specific feature (use investigation), writing tests for existing code (use write-integration-test), updating existing documentation (use documentation), refactoring or optimizing (use refactor or performance), new project with no codebase (use greenfield-init or product-discovery)
- Sequence: `scout -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> spec-discovery -> review-changes -> review-artifact -> watzup -> workflow-end`

Protocol:

```text
SPEC DISCOVERY PROTOCOL:
Reverse-engineers a complete, tech-agnostic specification bundle from an existing codebase. Real-world codebases can have thousands of files — this workflow uses scout-first → plan-decompose → investigate-deeply to handle that scale without context overrun.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. ALWAYS confirm scope with ask the user directly BEFORE any code reading — full-system or module-scoped?
2. SCOUT FIRST: before any extraction, map the full codebase holistically (directory structure, module boundaries, entry points, integration points, data stores) — this produces the Module Registry
3. PLAN BEFORE EXTRACTING: the plan step MUST break extraction into one task per module per phase — for N modules × M phases = N×M tasks. Each task is ≤50 files in scope. Use task tracking for every task BEFORE starting.
4. DEEP INVESTIGATE per task: each task reads ALL its target files before writing one spec line — grep → read → trace → extract → write → verify
5. WRITE OUTPUT IMMEDIATELY after each task — never accumulate spec content across tasks; large codebases overflow context if batched
6. ALL output must be tech-agnostic: no framework names, no language-specific types, no stack-specific patterns
7. EVERY claim in the spec bundle must cite [Source: path/to/file:line]
8. UNVERIFIABLE content must be marked [UNVERIFIED — needs manual review] — never invent

WORKFLOW EXECUTION:

STEP 1 — SCOUT (holistic codebase map):
  Map top-level directory structure → find entry points (bootstrap, DI container, router registration) → enumerate modules with responsibility + file count → map cross-cutting concerns → identify data store access points → find integration boundaries
  Output: docs/specs/{app-bucket}/{system-name}/00-module-registry.md

STEP 2 — PLAN (decompose big task into small tasks):
  From the module registry, create ONE task per module per extraction phase. If a module has >50 files, split it into sub-parts. Priority order: core domain first, infrastructure last.
  BLOCKING: call task tracking for every task. Do NOT start Step 3 until all tasks are created.
  Output: docs/specs/{app-bucket}/{system-name}/extraction-plan.md + task tracking for each task

STEP 3 — EXTRACT (per task: investigate deeply, write immediately):
  For each task in plan order:
    → Read all files in scope (grep to narrow first, then read)
    → Trace code paths (what calls what, what validates what, what triggers what)
    → Extract spec content for this phase/module
    → Write to spec file with [Source: file:line] on every claim
    → Mark [UNVERIFIED] for anything without a traceable source
    → Mark task completed. Load next task.
  Phases: A=Domain Model, B=Business Rules, C=API Contracts, D=Integration Events, E=User Journeys

STEP 4 — REVIEW (spec quality check):
  Review all generated spec files: [Source] on every claim, tech-agnostic language, no missing modules, state machines complete, errors documented
  Fix any gaps: create fix task → re-investigate → rewrite → re-check

STEP 5 — ASSEMBLE (spec bundle + README):
  Write 06-reimplementation-guide.md (build order, architecture constraints, data migration notes)
  Write README.md (index, completeness status table, reading order for AI agent)

SCALE ROUTING:
  1–3 modules → single-session extraction (all steps in one context)
  4–10 modules → sub-agent parallel extraction (one sub-agent per module)
  10+ modules → incremental coverage (one module-group per session, completeness tracker maintained)

SUB-AGENT PATTERN (4+ modules):
  After Plan, spawn one sub-agent per module with: Module Registry, task list for its module, output path
  Sub-agents run phases A–E in parallel, write to module spec files
  Main context assembles final bundle from sub-agent outputs

TECH-AGNOSTIC CONTRACT:
  ❌ FORBIDDEN: framework names, ORM type names, language generics, nullable annotations, file paths, class names, stack-specific pattern names
  ✅ REQUIRED: plain-language behavior, generic types (string/number/boolean/date/list/map), [Source: file:line] on every claim

CONDITIONAL SKIPS:
  Phase C (API): skip if internal library with no public operations
  Phase D (Events): skip if no async messaging, no background jobs, no webhooks
  Phase E (Journeys): skip if backend-only, no user-facing UI flows

HANDOFF at workflow-end:
  Present: total spec bundle (N files, X modules), completeness matrix, open questions
  Recommend: /product-discovery (spec → future backlog), /greenfield-init (start re-implementation planning)
```

### spec-driven-dev — Spec-Driven Development | ⚠️ Confirm

- Description: Unified spec-driven development — maintains both engineering spec bundle (docs/specs/{app-bucket}/{system-name}/) and business feature docs (docs/business-features/) in sync. Modes: init-full (zero → both layers), update (incremental sync from code changes), audit (staleness check both layers).
- Confirm First: yes
- When To Use: Initial spec generation from zero docs, maintaining spec sync after code changes, quarterly spec health audits, before tech migrations, after major features land. Replaces workflow-spec-discovery for new projects.
- When Not To Use: Understanding one specific feature (use investigation), updating a single feature doc (use feature-docs directly), extracting spec for one module (use spec-discovery directly)
- Sequence: `workflow-spec-driven-dev`

Protocol:

```text
SPEC-DRIVEN-DEV PROTOCOL:
Modes: init-full | update | audit.
Step 0: auto-detect mode, confirm system-name for stable path docs/specs/{app-bucket}/{system-name}/.
Scale gate: 4+ modules = MUST spawn sub-agents in ONE message.
Both output layers: docs/specs/{app-bucket}/{system-name}/ (engineering, tech-agnostic) + docs/business-features/ (stakeholder 17-section).
Update mode: git diff → impact map → spec-discovery update + feature-docs update → tdd-spec update → tdd-spec-review → tdd-spec sync.
New PBI/requirement update mode: run dor-gate when a new/changed PBI is being made implementation-ready; run pbi-mockup only for UI/user-journey changes.
Audit mode: compare last_extracted vs git log timestamps → staleness reports.
See .claude/skills/workflow-spec-driven-dev/SKILL.md for full protocol.
MANDATORY SPEC-DRIVEN SYNC GATES:
- Keep three-way sync explicit: spec docs ↔ Section 15 TCs ↔ test code (through tdd-spec + tdd-spec-review + sync + integration-test chain when behavior changes).
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): when lifecycle/state behavior exists, generated/updated TCs MUST require persisted-state transition assertions and invalid-transition rejection checks in test code.
- Run docs-update as a near-final sync before watzup/workflow-end for every mode to keep specs, feature docs, and TDD/spec docs aligned.
```

### spec-to-pbi — Spec to PBI Backlog | Confirm

- Description: Generate a complete, dependency-aware PBI backlog from an existing engineering spec bundle. Audits spec freshness, decomposes large specs by module and feature, creates PBIs/stories/DoR evidence, and produces a ranked backlog.
- Confirm First: yes
- When To Use: User wants to create all PBIs from an existing spec, convert a large engineering spec into a complete prioritized backlog, generate dependent PBIs from docs/specs, split a very big spec into sprint-ready PBIs, or produce a ranked implementation order from spec modules.
- When Not To Use: Raw product vision without an existing spec bundle (use product-discovery), one informal idea (use idea-to-pbi), implementation work after PBIs are ready (use feature or big-feature), spec generation/update only (use spec-driven-dev).
- Sequence: `scout -> spec-discovery -> domain-analysis -> why-review -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> refine -> why-review -> refine-review -> story -> why-review -> story-review -> pbi-challenge -> dor-gate -> pbi-mockup -> prioritize -> docs-update -> watzup -> workflow-end`

Protocol:

```text
SPEC TO PBI BACKLOG PROTOCOL:
Use when the user has an existing engineering spec bundle at docs/specs/{app-bucket}/{system-name}/ and wants all implementable PBIs created from it.

MANDATORY RULES:
1. Treat the spec bundle as canonical input; do not brainstorm unrelated opportunities.
2. Run spec-discovery audit/update first if the bundle may be stale.
3. Build a module x feature/operation inventory before creating any PBI.
4. Decompose large specs into independently deliverable vertical slices. Create explicit shared/foundation PBIs for cross-cutting prerequisites.
5. For each PBI, include acceptance criteria, story points, dependencies, priority, domain impact, test-spec needs, and DoR status.
6. Run domain-analysis when the spec implies new/changed entities, aggregates, invariants, state machines, or cross-service ownership.
7. Run prioritize once at the end across all generated PBIs to produce a dependency-aware ranked backlog.
8. Write artifacts immediately after each module/feature is processed; never hold all PBIs in memory.
9. Run docs-update after prioritize and before watzup so specs, feature docs, and TDD/spec docs stay synchronized.

SCALE GATE:
- 1-3 modules: process inline with task tracking.
- 4-10 modules: split tasks by module and feature group.
- 10+ modules or very large specs: process incrementally by module group, maintain a coverage matrix, and stop only when every spec feature is mapped to PBI/Shared Task/Out-of-scope.

OUTPUTS:
- team-artifacts/pbis/{date}-pbi-{slug}.md for each PBI.
- team-artifacts/backlog/spec-to-pbi-{date}-backlog.md with rank, dependency graph, priority, and recommended order.
- plans/reports/spec-to-pbi-{date}-{system-name}.md with source spec coverage and unresolved questions.
- docs-update report confirming specs, feature docs, and TDD/spec docs are synchronized.
```

### tdd-feature — TDD Feature Implementation

- Description: Test-driven feature: write test specs first, then implement, then verify with integration tests
- Confirm First: no
- When To Use: TDD implementation, test-first development, spec-driven feature, write test specs before implementing
- When Not To Use: Bug fixes, quick changes, documentation-only tasks, implement-first approach
- Sequence: `scout -> investigate -> domain-analysis -> why-review -> tdd-spec -> why-review -> tdd-spec-review -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> cook -> review-domain-entities -> tdd-spec -> why-review -> tdd-spec-review -> tdd-spec [direction=sync] -> integration-test -> integration-test-review -> integration-test-verify -> test -> workflow-review-changes -> sre-review -> changelog -> docs-update -> watzup -> workflow-end`

Protocol:

```text
TDD FEATURE WORKFLOW:
1. Scout & investigate codebase
2. CONDITIONAL: If feature creates/modifies domain entities (grep for Domain/, Entities/, ValueObjects/ in scope), run $domain-analysis to model bounded contexts before writing specs
3. Write test specs FIRST (feature doc Section 15) using $tdd-spec
4. Plan implementation
5. Validate plan
6. Implement feature with $cook
7. CONDITIONAL: If domain entity files changed, run $review-domain-entities (DDD quality review)
8. Update test specs after implementation with $tdd-spec UPDATE mode — reconcile TCs with actual implementation.
9. Review updated TCs with $tdd-spec-review
10. Sync dashboard with $tdd-spec [direction=sync]
11. Generate integration tests from updated specs with $integration-test
12. Run tests & verify all TCs pass
13. Code review and documentation

This workflow enforces test-first development: specs → plan → implement → verify.
MANDATORY TDD FEATURE INVARIANT LOOP:
- Read docs/project-reference/spec-principles.md before writing specs; lock intent + invariants.
- $tdd-spec MUST map each invariant to at least one TC in Section 15.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): tests MUST assert persisted state transitions and invalid-transition rejection where lifecycle logic exists.
- Before $workflow-end, enforce three-way sync: spec docs ↔ TDD docs ↔ integration test code via $tdd-spec + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update.
```

### test-spec-update — Test Spec Update (Post-Change)

- Description: Update test specs and feature docs after code changes, bug fixes, or PR reviews
- Confirm First: no
- When To Use: After fixing a bug update test specs, after code changes update test specs, after PR review update test specs, sync test specs after changes, update test documentation after implementation
- When Not To Use: New feature implementation (use tdd-feature), no code changes yet, idea refinement
- Sequence: `workflow-review-changes -> tdd-spec -> why-review -> tdd-spec-review -> tdd-spec [direction=sync] -> integration-test -> integration-test-review -> integration-test-verify -> test -> docs-update -> workflow-end`

Protocol:

```text
TEST SPEC UPDATE WORKFLOW:
Use after code changes, bug fixes, or PR reviews to keep test specs in sync.
1. Review what changed (git diff or PR diff)
2. Update test specs in feature doc Section 15 using $tdd-spec update mode
3. Sync dashboard (docs/specs/) via $tdd-spec [direction=sync]
4. Generate/update integration tests for changed TCs
5. Run tests to verify

Key: $tdd-spec uses UPDATE mode — diffs existing TCs against current code, adds regression TCs for bugfixes.
MANDATORY TEST-SPEC UPDATE GATES:
- Treat spec docs + Section 15 as intent/invariant source; do not encode buggy behavior as expected.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): when lifecycle transitions are affected, updated tests MUST assert persisted state changes and invalid-transition rejection.
- Enforce three-way sync before $workflow-end: spec docs ↔ TDD docs ↔ test code via $tdd-spec + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update.
```

### test-to-integration — Test Specs to Integration Tests

- Description: Generate integration tests from existing test specifications in feature docs or specs/
- Confirm First: no
- When To Use: Generate integration tests from test specs, create tests from feature docs, implement test cases from specifications, test specs to code
- When Not To Use: No test specs exist yet — use write-integration-test (includes tdd-spec step), test planning phase, documentation-only
- Sequence: `scout -> integration-test -> integration-test-review -> integration-test-verify -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
TEST-TO-INTEGRATION WORKFLOW:
Generate integration tests from existing test specifications.
1. Scout: Find the relevant test spec documents and existing test files
2. Integration Test: Generate test files from TCs in feature doc Section 15
   - Each test gets test spec annotation linking to TC-{FEATURE}-{NNN}
   - Tests use real DI, no mocks (subcutaneous testing pattern)
3. Test: Build and run the generated tests
4. Verify: Check bidirectional traceability (every TC has a test, every test has a TC)
MANDATORY INTEGRATION GENERATION GATES:
- Use Section 15 TCs as canonical intent + invariant source before generating test code.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): generated tests MUST assert entity state transitions and invalid-transition rejection for lifecycle/state-machine behavior.
- Preserve three-way sync before $workflow-end: spec docs ↔ TDD docs ↔ test code via $integration-test + $integration-test-review + $integration-test-verify + $docs-update (plus $tdd-spec [direction=sync] when TC updates occur).
```

### test-verify — Test Verification & Quality

- Description: Comprehensive test verification: review quality, diagnose failures, verify traceability, fix flaky tests
- Confirm First: no
- When To Use: Review test quality, fix flaky tests, diagnose test failures, verify test traceability, test audit, test health check, integration test review, why tests fail, tests not matching specs
- When Not To Use: Writing new tests (use write-integration-test or test-to-integration), creating test specs (use pbi-to-tests), new feature implementation
- Sequence: `scout -> integration-test -> test -> integration-test -> integration-test-review -> integration-test-verify -> docs-update -> watzup -> workflow-end`

Protocol:

```text
TEST VERIFICATION WORKFLOW:
Comprehensive test quality verification covering 4 concerns:
1. Scout: Find all integration test files and related specs
2. Integration Test (review mode): Audit test quality — flaky patterns, missing polling for async assertions, non-unique test data, best practice violations
3. Integration Test (verify mode): Check bidirectional traceability — every test has a TC in feature docs, every TC has a matching test, no orphans
4. Test: Run tests to identify actual failures
5. Integration Test (diagnose mode): For any failures — determine root cause: test bug vs code bug vs infrastructure issue
6. Review: Summarize findings and recommended fixes

KEY FLAKY PATTERNS TO DETECT:
- DB assertions without WaitUntilAsync/polling after async event handlers
- Hardcoded delays instead of condition-based polling
- Non-unique test data causing cross-test interference
- Race conditions from shared mutable state

MISMATCH RESOLUTION:
- Test passes but spec says different behavior → update spec
- Test fails but spec describes expected behavior → update test
- Test exists without spec → create spec from test
- Spec exists without test → generate test from spec

MANDATORY TEST-VERIFY GATES:
- Validate tests against spec intent and Section 15 TC invariants before PASS.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine scenarios, tests MUST assert persisted transitions and invalid-transition rejection.
- If drift exists in spec docs ↔ TDD docs ↔ test code, route through $tdd-spec + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update before closure.
```

### verification — Verification & Validation

- Description: Investigate-first verification: understand context, test/check behavior, report findings with root cause, then fix only if user approves
- Confirm First: no
- When To Use: User wants to verify, validate, confirm, or ensure something is correct/working; sanity check or double-check
- When Not To Use: Bug reports (known broken), investigation-only, feature implementation, code reviews
- Sequence: `scout -> investigate -> test-initial -> plan -> why-review -> plan-review -> why-review -> plan-validate -> why-review -> fix -> prove-fix -> tdd-spec -> why-review -> tdd-spec-review -> tdd-spec [direction=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> test -> docs-update -> watzup -> workflow-end`

Protocol:

```text
VERIFICATION WORKFLOW PROTOCOL:
1. Scout: Find files related to what needs verification
2. Investigate: Understand current behavior, trace code paths
   NOTE: If investigation reveals 'unused' code:
   - Follow Investigation Protocol (CLAUDE.md lines 302-430)
   - Use $investigate skill for evidence-based analysis
   - Require confidence ≥80% before recommending removal
3. Test (initial): Run relevant tests, check behavior, gather evidence
4. **CRITICAL GATE**: STOP and report to user:
   - What was verified
   - Current behavior vs expected behavior
   - Root cause analysis (if issue found)
   - Verdict: PASS or FAIL with evidence
5. ASK USER: 'Should I proceed to fix this?' (only if FAIL)
6. If PASS or user declines  ->  mark remaining steps completed
7. If user approves fix  ->  Plan fix with minimal blast radius
8. Implement fix  ->  Prove fix
9. Update test specs — $tdd-spec UPDATE mode generates regression TCs. Review with $tdd-spec-review. Sync dashboard with $tdd-spec [direction=sync].
10. Simplify code  ->  Review changes  ->  Code review for quality
11. Run tests to verify fix and no regressions
12. Summary report of verification results and any fixes applied
MANDATORY VERIFICATION SYNC GATES:
- For FAIL→fix paths, confirm intended behavior + invariants from spec docs before updating tests.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state behavior, verification tests MUST assert persisted transitions and invalid-transition rejection.
- Before $workflow-end, enforce three-way sync: spec docs ↔ Section 15 ↔ test code via $tdd-spec + $tdd-spec-review + $tdd-spec [direction=sync] + $integration-test + $integration-test-review + $integration-test-verify + $docs-update.
```

### visualize — Visual Diagram

- Description: Create visual Excalidraw diagrams from codebase investigation or web research
- Confirm First: no
- When To Use: User wants to visualize, diagram, draw, or create visual representation of workflows, architectures, concepts, systems, or research findings
- When Not To Use: Text-only documentation, code implementation, bug fixes, non-visual outputs
- Sequence: `scout -> investigate -> excalidraw-diagram -> workflow-end`

Protocol:

```text
VISUAL DIAGRAM PROTOCOL:
This workflow creates Excalidraw diagrams. Two paths based on source:

PATH A — Codebase Visualization (default if topic is about this project):
1. Scout: Find relevant files, architecture, and code patterns
2. Investigate: Trace code paths, understand relationships and data flow
3. Diagram: Generate .excalidraw file visualizing the findings

PATH B — Knowledge Visualization (if topic requires web research):
1. Web Research: Research the topic broadly (max 10 WebSearch)
2. Deep Research: Deep-dive into top sources (max 8 WebFetch)
3. Diagram: Generate .excalidraw file visualizing the synthesized knowledge

GUARDRAILS:
- Ask user which path (A or B) if ambiguous
- Output .excalidraw files to docs/diagrams/ (create dir if needed)
- Use kebab-case filenames describing the diagram subject
- MUST ATTENTION render and validate diagram (render-view-fix loop)
- Read references/color-palette.md and references/element-templates.md before generating
```

### workflow-seed-test-data — Seed Test Data

- Description: Generate or enhance test data seeders that simulate QC happy-path scenarios for a feature area. Scouts existing patterns, implements idempotent command-based seeders, reviews compliance, simplifies.
- Confirm First: no
- When To Use: User wants to seed test data, implement data seeders, generate realistic development environment data, add happy-path scenarios for a feature, create dummy data for manual QC testing, fill dev database with realistic test cases
- When Not To Use: Writing integration tests (use write-integration-test), production data migration (use migration workflow), seeding reference/config data without domain commands
- Sequence: `scout -> investigate -> seed-test-data -> review-changes -> code-simplifier -> docs-update -> watzup -> workflow-end`

Protocol:

```text
SEED TEST DATA PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → 'Data Seeders' context group for project-specific seeder base class, file location, config keys, and DI registration pattern. Then read docs/project-reference/seed-test-data-reference.md for the complete project-specific implementation guide.

UNIVERSAL RULES (apply to ALL projects):
1. Environment gate FIRST — development or config-enabled only. NEVER production.
2. Command-based ONLY — call application-layer commands. NEVER direct DB/repo for domain entities. Seeder = QC orchestrator.
3. No duplicate logic — commands own validation + domain rules; seeder provides valid inputs.
4. Idempotency — check existing count BEFORE seeding; seed only remaining = target - existing.
5. Count-configurable — read count from project config key (see project-config.json). Loop from existing to target.
6. Restart-safe — idempotency inherently handles restarts.

PROJECT-SPECIFIC CONTEXT:
- Read docs/project-config.json → 'Data Seeders' rules for environment gate key, count key, and DI registration.
- Read docs/project-reference/seed-test-data-reference.md for implementation template, reference files, and project-specific DI scope rules.
```

### write-integration-test — Write Integration Tests

- Description: Write or update integration tests for existing code — spec-first: investigate domain logic → write/update specs → generate test code → 6-gate review → run and verify
- Confirm First: no
- When To Use: Write integration tests for a specific command/handler, add test coverage to an untested feature, update integration tests after code changes, integration test authoring from scratch for a feature area, cover uncommitted code changes with integration tests
- When Not To Use: No implementation yet (use feature or bugfix), spec-only with no code generation (use pbi-to-tests), specs already exist and just need code generation (use test-to-integration), auditing existing tests for quality/flakiness (use test-verify)
- Sequence: `scout -> investigate -> tdd-spec -> why-review -> tdd-spec-review -> integration-test -> integration-test-review -> integration-test-verify -> tdd-spec [direction=sync] -> docs-update -> watzup -> workflow-end`

Protocol:

```text
WRITE INTEGRATION TEST PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → framework.integrationTestDoc for project-specific test patterns, helper classes, and async wait conventions.
⚠️ MANDATORY: Understand domain logic BEFORE writing assertions
1. Scout: Find target command/handler files; locate existing integration tests in same service for pattern matching
2. Investigate: Read the handler/entity/event source — understand WHAT fields change, WHAT entities are created/updated/deleted, WHAT event handlers fire. This is the prerequisite for correct assertions.
3. TDD Spec: Write/update test specs in feature doc Section 15 (TC-{FEATURE}-{NNN} codes). Path from docs/project-config.json → workflowPatterns.featureDocPath. CREATE mode for new tests, UPDATE mode for changed behavior.
4. TDD Spec Review: Validate spec coverage — GIVEN/WHEN/THEN completeness, happy path + validation failure + auth paths, no duplicate TC codes
5. Integration Test: Generate test files from TC specs. FROM-PROMPT for specific target, FROM-CHANGES for git diff.
   RULES (project-specific patterns from docs/project-config.json → framework.integrationTestDoc):
   - NO smoke-only tests (no-exception alone is FORBIDDEN)
   - ALL DB assertions wrapped in project async-wait helper
   - ALL string data uses project unique-data helper
   - Each test method has TC spec annotation linking to TC-{FEATURE}-{NNN}
   - Minimum 3 tests per command: happy path + validation failure + DB state check
6. Integration Test Review: 6-gate quality check (assertion value, data state, repeatability, domain logic, traceability, three-way sync). Mandatory fix loop + fresh sub-agent re-check. NEVER proceed with CRITICAL/HIGH issues outstanding.
7. Integration Test Verify: Run tests via quickRunCommand from docs/project-config.json → integrationTestVerify. Report exact pass/fail counts with test runner output. NEVER mark complete without real output.
8. Test Specs Docs: Sync cross-module spec dashboard. Update IntegrationTest fields with {File}::{MethodName} traceability links.
9. Docs Update: Update feature doc evidence fields and version history if test coverage changed materially.
10. Summary report

GUARDRAIL: Read handler source BEFORE writing any assertions. Use project async-wait helper for all DB assertions — no exceptions.
MANDATORY WRITE-INTEGRATION-TEST GATES:
- Read docs/project-reference/spec-principles.md before $tdd-spec and keep invariant language explicit in TCs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine behavior, generated integration tests MUST assert persisted state transitions and invalid-transition rejection.
- Maintain three-way sync before $workflow-end: spec docs ↔ TDD docs ↔ test code via $tdd-spec + $tdd-spec-review + $integration-test + $integration-test-review + $integration-test-verify + $tdd-spec [direction=sync] + $docs-update.
```

<!-- WORKFLOWS:END -->

# Primary Workflow

## Quick Summary

**Goal:** Define the standard development workflow phases and map them to the workflow catalog in `workflows.json`.

**Core Phases (all workflows follow subsets of these):**

1. **Discover** — Scout files, investigate patterns, run graph traces
2. **Plan** — `/plan` + `/plan-review` + `/plan-validate`, save in `./plans/`
3. **Design Review** — `/why-review` (rationale), `/spec [mode=tests]` + `/review-artifact --type=spec-tests` (test specs)
4. **Implement** — `/feature-implement` or `/plan-execute`, compile-check after every file change
5. **Verify** — `/prove-fix`, `/test`, `/integration-test`, `/spec [mode=sync]`
6. **Quality** — `/workflow-review-changes` (canonical review-changes workflow: review-changes → why-review → parallel reviewers → code-simplifier → verification → plan/plan-execute/restart)
7. **Ship** — `/production-readiness-review`, `/security-review`, `/changelog`, `/docs-update`, `/watzup`, `/workflow-end`

**Key Rules:**

- Understand code FIRST before any modification — mandatory, no exceptions
- Compile-check after every code change
- Never use fake data or mocks just to pass tests
- Activate relevant skills from catalog during the process
- Every claim needs `file:line` evidence, confidence >80% to act

---

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** Ensure token efficiency while maintaining high quality.

## Phase 0: Understand Code First (MANDATORY)

> **Understand-Code-First** — Do NOT write code, create plans, or attempt fixes until you READ existing code.
> Search 3+ similar implementations first. Run graph on key files (MANDATORY when graph.db exists).

- Read existing code before modifying. Validate assumptions with evidence. Search before creating.

## Phase 1: Planning

- Use `/plan` skill to create an implementation plan with tasks in `./plans/`
- Use `/research` skill for investigating technical topics before planning
- Validate plan via `/plan-review` (recursive until PASS) and `/plan-validate` (critical questions)
- **DO NOT** create new enhanced files — update existing files directly

## Phase 2: Design Review

- Use `/why-review` to validate design rationale before implementation
- Use `/spec [mode=tests]` to write test specifications (feature doc Section 8) — CREATE mode before implementation, UPDATE mode after
- Use `/review-artifact --type=spec-tests` to review test specs for coverage and correctness
- For features: two planning rounds — PLAN1 (architecture) then PLAN2 (incorporating test strategy)

## Phase 3: Implementation

- Use `/feature-implement` or `/plan-execute` skill to implement the plan
- Write clean, readable, maintainable code
- Follow established architectural patterns (CQRS, project store, BEM)
- Handle edge cases and error scenarios
- **[IMPORTANT]** After creating or modifying code, run compile command to check for errors

## Phase 4: Verification

- Use `/prove-fix` to build code proof traces (confidence scores, stack-trace-style evidence) — MANDATORY for bugfixes
- Use `/test` skill to run tests and analyze results
- Use `/integration-test` to generate integration tests from specs
- Use `/spec [mode=sync]` to sync test spec dashboard
- **IMPORTANT:** Never use fake data, mocks, cheats, or tricks just to pass the build
- **IMPORTANT:** Fix failing tests and re-run until all pass

## Phase 5: Quality

- Use `/workflow-review-changes` for the canonical review-changes workflow (review-changes → why-review → parallel reviewers → code-simplifier → verification → plan/plan-execute/restart), then continue until clean
- Alternatively use individual skills: `/code-simplifier`, `/code-review`, `/review-architecture`, `/performance-review`
- Follow coding standards and conventions
- Optimize for performance and maintainability

## Phase 6: Ship

- Use `/production-readiness-review` for production readiness (service-layer/API changes)
- Use `/security-review` for security review
- Use `/changelog` to update changelog entries
- Use `/docs-update` to update documentation if needed
- Use `/watzup` for summary report of all changes
- Use `/workflow-end` to clear workflow state

## Phase 7: Debugging (when issues arise)

- Use `/debug-investigate` skill for systematic debugging when issues are reported
- For non-trivial bugs, failed verification, or stale/incorrect final outputs, start from the observed end state and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/origin before proposing a fix
- Enumerate every feeder path and root-cause hypothesis; a fix is blocked until the owning fix layer and forward convergence proof are written
- Use `/fix` skill to apply fixes after root cause is identified
- Re-run tests after every fix to verify no regressions

---

## Workflow Catalog Reference

All workflows are defined in `.claude/workflows.json` — the canonical catalog (17 workflows). Each workflow composes a subset of the phases above into a specific sequence. Tables below are regenerated from the live catalog.

### Core Development Workflows

| Workflow            | Phases Used                     | When To Use                                                                 |
| ------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| **feature**         | 0→1→2→3→4→5→6                   | Well-defined feature implementation (spec-driven, test specs before code)   |
| **bugfix**          | 0→7→1→2→3→4→5→6                 | Bug reports, debugging, troubleshooting with end-to-start trace + RED/GREEN |
| **refactor**        | 0→1→2→3→4→5→6                   | Code restructuring without behavior change, technical debt                  |
| **big-feature**     | Full lifecycle with research    | Large/ambiguous features needing market research, domain modeling           |
| **review-changes**  | 5→3→5→6                         | Pre-commit review of uncommitted changes (recursive fix loop)               |
| **feature-spec**    | 0→1→2→6                         | Business feature docs (tech-free 8-section template, TCs in Section 8)      |
| **greenfield-init** | Full inception + implementation | New project from scratch                                                    |

### PBI & Discovery Workflows

| Workflow              | Flow                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **idea-to-pbi**       | PO/BA: idea (or PO artifact) → review → refine → stories → spec [mode=tests] (specs) → domain-analysis → plan → DoR gate → prioritize |
| **product-discovery** | Raw vision/problem → brainstorm → N PBIs with stories, challenge review, DoR gate, wireframes → ranked backlog                        |
| **spec-to-pbi**       | Existing Feature Specs → dependency-aware PBI backlog with stories, DoR gate, prioritization                                          |

### Spec-Driven Workflows

| Workflow        | Purpose                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **build-specs** | Author/maintain the canonical tech-free 8-section Feature Spec — initial generation, sync after changes, health audits |
| **spec-sync**   | Update test specs and feature docs after code changes, bug fixes, or PR reviews                                        |

### Test & Data Workflows

| Workflow                                           | Purpose                                                                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **e2e** (`--source=recording\|update-ui\|changes`) | Recording → Playwright (recording), update screenshot baselines (update-ui), or sync E2E tests to code/spec changes (changes) |
| **write-integration-test**                         | Spec-first integration test authoring for existing code: specs → test code → review gates → run and verify                    |
| **workflow-seed-test-data**                        | Generate/enhance idempotent test-data seeders simulating QC happy-path scenarios                                              |

### Design & Visualization Workflows

| Workflow      | Purpose                                     |
| ------------- | ------------------------------------------- |
| **visualize** | Codebase or knowledge → Excalidraw diagrams |

### Research & Content Workflows

| Workflow                                                              | Purpose                                                                                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **research** (`--output=synthesis\|business-eval\|marketing\|course`) | Web sources → synthesize into a cited knowledge report, business/market evaluation, marketing strategy, or course material |

---

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** understand existing code FIRST (read, grep 3+ patterns, graph trace) before ANY modification
**MANDATORY IMPORTANT MUST ATTENTION** compile-check after every code file change
**MANDATORY IMPORTANT MUST ATTENTION** never use fake data/mocks/cheats just to pass tests — fix real issues
**MANDATORY IMPORTANT MUST ATTENTION** activate relevant skills from catalog during the process
**MANDATORY IMPORTANT MUST ATTENTION** auto-select the best-matching workflow from the catalog and activate it via `/start-workflow <workflowId>` — selection is model-driven; do not ask the user to confirm activation
**MANDATORY IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding investigation/plan/fix

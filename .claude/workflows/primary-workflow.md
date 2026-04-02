# Primary Workflow

## Quick Summary

**Goal:** Define the standard development workflow phases and map them to the workflow catalog in `workflows.json`.

**Core Phases (all workflows follow subsets of these):**

1. **Discover** — Scout files, investigate patterns, run graph traces
2. **Plan** — `/plan` + `/plan-review` + `/plan-validate`, save in `./plans/`
3. **Design Review** — `/why-review` (rationale), `/tdd-spec` + `/tdd-spec-review` (test specs)
4. **Implement** — `/cook` or `/code`, compile-check after every file change
5. **Verify** — `/prove-fix`, `/test`, `/integration-test`, `/test-specs-docs`
6. **Quality** — `/workflow-review-changes` (consolidated: code-simplifier + review-changes + review-architecture + code-review + performance)
7. **Ship** — `/sre-review`, `/security`, `/changelog`, `/docs-update`, `/watzup`, `/workflow-end`

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
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

- Read existing code before modifying. Validate assumptions with evidence. Search before creating.

## Phase 1: Planning

- Use `/plan` skill to create an implementation plan with tasks in `./plans/`
- Use `/research` skill for investigating technical topics before planning
- Validate plan via `/plan-review` (recursive until PASS) and `/plan-validate` (critical questions)
- **DO NOT** create new enhanced files — update existing files directly

## Phase 2: Design Review

- Use `/why-review` to validate design rationale before implementation
- Use `/tdd-spec` to write test specifications (feature doc Section 17) — CREATE mode before implementation, UPDATE mode after
- Use `/tdd-spec-review` to review test specs for coverage and correctness
- For features: two planning rounds — PLAN1 (architecture) then PLAN2 (incorporating test strategy)

## Phase 3: Implementation

- Use `/cook` or `/code` skill to implement the plan
- Write clean, readable, maintainable code
- Follow established architectural patterns (CQRS, project store, BEM)
- Handle edge cases and error scenarios
- **[IMPORTANT]** After creating or modifying code, run compile command to check for errors

## Phase 4: Verification

- Use `/prove-fix` to build code proof traces (confidence scores, stack-trace-style evidence) — MANDATORY for bugfixes
- Use `/test` skill to run tests and analyze results
- Use `/integration-test` to generate integration tests from specs
- Use `/test-specs-docs` to sync test spec dashboard
- **IMPORTANT:** Never use fake data, mocks, cheats, or tricks just to pass the build
- **IMPORTANT:** Fix failing tests and re-run until all pass

## Phase 5: Quality

- Use `/workflow-review-changes` for consolidated review (code-simplifier + review-changes + review-architecture + code-review + performance), then plan + fix + re-review recursively until clean
- Alternatively use individual skills: `/code-simplifier`, `/code-review`, `/review-architecture`, `/performance`
- Follow coding standards and conventions
- Optimize for performance and maintainability

## Phase 6: Ship

- Use `/sre-review` for production readiness (service-layer/API changes)
- Use `/security` for security review
- Use `/changelog` to update changelog entries
- Use `/docs-update` to update documentation if needed
- Use `/watzup` for summary report of all changes
- Use `/workflow-end` to clear workflow state

## Phase 7: Debugging (when issues arise)

- Use `/debug` skill for systematic debugging when issues are reported
- Use `/fix` skill to apply fixes after root cause is identified
- Re-run tests after every fix to verify no regressions

---

## Workflow Catalog Reference

All workflows are defined in `.claude/workflows.json`. Each workflow composes a subset of the phases above into a specific sequence. Key workflows:

| Workflow                          | Phases Used                        | When To Use                                         |
| --------------------------------- | ---------------------------------- | --------------------------------------------------- |
| **feature**                       | 0→1→2→3→4→5→6                      | Well-defined feature implementation                 |
| **bugfix**                        | 0→1→3→4→5→6→7                      | Bug reports, debugging, troubleshooting             |
| **hotfix**                        | 0→1→3→4→5→6                        | P0/P1 production emergencies (lightweight planning) |
| **refactor**                      | 0→1→2→3→4→5→6                      | Code restructuring without behavior change          |
| **investigation**                 | 0 only                             | Read-only codebase exploration                      |
| **review-changes**                | 5→3→5→6                            | Pre-commit review of uncommitted changes            |
| **review**                        | 5→3→5→6                            | Code review, PR review, quality audit               |
| **verification**                  | 0→4→(3→4→5 if fix needed)→6        | Verify/validate correctness                         |
| **big-feature**                   | Full lifecycle with research       | Large/ambiguous features needing market research    |
| **feature-with-integration-test** | 0→1→2→3→4→5→6                      | Feature + spec-first integration testing            |
| **tdd-feature**                   | 0→2→1→3→4→5→6                      | Test-first development (specs before plan)          |
| **batch-operation**               | 1→2→3→4→5→6                        | Bulk multi-file modifications                       |
| **documentation**                 | 0→1→3→5→6                          | Documentation creation/update                       |
| **feature-docs**                  | 0→1→3→5→6                          | Business feature docs (26-section template)         |
| **testing**                       | 4 only                             | Run test suites                                     |
| **performance**                   | 0→1→2→3→4→5→6                      | Performance investigation and optimization          |
| **migration**                     | 0→1→3→5→6                          | Database schema/data migrations                     |
| **deployment**                    | 0→1→3→5→6                          | CI/CD, Docker, K8s setup                            |
| **package-upgrade**               | 0→1→3→4→5→6                        | Dependency upgrades                                 |
| **security-audit**                | 0→6                                | Security review and vulnerability assessment        |
| **quality-audit**                 | 5→1→3→4→6                          | Code quality audit with fix loop                    |
| **release-prep**                  | 6 only                             | Pre-release quality gate                            |
| **research**                      | Web research → synthesis → review  | Topic research and report generation                |
| **greenfield-init**               | Full inception + implementation    | New project from scratch                            |
| **full-feature-lifecycle**        | All roles PO→BA→Designer→Dev→QA→PO | End-to-end with formal handoffs                     |

### Role-Based Handoff Workflows

| Workflow               | Flow                                     |
| ---------------------- | ---------------------------------------- |
| **idea-to-pbi**        | PO: idea → refine → stories → prioritize |
| **idea-to-tdd**        | PO: idea → refine → TDD specs            |
| **po-ba-handoff**      | PO → BA: idea → refine → stories         |
| **ba-dev-handoff**     | BA → Dev: quality gate → plan            |
| **design-dev-handoff** | Designer → Dev: design spec → plan       |
| **dev-qa-handoff**     | Dev → QA: handoff → test spec            |
| **qa-po-acceptance**   | QA → PO: quality gate → acceptance       |
| **sprint-planning**    | PO: prioritize → dependency → team-sync  |
| **sprint-retro**       | PM: status → retrospective               |
| **pre-development**    | QC: quality gate → plan → validate       |
| **pbi-to-tests**       | QA: generate TDD specs from PBI          |
| **pm-reporting**       | PM: status report → dependency analysis  |

### Content & Research Workflows

| Workflow                | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| **research**            | Web research → deep research → synthesis → review |
| **course-building**     | Research → course material with Bloom taxonomy    |
| **marketing-strategy**  | Research → market analysis → strategy             |
| **business-evaluation** | Research → BMC → financials → risk → verdict      |
| **visualize**           | Codebase or knowledge → Excalidraw diagrams       |
| **design-workflow**     | Design spec → interface/frontend design → review  |

### E2E Test Workflows

| Workflow                | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| **e2e-from-recording**  | Chrome DevTools recording → Playwright test            |
| **e2e-update-ui**       | Update screenshot baselines after UI changes           |
| **e2e-from-changes**    | Sync E2E tests with code/spec changes                  |
| **test-spec-update**    | Update test specs after code changes                   |
| **test-to-integration** | Generate integration tests from test specs             |
| **test-verify**         | Test quality audit, flaky test detection, traceability |

---

## Closing Reminders

- **MUST** understand existing code FIRST (read, grep 3+ patterns, graph trace) before ANY modification
- **MUST** compile-check after every code file change
- **MUST** never use fake data/mocks/cheats just to pass tests — fix real issues
- **MUST** activate relevant skills from catalog during the process
- **MUST** detect nearest matching workflow from catalog and ask user to confirm activation
- **MUST** run at least ONE graph command on key files before concluding investigation/plan/fix

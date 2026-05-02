---
name: scan-integration-tests
description: '[Documentation] Scan project and populate/sync docs/project-reference/integration-test-reference.md with test base classes, fixtures, helpers, configuration, and service-specific setup.'
---

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

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current patterns
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan test codebase → populate `docs/project-reference/integration-test-reference.md` with test architecture, base classes, fixtures, helpers, configuration patterns, and service-specific setup conventions.

**Workflow:**

1. **Classify** — Detect test framework, infrastructure type, and scan mode
2. **Scan** — Parallel sub-agents discover patterns with `file:line` evidence
3. **Report** — Write findings incrementally to report file
4. **Generate** — Build/update reference doc from report
5. **Fresh-Eyes** — Round 2 verification validates all examples

**Key Rules:**

- Generic — works with any test framework (xUnit, NUnit, Jest, Vitest, pytest, JUnit, etc.)
  **MUST ATTENTION** detect framework AND infrastructure type FIRST — patterns differ significantly
- Focus on integration/subcutaneous tests (not unit tests) — tests that touch real infrastructure
- Every code example from actual project files with `file:line`

---

# Scan Integration Tests

## Phase 0: Detect Framework, Infrastructure & Mode

**[BLOCKING]** Before any other step, run in parallel:

1. Read `docs/project-reference/integration-test-reference.md`
    - Detect mode: Init (placeholder) or Sync (populated)
    - In Sync mode: extract section list → skip re-scanning well-documented sections

2. Detect test framework:

| Signal                         | Framework     | Key Patterns to Search                                  |
| ------------------------------ | ------------- | ------------------------------------------------------- |
| `*.csproj` with xUnit          | .NET xUnit    | `[Fact]`, `[Theory]`, `IAsyncLifetime`, `IClassFixture` |
| `*.csproj` with NUnit          | .NET NUnit    | `[Test]`, `[SetUp]`, `[TearDown]`, `[OneTimeSetUp]`     |
| `package.json` with jest       | Jest          | `describe`, `it`, `beforeAll`, `afterAll`, `jest.mock`  |
| `package.json` with vitest     | Vitest        | `describe`, `test`, `vi.mock`, `beforeEach`             |
| `package.json` with playwright | Playwright    | `test.describe`, `page`, `expect`, `fixtures`           |
| `pytest.ini`/`conftest.py`     | Python pytest | `@pytest.fixture`, `conftest`, `@pytest.mark`           |
| `pom.xml` with JUnit           | Java JUnit    | `@Test`, `@BeforeAll`, `@SpringBootTest`                |

3. Detect infrastructure approach:

| Signal                    | Approach                | Agent Focus                             |
| ------------------------- | ----------------------- | --------------------------------------- |
| `Testcontainers` in deps  | Docker-based real infra | Container lifecycle, startup time       |
| `WebApplicationFactory`   | In-process server       | DI override patterns, test server setup |
| `appsettings.test.json`   | Config-based test infra | Connection string overrides, env vars   |
| In-memory DB patterns     | Fake infra              | DB reset strategies, seeding            |
| `WaitUntilAsync`, polling | Eventual consistency    | Async assertion patterns                |

4. Detect scan mode:

| Mode | Condition                               | Action                                                 |
| ---- | --------------------------------------- | ------------------------------------------------------ |
| Init | Target doc doesn't exist or placeholder | Full scan, create all sections                         |
| Sync | Target doc has real content             | Diff scan — check for new base classes, helper changes |

5. Load test project paths from `docs/project-config.json` `integrationTesting` section if available.

**Evidence gate:** Confidence <60% on framework detection → report uncertainty, ask user before proceeding.

## Phase 1: Plan

Create task tracking entries for each sub-agent and each verification step. **Do not start Phase 2 without tasks created.**

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **2 general-purpose sub-agents** in parallel. Each MUST:

- Write findings incrementally after each service/module — NEVER batch at end
- Cite `file:line` for every pattern example
- NEVER hardcode test file counts — use grep expressions

All findings → `plans/reports/scan-integration-tests-{YYMMDD}-{HHMM}-report.md`

### Agent 1: Test Infrastructure

**Think (Base Class dimension):** What does the base class provide — DI container, test server, database connection, fixture lifecycle? Is there a hierarchy (base → service-specific → test)? What must a new test author know to write their first test?

**Think (Isolation dimension):** How is test isolation achieved — unique IDs per run, database reset, transaction rollback, separate tenant? Can tests run in parallel? What breaks parallelism?

**Think (Infrastructure dimension):** What must be running for tests to pass? How is the infrastructure provisioned — Docker, in-memory, seeded fixtures? What's the startup cost?

Security flag: If test credentials are found hardcoded in source files (not env vars or secret stores), flag as CRITICAL security issue in report.

- Grep for test base classes (`extends.*Test`, `TestBase`, `IntegrationTest`, `IClassFixture`, `PlatformServiceIntegrationTestWithAssertions`)
- Find test fixtures and factories (`WebApplicationFactory`, `TestFixture`, `conftest`, module bootstrappers)
- Discover test configuration (`appsettings.test.json`, `.env.test`, test container setup, port bindings)
- Find DI/service registration overrides for testing (mock registrations, test doubles)
- Look for test data builders, seed data patterns, and unique name generators

### Agent 2: Test Patterns & Conventions

**Think (Assertion dimension):** What assertion patterns are used? Is there a waiting/polling mechanism for async operations? Are assertions on specific field values or just "does not throw"?

**Think (Data dimension):** How is test data created — builders, factories, seed methods? How is uniqueness ensured across runs? Is there a cleanup strategy?

**Think (Coverage dimension):** Which services have tests? Which are missing? What's the test-to-feature ratio?

- Grep for assertion helpers (`WaitUntilAsync`, custom assertion extensions, `Should*` methods)
- Find common test patterns (Arrange-Act-Assert, Given-When-Then, test data flow)
- Discover test categorization (traits, categories, tags — how tests are grouped/filtered)
- Find data uniqueness patterns (`Ulid.NewUlid()`, `Guid.NewGuid()`, timestamp suffixes)
- Look for infrastructure interaction patterns (database state verification, queue drain, cache clear)
- Map which services have test projects (coverage distribution) — use grep expressions, not counts

## Phase 3: Analyze & Generate

Read full report. Apply fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts from report findings.

**Round 2 (fresh sub-agent, zero memory):**

- Does every code example exist at the claimed `file:line`? (Glob + Grep verify)
- Do base class names in examples match actual class definitions? (Grep verify)
- Are security-sensitive patterns (hardcoded credentials) flagged?
- Are test coverage stats expressed as grep expressions, not hardcoded counts?

### Target Sections

| Section                    | Content                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Test Architecture**      | Overall test strategy, framework, infrastructure approach, isolation mechanism |
| **Test Base Classes**      | Hierarchy with what each base provides; when to use which                      |
| **Fixtures & Factories**   | Test fixture setup, DI overrides, module bootstrappers                         |
| **Test Helpers**           | Assertion helpers, data builders, wait patterns with examples                  |
| **Configuration**          | Test config files, connection strings, environment variables                   |
| **Service-Specific Setup** | Per-service test differences, custom overrides, module registration            |
| **Test Data Patterns**     | How data is created, unique naming, cleanup strategies                         |
| **New Test Quickstart**    | Minimal steps to add a new test for a new service                              |
| **Running Tests**          | Commands for all, filtered, parallel, CI integration                           |

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve unchanged sections
3. Verify (Glob + Grep): ALL code example file paths exist AND class names match
4. Verify no hardcoded file counts — use grep expressions
5. Verify security flag present if credentials found
6. Report: sections created vs updated, framework detected, coverage gaps

---

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->
<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.

<!-- /SYNC:output-quality-principles:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> **Verify AI-generated content against actual code.** AI hallucinates base class names, fixture methods, and assertion helpers. Grep to confirm existence before documenting.
> **Trace full dependency chain after edits.** Always trace full chain.
> **Surface ambiguity before coding.** NEVER pick silently.
> **NEVER hardcode test file counts.** Use grep-expression stats, not hardcoded numbers.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting
**IMPORTANT MUST ATTENTION** detect framework AND infrastructure type in Phase 0 — patterns depend on both
**IMPORTANT MUST ATTENTION** cite `file:line` for every code example — NEVER fabricate class or method names
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each service — NEVER batch at end
**IMPORTANT MUST ATTENTION** NEVER hardcode test file counts — use grep expressions
**IMPORTANT MUST ATTENTION** Round 2 fresh-eyes is non-negotiable — NEVER declare PASS after Round 1

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| "Framework obvious, skip Phase 0 detection"  | Phase 0 is BLOCKING — infrastructure approach determines which patterns to scan     |
| "Smoke-only test assertions are fine"        | NEVER document smoke-only as acceptable unless infrastructure is truly unobservable |
| "Base class looks right from memory"         | Grep-verify every base class name — AI hallucinates class hierarchies               |
| "Coverage stats obvious from directory scan" | NEVER hardcode counts — use grep expressions that stay accurate as tests are added  |
| "Round 2 not needed for test docs"           | Main agent rationalizes own fabricated examples. Fresh-eyes mandatory.              |
| "Credential security flag not needed"        | Hardcoded test creds are a CRITICAL security issue — ALWAYS flag if found           |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

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
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->

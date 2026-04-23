---
name: scan-integration-tests
version: 2.0.0
last_reviewed: 2026-04-22
description: '[Documentation] Scan project and populate/sync docs/project-reference/integration-test-reference.md with test base classes, fixtures, helpers, configuration, and service-specific setup.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> - **Verify AI-generated content against actual code.** AI hallucinates base class names, fixture methods, and assertion helpers. Grep to confirm existence before documenting.
> - **Trace full dependency chain after edits.** Always trace full chain.
> - **Surface ambiguity before coding.** NEVER pick silently.
> - **NEVER hardcode test file counts.** Use grep-expression stats, not hardcoded numbers.

<!-- /SYNC:ai-mistake-prevention -->

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
- **MUST ATTENTION** detect framework AND infrastructure type FIRST — patterns differ significantly
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

Create `TaskCreate` entries for each sub-agent and each verification step. **Do not start Phase 2 without tasks created.**

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

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting
- **IMPORTANT MUST ATTENTION** detect framework AND infrastructure type in Phase 0 — patterns depend on both
- **IMPORTANT MUST ATTENTION** cite `file:line` for every code example — NEVER fabricate class or method names
- **IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each service — NEVER batch at end
- **IMPORTANT MUST ATTENTION** NEVER hardcode test file counts — use grep expressions
- **IMPORTANT MUST ATTENTION** Round 2 fresh-eyes is non-negotiable — NEVER declare PASS after Round 1
      <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
      <!-- /SYNC:scan-and-update-reference-doc:reminder -->
      <!-- SYNC:output-quality-principles:reminder -->
- **IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.
      <!-- /SYNC:output-quality-principles:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** critical thinking — every claim needs traced proof, confidence >80% to act. Never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** AI mistake prevention — holistic-first, fix at responsible layer, surface ambiguity before coding, re-read after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| "Framework obvious, skip Phase 0 detection"  | Phase 0 is BLOCKING — infrastructure approach determines which patterns to scan     |
| "Smoke-only test assertions are fine"        | NEVER document smoke-only as acceptable unless infrastructure is truly unobservable |
| "Base class looks right from memory"         | Grep-verify every base class name — AI hallucinates class hierarchies               |
| "Coverage stats obvious from directory scan" | NEVER hardcode counts — use grep expressions that stay accurate as tests are added  |
| "Round 2 not needed for test docs"           | Main agent rationalizes own fabricated examples. Fresh-eyes mandatory.              |
| "Credential security flag not needed"        | Hardcoded test creds are a CRITICAL security issue — ALWAYS flag if found           |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.

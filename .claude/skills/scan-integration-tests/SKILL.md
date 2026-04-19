---
name: scan-integration-tests
version: 1.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/integration-test-reference.md with test base classes, fixtures, helpers, configuration, and service-specific setup.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — When updating reference docs: (1) Read existing doc first. (2) Scan codebase for current state (grep/glob). (3) Diff findings vs doc content. (4) Update ONLY sections where code diverged from doc. (5) Preserve manual annotations. (6) Update metadata (date, counts). NEVER rewrite entire doc — surgical updates only.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — 10 rules for reference docs: (1) No inventories/counts, (2) No directory trees, (3) No TOCs, (4) Rules over descriptions, (5) 1 example per pattern, (6) Tables over prose, (7) Primacy-recency anchoring (critical rules in first+last 5 lines), (8) No checkbox checklists — use "MUST ATTENTION verify X", (9) Min density: 8 MUST ATTENTION/NEVER/ALWAYS per 100 lines, (10) Verify base class names and code examples preserved.

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan test codebase and populate `docs/project-reference/integration-test-reference.md` with test architecture, base classes, fixtures, helpers, configuration patterns, and service-specific setup conventions.

**Workflow:**

1. **Read** — Load current target doc, detect init vs sync mode
2. **Scan** — Discover test patterns via parallel sub-agents
3. **Report** — Write findings to external report file
4. **Generate** — Build/update reference doc from report
5. **Verify** — Validate code examples reference real files

**Key Rules:**

- Generic — works with any test framework (xUnit, NUnit, Jest, Vitest, pytest, JUnit, etc.)
- Detect test framework first, then scan for framework-specific patterns
- Focus on integration/E2E tests (not unit tests) — tests that touch real infrastructure
- Every code example must come from actual project files with file:line references

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Scan Integration Tests

## Phase 0: Read & Assess

1. Read `docs/project-reference/integration-test-reference.md`
2. Detect mode: init (placeholder) or sync (populated)
3. If sync: extract existing sections and note what's already well-documented

## Phase 1: Plan Scan Strategy

Detect test framework and infrastructure:

- `*.csproj` with xUnit/NUnit/MSTest references → .NET tests
- `package.json` with jest/vitest/playwright/cypress → JS/TS tests
- `pom.xml` with junit/testcontainers → Java tests
- `pytest.ini` / `conftest.py` → Python tests

Identify test infrastructure:

- Testcontainers usage (Docker-based test infra)
- In-memory databases vs real databases
- Custom test fixtures and factories
- WebApplicationFactory / TestServer patterns

Use `docs/project-config.json` if available for test project locations.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **2 Explore agents** in parallel:

### Agent 1: Test Infrastructure

- Grep for test base classes (`extends.*Test`, `TestBase`, `IntegrationTest`, `[Collection]`)
- Find test fixtures and factories (WebApplicationFactory, TestFixture, conftest)
- Discover test configuration (appsettings.test.json, .env.test, test containers setup)
- Find DI/service registration overrides for testing
- Look for test data builders and seed data patterns

### Agent 2: Test Patterns & Conventions

- Grep for test helper methods (assertion helpers, setup utilities, cleanup methods)
- Find common test patterns (Arrange-Act-Assert, Given-When-Then)
- Discover test categorization (traits, categories, tags for grouping)
- Find test data patterns (unique name generators, random data, factory patterns)
- Look for infrastructure interaction patterns (database reset, queue drain, cache clear)
- Count test files per service/module to assess coverage distribution

Write all findings to: `plans/reports/scan-integration-tests-{YYMMDD}-{HHMM}-report.md`

## Phase 3: Analyze & Generate

Read the report. Build these sections:

### Target Sections

| Section                    | Content                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| **Test Architecture**      | Overall test strategy, framework choice, infrastructure approach, test isolation |
| **Test Base Classes**      | Base class hierarchy, what each provides, when to use which                      |
| **Fixtures & Factories**   | Test fixture setup, service factory, DI container configuration                  |
| **Test Helpers**           | Assertion helpers, data builders, utility methods with examples                  |
| **Configuration**          | Test config files, connection strings, environment variables                     |
| **Service-Specific Setup** | Per-service test setup differences, module abbreviations, custom overrides       |
| **Test Data Patterns**     | How test data is created, unique naming, cleanup strategies                      |
| **Running Tests**          | Commands to run tests, filtering, parallel execution, CI integration             |

### Content Rules

- Show actual code snippets (5-15 lines) from the project with `file:line` references
- Include a "New Test Quickstart" section showing minimal steps to add a new test
- Use tables for convention summaries (base classes, config files, commands)
- Highlight infrastructure requirements (what must be running for tests to pass)

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Verify: 5 code example file paths exist (Glob check)
3. Verify: test base class names match actual class definitions
4. Report: sections updated, test count per service, coverage gaps

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following before starting:
      <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
  <!-- /SYNC:scan-and-update-reference-doc:reminder -->
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

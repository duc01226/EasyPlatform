---
name: integration-test
description: '[Testing] Use when you need to generate or review integration tests.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Generate/review integration test files using real DI (no mocks). 5 modes: (1) from-changes · (2) from-prompt · (3) review · (4) diagnose · (5) verify-traceability.

**Workflow:** Detect mode → Find targets → Gather context → Execute → Report

**Key Rules:**

- NEVER write smoke-only tests — read handler/entity/event source first, assert specific field values
- ALWAYS wrap ALL DB assertions in async polling — no exceptions, not just async handlers
- NEVER create invalid test state by direct repository writes; use real use-case paths (commands, queries, production consumers/messages) or valid seeded fixtures
- MUST ATTENTION search existing patterns FIRST before generating any test
- MUST ATTENTION READ `references/integration-test-patterns.md` before writing
- Organize by domain feature NEVER by CQRS type — NEVER create `Queries/` or `Commands/` folders
- Every test method MUST have TC annotation — auto-create in Section 15 if missing
- Minimum 3 tests per command
- NEVER mark done until the relevant suite passes 3 consecutive `$integration-test-verify` runs without DB reset

---

**Prerequisites — MUST ATTENTION READ before executing:**

> **`references/integration-test-patterns.md`** — canonical test templates: collection attributes, base class usage, TC annotation format, async polling helpers, unique name generators, DB assertion patterns. Read before writing ANY test.
>
> **`docs/specs/`** — existing TCs by module: read to verify test-to-spec traceability and get TC IDs before generating. (read directly when relevant; do not rely on hook-injected conversation text)

- `references/integration-test-patterns.md` — canonical test templates (MUST READ before writing any test)
- `docs/project-reference/domain-entities-reference.md` — domain entity catalog, relationships, cross-service sync (read directly when relevant; do not rely on hook-injected conversation text)
- `docs/specs/` — existing TCs by module (read before generating tests; verify test-to-spec traceability)

> **CRITICAL: Search existing patterns FIRST.** Before generating ANY test, grep existing integration test files in same service. Read ≥1 existing test file to match conventions (namespace, usings, collection name, base class, helper usage). NEVER generate tests contradicting established codebase patterns.

> **CRITICAL: NO Smoke/Fake/Useless Tests.** Every test MUST execute actual commands/handlers and verify DB data state. NO DI-resolution-only tests. NO exception-check-only tests. Before writing assertions: READ handler/entity/event source — understand WHAT fields change, WHAT entities created/updated/deleted, WHAT event handlers fire. Assert specific field values.

> **CRITICAL: Async Polling for ALL Data Assertions.** ALWAYS wrap data state assertions in async polling/retry helper. DEFAULT for ALL data verification — not just async handlers. Data persistence may be delayed by event handlers, message bus consumers, background jobs, DB write latency. **Rule: If asserting data in DB → use async polling. No exceptions.**

> **For test specifications and test case generation from PBIs, use `$tdd-spec` skill instead.**

> **External Memory:** Complex/lengthy work → write findings to `plans/reports/` — prevents context loss.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% act, <80% verify first).

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Project Pattern Discovery

Before implementation, search codebase for patterns:

- Search: `IntegrationTest`, `TestFixture`, `TestUserContext`, `IntegrationTestBase`
- Look for: existing test projects, collection definitions, service-specific base classes

> **MANDATORY IMPORTANT MUST ATTENTION** plan task to READ `integration-test-reference.md` for project-specific patterns and code examples. If not found, continue with search-based discovery.

**Workflow:**

1. **Detect mode** — See Mode Detection below
2. **Find targets** — Identify test/command/query files
3. **Gather context** — Read relevant files for detected mode
4. **Execute** — Generate, review, diagnose, or verify
5. **Report** — Build check (generate), quality report (review), root cause (diagnose)

**Key Rules:**

- MUST ATTENTION search existing test patterns in same service BEFORE generating
- MUST ATTENTION READ `references/integration-test-patterns.md` before writing any test
- **Organize by domain feature, NEVER by type** — command + query tests for same domain → same folder (e.g., `Orders/OrderCommandIntegrationTests.*`). NEVER create `Queries/` or `Commands/` folder.
- Use project's unique name generator for ALL string test data
- Use project's entity assertion helpers for DB verification with async polling
- **CRITICAL MUST ATTENTION:** Test setup MUST mirror real workflows. Do not create or edit domain data through repositories when a command/query/seeder path exists; invalid shortcut data is a test bug.
- **CRITICAL MUST ATTENTION:** ALWAYS wrap ALL DB assertions in async polling/retry — DEFAULT for ALL assertions, not just async handlers. **If asserting data in DB → use async polling. No exceptions.**
- **CRITICAL MUST ATTENTION:** Before writing assertions, READ handler/entity/event source. Understand WHAT fields change, WHAT entities created/updated/deleted, WHAT event handlers fire. **Smoke-only FORBIDDEN** unless side effect truly unobservable.
- **CRITICAL MUST ATTENTION:** Verification requires 3 consecutive successful runs of the relevant integration suite/project without resetting data. One green run proves only the current run, not repeatability.
- Minimum 3 test methods: happy path, validation failure, DB state check
- **Authorization tests:** Multiple user contexts — authorized succeeds AND unauthorized rejected
- Every test method MUST have `// TC-{FEATURE}-{NNN}: Description` comment + test-spec annotation — before method, outside body
- No TC in feature docs → **auto-create** in Section 15 before generating test
- For comprehensive spec generation before coding → `$tdd-spec` first

## Mandatory Task Ordering (MUST ATTENTION FOLLOW)

ALWAYS create and execute tasks in this exact order:

1. **FIRST: Verify/upsert test specs in feature docs**
    - Read feature doc Section 15 (`docs/business-features/{App}/detailed-features/`) for target domain
    - Read test-specs doc (`docs/specs/{App}/README.md`) if exists
    - For each test case: verify matching `TC-{FEATURE}-{NNN}` exists
    - TC MISSING → create entry in Section 15 with Priority, Status, GIVEN/WHEN/THEN, Evidence
    - TC INCORRECT → update to reflect current behavior
    - Output: TC mapping list (TC code → test method name)

2. **MIDDLE: Implement integration tests**
    - Generate test files using TC mapping from task 1
    - Each test method gets TC annotation before it (outside method body):
        ```csharp
        // TC-OM-001: Create valid order — happy path
        [Trait("TestSpec", "TC-OM-001")]
        [Fact]
        public async Task CreateOrder_WhenValidData_ShouldCreateSuccessfully()
        ```
    - Follow existing patterns from project's test base classes

3. **FINAL: Verify bidirectional traceability**
    - Grep test-spec annotations in test project
    - Grep all `TC-{FEATURE}-{NNN}` in feature doc Section 15 / specs doc
    - Verify: every test method → doc TC, every doc TC → test method
    - Flag orphans: tests without doc TCs, doc TCs without matching tests
    - Update `IntegrationTest` field in feature doc TCs with `{File}::{MethodName}`

## Module Abbreviation Registry

| Module                  | Abbreviation | Test Folder      |
| ----------------------- | ------------ | ---------------- |
| Order Management        | OM           | `Orders/`        |
| Inventory               | INV          | `Inventory/`     |
| User Profiles           | UP           | `UserProfiles/`  |
| Notification Management | NM           | `Notifications/` |
| Report Generation       | RG           | `Reports/`       |
| Feedback                | FB           | `Feedback/`      |
| Background Jobs         | BJ           | —                |

## TC Code Numbering Rules

Creating new `TC-{FEATURE}-{NNN}` codes:

1. Check feature doc first — `docs/business-features/{App}/detailed-features/` has existing codes. New codes must not collide.
2. Decade-based grouping — e.g., OM: 001-004 (CRUD), 011-013 (validation), 021-023 (permissions), 031-033 (events). Find next free decade.
3. Unavoidable collision → renumber in doc only. Keep test-spec annotation unchanged; add renumbering note in doc.
4. Feature doc = canonical registry. Test-spec annotation = traceability only, not numbering source.

# Integration Test Generation

## Mode Detection

```
Args = command/query name (e.g., "$integration-test CreateOrderCommand")
  → FROM-PROMPT mode: generate tests for the specified command/query

No args (e.g., "$integration-test")
  → FROM-CHANGES mode: detect changed command/query files from git

Args = "review" (e.g., "$integration-test review Orders")
  → REVIEW mode: audit existing test quality, find flaky patterns, check best practices

Args = "diagnose" (e.g., "$integration-test diagnose OrderCommandIntegrationTests")
  → DIAGNOSE mode: analyze why tests fail — determine test bug vs code bug

Args = "verify" (e.g., "$integration-test verify {Service}")
  → VERIFY-TRACEABILITY mode: check test code matches specs and feature docs
```

## Step 1: Find Targets

### From-Changes Mode (default)

Run via Bash tool:

```bash
git diff --name-only; git diff --cached --name-only
```

Filter for command/query files using project naming conventions (e.g., `*Command.*`, `*Query.*`). Path patterns from `docs/project-config.json` → `modules` or `backendServices`. Extract service from path:

| Path pattern                                        | Service   | Test project                                         |
| --------------------------------------------------- | --------- | ---------------------------------------------------- |
| Per `docs/project-config.json` service path pattern | {Service} | `{Service}.IntegrationTests` (or project equivalent) |

Search codebase for existing `*.IntegrationTests.*` projects to find correct mapping.

If no test project exists: inform user "No integration test project for {service}. See CLAUDE.md Integration Testing section to create one."

If test file already exists: ask user overwrite or skip.

### From-Prompt Mode

User specifies command/query name. Use Grep tool (NOT bash grep):

```
Grep pattern="class {CommandName}" path="." glob="*.cs"
```

## Step 2: Gather Context

For each target, read in parallel:

1. **Command/query file** — extract: class name, result type, DTO properties, entity type
2. **Existing test files in same service** — Glob `{Service}.IntegrationTests/**/*IntegrationTests.*`, read ≥1 for conventions (collection name, trait, namespace, usings, base class)
3. **Service integration test base class** — grep: `class.*ServiceIntegrationTestBase`
4. **`references/integration-test-patterns.md`** — canonical templates (adapt {Service} placeholders)

## Step 2b: Look Up TC Codes

For each target domain, read:

- `docs/business-features/{App}/detailed-features/` Section 15 (primary source)
- `docs/specs/{App}/README.md` (secondary reference)

Build mapping: test case description → TC code (e.g., "create valid order" → TC-OM-001).

- No TC exists → **CREATE IT** in Section 15 before generating test. NOT optional.
- TC outdated/incorrect → **UPDATE IT** first.
- Section 15 missing → run `$tdd-spec` first.

## Step 3: Generate Test File

**File path:** `{project-test-dir}/{Service}.IntegrationTests/{Domain}/{CommandName}IntegrationTests{ext}` (adapt path/extension per `docs/project-config.json` → `integrationTestVerify.testProjectPattern`)

> **Folder = domain feature.** `{Domain}` = business domain (Orders, Inventory, Notifications, UserProfiles), NOT CQRS type. Command and query tests for same domain live in same folder.

**Structure (C#/xUnit — adapt to your framework):**

```csharp
#region
using FluentAssertions;
// ... service-specific usings (copy from existing tests)
#endregion

namespace {Service}.IntegrationTests.{Domain};

[Collection({Service}IntegrationTestCollection.Name)]
[Trait("Category", "Command")]  // or "Query"
public class {CommandName}IntegrationTests : {Service}ServiceIntegrationTestBase
{
    // Minimum 3 tests: happy path, validation failure, DB state verification
}
```

**Test method naming:** `{CommandName}_When{Condition}_Should{Expectation}`

**Required patterns per command type:**

| Command type | Required tests                                     |
| ------------ | -------------------------------------------------- |
| Save/Create  | Happy path + validation failure + DB state         |
| Update       | Create-then-update + verify updated fields in DB   |
| Delete       | Create-then-delete + `AssertEntityDeletedAsync`    |
| Query        | Filter returns results + pagination + empty result |

## Step 4: Verify

Build test project via project's build tool (see `$integration-test-verify` for config-driven build).

MUST ATTENTION verify ALL of the following:

- Test collection/group attribute present with correct collection name
- Test category annotation present
- All string test data uses project's unique name generator
- User context created via project's user context factory
- DB assertions use project's entity assertion helpers with async polling
- No mocks — real DI only
- Every test method has `// TC-{FEATURE}-{NNN}: Description` comment + test-spec annotation

## Example Files to Study

Search codebase for existing integration test files:

```bash
find . -name "*IntegrationTests.*" -type f
find . -name "*IntegrationTestBase.*" -type f
find . -name "*IntegrationTestFixture.*" -type f
```

| Pattern                                                            | Shows                        |
| ------------------------------------------------------------------ | ---------------------------- |
| `{Service}.IntegrationTests/{Domain}/*CommandIntegrationTests.*`   | Create + update + validation |
| `{Service}.IntegrationTests/{Domain}/*QueryIntegrationTests.*`     | Query with create-then-query |
| `{Service}.IntegrationTests/{Domain}/Delete*IntegrationTests.*`    | Delete + cascade             |
| `{Service}.IntegrationTests/{Service}ServiceIntegrationTestBase.*` | Service base class pattern   |

### How to Use for Each Case

**Case: Generate tests from existing test specs (feature docs Section 15)**

```
$integration-test CreateOrderCommand
```

→ Reads Section 15 TCs, generates test file with TC annotations

**Case: Generate tests from git changes (default)**

```
$integration-test
```

→ Detects changed command/query files, checks Section 15 for matching TCs, generates tests

**Case: Generate tests after $tdd-spec created new TCs**

```
$tdd-spec → $integration-test
```

→ tdd-spec writes TCs to Section 15, then integration-test generates tests from those TCs

**Case: Review existing tests for quality**

```
$integration-test review Orders
```

→ Audits test quality, finds flaky patterns, checks best practices

**Case: Diagnose test failures**

```
$integration-test diagnose OrderCommandIntegrationTests
```

→ Analyzes failures, determines test bug vs code bug

**Case: Verify test-spec traceability**

```
$integration-test verify {Service}
```

→ Checks test code matches specs and feature docs bidirectionally

---

# REVIEW Mode — Test Quality Audit

Mode = REVIEW: audit existing integration tests for quality, flaky patterns, best practices.

## Sub-Agent Routing

| Input type                                        | Sub-agent            | Why                                                                                                                                |
| ------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Test file quality audit                           | `integration-tester` | Purpose-built for spec generation, TC traceability, and test patterns — catches integration-specific issues `code-reviewer` misses |
| Security-sensitive test data (PII, auth fixtures) | `security-auditor`   | Detects PII leakage in test fixtures                                                                                               |

## Sub-Agent Type Override

> **MANDATORY:** Integration test REVIEW mode spawns `integration-tester` sub-agent (`agent_type: "integration-tester"`), NOT `code-reviewer`.
> **Rationale:** `integration-tester` specializes in test spec generation, TC traceability, CQRS test patterns, `WaitUntilAsync` correctness, and microservices integration context — areas `code-reviewer` does not cover at depth.

**Fresh Eyes Protocol:** Run Round 1 inline. If findings are LOW confidence or contradictory → spawn fresh `integration-tester` sub-agent (zero memory of Round 1) for Round 2. Main agent reads report, NEVER filters findings. Max 2 rounds, then escalate.

## Review Workflow

1. **Find test files** — Glob `{Service}.IntegrationTests/{Domain}/**/*IntegrationTests.*`
2. **Read each test file** — analyze for quality issues (persist findings after each file per SYNC:incremental-persistence)
3. **Generate quality report** — categorized findings with severity
4. **Round 2 (if low confidence):** Spawn fresh sub-agent with report path — NEVER re-examine with main context

## Review Dimensions

**Dimension 1: Reliability** — Think: What causes intermittent failures?

- MUST ATTENTION flag **missing async polling** — DB assertions after async handlers without `WaitUntilAsync()` or equiv → WILL flake
- MUST ATTENTION flag **missing retry for eventual consistency** — message bus / event handler / background job state without polling wrapper
- MUST ATTENTION flag **hardcoded delays** — `Thread.Sleep()`, `Task.Delay()` instead of condition-based polling
- MUST ATTENTION flag **race conditions** — tests modifying shared state without isolation (same entity ID, same user context)
- MUST ATTENTION flag **non-unique test data** — hardcoded strings/IDs instead of unique generators
- MUST ATTENTION flag **time-dependent assertions** — `DateTime.Now` without time abstraction

**Dimension 2: Assertion Value** — Think: Does the test actually verify anything?

- MUST ATTENTION flag DI-resolution-only tests — smoke tests that just resolve services → HIGH severity
- MUST ATTENTION flag exception-check-only tests — `exception.Should().BeNull()` alone → HIGH severity
- MUST ATTENTION verify test reads handler/entity/event source and asserts specific field values
- MUST ATTENTION verify minimum 3 tests per command (happy path, validation failure, DB state)

**Dimension 3: Conventions** — Think: Does test follow project patterns?

- MUST ATTENTION verify collection/group attribute — correct collection name for shared fixture
- MUST ATTENTION verify category trait — `[Trait("Category", "Command")]` or equiv
- MUST ATTENTION verify TC annotation — every test method has TC code comment + test spec trait
- MUST ATTENTION verify no mocks — real DI only
- MUST ATTENTION verify unique test data — all string data uses unique generators
- MUST ATTENTION verify user context — via factory, not hardcoded
- MUST ATTENTION verify DB assertions — uses entity assertion helpers, not raw DB queries

**Dimension 4: Code Quality** — Think: Maintainability and isolation?

- MUST ATTENTION verify method naming — `{Action}_When{Condition}_Should{Expectation}`
- MUST ATTENTION verify Arrange-Act-Assert — clear separation
- MUST ATTENTION flag logic in tests — conditionals, loops, complex setup in test methods
- MUST ATTENTION verify test independence — each test runs in isolation

## Review Report Format

```markdown
# Integration Test Quality Report — {Domain}

## Summary

- Tests scanned: {N}
- Issues found: {N} (HIGH: {n}, MEDIUM: {n}, LOW: {n})
- Overall quality: {GOOD|NEEDS_WORK|CRITICAL}

## HIGH Severity Issues (Flaky Risk)

| Test         | Issue                                            | Fix                                    |
| ------------ | ------------------------------------------------ | -------------------------------------- |
| {MethodName} | DB assertion without polling after async handler | Wrap in project's async polling helper |

## MEDIUM Severity Issues (Best Practice)

| Test | Issue | Fix |
| ---- | ----- | --- |

## LOW Severity Issues (Style)

| Test | Issue | Fix |
| ---- | ----- | --- |

## Recommendations

1. {Prioritized fix suggestions}
```

---

# DIAGNOSE Mode — Test Failure Root Cause Analysis

Mode = DIAGNOSE: analyze failing tests to determine test bug vs application code bug.

## Diagnose Workflow

1. **Identify failing tests** — User provides test class name or run test suite to collect failures
2. **Read test code** — understand what test expects
3. **Read application code** — trace the command/query handler path
4. **Compare expected vs actual** — determine root cause
5. **Classify** — Test bug vs code bug vs infrastructure issue
6. **Report** — Root cause + recommended fix

## Root Cause Decision Tree

```
Test fails
├── Compilation error?
│   ├── Missing type/method → Code changed, test not updated → TEST BUG
│   └── Wrong import/namespace → TEST BUG
├── Timeout/hang?
│   ├── Missing async/await → TEST BUG
│   ├── Deadlock in handler → CODE BUG
│   └── Infrastructure down → INFRA ISSUE
├── Assertion failure?
│   ├── Expected value wrong?
│   │   ├── Test hardcoded old behavior → TEST BUG
│   │   └── Business logic changed → CODE BUG (if unintended) or TEST BUG (if intended change)
│   ├── Null/empty result?
│   │   ├── Entity not found → Check if create step succeeded → TEST BUG (setup) or CODE BUG (handler)
│   │   └── Query returns empty → Check filters/predicates → CODE BUG
│   ├── Intermittent (passes sometimes)?
│   │   ├── Async assertion without polling → TEST BUG (add async polling/retry)
│   │   ├── Non-unique test data collision → TEST BUG (use unique name generator)
│   │   └── Race condition in handler → CODE BUG
│   └── Wrong count/order?
│       ├── Test data leak from other tests → TEST BUG (isolation)
│       └── Logic error in query → CODE BUG
├── Validation error (expected success)?
│   ├── Test sends invalid data → TEST BUG
│   └── Validation rule too strict → CODE BUG
└── Exception thrown?
    ├── Known exception type in handler → CODE BUG
    └── DI/config error → INFRA ISSUE
```

## Diagnose Report Format

```markdown
# Test Failure Diagnosis — {TestClass}

## Failing Tests

| Test Method | Error Type        | Root Cause    | Classification              |
| ----------- | ----------------- | ------------- | --------------------------- |
| {Method}    | {AssertionFailed} | {Description} | TEST BUG / CODE BUG / INFRA |

## Detailed Analysis

### {MethodName}

**Error:** {error message}
**Expected:** {what test expected}
**Actual:** {what happened}
**Root Cause:** {explanation with code evidence}
**Classification:** TEST BUG | CODE BUG | INFRA ISSUE
**Evidence:** `{file}:{line}` — {what the code does}
**Recommended Fix:** {specific fix with code location}

## Summary

- Test bugs: {N} — fix in test code
- Code bugs: {N} — fix in application code
- Infra issues: {N} — fix in configuration/environment
```

---

# VERIFY-TRACEABILITY Mode — Test ↔ Spec ↔ Feature Doc Verification

Mode = VERIFY: bidirectional traceability check between test code, test specs, feature docs.

## Verify Workflow

1. **Collect test methods** — Grep for test spec annotations in test project
2. **Collect doc TCs** — Read feature doc Section 15 for all TC entries
3. **Build 3-way matrix** — Test code ↔ specs/ ↔ feature doc Section 15
4. **Identify mismatches** — Orphans, stale references, behavior drift
5. **Classify mismatches** — Which source is correct?
6. **Report** — Traceability matrix + recommended fixes

## Mismatch Classification

| Scenario                                          | Likely Correct Source                 | Action                                                                 |
| ------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Test passes, spec describes different behavior    | Adjudication required                 | Compare against canonical product/spec intent before changing anything |
| Test fails, spec describes expected behavior      | Spec, unless spec intent is disproved | Update test to match intended spec behavior                            |
| Test exists, no spec                              | Adjudication required                 | Create spec from test only after confirming the test protects intent   |
| Spec exists, no test                              | Spec                                  | Generate test from spec                                                |
| Test and spec agree, but code behaves differently | Spec, unless both are stale           | Fix code or update spec+test after intent adjudication                 |

**Rule:** Passing code or tests NEVER automatically outrank canonical product/spec intent. NEVER update spec, test, or code on a behavior-changing mismatch until it reaches adjudication-required status with explicit evidence. — why: a green test can encode a regression, so code agreement alone cannot ratify a spec change.

## Verification Requirements

MUST ATTENTION verify ALL of the following:

- Every test method has matching TC in feature doc Section 15
- Every TC in Section 15 has matching test method (or marked `Status: Untested`)
- TC descriptions in docs match what test actually validates
- Evidence file paths in TCs point to current (not stale) code locations
- Test annotations match TC IDs (no typos, no orphaned IDs)
- Priority levels in docs match test categorization
- `docs/specs/` dashboard is in sync with feature doc Section 15

## Verify Report Format

```markdown
# Traceability Report — {Service}

## Summary

- TCs in feature docs: {N}
- Test methods with TC annotations: {N}
- Fully traced (both directions): {N}
- Orphaned tests (no matching TC): {N}
- Orphaned TCs (no matching test): {N}
- Mismatched behavior: {N}

## Traceability Matrix

| TC ID     | Feature Doc? | Test Code? | Dashboard? | Status       |
| --------- | ------------ | ---------- | ---------- | ------------ |
| TC-OM-001 | ✅           | ✅         | ✅         | Traced       |
| TC-OM-005 | ✅           | ❌         | ✅         | Missing test |
| TC-OM-010 | ❌           | ✅         | ❌         | Missing spec |

## Orphaned Tests (no matching TC in docs)

| Test File | Method   | Annotation | Action                   |
| --------- | -------- | ---------- | ------------------------ |
| {file}    | {method} | TC-OM-010  | Create TC in feature doc |

## Orphaned TCs (no matching test)

| TC ID     | Doc Location | Priority | Action                              |
| --------- | ------------ | -------- | ----------------------------------- |
| TC-OM-005 | Section 15   | P0       | Generate test via $integration-test |

## Behavior Mismatches

| TC ID | Doc Says | Test Does | Correct Source | Action |
| ----- | -------- | --------- | -------------- | ------ |

## Recommendations

1. {Prioritized actions}
```

---

## Test Data Setup Guidelines

| Pattern             | When to Use                        | Example                                                      |
| ------------------- | ---------------------------------- | ------------------------------------------------------------ |
| **Per-test inline** | Simple tests, unique data          | `var order = new CreateOrderCommand { Name = UniqueName() }` |
| **Factory methods** | Repeated entity creation           | `TestDataFactory.CreateValidOrder()`                         |
| **Builder pattern** | Complex entities with many fields  | `new OrderBuilder().WithStatus(Active).WithItems(3).Build()` |
| **Shared fixture**  | Reference data needed by all tests | `CollectionFixture.SeedReferenceData()`                      |

**Rules:**

- Every test creates own data — no shared mutable state between tests
- Unique identifiers for ALL string data (search test utilities for unique name/data generator helper)
- Factory methods return valid entities by default — tests override only what they test
- Cross-entity dependencies: create parent first, then child (e.g., User → Order)
- Feature requires reference/lookup data → set up in collection fixture or per-test preconditions

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** NOT in workflow? a direct user question — do NOT decide complexity yourself. User decides:
>
> 1. **`test-to-integration` workflow** (Recommended) — scout → integration-test → integration-test-review → integration-test-verify → test → docs-update → watzup → workflow-end
> 2. **`$integration-test` directly** — standalone

---

## Test Execution & Failure Diagnosis (MANDATORY)

> **IMPORTANT MUST ATTENTION:** After generating/modifying integration tests, MUST:
>
> 1. **Run tests:** `$integration-test-verify` (reads `quickRunCommand` from `docs/project-config.json`)
> 2. **If tests fail:** Diagnose root cause — (a) wrong test setup/assertions → fix test, or (b) service bug → report as finding
> 3. **NEVER mark done until tests pass.** Unrun tests have zero value.
> 4. **Iterate:** Fix → rerun → verify until all pass or failures confirmed as service bugs

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use a direct user question to present:

- **"$integration-test-verify (Recommended)"** — Run integration tests to verify they pass
- **"$workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

## Related Skills

| Skill                        | Relationship                                                                         | When to Call                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `$tdd-spec`                  | **Producer** — TCs in feature doc Section 15 are the source for test generation      | Must run tdd-spec before integration-test (CREATE or UPDATE mode). TCs must exist before generating tests. |
| `$tdd-spec-review`           | **Upstream reviewer** — validates TC quality before test generation                  | Run before integration-test to ensure TCs have real assertion value                                        |
| `$tdd-spec [direction=sync]` | **Dashboard** — syncs QA dashboard after TCs are linked to test files                | Run after integration-test to update `IntegrationTest:` fields in dashboard                                |
| `$feature-docs`              | **TC host** — Section 15 of feature doc is where TCs live                            | If feature doc is missing or Section 15 is empty → run $feature-docs first                                 |
| `$spec-discovery`            | **Upstream spec** — engineering spec is source of truth for what tests should assert | If tests diverge from spec → check spec-discovery output for correct behavior                              |
| `$integration-test-review`   | **Reviewer** — 6-gate quality audit of generated tests                               | Always call after generating integration tests                                                             |
| `$integration-test-verify`   | **Runner** — executes tests and reports pass/fail                                    | Always call after integration-test-review clears                                                           |
| `$docs-update`               | **Orchestrator** — calls tdd-spec sync (Phase 4) with test traceability              | Run for full doc sync after integration test files updated                                                 |

## Standalone Chain

> **When called outside a workflow**, follow this chain to complete the integration test authoring cycle.

```
integration-test (you are here)
  │
  ├─ PREREQUISITE: TCs must exist in feature doc Section 15
  │    [REQUIRED] Verify: docs/business-features/{Module}/README.md Section 15 has TC-{FEATURE}-{NNN} entries
  │    If empty → run $tdd-spec [CREATE mode] first
  │
  ├─ [REQUIRED] → $integration-test-review
  │     6-gate quality audit: assertion value, data state, repeatability, domain logic, traceability, three-way sync.
  │     Never skip — Gate 6 (three-way sync) is the only place where spec/code/test conflicts surface.
  │
  ├─ [REQUIRED] → $integration-test-verify
  │     Runs tests and reports pass/fail counts. Never mark complete without real runner output.
  │
  ├─ [REQUIRED] → $tdd-spec [direction=sync]
  │     Updates QA dashboard with IntegrationTest: file::method traceability links.
  │
  ├─ [RECOMMENDED] → $docs-update
  │     Updates feature doc evidence fields and version history if test coverage changed materially.
  │
  └─ [RECOMMENDED] → $tdd-spec-review
        Re-run if integration-test-review (Gate 6) flagged TC issues requiring TC edits.

### Mode-Specific Chains

| Mode | Pre-step | Post-step |
|------|---------|-----------|
| from-changes | verify TCs updated (run $tdd-spec UPDATE first) | $integration-test-review → /verify → /sync |
| from-prompt | confirm TC exists for target feature | $integration-test-review → /verify → /sync |
| review | N/A (read-only) | report findings → $tdd-spec UPDATE if TCs need fixes |
| diagnose | run $test to see failures first | fix identified issue → re-run $integration-test-verify |
| verify-traceability | N/A (read-only) | if orphaned TCs: $tdd-spec UPDATE → $integration-test [from-prompt] |
```

> **[IMPORTANT]** task tracking — break ALL work into small tasks BEFORE starting. NEVER skip task creation.

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix.

<!-- /SYNC:source-test-drift-check -->
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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

<!-- SYNC:repeatable-test-principle -->

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run 100 times, each run adds data. Verification is only PASS after the relevant suite/project passes 3 consecutive runs without DB reset.
>
> 1. **Unique data per run:** Use project's unique ID generator for ALL entity IDs. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior runs MUST NOT interfere.
> 3. **No schema rollback dependency:** Tests work with current schema only. Never rely on rollback.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no DB reset between runs. Isolation by unique seed data, not cleanup.
> 6. **Unique names/codes:** Entities requiring unique names/codes — append unique suffix via project's ID generator.

<!-- /SYNC:repeatable-test-principle -->

<!-- SYNC:red-flag-stop-conditions -->

> **Red Flag Stop Conditions** — STOP and escalate via ask the user directly when:
>
> 1. Confidence drops below 60% on any critical decision
> 2. Changes affect >20 files
> 3. Cross-service boundary crossed
> 4. Security-sensitive code (auth, crypto, PII)
> 5. Breaking change detected (interface, API contract, DB schema)
> 6. Test coverage would decrease
> 7. Approach requires technology/pattern not in project
>
> **NEVER proceed past a red flag without explicit user approval.**

<!-- /SYNC:red-flag-stop-conditions -->

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need task tracking. Skip depth, never skip tracking.    |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` ONLY when: (a) resolving specific blocker, or (b) building fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-docs-reference.md`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc that exists; skip absent docs as not applicable. Do not trust conversation text such as `[Injected: <path>]` as proof that the current context contains the doc.
> 4. Before target work, state: `Reference docs read: ... | Missing/not applicable: ...`.
>
> **Blocked until:** scope evaluated, required docs checked/read, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run graph trace when graph.db exists. Grep 3+ patterns, cite `file:line`.
      <!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:graph-impact-analysis:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run `blast-radius` when graph.db exists. Flag impacted files NOT in changeset as potentially stale.
      <!-- /SYNC:graph-impact-analysis:reminder -->

<!-- SYNC:red-flag-stop-conditions:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** STOP after 3 failed fix attempts. Report all attempts, ask user before continuing.
      <!-- /SYNC:red-flag-stop-conditions:reminder -->

<!-- SYNC:rationalization-prevention:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** follow ALL steps regardless of perceived simplicity. "Too simple to plan" is an evasion, not a reason.
      <!-- /SYNC:rationalization-prevention:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** NEVER write smoke-only tests — read handler/entity/event source, assert specific field values
- **MANDATORY IMPORTANT MUST ATTENTION** ALWAYS use async polling for ALL DB assertions — no exceptions
- **MANDATORY IMPORTANT MUST ATTENTION** task tracking — break ALL work into small tasks BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** a direct user question — validate decisions with user. NEVER auto-decide.
- **MANDATORY IMPORTANT MUST ATTENTION** READ `references/integration-test-patterns.md` BEFORE writing any test
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER create `Queries/` or `Commands/` folders — organize by domain feature
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER generate tests without TC annotation — auto-create in Section 15 if missing
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER mark done until tests pass via `$integration-test-verify`
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns, cite `file:line` before modifying anything

**Anti-Rationalization:**

| Evasion                            | Rebuttal                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "Test is simple, skip TC lookup"   | TC traceability = test value. Skip = untraceable test.                                               |
| "Async polling not needed here"    | ALL DB assertions need polling. Handler type irrelevant.                                             |
| "Already searched patterns"        | Show `file:line` evidence. No proof = no search.                                                     |
| "Smoke test is fine for now"       | Smoke-only FORBIDDEN. Assert specific field values.                                                  |
| "Repo setup is faster"             | Direct repository data hacks create invalid state. Use real use-case paths or valid seeded fixtures. |
| "One green run is enough"          | Verification requires 3 consecutive passing runs without DB reset.                                   |
| "REVIEW: one pass is enough"       | Low confidence → spawn fresh sub-agent. Never declare PASS after Round 1.                            |
| "Skip task creation, it's obvious" | task tracking is non-negotiable. Tracking prevents context loss.                                     |

---

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->

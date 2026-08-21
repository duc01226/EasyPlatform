---
name: integration-test
version: 2.2.1
description: '[Testing] Use when you need to generate or review integration tests.'
execution-mode: subagent
context-budget: high
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Generate/review integration tests using real DI (no mocks) across 5 modes (from-changes · from-prompt · review · diagnose · verify-traceability) that exercise real production paths and assert specific DB field values — so every test protects a traceable business behavior (TC), survives repeated runs without reset, and fails only when the protected intent actually breaks.

**Summary:**

- Three things make or break a test here: read handler/entity/event source first and assert specific changed fields (never smoke/DI-resolution-only), wrap EVERY DB assertion in async polling (not just async handlers), and drive state through real command/query/seeder paths — never direct repository writes that fabricate invalid state.
- TC traceability is the spine: each test method carries a `TC-{FEATURE}-{NNN}` test-spec annotation; one business TC maps to MANY tests (1:N, integration + unit), so cover with as many tests as needed — never split a TC to force 1:1, and auto-create a TC in feature-doc Section 8 only for genuinely uncovered business behavior.
- Always search existing tests in the SAME service and read `references/integration-test-patterns.md` before writing; match local conventions (collection, base class, helpers, unique-name generators) and organize files by domain feature, never by `Queries/`/`Commands/` CQRS type.
- Done means repeatable, not green-once: the suite must pass 2 consecutive `/integration-test-verify` runs WITHOUT a DB reset; the in-skill `review`/`verify` modes are lightweight inline passes, distinct from the heavier standalone `/integration-test-review` and `/integration-test-verify` skills.
- **Main steps (MANDATORY order):** (1) FIRST — for business-visible behavior, verify/upsert each `TC-{FEATURE}-{NNN}` in feature-doc Section 8 (create if missing, update if stale, output TC→method mapping); for technical-only behavior, record `TECHNICAL-ONLY — no business TC` and use a technical annotation instead; (2) MIDDLE — implement test files with the appropriate annotation, following the project's existing base classes/helpers; (3) FINAL — verify traceability bidirectionally, feature-area-WIDE, across integration AND unit suites (business tests → exactly one doc TC; technical-only tests → `TechnicalSpec`; every §8 TC in the feature area → ≥1 test, not only TCs this run touched; flag orphans). Per-mode loop: Detect mode → Find targets → Gather context → Execute → Report.
- **MANDATORY "Validate: no missing integration tests" task** — non-skippable whenever inside a workflow, current git changes exist, or by user request (essentially every run): every changed file has a covering test AND every §8 TC in the feature area has a covering test; zero-GAP table required before marking done.

**Workflow:** Detect mode → Find targets → Gather context → Execute → Report

**Key Rules:**

- NEVER write smoke-only tests — read handler/entity/event source first, assert specific field values
- ALWAYS wrap ALL DB assertions in async polling — no exceptions, not just async handlers
- NEVER create invalid test state by direct repository writes; use real use-case paths (commands, queries, production consumers/messages) or valid seeded fixtures
- MUST ATTENTION apply the Real-World Fidelity Gate BEFORE writing setup — a sequence, pacing, or data shape production can never reach proves nothing when green; fix the SCENARIO, never the assertion
- MUST ATTENTION search existing patterns FIRST before generating any test
- MUST ATTENTION READ `references/integration-test-patterns.md` before writing
- Organize by domain feature NEVER by CQRS type — NEVER create `Queries/` or `Commands/` folders
- Every test method MUST have a traceability annotation: `TestSpec` for business §8 coverage or `TechnicalSpec` for technical-only regression coverage. Auto-create in Section 8 only for genuinely uncovered business behavior.
- Minimum 3 tests per command
- NEVER mark done until the relevant suite passes 2 consecutive `/integration-test-verify` runs without DB reset

---

**Prerequisites — MUST ATTENTION READ before executing:**

> **`references/integration-test-patterns.md`** — canonical test templates: collection attributes, base class usage, TC annotation format, async polling helpers, unique name generators, DB assertion patterns. Read before writing ANY test.
>
> **`docs/specs/`** — existing TCs by module: read to verify test-to-spec traceability and get TC IDs before generating.

- `references/integration-test-patterns.md` — canonical test templates (MUST READ before writing any test)
- `docs/project-reference/domain-entities-reference.md` — domain entity catalog, relationships, cross-service sync
- `docs/specs/` — existing TCs by module (read before generating tests; verify test-to-spec traceability)

> **CRITICAL: Search existing patterns FIRST.** Before generating ANY test, grep existing integration test files in same service. Read ≥1 existing test file to match conventions (namespace, usings, collection name, base class, helper usage). NEVER generate tests contradicting established codebase patterns.

> **CRITICAL: NO Smoke/Fake/Useless Tests.** Every test MUST execute actual commands/handlers and verify DB data state. NO DI-resolution-only tests. NO exception-check-only tests. Before writing assertions: READ handler/entity/event source — understand WHAT fields change, WHAT entities created/updated/deleted, WHAT event handlers fire. Assert specific field values.

> **CRITICAL: Async Polling for ALL Data Assertions.** ALWAYS wrap data state assertions in async polling/retry helper. DEFAULT for ALL data verification — not just async handlers. Data persistence may be delayed by event handlers, message bus consumers, background jobs, DB write latency. **Rule: If asserting data in DB → use async polling. No exceptions.**

> **For test specifications and test case generation from PBIs, use `/spec [mode=tests]` skill instead.**

> **Spec-Loop Discipline (property + mutation bar).** Where a rule is universal — a `[HARD]` §4 rule or a §5 invariant that holds for ALL inputs, not just one example — generate a **property/metamorphic test** (see `references/integration-test-patterns.md` → Pattern 9) plus a **boundary counter-case**, and trace each to a §8 **Invariant/Property TC** (not just an example-scenario TC). The assertion-quality bar is **MUTATION-KILL, not line-coverage %**: a mutant that survives on the covered core-logic = a missing invariant → write the killing test. (Example-only scenarios stay valid for non-universal behaviors; this is additive for the universal ones.)

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
- **CRITICAL MUST ATTENTION:** Verification requires 2 consecutive successful runs of the relevant integration suite/project without resetting data. One green run proves only the current run, not repeatability.
- Minimum 3 test methods: happy path, validation failure, DB state check
- **Authorization tests:** Multiple user contexts — authorized succeeds AND unauthorized rejected
- Every business test method MUST have `// TC-{FEATURE}-{NNN}: Description` comment + `TestSpec` annotation before the method, outside the body. Every technical-only test method MUST have a `TechnicalSpec` annotation and MUST NOT invent a business TC. **Many test methods MAY carry the same TC** (one business TC → many tests across components/services); the test-spec annotation is the join key, so cover a TC with as many tests as the implementation needs without inventing extra business TCs.
- No TC in feature docs → **auto-create** in Section 8 before generating test (auto-create a TC only for genuinely uncovered **business** behavior — never create a TC just to mirror a new test method when an existing TC already covers that behavior)
- For comprehensive spec generation before coding → `/spec [mode=tests]` first

## Mandatory Task Ordering (MUST ATTENTION FOLLOW)

ALWAYS create and execute tasks in this exact order:

1. **FIRST: Verify/upsert test specs in feature docs**
    - Read feature doc Section 8 (`docs/specs/{App}/README.{Feature}.md`) for target domain
    - For each test case: verify matching `TC-{FEATURE}-{NNN}` exists
    - TC MISSING → create entry in Section 8 with Priority, Status, GIVEN/WHEN/THEN, Evidence
    - TC INCORRECT → update to reflect current behavior
    - Output: TC mapping list (TC code → test method name(s)) — **one TC may map to many test methods** (across components/services); the mapping is 1 TC : N tests, joined by the `TestSpec` annotation

2. **MIDDLE: Implement integration tests**
    - Generate test files using TC mapping from task 1
    - Each test method gets the TC annotation before it (outside the method body) using the configured test framework's attribute/decorator/tag/marker syntax.
    - Follow existing patterns from project's test base classes

3. **FINAL: Verify traceability (cardinality: 1 TC : N tests) — scope: WHOLE current feature area, not only this run's TCs**
    - Grep test-spec annotations across **all** test projects/suites for the stack — integration **and** unit (a TC may be covered by tests in either — grep only the integration project and unit-only-covered TCs falsely look uncovered)
    - Grep **every** `TC-{FEATURE}-{NNN}` in Section 8 of **all** feature doc(s) implicated by this run — doc(s) covering changed files' domain, or user-named feature/domain — including TCs this run did NOT touch. TC pre-dating this run in scope same as one created in step 1.
    - Verify: every business test method → **exactly one** doc TC (its `TestSpec` annotation); every technical-only test method → a `TechnicalSpec` annotation; every doc TC → **≥1** covering test method. **One TC may be covered by many test methods** (integration + unit, across components/services) — that is the expected one-to-many shape. NEVER require one test per TC, and NEVER split/technicalize a business TC to make tests map 1:1 (breaks the spec's business/user-story orientation, M1/M5 — see `tc-format.md` → TC ↔ Test Code Cardinality).
    - Flag orphans: tests whose `TestSpec` TC is absent from §8; technical-only tests that still carry business `TestSpec`; doc TCs with **zero** covering tests. (Many tests sharing one TC is NOT an orphan and NOT a duplicate.)
    - Update the `CoveredBy` field in feature doc TCs with the covering tests — `{File}::{MethodName}` comma-separated **on one line**, or a test-filter expression when the set is large (the field is representative; the annotation in code is authoritative). The covering set MAY include unit tests, not only integration tests. Legacy `IntegrationTest:` is migration input only.

    > **MANDATORY task — "Validate: no missing integration tests" (non-skippable — three trigger conditions: inside workflow, current git changes present (staged/unstaged), or direct user request — essentially every run; ONLY exception: narrow read-only single-TC lookup, no test generation intended).** Create as OWN named `TaskCreate` item, not folded silently into step 3. Subsumes same bidirectional logic as VERIFY-TRACEABILITY mode below, run every time — not only when user types `verify` — scoped to feature area:
    >
    > 1. Every changed command/query/handler/entity/event-handler file in this run has **≥1** covering test (grep + read; name match alone NOT coverage).
    > 2. Every `TC-{FEATURE}-{NNN}` in Section 8 of implicated feature doc(s) — FULL set, not only TCs this run created/touched — has **≥1** covering test.
    > 3. Emit result as table; require **zero GAP rows** before marking run done:
    >
    > | TC / Changed File                 | Covering Test(s)             | Status        |
    > | --------------------------------- | ---------------------------- | ------------- |
    > | TC-{FEATURE}-{NNN} or {file:line} | {file}::{method}[, …] / NONE | COVERED / GAP |
    >
    > Any `GAP` row → generate missing test (loop back to Step 3: Generate Test File) before task marked `completed`. Do NOT report done with open GAP row.

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

1. Check feature doc first — `docs/specs/{App}/README.{Feature}.md` has existing codes. New codes must not collide.
2. Decade-based grouping — e.g., OM: 001-004 (CRUD), 011-013 (validation), 021-023 (permissions), 031-033 (events). Find next free decade.
3. Unavoidable collision → renumber in doc only. Keep test-spec annotation unchanged; add renumbering note in doc.
4. Feature doc = canonical registry. Test-spec annotation = traceability only, not numbering source.

# Integration Test Generation

## Mode Detection

```
Args = command/query name (e.g., "/integration-test CreateOrderCommand")
  → FROM-PROMPT mode: generate tests for the specified command/query

No args (e.g., "/integration-test")
  → FROM-CHANGES mode: detect changed command/query files from git

Args = "review" (e.g., "/integration-test review Orders")
  → REVIEW mode: audit existing test quality, find flaky patterns, check best practices

Args = "diagnose" (e.g., "/integration-test diagnose OrderCommandIntegrationTests")
  → DIAGNOSE mode: analyze why tests fail — determine test bug vs code bug

Args = "verify" (e.g., "/integration-test verify {Service}")
  → VERIFY-TRACEABILITY mode: check test code matches specs and feature docs
```

> **Modes vs. sibling skills (name-collision note).** The `review` and `verify` **modes** above are lightweight branches _inside this skill_ — quick, inline audits run during generation. They are NOT the same as the standalone skills `/integration-test-review` (deep test-quality review) and `/integration-test-verify` (full spec-traceability verification), which are separate, heavier workflow steps. When the refactor workflow sequences `/integration-test → /integration-test-review → /integration-test-verify`, those are the **standalone skills**, not these in-skill modes. Use a mode for a fast pass mid-generation; invoke the sibling skill for a thorough, standalone gate.

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
Grep pattern="{CommandName}" path="{configured-source-root}" glob="{configured-source-glob}"
```

## Step 2: Gather Context

For each target, read in parallel:

1. **Command/query file** — extract: class name, result type, DTO properties, entity type
2. **Existing test files in same service** — Glob `{Service}.IntegrationTests/**/*IntegrationTests.*`, read ≥1 for conventions (collection/suite name, test annotations, namespace/imports, base class)
3. **Service integration test base class** — grep: `class.*ServiceIntegrationTestBase`
4. **`references/integration-test-patterns.md`** — canonical templates (adapt {Service} placeholders)

## Step 2b: Look Up TC Codes

For each target domain, read:

- `docs/specs/{App}/README.{Feature}.md` Section 8 (primary source)

Build mapping: test case description → TC code (e.g., "create valid order" → TC-OM-001).

- No TC exists → **CREATE IT** in Section 8 before generating test. NOT optional.
- TC outdated/incorrect → **UPDATE IT** first.
- Section 8 missing → run `/spec [mode=tests]` first.

## Step 2c: Real-World Fidelity Check (BEFORE any test code is written)

MUST ATTENTION answer this BEFORE the Arrange block exists — never after a failure:

> **"Can this sequence, timing, and data actually occur in production?"**

For each planned test, state:

- **Sequence** — can a real actor reach these steps, in this order, through the paths under test?
- **Pacing** — how far apart does production separate consecutive actor actions (milliseconds, seconds, minutes, hours)? Firing two distinct actor actions back-to-back in the same millisecond is a fidelity defect, NOT a test speed-up.
- **Data shape** — is every seeded value reachable through a real use-case path (see the direct-repository-write ban above)?
- **Barrier** — for each gap between actor actions, name the observable that proves the prior step settled (persisted state change, audit/version stamp, queue/worker idle marker, completion event) and poll it in ARRANGE.

Any "no" → fix the SCENARIO before writing the test; NEVER compensate afterwards by widening an assertion timeout. Full contract: `SYNC:real-world-fidelity-testing` below; barrier shape: `references/integration-test-patterns.md` → Pattern 10.

## Step 3: Generate Test File

**File path:** `{project-test-dir}/{Service}.IntegrationTests/{Domain}/{CommandName}IntegrationTests{ext}` (adapt path/extension per `docs/project-config.json` → `integrationTestVerify.testProjectPattern`)

> **Folder = domain feature.** `{Domain}` = business domain (Orders, Inventory, Notifications, UserProfiles), NOT CQRS type. Command and query tests for same domain live in same folder.

**Structure:** adapt file layout, imports, fixture setup, assertion style, and test markers from existing tests in the configured test project.

namespace {Service}.IntegrationTests.{Domain};

[Collection({Service}IntegrationTestCollection.Name)]
[Trait("Category", "Command")] // or "Query"
public class {CommandName}IntegrationTests : {Service}ServiceIntegrationTestBase
{
// Minimum 3 tests: happy path, validation failure, DB state verification
}

````

**Test method naming:** `{CommandName}_When{Condition}_Should{Expectation}`

**Required patterns per command type:**

| Command type | Required tests                                     |
| ------------ | -------------------------------------------------- |
| Save/Create  | Happy path + validation failure + DB state         |
| Update       | Create-then-update + verify updated fields in DB   |
| Delete       | Create-then-delete + `AssertEntityDeletedAsync`    |
| Query        | Filter returns results + pagination + empty result |
| **Owns a [HARD] §4 rule or §5 invariant** (orthogonal to the rows above — applies to the same command/query) | **+ Pattern 9 property/metamorphic test** tied to a §8 Invariant/Property TC: the example tests above guard fixed points; the property test guards the rule across its whole input domain (see `references/integration-test-patterns.md` → Pattern 9). FORCED, not optional — a `>`/`>=` flip on the invariant line must fail an assertion. |

> **[FORCED BRANCH — property apparatus]** Pattern 9 is not a "nice-to-have reference". For ANY command/query whose handler enforces a `[HARD]` §4 business rule or a §5 entity invariant, the example-based rows are NOT sufficient on their own — generate the Pattern 9 property test alongside them, carrying the `TestSpec` annotation of the §8 Invariant/Property TC (decade `071–079`). This is the test-side mirror of the spec-side invariant-coverage gate (`spec [mode=tests]` → property TC count ≥ count([HARD] BR) + count(§5 invariants)). Skipping it = a fakeable, over-fitted suite that passes while the rule can be broken across the unenumerated space.

## Step 4: Verify

Build test project via project's build tool (see `/integration-test-verify` for config-driven build).

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
````

| Pattern                                                            | Shows                        |
| ------------------------------------------------------------------ | ---------------------------- |
| `{Service}.IntegrationTests/{Domain}/*CommandIntegrationTests.*`   | Create + update + validation |
| `{Service}.IntegrationTests/{Domain}/*QueryIntegrationTests.*`     | Query with create-then-query |
| `{Service}.IntegrationTests/{Domain}/Delete*IntegrationTests.*`    | Delete + cascade             |
| `{Service}.IntegrationTests/{Service}ServiceIntegrationTestBase.*` | Service base class pattern   |

### How to Use for Each Case

**Case: Generate tests from existing test specs (feature docs Section 8)**

```
/integration-test CreateOrderCommand
```

→ Reads Section 8 TCs, generates test file with TC annotations

**Case: Generate tests from git changes (default)**

```
/integration-test
```

→ Detects changed command/query files, checks Section 8 for matching TCs, generates tests

**Case: Generate tests after /spec [mode=tests] created new TCs**

```
/spec [mode=tests] → /integration-test
```

→ spec [mode=tests] writes TCs to Section 8, then integration-test generates tests from those TCs

**Case: Review existing tests for quality**

```
/integration-test review Orders
```

→ Audits test quality, finds flaky patterns, checks best practices

**Case: Diagnose test failures**

```
/integration-test diagnose OrderCommandIntegrationTests
```

→ Analyzes failures, determines test bug vs code bug

**Case: Verify test-spec traceability**

```
/integration-test verify {Service}
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

> **MANDATORY:** Integration test REVIEW mode spawns `integration-tester` sub-agent (`subagent_type: "integration-tester"`), NOT `code-reviewer`.
> **Rationale:** `integration-tester` specializes in test spec generation, TC traceability, CQRS test patterns, async-polling / eventual-consistency assertion correctness, and cross-service integration context — areas `code-reviewer` does not cover at depth.

**Fresh Eyes Protocol:** Run Round 1 inline. If findings are LOW confidence or contradictory → spawn fresh `integration-tester` sub-agent (zero memory of Round 1) for Round 2. Main agent reads report, NEVER filters findings. Max 2 rounds, then escalate.

## Review Workflow

1. **Find test files** — Glob `{Service}.IntegrationTests/{Domain}/**/*IntegrationTests.*`
2. **Read each test file** — analyze for quality issues (persist findings after each file per SYNC:incremental-persistence)
3. **Generate quality report** — categorized findings with severity
4. **Round 2 (if low confidence):** Spawn fresh sub-agent with report path — NEVER re-examine with main context

## Review Dimensions

**Dimension 1: Reliability** — Think: What causes intermittent failures?

- MUST ATTENTION flag **missing async polling** — DB assertions after async handlers without an await-until-condition poll (the project's async-assertion helper) → WILL flake
- MUST ATTENTION flag **missing retry for eventual consistency** — message bus / event handler / background job state without polling wrapper
- MUST ATTENTION flag **hardcoded delays** — `Thread.Sleep()`, `Task.Delay()` instead of condition-based polling
- MUST ATTENTION flag **race conditions** — tests modifying shared state without isolation (same entity ID, same user context)
- MUST ATTENTION flag **shared mutable data** (see `SYNC:test-data-isolation`) — assertions hung off a shared mutable entity another test can change, OR off a parent a bulk re-sync/recompute/rebuild/cascade consumer can wipe → not parallel-safe, even without your test mutating it
- MUST ATTENTION flag **non-unique test data** — hardcoded strings/IDs instead of unique generators
- MUST ATTENTION flag **time-dependent assertions** — `DateTime.Now` without time abstraction

**Dimension 2: Assertion Value** — Think: Does the test actually verify anything?

- MUST ATTENTION flag DI-resolution-only tests — smoke tests that just resolve services → HIGH severity
- MUST ATTENTION flag exception-check-only tests — `exception.Should().BeNull()` alone → HIGH severity
- MUST ATTENTION verify test reads handler/entity/event source and asserts specific field values
- MUST ATTENTION verify minimum 3 tests per command (happy path, validation failure, DB state)

**Dimension 3: Conventions** — Think: Does test follow project patterns?

- MUST ATTENTION verify collection/group attribute — correct collection name for shared fixture
- MUST ATTENTION verify category annotation or equivalent test-category marker when the project uses one
- MUST ATTENTION verify TC annotation — every test method has a TC code comment + the test-spec annotation
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
│   └── Wrong/empty count when path under test is provably innocent?
│       ├── Test data leak from other tests → TEST BUG (isolation: own fresh per-test data, not a shared mutable entity)
│       ├── Shared parent wiped by cross-cutting consumer (bulk re-sync, recompute, cascade) → TEST BUG (isolation) — suspect FIRST, grep other tests + consumers before blaming code
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

> **Relationship to Mandatory "no missing integration tests" task (Mandatory Task Ordering, step 3).** That task already runs SAME bidirectional logic, feature-area-scoped, EVERY run (workflow / git-changes-present / user-request) — not only when user explicitly types `verify`. This standalone VERIFY mode exists for on-demand, potentially broader (multi-feature-doc or whole-service) traceability sweep user invokes by name — not a separate, narrower obligation. Both apply same run → audit once, satisfy both.

## Verify Workflow

1. **Collect test methods** — Grep for test-spec annotations across all test projects/suites (integration **and** unit)
2. **Collect doc TCs** — Read feature doc Section 8 for all TC entries
3. **Build 3-way matrix** — Test code ↔ specs/ ↔ feature doc Section 8
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

- Every test method has matching TC in feature doc Section 8
- Every TC in Section 8 has matching test method (or marked `Status: Untested`)
- TC descriptions in docs match what test actually validates
- Evidence file paths in TCs point to current (not stale) code locations
- Business `TestSpec` annotations match TC IDs (no typos, no orphaned IDs); technical-only tests use `TechnicalSpec` and do not create §8 obligations
- Priority levels in docs match test categorization
- `docs/specs/` dashboard is in sync with feature doc Section 8

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
| TC-OM-005 | Section 8    | P0       | Generate test via /integration-test |

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

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** NOT in workflow? `AskUserQuestion` — do NOT decide complexity yourself. User decides:
>
> 1. **`workflow-write-integration-test` workflow** (Recommended) — scout → investigate → spec [mode=tests] → why-review → artifact-review --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → docs-update → workflow-end → watzup
> 2. **`/integration-test` directly** — standalone

---

## Test Execution & Failure Diagnosis (MANDATORY)

> **IMPORTANT MUST ATTENTION:** After generating/modifying integration tests, MUST:
>
> 1. **Run tests:** `/integration-test-verify` (reads `quickRunCommand` from `docs/project-config.json`)
> 2. **If tests fail:** Diagnose root cause — (a) wrong test setup/assertions → fix test, or (b) service bug → report as finding
> 3. **NEVER mark done until tests pass.** Unrun tests have zero value.
> 4. **Iterate:** Fix → rerun → verify until all pass or failures confirmed as service bugs

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use `AskUserQuestion` to present:

- **"/integration-test-verify (Recommended)"** — Run integration tests to verify they pass
- **"/workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

## Related Skills

| Skill                                | Relationship                                                                                        | When to Call                                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/spec [mode=tests]`                 | **Producer** — TCs in feature doc Section 8 are the source for test generation                      | Must run spec [mode=tests] before integration-test (CREATE or UPDATE mode). TCs must exist before generating tests. |
| `/artifact-review --type=spec-tests` | **Upstream reviewer** — validates TC quality before test generation                                 | Run before integration-test to ensure TCs have real assertion value                                                 |
| `/spec [mode=sync]`                  | **Sync** — reconciles §8 TCs ↔ executing test code after tests are linked                           | Run after integration-test to update the §8 `CoveredBy:` fields with the covering test links                        |
| `/spec`                              | **TC host** — Section 8 of feature doc is where TCs live                                            | If feature doc is missing or Section 8 is empty → run /spec first                                                   |
| `/spec-index`                        | **Derived index** — regenerable navigation catalog over the Feature Specs (never a source of truth) | After §8 changes, to refresh the bucket `INDEX.md` TC counts                                                        |
| `/integration-test-review`           | **Reviewer** — 7-gate quality audit of generated tests + change coverage                            | Always call after generating integration tests                                                                      |
| `/integration-test-verify`           | **Runner** — executes tests and reports pass/fail                                                   | Always call after integration-test-review clears                                                                    |
| `/docs-update`                       | **Orchestrator** — calls spec [mode=sync] (Phase 4) with test traceability                          | Run for full doc sync after integration test files updated                                                          |

## Standalone Chain

> **When called outside a workflow**, follow this chain to complete the integration test authoring cycle.

```
integration-test (you are here)
  │
  ├─ PREREQUISITE: TCs must exist in feature doc Section 8
  │    [REQUIRED] Verify: docs/specs/{Bucket}/README.{Feature}.md Section 8 has TC-{FEATURE}-{NNN} entries
  │    If empty → run /spec [mode=tests] [CREATE mode] first
  │
  ├─ [REQUIRED] → /integration-test-review
  │     7-gate quality audit: assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage.
  │     Never skip — Gate 6 (three-way sync) is the only place where spec/code/test conflicts surface,
  │     and Gate 7 (change coverage) is the only place where untested changed behavior surfaces.
  │
  ├─ [REQUIRED] → /integration-test-verify
  │     Runs tests and reports pass/fail counts. Never mark complete without real runner output.
  │
  ├─ [REQUIRED] → /spec [mode=sync]
  │     Updates the §8 TCs' CoveredBy: file::method traceability links.
  │
  ├─ [RECOMMENDED] → /docs-update
  │     Updates feature doc evidence fields and version history if test coverage changed materially.
  │
  └─ [RECOMMENDED] → /artifact-review --type=spec-tests
        Re-run if integration-test-review (Gate 6) flagged TC issues requiring TC edits.

### Mode-Specific Chains

| Mode | Pre-step | Post-step |
|------|---------|-----------|
| from-changes | verify TCs updated (run /spec [mode=tests] UPDATE first) | /integration-test-review → /verify → /sync |
| from-prompt | confirm TC exists for target feature | /integration-test-review → /verify → /sync |
| review | N/A (read-only) | report findings → /spec [mode=tests] UPDATE if TCs need fixes |
| diagnose | run /test to see failures first | fix identified issue → re-run /integration-test-verify |
| verify-traceability | N/A (read-only) | if orphaned TCs: /spec [mode=tests] UPDATE → /integration-test [from-prompt] |
```

> **[IMPORTANT]** `TaskCreate` — break ALL work into small tasks BEFORE starting. NEVER skip task creation.

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine _who is at fault — the source code or the test code_. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/debug-investigate` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the spec AND the source.** If a governing Feature Spec covers the behavior (e.g. `docs/specs/**` — §3 ACs / §4 BRs / §5 invariants / §8 TCs), it is the tiebreaker for _intended_ behavior — compare BOTH the production source and the failing test against it. With no spec, the documented intent / acceptance criteria / caller contract is the reference. Decide from this evidence whether the SOURCE is wrong or the TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure or external state prevents a source/test verdict → preserve diagnostics and stop mutation until the environment is healthy.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no spec covers the behavior, the spec is silent, or the spec is ambiguous about which side is correct, STOP and `AskUserQuestion` (or consult the canonical spec owner) before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.

<!-- /SYNC:test-failure-fault-adjudication -->

<!-- SYNC:spec-tests-code-triangulation -->

> **Spec ↔ Tests ↔ Code Triangulation** — The unit of review is the WHOLE PACKAGE (spec + tests + code), not the diff alone. Load all three faces together and reason mutual-consistency FIRST, before any isolated per-file check.
>
> 1. **Locate all three faces** for the changed behavior: the governing Feature Spec section(s) (§3 ACs / §4 BRs / §8 TCs), the tests that guard it, and the production code. A missing face is a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
> 2. **Triangulate pairwise** — classify which face is wrong on every disagreement:
>     - code vs spec → CODE-EXTRA / SPEC-STALE / CODE-WRONG (a [HARD] §4 rule or §5 invariant with no enforcing path is CODE-WRONG).
>     - tests vs spec → TEST-GAP / SPEC-SILENT.
>     - tests vs code → TEST-GAP / WEAK-TEST (a test that survives a deliberately broken invariant).
> 3. **Capture hidden rules** — an invariant the code enforces but the spec never states (SPEC-SILENT) is surfaced as a finding, added into §3/§4/§8, and guarded with a test: the enrichment loop, never a silent pass.
> 4. **Re-review after enrichment** — when triangulation adds spec content or a test, re-review the package against the enriched spec; converge only when a full pass surfaces no new disagreement.
>
> NEVER mark PASS while any face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

<!-- /SYNC:spec-tests-code-triangulation -->

<!-- SYNC:spec-drift-adjudication -->

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever changed behavior diverges from a canonical Feature Spec (business rule, acceptance criterion, flow, state transition, or §8 TC under `docs/specs/`), you MUST NOT silently pick a side. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the spec's documented intent. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>     - **CODE-WRONG** — the spec correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior (write/adjust a regression TC first).
>     - **SPEC-STALE** — the change is the new intended behavior and the spec now documents the old/wrong behavior → update the spec FIRST via `/spec [mode=update]`, then sync `/spec [mode=tests]` + `/spec [mode=sync]`.
>     - **AMBIGUOUS** — intended behavior is unclear → `AskUserQuestion` (or the canonical spec owner) before editing either side.
>     - **SPEC-SILENT** — the code correctly enforces an invariant/behavior that NO canonical spec artifact (§3 AC, §4 BR, §5 invariant, §8 TC) states → not drift but an UNWRITTEN rule discovered by review. ENRICH the spec via the **Invariant Harvest** pass (`/spec [mode=sync] direction=harvest` → `spec/references/sync.md`): prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, then add the rule to §4 (or §3/§5) AND a §8 TC via `/spec [update]` + `/spec [mode=tests]` and add the guarding test. A discovered invariant left only in code (or only in tests) is INCOMPLETE — this is the highest-value capture (the rule nobody wrote down).
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured (no §4/§8 entry) is equally INCOMPLETE.

<!-- /SYNC:spec-drift-adjudication -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

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

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run the suite 100 times, each run just adds more data. Verification is only PASS after the relevant suite/project passes 2 consecutive runs without database reset.
>
> 1. **Unique data per run:** Use the project's unique ID generator for ALL entity IDs created in tests. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior test runs MUST NOT interfere with current run.
> 3. **No schema rollback dependency:** Tests work with current schema only. Never rely on schema rollback or migration reversals.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing pattern (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no database reset between runs. Each test is isolated by unique seed data, not by cleanup.
> 6. **Unique names/codes:** When entities require unique names/codes, append a unique suffix using the project's ID generator.
> 7. **Migration code excluded:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:repeatable-test-principle -->

<!-- SYNC:test-data-isolation -->

> **Parallel-Safe Test Isolation** — Tests MUST run in parallel and still pass; no test's data may be affected by any other test. `repeatable-test-principle` guards a test against its OWN prior runs; THIS guards it against OTHER concurrent tests, including indirect corruption through a shared parent + a cross-cutting consumer.
>
> 1. **Own fresh data per test:** Each test creates its own entities with unique IDs, down to the root it asserts on. NEVER assert against a shared mutable entity another test can change; only immutable reference/lookup data may be shared — why: shared mutable state is the single point another test corrupts.
> 2. **Isolate at the highest mutated entity:** Own a private instance of the highest-level entity (aggregate root/parent) any test mutates. Sharing is safe only for data no test ever writes — why: a writable shared parent is contended ground two tests fight over.
> 3. **Account for cross-cutting consumers:** A bulk re-sync, recompute, projection rebuild, or cascade any test triggers over a shared parent can rewrite or wipe every entity beneath it — so sharing that parent is unsafe EVEN WHEN your test never mutates it directly — why: the corruption arrives through a consumer, not the path under test.
> 4. **Suspect contamination FIRST on contradiction:** When a test fails intermittently, or its result contradicts the traced behavior of the path under test (the path is provably innocent yet state is wrong), rule out cross-test interference BEFORE blaming the code under test — why: the innocent path takes the blame for another test's writes.
> 5. **Prove isolation by search, not assumption:** Grep every OTHER test touching the same shared data AND every consumer that fans out over it; cite `file:line` evidence. Absence of a sharer is a finding to prove, not assume — why: isolation claimed without a search is unverified.

<!-- /SYNC:test-data-isolation -->

<!-- SYNC:real-world-fidelity-testing -->

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** _"Can this sequence, timing, and data actually occur in production?"_ If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model real pacing between actor steps.** Two distinct actor actions that production separates by seconds, minutes, or hours MUST NOT be fired back-to-back in the same millisecond. Compressed pacing manufactures races the system was never designed to survive, then reports them as product defects.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.

<!-- /SYNC:real-world-fidelity-testing -->

<!-- SYNC:integration-test-execution-discipline -->

> **Integration Test Execution Discipline** — How the integration-test family (write · review · verify) runs, diagnoses, and clears a suite. Binds `/integration-test`, `/integration-test-review`, and `/integration-test-verify` identically.
>
> 1. **Verify the WHOLE system passes — not a hand-picked subset.** `/integration-test-verify` must prove the full relevant suite is green (every test in the system the change can touch), not one cherry-picked test. "All pass" is only true with actual runner output (Passed/Failed/Skipped counts + names) and only after 2 consecutive green runs without a DB reset.
> 2. **Drive state through real use-case paths — NEVER hack seed data.** Set up every precondition exactly as a real user would: real commands, queries, production consumers/messages, or valid idempotent seeders. NEVER create or mutate domain data by direct repository writes — that fabricates states a user could never reach and hides the real workflow bug. Hacking seed data to force a green run is forbidden.
> 3. **On ANY failure → `/debug-investigate` the root cause BEFORE any fix.** Do not guess, do not patch the symptom site. Trace the failure end-to-start and classify whose fault it is: test code (wrong assertion/setup), source/production code (real defect), or environment/infrastructure/data. Then route: test-code fault → `/integration-test-review` to fix the test at the root (never weaken assertions or add skips); source-code fault → fix the production defect at the owning layer and report it; environment fault → mark BLOCKED and point at the startup script. NEVER change a test to match broken code.
> 4. **60-second runtime cap — a slow test is a RED FLAG, not a tuning knob.** Local integration tests run fast. If any single test (or a stalled suite) exceeds ~60s, STOP and treat the slowness itself as a defect signal — deadlock, missing `await`, infinite poll/retry, a real network/external call, or an unbounded query. `/debug-investigate` the cause; NEVER paper over it by raising the timeout or extending the wait.
> 5. **Loop until the whole suite is green.** After fixing the validated root cause, restart the full 2-run verification from run 1. Done means the entire relevant suite passes repeatably — never green-once, never a subset.

<!-- /SYNC:integration-test-execution-discipline -->

<!-- SYNC:red-flag-stop-conditions -->

> **Red Flag Stop Conditions** — STOP and escalate to user via AskUserQuestion when:
>
> 1. Confidence drops below 60% on any critical decision
> 2. Changes would affect >20 files (blast radius too large)
> 3. Cross-service boundary is being crossed
> 4. Security-sensitive code (auth, crypto, PII handling)
> 5. Breaking change detected (interface, API contract, DB schema)
> 6. Test coverage would decrease after changes
> 7. Approach requires technology/pattern not in the project
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
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
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
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
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
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `/project-init` or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `/sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

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

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->

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

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

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

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `plans/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce integration tests that exercise real production paths and assert specific DB field values — so every test protects a traceable business behavior (TC), survives repeated runs without reset, and fails only when the protected intent actually breaks.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION each canonical body below is in force; this digest is the signpost, NEVER the substitute:**

- **Source/Test Drift Check:** on source change, adjudicate whether tests or source is wrong.
- **Spec↔Tests↔Code Triangulation:** the unit of judgment is the WHOLE PACKAGE (spec §3/§4/§8 + tests + code) — load all three, reason mutual-consistency first; a disagreeing or missing face is a logged finding, NEVER a silent pass.
- **Spec Drift Adjudication:** on behavior divergence from a canonical spec, classify CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and harvest unwritten invariants into §4/§8 + a guarding test — NEVER normalize drift to whichever side is green.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** every claim needs traced proof; never present a guess as fact.
- **Understand Code First:** read existing code and grep 3+ patterns before writing.
- **Graph Impact Analysis:** run blast-radius when graph.db exists; flag stale impacted files.
- **Repeatable Test Principle:** unique data, additive-only, no reset — pass 2 consecutive runs.
- **Parallel-Safe Test Isolation:** own fresh per-test data; never a shared mutable entity; account for cross-cutting consumers that wipe a shared parent; suspect contamination FIRST on contradiction; prove isolation by grep.
- **Real-World Fidelity Gate:** only test sequences, pacing, and data production can actually reach; barriers wait on a real settle signal in ARRANGE — never a widened assertion.
- **Red Flag Stop Conditions:** escalate on low confidence, large blast radius, breaking change.
- **Rationalization Prevention:** reject step-skipping evasions; show grep evidence, plan anyway.
- **Incremental Persistence:** persist findings to `plans/reports/` after each file, never in memory.
- **Sub-Agent Return Contract:** sub-agents return only the summary shape, detail on disk.
- **Sub-Agent Selection:** route specialized domains to matching specialists, never `code-reviewer`.
- **Nested Task Creation:** child skills expand visible phase tasks and link the parent.
- **Project Reference Docs Guide:** read required project-reference docs (always `lessons.md`) before target work.
- **Task Tracking & External Report:** bootstrap task breakdown, transition one task at a time.

- **MANDATORY IMPORTANT MUST ATTENTION** NEVER write smoke-only tests — instead read handler/entity/event source, assert specific changed field values — why: DI-resolution / exception-null-only tests pass while the behavior is broken
- **MANDATORY IMPORTANT MUST ATTENTION** ALWAYS use async polling for EVERY DB assertion — no exceptions, not just async handlers — why: event handlers, message-bus consumers, background jobs, write latency delay persistence
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER fabricate state by direct repository writes — instead drive state through real command/query/seeder paths or valid seeded fixtures — why: shortcut data creates invalid state the suite then certifies
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing tests in the SAME service and READ `references/integration-test-patterns.md` BEFORE writing — match collection, base class, helpers, unique-name generators — why: local conventions override generic templates
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence (confidence >80% to act, <60% do NOT recommend) for every claim about field changes, entities, or handler behavior — why: AI hallucinates APIs/signatures; grep to confirm before asserting
- **MANDATORY IMPORTANT MUST ATTENTION** `TaskCreate` — break ALL work into small tasks BEFORE starting; transition one task at a time, add a final review task — why: tracking survives context loss/compaction
- **MANDATORY IMPORTANT MUST ATTENTION** execute the main task ordering IN ORDER — (1) FIRST verify/upsert TCs in feature-doc §8 for business-visible behavior, or record `TECHNICAL-ONLY` for non-business behavior, (2) MIDDLE implement tests with the correct annotation, (3) FINAL verify traceability, feature-area-WIDE, across integration + unit suites — and run the per-mode loop Detect mode → Find targets → Gather context → Execute → Report — why: implementing before traceability exists produces orphans and skipping FINAL leaves drift undetected
- **MANDATORY IMPORTANT MUST ATTENTION** run the named "Validate: no missing integration tests" `TaskCreate` item — non-skippable inside a workflow, with current git changes present, or by user request (essentially every run) — every changed file covered AND every §8 TC in the WHOLE feature area covered, zero GAP rows before marking done — why: a diff-scoped-only check misses pre-existing orphaned TCs outside this run
- **MANDATORY IMPORTANT MUST ATTENTION** every test method carries a traceability annotation: `TestSpec=TC-{FEATURE}-{NNN}` for business §8 coverage, or `TechnicalSpec=...` for technical-only regression coverage. Auto-create in Section 8 ONLY for genuinely uncovered business behavior — why: the annotation is the join key for traceability
- **MANDATORY IMPORTANT MUST ATTENTION** one business TC maps to MANY tests (1:N, integration + unit) — NEVER split or technicalize a TC to force 1:1 — why: 1:1 splitting breaks the spec's business/user-story orientation (M1/M5)
- **MANDATORY IMPORTANT MUST ATTENTION** for any handler enforcing a `[HARD]` §4 rule or §5 invariant, generate a Pattern 9 property/metamorphic test + boundary counter-case tied to a §8 Invariant/Property TC — why: example tests guard fixed points; the rule must fail across its whole input domain (mutation-kill, not line-coverage)
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER create `Queries/` or `Commands/` folders — instead organize by domain feature — why: CQRS-type folders fragment a domain across directories
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER mark done after one green run — verification requires 2 consecutive `/integration-test-verify` passes WITHOUT a DB reset — why: one run proves only the current run, not repeatability
- **MANDATORY IMPORTANT MUST ATTENTION** make every test parallel-safe — own fresh per-test data down to the root it asserts on, NEVER a shared mutable entity; account for cross-cutting consumers (bulk re-sync/recompute/rebuild/cascade) that wipe a shared parent; on a contradiction between a provably-innocent path and wrong state, suspect cross-test interference FIRST and prove isolation by grepping other tests + consumers — why: shared mutable state lets another test silently corrupt your data and the innocent path takes the blame
- **MANDATORY IMPORTANT MUST ATTENTION** apply the Real-World Fidelity Gate BEFORE writing any setup — ask "can this sequence, timing, and data actually occur in production?", model real pacing between distinct actor actions instead of firing them in the same millisecond, and wait on an observable settle signal in ARRANGE; NEVER widen an assertion timeout, loosen a comparison, or wrap a failing assertion in a retry to compensate — why: a scenario production can never reach proves nothing when it passes and manufactures phantom "product defects" when it fails
- **MANDATORY IMPORTANT MUST ATTENTION** `review`/`verify` are lightweight in-skill MODES — invoke the standalone `/integration-test-review` and `/integration-test-verify` skills for the heavier workflow gates — why: name-collision; modes are not the sibling skills
- **MANDATORY IMPORTANT MUST ATTENTION** `AskUserQuestion` — validate workflow/route decisions with the user. NEVER auto-decide complexity.
- **MANDATORY IMPORTANT MUST ATTENTION** passing code/tests NEVER outrank canonical spec intent — instead reach adjudication-required with evidence before changing spec/test/code on a behavior mismatch — why: a green test can encode a regression
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**Anti-Rationalization:**

| Evasion                                                | Rebuttal                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Test is simple, skip TC lookup"                       | TC traceability = test value. Skip = untraceable test.                                                                                            |
| "Async polling not needed here"                        | ALL DB assertions need polling. Handler type irrelevant.                                                                                          |
| "Already searched patterns"                            | Show `file:line` evidence. No proof = no search.                                                                                                  |
| "Smoke test is fine for now"                           | Smoke-only FORBIDDEN. Assert specific field values.                                                                                               |
| "Repo setup is faster"                                 | Direct repository data hacks create invalid state. Use real use-case paths or valid seeded fixtures.                                              |
| "One green run is enough"                              | Verification requires 2 consecutive passing runs without DB reset.                                                                                |
| "It shares an existing entity, that's fine"            | Shared mutable state is the single point another test corrupts. Own fresh per-test data; only immutable lookup data may be shared.                |
| "My path doesn't mutate that parent"                   | A cross-cutting consumer can wipe the shared parent without you touching it. Sharing it is unsafe even without direct mutation.                   |
| "The path under test is correct, so the test is right" | Provably-innocent path + wrong state = suspect cross-test interference FIRST. Grep other tests + cross-cutting consumers before blaming the code. |
| "REVIEW: one pass is enough"                           | Low confidence → spawn fresh sub-agent. Never declare PASS after Round 1.                                                                         |
| "Skip task creation, it's obvious"                     | TaskCreate is non-negotiable. Tracking prevents context loss.                                                                                     |
| "Split this TC so tests map 1:1"                       | One business TC → MANY tests is the expected shape. Splitting breaks spec business orientation (M1/M5).                                           |
| "Example tests cover the rule"                         | A `[HARD]` §4 rule / §5 invariant needs a Pattern 9 property test — examples guard fixed points only.                                             |
| "Run `review` mode, it's the gate"                     | `review`/`verify` modes are inline passes; the workflow gates are the standalone `/integration-test-review` + `/integration-test-verify` skills.  |

---

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

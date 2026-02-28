---
name: integration-test
version: 1.0.0
description: '[Testing] Generate integration tests from git changes (default) or user prompt. Subcutaneous CQRS tests with real DI, no mocks.'
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task, TaskCreate
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI may ask user whether to skip.

**Prerequisites:** **MUST READ** before executing:

- `.claude/skills/shared/understand-code-first-protocol.md`
- `references/integration-test-patterns.md`

> **CRITICAL: Search existing patterns FIRST.** Before generating ANY test, grep for existing integration test files in the same service. Read at least 1 existing test file to match conventions (namespace, usings, collection name, base class, helper usage). Never generate tests that contradict established patterns in the codebase.

> **For mocked unit tests using Arrange-Act-Assert patterns, use `tasks-test-generation` skill instead.**

## Quick Summary

**Goal:** Generate integration test files for CQRS commands/queries using real DI (no mocks).

## Project Pattern Discovery

Before implementation, search your codebase for project-specific patterns:

- Search for: `IntegrationTest`, `TestFixture`, `TestUserContext`, `IntegrationTestBase`
- Look for: existing test projects, test collection definitions, service-specific test base classes

> **MANDATORY IMPORTANT MUST** Plan ToDo Task to READ `integration-test-reference.md` for project-specific patterns and code examples.
> If file not found, continue with search-based discovery above.

**Two modes:** (1) From git changes (default) — detects uncommitted command/query files and generates matching tests. (2) From prompt — user specifies what to test. Both modes read existing tests for conventions before generating.

**Workflow:**

1. **Detect mode** — Args provided? From-prompt. No args? From-changes (git diff).
2. **Find targets** — Identify command/query files to test
3. **Gather context** — Read command file + existing tests in same service for conventions + service base class
4. **Generate** — Write test file following canonical patterns
5. **Verify** — Build check

**Key Rules:**

- MUST search for existing test patterns in the same service BEFORE generating
- MUST READ `references/integration-test-patterns.md` before writing any test
- **Organize by domain feature, NOT by type** — command and query tests for the same domain go in the same folder (e.g., `Goals/GoalCommandIntegrationTests.cs` + `Goals/GoalQueryIntegrationTests.cs`). NEVER create a `Queries/` or `Commands/` folder.
- Use `IntegrationTestHelper.UniqueName()` for ALL string test data
- Use `AssertEntityMatchesAsync<T>` for DB verification (built-in WaitUntil polling)
- Minimum 3 test methods: happy path, validation failure, DB state check
- Every test method MUST have `// TC-{MOD}-XXX: Description` comment AND `[Trait("TestSpec", "TC-{MOD}-XXX")]` — placed **before** `[Fact]`, outside method body
- If no TC exists in feature docs, **auto-create** it in Section 17 before generating the test

## Mandatory Task Ordering (MUST FOLLOW)

When generating integration tests, ALWAYS create and execute tasks in this exact order:

1. **FIRST task: Verify/upsert test specs in feature docs**
    - Read feature doc Section 17 (`docs/business-features/{App}/detailed-features/`) for the target domain
    - Read test-specs doc (`docs/test-specs/{App}/README.md`) if exists
    - For each test case to generate: verify a matching `TC-{MOD}-XXX` exists in docs
    - If TC is MISSING: create the TC entry in Section 17 with Priority, Status, GIVEN/WHEN/THEN, Evidence
    - If TC is INCORRECT: update it to reflect current command/query behavior
    - Output: a TC mapping list (TC code → test method name) for subsequent tasks

2. **MIDDLE tasks: Implement integration tests**
    - Generate test files using the TC mapping from task 1
    - Each `[Fact]` method gets annotation before it (outside method body):
        ```csharp
        // TC-GM-001: Create valid goal — happy path
        [Trait("TestSpec", "TC-GM-001")]
        [Fact]
        public async Task CreateGoal_WhenValidData_ShouldCreateSuccessfully()
        ```
    - Follow all existing patterns (Collection, Trait("Category"), UniqueName, AssertEntity\*, etc.)

3. **FINAL task: Verify bidirectional traceability**
    - Grep all `[Trait("TestSpec", ...)]` in the test project
    - Grep all `TC-{MOD}-XXX` in feature doc Section 17 / test-specs doc
    - Verify every test method links to a doc TC, and every doc TC links back to a test
    - Flag orphans: tests without doc TCs, or doc TCs without matching tests
    - Update `IntegrationTest` field in feature doc TCs with `{File}::{MethodName}`

## Module Abbreviation Registry

| Module             | Abbreviation | Test Folder           |
| ------------------ | ------------ | --------------------- |
| Goal Management    | GM           | `Goals/`              |
| Check-In           | CI           | `CheckIns/`           |
| Performance Review | PR           | `PerformanceReviews/` |
| Time Management    | TM           | `TimeManagement/`     |
| Form Templates     | FT           | `FormTemplates/`      |
| Kudos              | KD           | `Kudos/`              |
| Background Jobs    | BJ           | —                     |

# Integration Test Generation

## Mode Detection

```
Args provided (e.g., "/integration-test SaveKudosCommand")
  → FROM-PROMPT mode: generate tests for the specified command/query

No args (e.g., "/integration-test")
  → FROM-CHANGES mode: detect changed command/query files from git
```

## Step 1: Find Targets

### From-Changes Mode (default)

Run via Bash tool:

```bash
git diff --name-only; git diff --cached --name-only
```

Filter for `*Command.cs` or `*Query.cs` under `src/Services/`. Extract service from path:

| Path pattern                                       | Service   | Test project                 |
| -------------------------------------------------- | --------- | ---------------------------- |
| `src/Services/{ServiceDir}/{Service}.Application/` | {Service} | `{Service}.IntegrationTests` |

Search your codebase for existing `*.IntegrationTests` projects to find the correct mapping.

If no test project exists: inform user "No integration test project for {service}. See CLAUDE.md Integration Testing section to create one."

If test file already exists: ask user overwrite or skip.

### From-Prompt Mode

User specifies command/query name. Use Grep tool (NOT bash grep):

```
Grep pattern="class {CommandName}" path="src/Services/" glob="*.cs"
```

## Step 2: Gather Context

For each target, read these files (in parallel):

1. **Command/query file** — extract: class name, result type, DTO property, entity type
2. **Existing test files in same service** — use Glob `{Service}.IntegrationTests/**/*IntegrationTests.cs`, read 1+ for conventions (collection name, trait, namespace, usings, base class)
3. **Service integration test base class** — grep: `class.*ServiceIntegrationTestBase`
4. **`references/integration-test-patterns.md`** — canonical templates (adapt {Service} placeholders)

## Step 2b: Look Up TC Codes

For each target domain, read the matching test spec:

- `docs/business-features/{App}/detailed-features/` Section 17 (primary source of truth)
- `docs/test-specs/{App}/README.md` (secondary reference)

Build a mapping: test case description → TC code (e.g., "create valid goal" → TC-GM-001).
If no TC exists, **CREATE IT** in the feature doc Section 17 before generating the test.
If TC is outdated or incorrect, **UPDATE IT** first.
This is NOT optional — the doc is the source of truth and must be correct before tests reference it.

## Step 3: Generate Test File

**File path:** `src/Services/{ServiceDir}/{Service}.IntegrationTests/{Domain}/{CommandName}IntegrationTests.cs`

> **Folder = domain feature.** `{Domain}` is the business domain (Goals, CheckIns, TimeManagement, PerformanceReviews, etc.), NOT the CQRS type. Both command and query tests for the same domain live in the same folder.

**Structure:**

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

```bash
dotnet build {test-project-path}
```

Check:

- [ ] `[Collection]` attribute present with correct collection name
- [ ] `[Trait("Category", ...)]` present
- [ ] All string test data uses `IntegrationTestHelper.UniqueName()`
- [ ] User context via `TestUserContextFactory.Create*()`
- [ ] DB assertions use `AssertEntityMatchesAsync` or `AssertEntityDeletedAsync`
- [ ] No mocks — real DI only
- [ ] Every `[Fact]` method has `// TC-{MOD}-XXX: Description` comment + `[Trait("TestSpec", "TC-{MOD}-XXX")]`

## Example Files to Study

Search your codebase for existing integration test files to use as reference:

```bash
# Find existing integration test files
find src/Services -name "*IntegrationTests.cs" -type f
find src/Services -name "*IntegrationTestBase.cs" -type f
find src/Services -name "*IntegrationTestFixture.cs" -type f
```

| Pattern                                                             | Shows                        |
| ------------------------------------------------------------------- | ---------------------------- |
| `{Service}.IntegrationTests/{Domain}/*CommandIntegrationTests.cs`   | Create + update + validation |
| `{Service}.IntegrationTests/{Domain}/*QueryIntegrationTests.cs`     | Query with create-then-query |
| `{Service}.IntegrationTests/{Domain}/Delete*IntegrationTests.cs`    | Delete + cascade             |
| `{Service}.IntegrationTests/{Service}ServiceIntegrationTestBase.cs` | Service base class pattern   |

## Related

- `tasks-test-generation` — Unit test generation (mock-based)
- `test` — Run existing tests
- `review-changes` — Review uncommitted changes

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements

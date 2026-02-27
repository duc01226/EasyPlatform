---
name: generate-tests
description: "[Testing] Generate integration and E2E tests from TC-IDs in docs/test-specs/. Reads feature test specifications, classifies each TC-ID as backend or frontend, and scaffolds C# xUnit integration tests or Playwright E2E tests using established project patterns."
keywords: "generate tests, generate test, tests from feature, feature to tests, scaffold tests, create tests from spec"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
skill-type: user-invoked
---

# Generate Tests Skill

## Summary

**Goal:** Generate integration and E2E test files from TC-IDs defined in `docs/test-specs/` feature documents.

| Step | Action | Key Notes |
|------|--------|-----------|
| 1 | Accept feature name and locate spec docs | Scan `docs/test-specs/<Feature>/README.md` |
| 2 | Parse TC-IDs with metadata | Extract `TC-{MOD}-{FEAT}-{NUM}`, priority, Gherkin steps, acceptance criteria |
| 3 | Read existing test examples for patterns | Grep for similar test files to reuse naming/import conventions |
| 4 | Classify each TC-ID as backend or frontend | Backend = API/endpoint/data; Frontend = UI/page/browser/click |
| 5 | Generate test files with TC-ID trait annotations | Output to correct directories with full boilerplate |
| 6 | Report generated files and coverage | Summary of what was created |

## Input

```
/generate-tests <FeatureName> [--tc-ids TC-XXX-001,TC-XXX-002] [--type backend|frontend|both]
```

- **FeatureName** (required): Module name matching a folder under `docs/test-specs/` (e.g., `TextSnippet`)
- **--tc-ids** (optional): Comma-separated list of specific TC-IDs to generate. If omitted, generates all.
- **--type** (optional): Force generation type. If omitted, auto-classifies each TC-ID.

## Keywords (Trigger Phrases)

- `generate tests`
- `generate test`
- `tests from feature`
- `feature to tests`
- `scaffold tests`
- `create tests from spec`

## Workflow

### Step 1 -- Locate and Read Feature Spec

1. Read `docs/test-specs/{FeatureName}/README.md`
2. Read `docs/test-specs/INTEGRATION-TESTS.md` for cross-module scenarios
3. If feature doc not found, report error and list available features via Glob

```
Glob: docs/test-specs/*/README.md
```

### Step 2 -- Parse TC-IDs with Metadata

Extract from the spec document:

| Field | Source Pattern | Example |
|-------|---------------|---------|
| TC-ID | `### TC-{MOD}-{FEAT}-{NUM}:` heading | `TC-SNP-CRT-001` |
| Title | Text after TC-ID in heading | `Create New Snippet Successfully` |
| Priority | `**Priority**: P{N}-{Label}` | `P1-High` |
| Preconditions | Content under `**Preconditions**:` | List items |
| Gherkin Steps | Content inside ` ```gherkin ``` ` block | Given/When/Then |
| Acceptance Criteria | Content under `**Acceptance Criteria**:` | Checklist items |
| Test Data | Content inside ` ```json ``` ` block (if present) | JSON object |

**TC-ID format**: `TC-{MODULE}-{FEATURE}-{NUM}` where:
- MODULE: 2-5 uppercase letters (e.g., SNP, TSK, CAT)
- FEATURE: 2-5 uppercase letters (e.g., CRT, UPD, DEL, SRC)
- NUM: 3 digits (e.g., 001, 002)

Regex: `TC-[A-Z]{2,5}-[A-Z]{2,5}-\d{3}`

### Step 3 -- Read Existing Test Examples

Before generating, find existing patterns to match conventions:

```
# Backend patterns
Grep: pattern="[Trait\(\"TestCase\"" in src/Backend/PlatformExampleApp.Tests.Integration/

# Frontend patterns
Grep: pattern="TC-" in src/Frontend/e2e/tests/
```

Read reference templates:
- `.claude/skills/generate-tests/references/integration-test-template.md`
- `.claude/skills/generate-tests/references/e2e-test-template.md`

### Step 4 -- Classify as Backend or Frontend

| TC-ID Keywords | Target Layer | Rationale |
|----------------|-------------|-----------|
| API, endpoint, HTTP, save, create, update, delete, search, database, persist, validation error, message bus | **Backend** (C# xUnit) | Tests server-side logic |
| UI, page, browser, click, form, display, list, navigate, button, input, modal, dropdown | **Frontend** (Playwright E2E) | Tests user interaction |
| lifecycle, full flow, end-to-end, integration | **Both** | Cross-layer scenarios |

Classification algorithm:
1. Scan Gherkin steps and acceptance criteria for keywords
2. If "API" or "endpoint" or "database" keywords dominate -- Backend
3. If "click" or "page" or "UI" or "form" keywords dominate -- Frontend
4. If both keyword sets present or TC-ID starts with `INT-` -- Both
5. If `--type` flag provided, override classification

### Step 5 -- Generate Test Files

#### Backend (C# xUnit Integration Test)

**Output path**: `src/Backend/PlatformExampleApp.Tests.Integration/{FeatureName}/{FeatureName}{Feature}Tests.cs`

Template structure (see `references/integration-test-template.md` for full template):

```csharp
using System.Net;
using System.Text.Json;
using Easy.Platform.IntegrationTest;
using PlatformExampleApp.Tests.Integration.Infrastructure;

namespace PlatformExampleApp.Tests.Integration.{FeatureName};

/// <summary>
/// {Feature} integration tests for the {FeatureName} endpoints.
/// Auto-generated from docs/test-specs/{FeatureName}/README.md
/// </summary>
[Trait("Category", "Integration")]
public class {ClassName}Tests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// {TC-ID}: {Title}
    /// </summary>
    [Fact]
    [Trait("TestCase", "{TC-ID}")]
    public async Task {MethodName}()
    {
        // Arrange
        var uniqueText = TestDataHelper.GenerateTestText("{context}");

        // Act
        var response = await Api.{Method}(endpoint, body);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        // ... assertions from acceptance criteria
    }
}
```

**Naming conventions**:
- Class: `{FeatureName}{Feature}Tests` (e.g., `SnippetCrudTests`)
- Method: `{Feature}_{Scenario}_{ExpectedResult}` (e.g., `SaveSnippet_ValidData_ReturnsCreatedSnippet`)
- TC-ID goes in both `[Trait("TestCase", "...")]` and XML doc comment

#### Frontend (Playwright E2E Test)

**Output path**: `src/Frontend/e2e/tests/{feature-kebab}/{feature-kebab}.spec.ts`

Template structure (see `references/e2e-test-template.md` for full template):

```typescript
import { createTestSnippet } from '../../fixtures/test-data';
import { AppPage, TextSnippetPage } from '../../page-objects';
import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

test.describe('@{Priority} @{FeatureName} - {Feature} Operations', () => {
    let appPage: AppPage;
    let featurePage: FeaturePage;

    test.beforeEach(async ({ page }) => {
        appPage = new AppPage(page);
        featurePage = new FeaturePage(page);
        await appPage.goToHome();
        // navigate to feature...
    });

    test('{TC-ID}: @{Priority} {Title}', async ({ page }) => {
        /**
         * @scenario {Title}
         * @given {Given steps from Gherkin}
         * @when {When steps from Gherkin}
         * @then {Then steps from Gherkin}
         */
        // Arrange
        // Act
        // Assert
    });
});
```

**Naming conventions**:
- File: `{feature-kebab-case}.spec.ts`
- Describe block: `@{Priority} @{FeatureName} - {Feature} Operations`
- Test title: `{TC-ID}: @{Priority} {Title}`
- JSDoc with Gherkin steps in every test

### Assertion Quality Rules (MANDATORY)

Every generated test MUST meet these minimum assertion requirements:

| Operation | Required Assertions |
|-----------|-------------------|
| Create | HTTP status + `id` not null/empty + at least 1 domain field matches input. **PREFERRED:** follow-up GET/search query to confirm persistence |
| Update | HTTP status + `id` unchanged + at least 1 field reflects new value. **PREFERRED:** follow-up query confirms updated value |
| Soft Delete | HTTP status + domain boolean flag (`wasSoftDeleted`). **PREFERRED:** follow-up query confirms absence or deleted status |
| Restore | HTTP status + domain boolean flag (`wasRestored`) + `id` retained |
| Validation Error | Non-success status + parse response body + assert error details (never status-only) |
| Search | HTTP status + result count >= 1 + verify matched item contains search term |
| Setup Step | HTTP status with descriptive `because` string (e.g., "setup: create must succeed") |

#### Data Verification Priority

1. **Follow-up query (PREFERRED):** After mutation, execute a GET/search/list query to verify data was persisted correctly. This proves the data round-trips through the database and is the source of truth.
2. **Response body inspection:** Parse the command response JSON and verify domain fields. Acceptable when no query endpoint exists.

Always use at least one method. Never rely solely on HTTP status codes.

#### Domain Flag Verification

If the entity response includes boolean flags (e.g., `wasCreated`, `wasSoftDeleted`, `wasRestored`),
the test MUST assert the relevant flag value. Check the entity DTO or API response schema to identify available flags.

#### E2E Post-Mutation Verification

After any E2E create/update/delete action + `waitForLoading()`:
- Create: verify item appears in list (`verifySnippetInList()` or equivalent)
- Update: re-select item + re-read at least one field value and assert it matches the updated input (PREFERRED over list-only check)
- Delete: verify item no longer appears in list

#### Validation Error Body Inspection

Never assert only HTTP status for validation errors. Always:
1. Parse the response body
2. Assert the error structure exists (e.g., `errors` array length > 0)
3. Optionally assert specific error field names match the invalid input field

### Step 6 -- Report

After generation, output a summary:

```markdown
## Generate Tests Report

### Feature: {FeatureName}
- Spec file: docs/test-specs/{FeatureName}/README.md
- TC-IDs processed: N

### Backend Tests Generated
| TC-ID | Class | Method | File |
|-------|-------|--------|------|
| TC-XXX-001 | XxxTests | Method_Scenario_Expected | path/to/file.cs |

### Frontend Tests Generated
| TC-ID | Describe | Test Title | File |
|-------|----------|-----------|------|
| TC-XXX-001 | Feature Operations | TC-XXX-001: Title | path/to/file.spec.ts |

### Skipped TC-IDs
| TC-ID | Reason |
|-------|--------|
| TC-XXX-002 | Already exists in SnippetCrudTests.cs:19 |
```

## References

- **Integration test template**: `.claude/skills/generate-tests/references/integration-test-template.md`
- **E2E test template**: `.claude/skills/generate-tests/references/e2e-test-template.md`
- **Test spec format**: `docs/test-specs/TextSnippet/README.md` (canonical example)
- **Integration scenarios**: `docs/test-specs/INTEGRATION-TESTS.md`
- **Existing backend tests**: `src/Backend/PlatformExampleApp.Tests.Integration/`
- **Existing E2E tests**: `src/Frontend/e2e/tests/`
- **Platform test base**: `src/Platform/Easy.Platform.IntegrationTest/`
- **Page objects**: `src/Frontend/e2e/page-objects/`
- **Test data fixtures**: `src/Frontend/e2e/fixtures/test-data.ts`
- **Test helpers**: `src/Frontend/e2e/utils/test-helpers.ts`
- **API helpers**: `src/Frontend/e2e/utils/api-helpers.ts`

## Anti-Patterns to Avoid

- **Never generate tests without a corresponding TC-ID** -- every test must trace to a spec
- **Never hardcode test data** -- use `TestDataHelper.GenerateTestText()` (backend) or `createTestSnippet()` / `generateTestId()` (frontend)
- **Never skip the Arrange-Act-Assert pattern** -- every test must have clear sections
- **Never skip the `[Trait("TestCase", "...")]` annotation** -- this is how TC-ID coverage is tracked
- **Never create duplicate tests** -- always Grep for existing TC-ID coverage first
- **Never use `HttpClient` directly in E2E tests** -- use `ApiHelpers` or page objects
- **Never forget cleanup** -- frontend tests use `test.afterEach` to clean test data
- **Always include Gherkin steps as JSDoc** in E2E tests for traceability
- **Never generate a test with only HTTP status assertions** -- every test must verify at least one domain field or flag in the response body, or execute a follow-up query
- **Never skip response body parsing** for validation error tests -- status-only checks prove nothing about error handling correctness
- **Never end an E2E update test at `waitForLoading()`** -- always re-select and re-read at least one field value to confirm persistence

## Status

- [x] Skill scaffolded (Phase 1.7)
- [x] Step 1 -- Feature spec locator (Phase 4)
- [x] Step 2 -- TC-ID parser with metadata extraction (Phase 4)
- [x] Step 3 -- Existing test pattern reader (Phase 4)
- [x] Step 4 -- Backend/Frontend classifier (Phase 4)
- [x] Step 5 -- Code generator with templates (Phase 4)
- [x] Step 6 -- Coverage report generator (Phase 4)

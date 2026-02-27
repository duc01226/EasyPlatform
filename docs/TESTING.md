# Testing Guide — EasyPlatform (TextSnippet Example App)

> .NET 9 + Angular 19 | Single-service example app

---

## 1. Overview

The TextSnippet service is a single-microservice example demonstrating all EasyPlatform patterns end-to-end.

| Layer | URL |
|-------|-----|
| API (ASP.NET Core) | `http://localhost:5001` |
| Frontend (Angular) | `http://localhost:4001` |

Three test layers:

- **Integration Tests** — C# xUnit tests that hit the real API via docker-compose (no mocks)
- **Contract Tests** — C# xUnit tests validating RabbitMQ message serialization round-trips (no infrastructure needed)
- **E2E Tests** — Playwright TypeScript tests that drive the browser against the running frontend + API

---

## 2. Prerequisites

### Infrastructure

1. **Docker Desktop** must be running.
2. Create the shared Docker network (one-time):
   ```bash
   docker network create platform-example-app-network
   ```
3. Start all services:
   ```bash
   cd src
   docker-compose \
     -f platform-example-app.docker-compose.yml \
     -f platform-example-app.docker-compose.override.yml \
     -p easyplatform-example \
     up --detach
   ```

### Toolchain

| Tool | Version |
|------|---------|
| .NET SDK | 9.x |
| Node.js | 20+ |
| npm | 10+ |

---

## 3. Running Tests

### Integration Tests (C# xUnit)

```bash
dotnet test src/Backend/PlatformExampleApp.Tests.Integration/PlatformExampleApp.Tests.Integration.csproj
```

### Contract Tests (C# xUnit — no Docker needed)

```bash
dotnet test src/Backend/PlatformExampleApp.TextSnippet.ContractTests/PlatformExampleApp.TextSnippet.ContractTests.csproj
```

### E2E Tests (Playwright TypeScript)

```bash
cd src/Frontend/e2e

# First-time setup
npm install
npx playwright install chromium

# Run modes
npm test                    # Run all tests (headless)
npm run test:smoke          # Smoke tests only (@P0)
npm run test:critical       # Critical tests (@P0 + @P1)
npm run test:headed         # Headed mode (visible browser)
npm run test:debug          # Debug mode (step-through)
npm run test:ui             # Playwright UI mode (interactive)
npm run codegen             # Record new tests via browser
```

---

## 4. Test Data Strategy

### UUID-Based Creation

All test data uses globally unique identifiers so tests never collide:

- **C# integration tests:** `TestDataHelper.GenerateTestText("context")` / `GenerateTestId("prefix")` / `GenerateTestName("prefix")`
- **E2E tests:** `TestDataHelper.GenerateTestId()` (TypeScript helper)

### No Teardown in Integration Tests

Integration tests are **additive only**. They create data but never delete it. UUID-scoped search filters (e.g., filtering by a unique tag or title prefix) prevent cross-test interference without requiring cleanup.

Rationale: teardown logic is brittle, order-dependent, and adds test maintenance overhead. UUID isolation is simpler and sufficient.

### Seed Data

`TextSnippetApplicationDataSeeder` seeds 60 snippets on every fresh database startup.

- Tests **MAY** use seed data for read/search/list scenarios.
- Tests **MUST NOT** depend on specific seed record IDs (IDs are non-deterministic across environments).

### E2E Exception

E2E tests **DO** use `cleanupTestData()` in `afterEach` which calls the API to delete test-created records (text snippets and tasks matching the test ID prefix). This ensures test data isolation across runs.

---

## 5. TC-ID Naming Convention

Every test case has a unique, traceable identifier.

### Format

```
TC-{MOD}-{FEAT}-{NUM}
```

### Module Codes

| Code | Module |
|------|--------|
| `SNP` | Snippet |
| `TSK` | Task |
| `CAT` | Category |

### Feature Codes

| Code | Feature |
|------|---------|
| `CRT` | Create |
| `UPD` | Update |
| `DEL` | Delete |
| `SRC` | Search |
| `LST` | List |
| `CMP` | Complete |
| `FLT` | Filter |
| `EDGE` | Edge Cases |

### Examples

```
TC-SNP-CRT-001   Create snippet with valid title and content
TC-SNP-SRC-003   Search snippets by keyword returns matching results
TC-TSK-DEL-002   Delete task removes it from the list
```

### Smoke Tests Exception

Smoke tests in `Smoke/` use a simplified `INT-{NUM}` format (e.g., `INT-001`) since they test cross-cutting infrastructure health, not specific domain features.

### Supplementary E2E Tests

E2E tests that cover scenarios **not** listed in `docs/test-specs/` use a `TS-{MODULE}-{PRIORITY}-{NUM}` format (e.g., `TS-TASK-P1-002`). These are supplementary tests covering additional UX flows (reset form, partial search, responsive viewport, etc.) that don't have TC-ID specifications. Only tests with a corresponding TC-ID in the spec get the `TC-` prefix.

### C# Annotation

```csharp
[Trait("TestCase", "TC-SNP-CRT-001")]
[Trait("Category", "Integration")]
public async Task CreateSnippet_WithValidData_ReturnsCreatedSnippet()
```

### Playwright Annotation

```typescript
test('TC-SNP-CRT-001: Create snippet with valid data @P1', async ({ page }) => {
```

### Priority Tags

| Tag | Meaning |
|----|---------|
| `@P0` | Smoke — must pass before any deployment |
| `@P1` | Critical — core user flows |
| `@P2` | Extended — edge cases and secondary flows |

---

## 6. Auth

**Auth is NOT enforced in the current TextSnippet example.**

No `[Authorize]` attribute is applied to any TextSnippet controller. All integration tests and E2E tests run **unauthenticated** — no tokens, no login steps required.

An in-memory IdentityServer4 instance provides test users `alice` and `bob`, but the TextSnippet API does not validate them.

### Future Auth Migration

When `[Authorize]` is added to controllers:

| Test Type | Approach |
|-----------|----------|
| Integration tests (WebApplicationFactory) | Add `TestAuthHandler` with `AddAuthentication("Test")` |
| Integration tests (docker-compose) | Use IDS machine-to-machine client credentials flow |
| E2E tests | Add login step in `beforeAll` or use saved auth state (`storageState`) |

---

## 7. Project Structure

```
src/
├── Platform/
│   └── Easy.Platform.IntegrationTest/        # Reusable integration test base library
│
├── Backend/
│   ├── PlatformExampleApp.Tests.Integration/ # TextSnippet integration tests (xUnit)
│   │   ├── Infrastructure/                    # Base classes, endpoints, shared helpers
│   │   ├── Smoke/                             # Smoke tests (API health, basic CRUD)
│   │   ├── TextSnippet/                       # Snippet CRUD, search, message bus tests
│   │   └── TaskItem/                          # Task CRUD and query tests
│   │
│   └── PlatformExampleApp.TextSnippet.ContractTests/ # Message bus contract tests (no Docker)
│       ├── Helpers/                            # Serialization test helper
│       └── MessageSchema/                     # Entity event + free-format round-trip tests
│
└── Frontend/
    └── e2e/                                   # Playwright E2E tests (TypeScript)
        ├── tests/                             # Test files organized by feature
        ├── page-objects/                       # Page Object Models
        ├── fixtures/                          # Playwright fixtures and helpers
        └── playwright.config.ts              # Playwright configuration
```

---

## 8. QC Recording Workflow (Playwright Codegen)

Record browser interactions with Playwright's built-in codegen tool, then refactor into production-quality tests.

### Prerequisites

1. Docker-compose services running (API + frontend)
2. Frontend accessible at `http://localhost:4001`
3. Node.js installed, `npm install` done in `src/Frontend/e2e/`

### Step-by-Step Guide

#### Step 1: Launch Codegen

```bash
cd src/Frontend/e2e
npm run codegen
```

This opens a browser and a code panel. Every click, fill, and navigation is recorded as Playwright code.

#### Step 2: Perform the Test Flow

Walk through the manual test scenario in the browser. The code panel generates TypeScript test code in real-time.

#### Step 3: Save Raw Recording

Copy the generated code and save it to:

```
src/Frontend/e2e/recordings/{feature-name}.spec.ts
```

The `recordings/` directory is gitignored (`*.spec.ts` excluded). Raw recordings are intermediate artifacts — not committed.

#### Step 4: Refactor into POM-Based Test

Transform the raw codegen output into a test that follows project conventions:

1. **Replace raw selectors** with existing page object methods (see `page-objects/`)
2. **Add TC-ID annotation** in the test title: `test('TC-SNP-CRT-001: description @P1', ...)`
3. **Add assertions** — codegen records actions but not verifications
4. **Add test data helpers** — use `createTestSnippet()` or `createTestTask()` from `fixtures/test-data.ts`
5. **Add cleanup** — push test data identifiers to `currentTestSnippets` / `currentTestTasks` array for `afterEach` cleanup

#### Step 5: Move to Tests Directory

Place the refactored test in the correct folder:

```
src/Frontend/e2e/tests/{module}/{feature}.spec.ts
```

| Module | Folder |
|--------|--------|
| Text Snippet | `tests/text-snippet/` |
| Task | `tests/task/` |
| Smoke | `tests/smoke/` |
| Form Validation | `tests/form-validation/` |

#### Step 6: Verify Locally

```bash
npm test                    # Run all tests
npm run test:headed         # Run with visible browser (useful for debugging)
```

### Existing Page Objects

| Page Object | File | Key Methods |
|-------------|------|-------------|
| `AppPage` | `app.page.ts` | `goToHome()`, `goToTextSnippets()`, `goToTasks()`, `isAppLoaded()` |
| `TextSnippetPage` | `text-snippet.page.ts` | `createSnippet()`, `selectSnippetByText()`, `verifySnippetInList()` |
| `TaskListPage` | `task-list.page.ts` | `createNewTask()`, `taskExistsInList()`, `getStatistics()` |
| `TaskDetailPage` | `task-detail.page.ts` | `fillTaskForm()`, `saveTask()`, `selectStatus()` |

### AI-Assisted Refactoring

Use the `/e2e-record` Claude Code skill to automate Step 4. It reads raw codegen output, identifies matching page object methods, adds TC-ID annotations, and produces a POM-based test following project conventions.

---

## 9. data-testid Attribute Strategy

Stable E2E selectors decouple tests from implementation details (CSS classes, element structure).

### Convention

```
data-testid="feature-name__element-name"
```

BEM-inspired: block is the feature, element is the specific UI element.

### Angular Template Example

```html
<div class="snippet-form" data-testid="snippet-form">
  <input class="snippet-form__title" data-testid="snippet-form__title-input" />
  <textarea class="snippet-form__content" data-testid="snippet-form__content-input"></textarea>
  <button class="snippet-form__btn --primary" data-testid="snippet-form__save-btn">Save</button>
</div>
```

### Playwright Usage

```typescript
// Preferred: testid locator
await page.getByTestId('snippet-form__save-btn').click();
await page.getByTestId('snippet-form__title-input').fill('My snippet');

// Acceptable: role + name (semantic, readable)
await page.getByRole('button', { name: 'Save' }).click();

// Avoid: CSS class selectors (fragile, couples tests to styling)
await page.locator('.snippet-form__btn--primary').click(); // don't do this
```

Existing E2E tests using role/text selectors are acceptable and do not need migration unless they become flaky.

---

## 10. CI Pipeline

### Azure DevOps

Configuration: `azure-pipelines.yml` (root)

Steps:
1. Run contract tests (no Docker needed)
2. Start docker-compose services
3. Run integration tests — output: TRX format
4. Run Playwright E2E tests — output: HTML report
5. TC-ID coverage check
6. Publish test results artifacts

### GitHub Actions

Configuration: `.github/workflows/test.yml`

Same sequence as Azure DevOps. Runs on push to `main` and on pull requests.

### Test Result Formats

| Test Type | Format | Location |
|-----------|--------|----------|
| .NET xUnit (integration + contract) | TRX | `TestResults/*.trx` |
| Playwright | HTML | `src/Frontend/e2e/playwright-report/` |

### TC-ID Coverage Validation

Automated script checks that all TC-IDs from `docs/test-specs/` have matching test annotations:

```bash
bash .claude/scripts/test-coverage-check.sh
```

Runs automatically in CI. Emits warnings for missing coverage.

---

## 11. Database Connections (Dev)

All services are exposed on localhost when running docker-compose locally.

| Service | Host:Port | Credentials |
|---------|-----------|-------------|
| SQL Server | `localhost:14330` | `sa` / `123456Abc` |
| MongoDB | `localhost:27017` | `root` / `rootPassXXX` |
| PostgreSQL | `localhost:54320` | `postgres` / `postgres` |
| Redis | `localhost:6379` | — |
| RabbitMQ | `localhost:5672` | `guest` / `guest` |

RabbitMQ Management UI: `http://localhost:15672` (`guest` / `guest`)

## 12. Test Assertion Quality

### Data Verification Priority

1. **Follow-up query (PREFERRED):** After mutation, execute a GET/search/list query to verify data was persisted correctly. This proves the data round-trips through the database.
2. **Response body inspection:** Parse the command response JSON and verify domain fields. Acceptable when no query endpoint exists.

Never rely solely on HTTP status codes.

### Minimum Assertion Rules

Every test must verify domain behavior, not just HTTP transport:

| Operation | Required Assertions |
|-----------|-------------------|
| Create | HTTP 200 + `id` not null + at least 1 domain field matches input. PREFERRED: follow-up query |
| Update | HTTP 200 + same `id` + at least 1 changed field. PREFERRED: follow-up query |
| Soft Delete | HTTP 200 + `wasSoftDeleted == true`. PREFERRED: follow-up query |
| Validation Error | Non-success status + parse response body + error details present |
| Search | HTTP 200 + result count >= 1 + matched item contains search term |
| E2E Create | UI action + `verifySnippetInList()` or equivalent |
| E2E Update | UI action + `waitForLoading()` + re-select + re-read field value |

### Anti-Patterns

| Weak (Do NOT) | Strong (DO) |
|---------------|-------------|
| `response.StatusCode.Should().Be(OK)` only | Parse body, assert `id` + domain field. PREFERRED: follow-up query |
| `IsSuccessStatusCode.Should().BeFalse()` only | Parse error body, assert error array length > 0 |
| E2E ends at `waitForLoading()` | Re-read field: `expect(await getFullTextValue()).toBe(updated)` |
| No setup step assertion | `createResponse.StatusCode.Should().Be(OK, "setup: create must succeed")` |

### Domain Flag Verification

Entities returning boolean operation flags must have those flags asserted:
- `wasCreated`: assert `true` after successful create
- `wasSoftDeleted`: assert `true` after soft delete
- `wasRestored`: assert `true` after restore

### Concurrency Tokens

For entities with `concurrencyUpdateToken`:
1. Extract token from create response
2. Include token in update request body
3. Assert token value changes in update response

### References

- Integration test template: `.claude/skills/generate-tests/references/integration-test-template.md`
- E2E test template: `.claude/skills/generate-tests/references/e2e-test-template.md`
- Deep test audit skill: `.claude/skills/review-tests/SKILL.md`
- Exemplar: `src/Backend/PlatformExampleApp.Tests.Integration/TaskItem/TaskCrudTests.cs`

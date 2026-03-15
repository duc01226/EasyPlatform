<!-- Last scanned: 2026-03-15 -->

# E2E Test Reference

This project has **two E2E testing frameworks**: Playwright (TypeScript, frontend-focused) and Selenium + SpecFlow (C#, BDD backend-focused). Both target the PlatformExampleApp (TextSnippet + TaskItem) running against live infrastructure.

---

## Architecture Overview

```
E2E Testing
├── Playwright (Frontend)
│   └── src/Frontend/e2e/
│       ├── playwright.config.ts         # Config: baseURL, projects, webServer
│       ├── tests/                       # 10 spec files across 4 categories
│       ├── page-objects/                # 5 page objects (POM pattern)
│       ├── fixtures/                    # Test data factories
│       ├── utils/                       # API helpers, console error tracking
│       └── recordings/                  # Video recordings (gitignored)
│
└── Selenium + SpecFlow (Backend BDD)
    ├── src/Backend/PlatformExampleApp.Test.BDD/
    │   ├── Features/                    # Gherkin .feature files
    │   ├── StepDefinitions/             # C# step bindings
    │   └── Startup.cs                   # DI + WebDriver config
    │
    └── src/Platform/Easy.Platform.AutomationTest/
        └── Base classes: BaseStartup, BddStepDefinitions<T>, IBddStepsContext
```

**Target Application:** `http://localhost:4001` (frontend), `http://localhost:5001/api` (backend API)

---

## Project Structure

### Playwright (Frontend E2E)

```
src/Frontend/e2e/
├── playwright.config.ts          # Framework configuration
├── package.json                  # Standalone package with @playwright/test ^1.50.0
├── tsconfig.json                 # Path aliases: @page-objects/*, @fixtures/*, @utils/*
├── page-objects/
│   ├── index.ts                  # Barrel exports
│   ├── base.page.ts              # BasePage: navigation, waitUntil, waitForLoading
│   ├── app.page.ts               # AppPage: tab navigation, global errors
│   ├── text-snippet.page.ts      # TextSnippetPage: CRUD, search, form modes
│   ├── task-list.page.ts         # TaskListPage: filtering, statistics, pagination
│   └── task-detail.page.ts       # TaskDetailPage: form, subtasks, soft-delete
├── fixtures/
│   └── test-data.ts              # TestData constants, createTestTask(), createTestSnippet()
├── utils/
│   ├── api-helpers.ts            # ApiHelpers class: CRUD via REST, cleanup
│   └── test-helpers.ts           # Extended test with ConsoleErrorTracker fixture
├── tests/
│   ├── smoke/
│   │   ├── app-load.spec.ts      # @P0: App loads, tabs work, responsive
│   │   └── api-health.spec.ts    # @P0: Backend API health checks
│   ├── text-snippet/
│   │   ├── crud.spec.ts          # @P0-P2: Create, update, reset, select
│   │   ├── search.spec.ts        # @P0-P3: Full-text, partial, case-insensitive, debounce
│   │   └── edge-cases.spec.ts    # @P2: Max length, special chars, unicode
│   ├── task/
│   │   ├── crud.spec.ts          # @P0-P2: Create, update, view, status/priority change
│   │   ├── filtering.spec.ts     # @P1-P3: Status, priority, overdue, combined filters
│   │   ├── soft-delete.spec.ts   # @P0-P3: Delete, restore, include-deleted toggle
│   │   ├── subtasks.spec.ts      # @P0-P3: Add, toggle, remove, persist, completion %
│   │   └── completion.spec.ts    # @P1-P2: Status transitions, stats update
│   └── form-validation/
│       └── task-form.spec.ts     # @P0-P3: Required fields, errors, unicode, dates
└── recordings/                   # .gitignored video output
```

### SpecFlow BDD (Backend E2E)

```
src/Backend/PlatformExampleApp.Test.BDD/
├── PlatformExampleApp.Test.BDD.csproj    # SpecFlow.xUnit 3.9.74, Selenium 4.28.0
├── Startup.cs                            # DI config, WebDriver options
├── Features/
│   └── CreateTextSnippet.feature         # 2 scenarios: create + duplicate validation
└── StepDefinitions/
    ├── HomePageSteps.cs                  # Given/When/Then for text snippet CRUD
    └── Common/
        └── CommonSteps.cs                # Shared "page has no errors" assertion
```

---

## Key Dependencies

### Playwright (Frontend)

| Package            | Version  | Purpose                     |
| ------------------ | -------- | --------------------------- |
| `@playwright/test` | ^1.50.0  | Test framework + assertions |
| `@types/node`      | ^20.10.0 | Node.js type definitions    |

### Selenium + SpecFlow (Backend)

| Package                                   | Version | Purpose                        |
| ----------------------------------------- | ------- | ------------------------------ |
| `Selenium.WebDriver`                      | 4.28.0  | Browser automation             |
| `Selenium.Support`                        | 4.28.0  | Wait helpers, page objects     |
| `DotNetSeleniumExtras.WaitHelpers`        | 3.11.0  | ExpectedConditions             |
| `SpecFlow.xUnit`                          | 3.9.74  | BDD test runner                |
| `SolidToken.SpecFlow.DependencyInjection` | 3.9.3   | SpecFlow DI integration        |
| `xRetry.SpecFlow`                         | 1.9.0   | Retry flaky scenarios          |
| `SpecFlow.Plus.LivingDocPlugin`           | 3.9.57  | Living documentation generator |
| `FluentAssertions`                        | 7.0.0   | Fluent assertion API           |
| `AutoFixture`                             | 4.18.1  | Test data generation           |
| `WebDriverManager`                        | 2.17.5  | Driver binary management       |

---

## Base Classes

### Playwright: BasePage

All page objects extend `BasePage` which provides common utilities.

**File:** `src/Frontend/e2e/page-objects/base.page.ts`

```typescript
export class BasePage {
    readonly page: Page;
    constructor(page: Page) { this.page = page; }

    async navigateTo(path: string = '/'): Promise<void> { ... }
    async waitForPageLoad(): Promise<void> { ... }         // domcontentloaded + 300ms
    async waitUntil(condition, options): Promise<boolean> { ... } // polling with timeout
    async waitUntilVisible(selector, maxWaitMs): Promise<Locator> { ... }
    async waitForLoading(): Promise<void> { ... }          // spinner disappearance
    async waitForElement(selector, timeout): Promise<Locator> { ... }
    async clickAndWait(selector): Promise<void> { ... }
    async fillField(selector, value): Promise<void> { ... }
    async getText(selector): Promise<string> { ... }
    async getSnackbarMessage(): Promise<string | null> { ... }
    async waitForSnackbar(timeout): Promise<string> { ... }
    async getErrorMessage(): Promise<string | null> { ... }
    async takeScreenshot(name): Promise<void> { ... }
}
```

Key design decisions:

- Uses `domcontentloaded` instead of `networkidle` because Angular apps with background polling never become truly idle (`base.page.ts:27`)
- `waitUntil()` implements human-like polling with configurable interval and max wait (`base.page.ts:43-68`)
- `waitForLoading()` waits for Angular Material spinners to disappear with 30s timeout (`base.page.ts:102-113`)

### Playwright: Page Object Hierarchy

```
BasePage
├── AppPage          # Tab navigation (Text Snippets / Task Management)
├── TextSnippetPage  # Snippet CRUD, search, form modes
├── TaskListPage     # Task list, statistics, filters, pagination
└── TaskDetailPage   # Task form, subtasks, soft-delete/restore
```

### SpecFlow BDD: BddStepDefinitions

Step definitions extend the framework base class for Selenium integration.

**File:** `src/Platform/Easy.Platform.AutomationTest/TestCases/BddStepDefinitions.cs`

```csharp
public abstract class BddStepDefinitions<TSettings, TContext> : TestCase<TSettings>
    where TSettings : AutomationTestSettings
    where TContext : IBddStepsContext
```

**File:** `src/Backend/PlatformExampleApp.Test.BDD/StepDefinitions/HomePageSteps.cs:13`

```csharp
[Binding]
public class HomePageSteps : BddStepDefinitions<TextSnippetAutomationTestSettings, HomePageStepsContext>
```

---

## Page Object Pattern

### Locator Strategy

Page objects use Angular Material-specific selectors with BEM class names from the actual templates.

**File:** `src/Frontend/e2e/page-objects/task-list.page.ts:53-81`

```typescript
// Statistics cards - BEM-style selectors
this.statsContainer = page.locator('.task-list__statistics');
this.totalStatsCard = page.locator('.stat-card:has-text("Total Tasks")');

// Filter chips - Angular Material selectors
this.statusFilterChips = page.locator('mat-chip-listbox[aria-label="Status filter"] mat-chip-option');

// Search - using placeholder for reliable selection
this.searchInput = page.getByPlaceholder('Search by title or description...');

// Task list - mat-table rows
this.taskItems = page.locator('.task-list__table tr.mat-mdc-row');
```

**Selector patterns used:**

- BEM classes: `.task-list__statistics`, `.task-detail__form`, `.text-snippet-detail__main-form-submit-btn`
- Angular Material: `mat-select[formcontrolname="..."]`, `mat-chip-option`, `mat-spinner`
- Accessibility: `[aria-selected="true"]`, `[role="tab"]`, `page.getByPlaceholder()`
- Form controls: `input[formcontrolname="title"]`, `textarea[formcontrolname="description"]`
- Content-based: `:has-text()`, `:text-is()` for exact matching
- Composite: `tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))`

### Interfaces for Page Data

Page objects export typed interfaces for test data.

**File:** `src/Frontend/e2e/page-objects/task-detail.page.ts:6-18`

```typescript
export interface TaskFormData {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    startDate?: string;
    dueDate?: string;
    tags?: string[];
}

export interface SubTask {
    title: string;
    isCompleted?: boolean;
}
```

### Angular Form Interaction Pattern

Special handling for Angular reactive forms: fill + blur + waitForTimeout to ensure change detection fires.

**File:** `src/Frontend/e2e/page-objects/task-detail.page.ts:98-114`

```typescript
private async fillInputWithAngular(locator: Locator, value: string): Promise<void> {
    await locator.click();
    await locator.clear();
    await locator.fill(value);
    await this.page.waitForTimeout(50);
    const currentValue = await locator.inputValue();
    if (currentValue !== value) {
        await locator.clear();
        await locator.pressSequentially(value, { delay: 20 });
    }
    await locator.blur();
}
```

### API-Based Verification Pattern

Some page objects use direct API calls for verification to avoid pagination/timing issues in the UI.

**File:** `src/Frontend/e2e/page-objects/task-list.page.ts:456-493`

```typescript
async taskExistsInList(title: string, includeDeleted: boolean = false): Promise<boolean> {
    const response = await this.page.request.get('http://localhost:5001/api/TaskItem/list', {
        params: { searchText: uniquePart, maxResultCount: '200', includeDeleted: ... }
    });
    const data = await response.json();
    return data.items.some((t: any) => t.title === title);
}
```

---

## Wait and Assertion Patterns

### Custom Wait Utility

`BasePage.waitUntil()` provides a polling-based wait with configurable interval.

**File:** `src/Frontend/e2e/page-objects/base.page.ts:43-68`

```typescript
async waitUntil(condition: () => Promise<boolean>, options = {}): Promise<boolean> {
    const { maxWaitMs = 5000, intervalMs = 1000, errorMessage = '...' } = options;
    // Polls condition every intervalMs, throws after maxWaitMs
}
```

### Console Error Tracking

Tests use a custom `ConsoleErrorTracker` fixture that captures browser console errors and attaches them to failed test reports.

**File:** `src/Frontend/e2e/utils/test-helpers.ts:17-122`

```typescript
export class ConsoleErrorTracker {
    attach(page: Page): void { ... }     // Starts tracking console errors + page errors
    getErrors(): ConsoleError[] { ... }
    hasErrors(): boolean { ... }
    formatErrors(): string { ... }       // Formatted output for test reports
}
```

Usage: import `test` and `expect` from `utils/test-helpers` instead of `@playwright/test`.

```typescript
import { test, expect } from '../../utils/test-helpers';

test('my test', async ({ page, consoleTracker }) => {
    // Console errors automatically attached to report on failure
});
```

### API Response Waiting Pattern

For operations that trigger API calls, tests wait for specific API responses.

**File:** `src/Frontend/e2e/page-objects/task-list.page.ts:161-163`

```typescript
const responsePromise = this.page
    .waitForResponse(resp => resp.url().includes('/api/TaskItem/list') && resp.status() === 200, { timeout: 15000 })
    .catch(() => null);
```

---

## Test Data and Fixtures

### Test Data Factory

**File:** `src/Frontend/e2e/fixtures/test-data.ts`

Provides:

- `TestData` constant object with predefined test data for text snippets, tasks, subtasks, search terms, and validation edge cases
- `generateTestId(prefix)` -- timestamp + random suffix for unique identifiers
- `createTestSnippet(overrides?)` -- factory with unique snippet text
- `createTestTask(overrides?)` -- factory with unique task title

```typescript
export function createTestTask(overrides?: Partial<TaskFormData>): TaskFormData {
    return {
        title: `Test-Task ${generateTestId()}`,
        description: `Created at ${new Date().toISOString()}`,
        status: 'Todo',
        priority: 'Medium',
        ...overrides
    };
}
```

### API Helpers

**File:** `src/Frontend/e2e/utils/api-helpers.ts`

`ApiHelpers` class wraps backend REST calls for:

- `isApiHealthy()` -- health check via `/api/TextSnippet/search`
- `createTextSnippet(data)` / `deleteTextSnippet(id)` -- snippet CRUD
- `createTask(data)` / `deleteTask(id)` / `restoreTask(id, data)` -- task CRUD
- `getTasks(params?)` / `getTextSnippets(searchText?, skip, take)` -- queries
- `getTaskStatistics()` -- stats endpoint
- `cleanupTestData(testIdPrefix)` -- bulk cleanup by prefix

### Test Cleanup Pattern

Each test suite tracks created entities and cleans up in `afterEach`.

```typescript
let currentTestTasks: string[] = [];

test.beforeEach(async ({ page }) => {
    currentTestTasks = [];
});

test.afterEach(async ({ request }) => {
    const apiHelper = new ApiHelpers(request);
    for (const taskTitle of currentTestTasks) {
        await apiHelper.cleanupTestData(taskTitle);
    }
});
```

---

## Configuration

### Playwright Configuration

**File:** `src/Frontend/e2e/playwright.config.ts`

| Setting             | Value                                  | Notes                         |
| ------------------- | -------------------------------------- | ----------------------------- |
| `testDir`           | `./tests`                              | Relative to config file       |
| `fullyParallel`     | `true`                                 | Tests run in parallel         |
| `forbidOnly`        | `!!process.env.CI`                     | `.only` blocked in CI         |
| `retries`           | CI: 2, local: 0                        | Retry flaky tests in CI       |
| `workers`           | CI: 1, local: auto                     | Sequential in CI              |
| `reporter`          | `[['html', ...], ['list']]`            | HTML report + console list    |
| `baseURL`           | `http://localhost:4001`                | Frontend dev server           |
| `trace`             | `on-first-retry`                       | Trace captured on retry       |
| `screenshot`        | `only-on-failure`                      | Screenshot on failure         |
| `video`             | `on-first-retry`                       | Video captured on retry       |
| `actionTimeout`     | `10000` (10s)                          | Per-action timeout            |
| `navigationTimeout` | `30000` (30s)                          | Page navigation timeout       |
| `timeout`           | `120000` (2min)                        | Test-level timeout            |
| `expect.timeout`    | `10000` (10s)                          | Assertion timeout             |
| `webServer.command` | `npx nx serve playground-text-snippet` | Auto-starts frontend          |
| `webServer.url`     | `http://localhost:4001`                | Wait for this URL             |
| `webServer.timeout` | `120000` (2min)                        | Server startup timeout        |
| `projects`          | `chromium` only                        | Desktop Chrome device profile |

### SpecFlow BDD Configuration

**File:** `src/Backend/PlatformExampleApp.Test.BDD/Startup.cs`

- Extends `BaseStartup` from `Easy.Platform.AutomationTest`
- Uses `[ScenarioDependencies]` for SpecFlow DI wiring
- Custom `TextSnippetAutomationTestSettings` extends `AutomationTestSettings` with `RandomTestShortWaitingFailed` flag
- WebDriver page load timeout: 1 minute
- Environment: `Development` (configurable via `ASPNETCORE_ENVIRONMENT`)
- Config files: `appsettings.json`, `appsettings.Development.json`, `appsettings.Development.Docker.json`

### TypeScript Path Aliases

**File:** `src/Frontend/e2e/tsconfig.json`

```json
{
    "paths": {
        "@page-objects/*": ["./page-objects/*"],
        "@fixtures/*": ["./fixtures/*"],
        "@utils/*": ["./utils/*"]
    }
}
```

---

## Running Tests

### Playwright Commands

| Goal                 | Command                                                               |
| -------------------- | --------------------------------------------------------------------- |
| **All tests**        | `cd src/Frontend/e2e && npx playwright test`                          |
| **Smoke only (P0)**  | `cd src/Frontend/e2e && npx playwright test --grep @P0`               |
| **Critical (P0+P1)** | `cd src/Frontend/e2e && npx playwright test --grep "@P0\|@P1"`        |
| **Headed (visible)** | `cd src/Frontend/e2e && npx playwright test --headed`                 |
| **Debug mode**       | `cd src/Frontend/e2e && npx playwright test --debug`                  |
| **Interactive UI**   | `cd src/Frontend/e2e && npx playwright test --ui`                     |
| **View HTML report** | `cd src/Frontend/e2e && npx playwright show-report`                   |
| **Record/codegen**   | `cd src/Frontend/e2e && npx playwright codegen http://localhost:4001` |
| **Specific file**    | `cd src/Frontend/e2e && npx playwright test tests/task/crud.spec.ts`  |

**Using package.json scripts:**

```bash
cd src/Frontend/e2e
npm test              # All tests
npm run test:smoke    # P0 only
npm run test:critical # P0 + P1
npm run test:headed   # Visible browser
npm run test:debug    # Step-through debug
npm run test:ui       # Playwright UI mode
npm run report        # Open HTML report
npm run codegen       # Record interactions
```

### SpecFlow BDD Commands

| Goal              | Command                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| **All BDD tests** | `dotnet test src/Backend/PlatformExampleApp.Test.BDD/`                        |
| **With filter**   | `dotnet test src/Backend/PlatformExampleApp.Test.BDD/ --filter "Name~Create"` |

### Prerequisites

Both test suites require live infrastructure:

1. Start infrastructure: `src/start-dev-platform-example-app.infrastructure.cmd`
2. Start backend API: `dotnet run --project src/Backend/PlatformExampleApp.TextSnippet.Api`
3. Playwright auto-starts frontend via `webServer` config; SpecFlow requires manual browser setup

---

## Test Organization and Tagging

### Priority Tags (Playwright)

Tests use priority tags for selective execution:

| Tag   | Meaning          | Count | Typical Run Time |
| ----- | ---------------- | ----- | ---------------- |
| `@P0` | Smoke / Critical | ~10   | < 1 min          |
| `@P1` | Core Features    | ~20   | 2-5 min          |
| `@P2` | Extended         | ~15   | 3-5 min          |
| `@P3` | Edge Cases       | ~5    | 1-2 min          |

### Feature Tags (Playwright)

| Tag            | Scope                                   |
| -------------- | --------------------------------------- |
| `@Smoke`       | App load, API health                    |
| `@TextSnippet` | Text snippet CRUD, search, edge cases   |
| `@Task`        | Task CRUD, filtering, completion        |
| `@CRUD`        | Create/Read/Update/Delete operations    |
| `@Search`      | Search and filter functionality         |
| `@Filter`      | Task filtering by status/priority       |
| `@SoftDelete`  | Soft delete and restore                 |
| `@SubTask`     | Subtask management                      |
| `@Completion`  | Task completion status transitions      |
| `@Validation`  | Form validation and error handling      |
| `@EdgeCase`    | Boundary conditions, special characters |
| `@API`         | Direct API testing                      |

### Test ID Conventions

- `TS-APP-P0-XXX` -- App-level smoke tests
- `TS-SNIPPET-PX-XXX` -- Text snippet tests
- `TS-NAV-P0-XXX` -- Navigation tests
- `TC-SNP-CRT-XXX` / `TC-SNP-UPD-XXX` / `TC-SNP-SRC-XXX` / `TC-SNP-EDGE-XXX` -- Snippet test cases
- `TC-TSK-CRT-XXX` / `TC-TSK-LST-XXX` / `TC-TSK-CMP-XXX` -- Task test cases
- `TS-TASK-PX-XXX` -- Task feature tests
- `TS-FILTER-PX-XXX` -- Filter tests
- `TS-DELETE-PX-XXX` -- Soft delete tests
- `TS-SUBTASK-PX-XXX` -- Subtask tests
- `TS-COMPLETE-PX-XXX` -- Completion tests
- `TS-VALIDATION-PX-XXX` -- Validation tests
- `TS-EDGE-PX-XXX` -- Edge case tests
- `TS-SEARCH-PX-XXX` -- Search tests
- `TS-RESPONSIVE-P0-XXX` -- Responsive tests
- `TS-API-P0-XXX` -- API health tests

### SpecFlow BDD Tags

- `@retry(3,5000)` -- Retry flaky scenarios up to 3 times with 5s delay (via xRetry.SpecFlow)

---

## BDD Pattern (SpecFlow)

### Feature File Convention

**File:** `src/Backend/PlatformExampleApp.Test.BDD/Features/CreateTextSnippet.feature`

```gherkin
@retry(3,5000)
Feature: Create Text Snippet Feature

Scenario: Create a new random unique snippet text item should be successful
    Given Loaded success home page
    When Fill in a new random unique value snippet text item data ...
    Then Current page has no errors
    And Do search text snippet item with the snippet text ...
    And The item data should equal to the filled data ...
```

### Step Definition Pattern

Step definitions use the `IBddStepsContext` pattern for state sharing between steps.

**File:** `src/Backend/PlatformExampleApp.Test.BDD/StepDefinitions/HomePageSteps.cs:6-10`

```csharp
public class HomePageStepsContext : IBddStepsContext
{
    public TextSnippetApp.HomePage? LoadedSuccessHomePage { get; set; }
    public TextSnippetEntityData? DoFillInAndSubmitRandomUniqueSnippetTextData { get; set; }
}
```

### DI and Startup

**File:** `src/Backend/PlatformExampleApp.Test.BDD/Startup.cs:14-20`

```csharp
internal sealed class Startup : BaseStartup
{
    [ScenarioDependencies]
    public static IServiceCollection SpecFlowConfigureServices()
    {
        return SpecFlowConfigureServices(() => new Startup());
    }
}
```

---

## Best Practices

These conventions are observed across the existing test suite:

1. **Use factory functions for test data** -- `createTestTask()` / `createTestSnippet()` with `generateTestId()` ensure unique identifiers per test run (`fixtures/test-data.ts:112-140`)

2. **Clean up test data in afterEach** -- Every test suite tracks created entities and deletes them via API in `afterEach` to prevent test pollution

3. **Use API verification for existence checks** -- `taskExistsInList()` queries the backend API directly instead of searching the paginated UI table, avoiding false negatives from pagination

4. **Handle Angular change detection** -- Use `fill()` + `blur()` + `waitForTimeout()` pattern; fall back to `pressSequentially()` if `fill()` does not trigger Angular's change detection (`task-detail.page.ts:98-114`)

5. **Wait for specific API responses** -- Use `page.waitForResponse()` with URL pattern matching before asserting UI state, especially for search with `throttleTime(500)` debounce (`task-list.page.ts:161-163`)

6. **Use `domcontentloaded` over `networkidle`** -- Angular apps with polling never reach network idle; use `domcontentloaded` + small delay instead (`base.page.ts:27-29`)

7. **Priority-based test organization** -- Tag tests with `@P0` through `@P3` for selective CI/local execution; `@P0` smoke tests should run in < 1 minute

8. **Console error tracking** -- Import `test`/`expect` from `utils/test-helpers` to get automatic console error capture attached to failed test reports

9. **Status display mapping** -- Map API enum values (`Todo`, `InProgress`) to UI display text (`To Do`, `In Progress`) in page objects, not in tests (`task-detail.page.ts:25-30`)

10. **Use `@retry` for flaky BDD scenarios** -- SpecFlow tests use `@retry(3,5000)` tag via xRetry.SpecFlow to handle infrastructure timing issues

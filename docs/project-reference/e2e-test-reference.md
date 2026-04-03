<!-- Last scanned: 2026-04-03 -->

# E2E Test Reference

**CRITICAL RULES (read first):** MUST extend `BasePage` for all page objects. MUST use `createTestTask()`/`createTestSnippet()` for test data (never hardcode). MUST clean up test data in `afterEach` via `ApiHelpers`. MUST import `test`/`expect` from `utils/test-helpers` (not `@playwright/test` directly). MUST use TC-{MODULE}-{AREA}-{NNN} format for test IDs.

## Architecture Overview

Playwright (TypeScript) E2E tests for the `playground-text-snippet` Angular app.

| Layer        | Path                                     | Purpose                                 |
| ------------ | ---------------------------------------- | --------------------------------------- |
| Config       | `src/Frontend/e2e/playwright.config.ts`  | Playwright settings, browser, webServer |
| Tests        | `src/Frontend/e2e/tests/{feature}/`      | Spec files organized by feature area    |
| Page Objects | `src/Frontend/e2e/page-objects/`         | Page abstractions extending `BasePage`  |
| Fixtures     | `src/Frontend/e2e/fixtures/test-data.ts` | Test data factories and constants       |
| Utils        | `src/Frontend/e2e/utils/`                | API helpers, console error tracking     |

**Ports:** Frontend `localhost:4001`, Backend API `localhost:5001`

## Key Dependencies

| Package            | Version  |
| ------------------ | -------- |
| `@playwright/test` | ^1.50.0  |
| `@types/node`      | ^20.10.0 |

## Base Classes

All page objects MUST extend `BasePage` (`page-objects/base.page.ts`):

```typescript
// src/Frontend/e2e/page-objects/base.page.ts (lines 6-11)
export class BasePage {
    readonly page: Page;
    constructor(page: Page) {
        this.page = page;
    }
}
```

**Key methods provided by BasePage:**

| Method                       | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `navigateTo(path)`           | Navigate + wait for load                                       |
| `waitForPageLoad()`          | `domcontentloaded` + 300ms Angular bootstrap delay             |
| `waitUntil(condition, opts)` | Polling wait with configurable interval/timeout                |
| `waitForLoading()`           | Wait for `mat-spinner` / `.loading-spinner` to disappear (30s) |
| `waitUntilVisible(selector)` | Wait until element visible                                     |
| `waitForElement(selector)`   | Playwright `waitFor` with timeout                              |
| `fillField(selector, value)` | Clear + fill                                                   |
| `clickAndWait(selector)`     | Click + waitForLoading                                         |
| `waitForSnackbar(timeout)`   | Wait for Angular Material snackbar                             |
| `getErrorMessage()`          | Get first visible error message                                |

### Page Object Hierarchy

| Class             | Extends    | File                   | Purpose                                              |
| ----------------- | ---------- | ---------------------- | ---------------------------------------------------- |
| `BasePage`        | -          | `base.page.ts`         | Common wait/nav/form utilities                       |
| `AppPage`         | `BasePage` | `app.page.ts`          | Tab navigation (Text Snippets / Tasks), global state |
| `TextSnippetPage` | `BasePage` | `text-snippet.page.ts` | Snippet CRUD, search, list                           |
| `TaskListPage`    | `BasePage` | `task-list.page.ts`    | Task list, filtering, statistics, pagination         |
| `TaskDetailPage`  | `BasePage` | `task-detail.page.ts`  | Task form, subtasks, save/delete/restore             |

All page objects exported via barrel `page-objects/index.ts`.

## Page Object Pattern

MUST follow this pattern for new page objects:

```typescript
// src/Frontend/e2e/page-objects/task-detail.page.ts (lines 23-93)
export class TaskDetailPage extends BasePage {
    // Declare locators as readonly in constructor
    readonly titleField: Locator;
    readonly saveButton: Locator;
    readonly deleteButton: Locator;

    constructor(page: Page) {
        super(page);
        // Initialize locators using formcontrolname, BEM classes, or Material selectors
        this.titleField = page.locator('input[formcontrolname="title"]');
        this.saveButton = page.locator('button[type="submit"]');
        this.deleteButton = page.locator('tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))');
    }

    async fillTaskForm(data: TaskFormData): Promise<void> {
        /* ... */
    }
    async saveTask(): Promise<void> {
        /* ... */
    }
}
```

**Selector strategy (priority order):**

1. `formcontrolname` attributes: `input[formcontrolname="title"]`
2. BEM class names: `.task-list__statistics`, `.text-snippet-detail__main-form-submit-btn`
3. Angular Material selectors: `mat-select[formcontrolname="taskStatus"]`, `.mat-mdc-tab`
4. Role-based: `page.getByRole('listbox', { name: 'Status filter' })`
5. Placeholder text: `page.getByPlaceholder('Search by title...')`
6. Text content filter: `page.locator('.mat-mdc-tab').filter({ hasText: 'Text Snippets' })`

**Angular form interaction pattern:**

```typescript
// src/Frontend/e2e/page-objects/task-detail.page.ts (lines 98-114)
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
    await locator.blur(); // Trigger Angular change detection
}
```

**Typed data interfaces:** MUST define interfaces for page data:

```typescript
// src/Frontend/e2e/page-objects/task-list.page.ts (lines 3-12)
export type TaskStatus = 'Todo' | 'InProgress' | 'Completed' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export interface TaskStatistics {
    total: number;
    active: number;
    completed: number;
    overdue: number;
}
```

## Wait & Assertion Patterns

**NEVER use `networkidle`** for Angular apps with background polling. Use `domcontentloaded` + delay:

```typescript
// src/Frontend/e2e/page-objects/base.page.ts (lines 26-30)
async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(300); // Angular bootstrap
}
```

**Wait for API response before asserting UI state:**

```typescript
// src/Frontend/e2e/page-objects/task-list.page.ts (lines 160-168)
const responsePromise = this.page
    .waitForResponse(resp => resp.url().includes('/api/TaskItem/list') && resp.status() === 200, { timeout: 15000 })
    .catch(() => null);
await this.searchInput.pressSequentially(searchText, { delay: 20 });
await responsePromise;
```

**Wait for Angular DOM state with `waitForFunction`:**

```typescript
// src/Frontend/e2e/page-objects/task-detail.page.ts (lines 389-396)
await this.page.waitForFunction(
    expectedTitle => {
        const input = document.querySelector('input[formcontrolname="title"]') as HTMLInputElement;
        return input && input.value === expectedTitle;
    },
    title,
    { timeout: 5000 }
);
```

### Console Error Tracking

MUST import `test`/`expect` from `utils/test-helpers` (NOT from `@playwright/test`):

```typescript
// src/Frontend/e2e/utils/test-helpers.ts (lines 145-176)
export const test = baseTest.extend<TestFixtures>({
    consoleTracker: async ({ page }, use, testInfo) => {
        const tracker = new ConsoleErrorTracker();
        tracker.attach(page);
        await use(tracker);
        if (testInfo.status !== testInfo.expectedStatus) {
            // Auto-attach console errors to report on failure
            await testInfo.attach('console-errors', { body: tracker.formatErrors(), contentType: 'text/plain' });
        }
        tracker.detach();
    }
});
export const expect = baseExpect;
```

## Test Data & Fixtures

MUST use factory functions for unique test data:

```typescript
// src/Frontend/e2e/fixtures/test-data.ts (lines 112-140)
export function generateTestId(prefix: string = 'TEST'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
export function createTestTask(overrides?: Partial<TaskFormData>): TaskFormData {
    return {
        title: `Test-Task ${generateTestId()}`,
        description: `Created at ${new Date().toISOString()}`,
        status: 'Todo',
        priority: 'Medium',
        ...overrides
    };
}
export function createTestSnippet(overrides?: Partial<TextSnippetData>): TextSnippetData {
    return {
        snippetText: generateTestId('SNIPPET'),
        fullText: `Test snippet created at ${new Date().toISOString()}`,
        ...overrides
    };
}
```

**Predefined fixtures** in `TestData` constant: `TestData.tasks.basic`, `TestData.tasks.complete`, `TestData.textSnippets.basic`, `TestData.validation.specialCharacters`, etc.

## API Helpers

`ApiHelpers` (`utils/api-helpers.ts`) wraps Playwright `APIRequestContext` for direct API calls:

```typescript
// src/Frontend/e2e/utils/api-helpers.ts (lines 8-10)
export class ApiHelpers {
    constructor(request: APIRequestContext) {
        this.request = request;
    }
}
```

| Method                    | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `isApiHealthy()`          | GET `/api/TextSnippet/search` health check |
| `createTextSnippet(data)` | POST `/api/TextSnippet/save`               |
| `deleteTextSnippet(id)`   | DELETE `/api/TextSnippet/{id}`             |
| `createTask(data)`        | POST `/api/TaskItem/save`                  |
| `deleteTask(id)`          | POST `/api/TaskItem/delete` (permanent)    |
| `restoreTask(id, data)`   | POST `/api/TaskItem/restore`               |
| `getTasks(params)`        | GET `/api/TaskItem/list` with filters      |
| `cleanupTestData(prefix)` | Delete all test data matching prefix       |

**MUST clean up test data in `afterEach`:**

```typescript
// src/Frontend/e2e/tests/task/crud.spec.ts (lines 28-34)
test.afterEach(async ({ request }) => {
    const apiHelper = new ApiHelpers(request);
    for (const taskTitle of currentTestTasks) {
        await apiHelper.cleanupTestData(taskTitle);
    }
});
```

## Configuration

Key `playwright.config.ts` settings:

| Setting                         | Value                                  | Notes                             |
| ------------------------------- | -------------------------------------- | --------------------------------- |
| `fullyParallel`                 | `true`                                 | Tests run in parallel             |
| `retries`                       | CI: 2, local: 0                        | Auto-retry on CI                  |
| `workers`                       | CI: 1, local: auto                     | Single worker on CI for stability |
| `baseURL`                       | `http://localhost:4001`                | Frontend dev server               |
| `actionTimeout`                 | 10000ms                                | Per-action timeout                |
| `navigationTimeout`             | 30000ms                                | Navigation timeout                |
| `timeout`                       | 120000ms                               | Test-level timeout (2 min)        |
| `trace`                         | `on-first-retry`                       | Trace captured on retry           |
| `screenshot`                    | `only-on-failure`                      | Screenshot on failure             |
| `video`                         | `on-first-retry`                       | Video on retry                    |
| `webServer.command`             | `npx nx serve playground-text-snippet` | Auto-start frontend               |
| `webServer.reuseExistingServer` | `!process.env.CI`                      | Reuse locally, fresh on CI        |

Browser: **Chromium** (Desktop Chrome device)

## Running Tests

```bash
cd src/Frontend/e2e

# All tests
npx playwright test

# By priority
npx playwright test --grep @P0           # Smoke only
npx playwright test --grep "@P0|@P1"     # Critical

# Debug modes
npx playwright test --headed             # See browser
npx playwright test --debug              # Step-through debugger
npx playwright test --ui                 # Interactive UI

# Reporting
npx playwright show-report               # View HTML report

# Code generation
npx playwright codegen http://localhost:4001
```

## Test Organization & Tagging

**Priority tags** (used with `--grep`):

| Tag   | Level             | Examples                                   |
| ----- | ----------------- | ------------------------------------------ |
| `@P0` | Smoke / must-pass | App loads, API health, tab navigation      |
| `@P1` | Critical path     | CRUD operations, status changes, filtering |
| `@P2` | Important         | Edge cases, unicode, multiple operations   |
| `@P3` | Nice-to-have      | Debouncing, whitespace validation          |

**Feature tags:** `@Smoke`, `@API`, `@TextSnippet`, `@Task`, `@CRUD`, `@Search`, `@Filter`, `@SubTask`, `@SoftDelete`, `@Completion`, `@Validation`, `@EdgeCase`

**Test ID format:** `TC-{MODULE}-{AREA}-{NNN}` -- e.g., `TC-TSK-CRT-001`, `TC-SNP-SRC-001`, `TC-TSK-CMP-001`

**Test areas by directory:**

| Directory                | Feature                                         | Specs                                                                                                |
| ------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `tests/smoke/`           | App load, API health                            | `app-load.spec.ts`, `api-health.spec.ts`                                                             |
| `tests/text-snippet/`    | Snippet CRUD, search, edge cases                | `crud.spec.ts`, `search.spec.ts`, `edge-cases.spec.ts`                                               |
| `tests/task/`            | Task CRUD, filter, delete, subtasks, completion | `crud.spec.ts`, `filtering.spec.ts`, `soft-delete.spec.ts`, `subtasks.spec.ts`, `completion.spec.ts` |
| `tests/form-validation/` | Form validation, required fields                | `task-form.spec.ts`                                                                                  |

## Best Practices

- **Page Object pattern ONLY** -- no raw selectors in test files, all in page objects
- **Unique test data** -- `createTestTask()`/`createTestSnippet()` generate timestamp-based unique IDs to prevent collision
- **API cleanup** -- `afterEach` hooks delete test data via `ApiHelpers.cleanupTestData(prefix)`
- **API verification over UI search** -- `taskExistsInList()` uses direct API calls (handles pagination/sorting)
- **Angular-aware waits** -- `domcontentloaded` + delay (never `networkidle`), spinner checks, `waitForFunction` for DOM state
- **Angular form fill** -- use `fillInputWithAngular()` with blur() to trigger change detection; `pressSequentially` as fallback
- **Console error tracking** -- import `test`/`expect` from `utils/test-helpers` to auto-capture JS errors on failure
- **BDD-style comments** -- each test has `@scenario`/`@given`/`@when`/`@then` JSDoc comments for documentation
- **Response interception** -- `page.waitForResponse()` before triggering actions to wait for API completion
- **Test describe blocks** include priority + feature tags: `test.describe('@P1 @Task @CRUD - ...')`

**CRITICAL RULES (closing anchor):** MUST extend `BasePage`. MUST use factory functions for test data. MUST clean up in `afterEach`. MUST import from `utils/test-helpers`. MUST use TC-{MODULE}-{AREA}-{NNN} IDs. NEVER use `networkidle`. NEVER hardcode selectors in test files.

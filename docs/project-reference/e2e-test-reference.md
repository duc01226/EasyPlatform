<!-- Last scanned: 2026-06-12 -->

# E2E Test Reference

**Purpose:** Author and maintain resilient Playwright E2E tests for the `playground-text-snippet` Angular app — Page Object Model on `BasePage`, Angular-aware waits, API-level arrange/cleanup, priority-tagged specs.

**CRITICAL RULES (read first):** MUST extend `BasePage` for all page objects. MUST use `createTestTask()`/`createTestSnippet()` for test data (never hardcode). MUST clean up test data in `afterEach` via `ApiHelpers`. MUST import `test`/`expect` from `utils/test-helpers` (not `@playwright/test` directly). MUST tag every `test.describe`/`test` with a priority tag (`@P0`–`@P3`). NEVER use `networkidle` — use `domcontentloaded` + delay. NEVER put raw selectors in spec files — all selectors live in page objects.

## Architecture Overview

Playwright (TypeScript) E2E tests for the `playground-text-snippet` Angular app.

| Layer        | Path                                     | Purpose                                 |
| ------------ | ---------------------------------------- | --------------------------------------- |
| Config       | `src/Frontend/e2e/playwright.config.ts`  | Playwright settings, browser, webServer |
| Tests        | `src/Frontend/e2e/tests/{feature}/`      | Spec files organized by feature area    |
| Page Objects | `src/Frontend/e2e/page-objects/`         | Page abstractions extending `BasePage`  |
| Fixtures     | `src/Frontend/e2e/fixtures/test-data.ts` | Test data factories and constants       |
| Utils        | `src/Frontend/e2e/utils/`                | API helpers, console error tracking     |

Self-contained Playwright project (own `package.json`, `tsconfig.json`, `playwright.config.ts`). `recordings/` exists but is empty (`.gitkeep`/`.gitignore` only).

**Ports:** Frontend `localhost:4001` (auto-started by `webServer`), Backend API `localhost:5001` (NOT auto-started — must be running independently, e.g. via `start-dev-platform-example-app*.cmd`; `API_BASE_URL` is hardcoded in `utils/api-helpers.ts:3`).

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

**Key methods provided by BasePage** (`base.page.ts`):

| Method                                                        | Line | Purpose                                                                                  |
| ------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------- |
| `navigateTo(path = '/')`                                      | 16   | `goto` + `waitForPageLoad`                                                               |
| `waitForPageLoad()`                                           | 26   | `domcontentloaded` + 300ms Angular bootstrap delay (deliberately NOT `networkidle`)      |
| `waitUntil(condition, {maxWaitMs, intervalMs, errorMessage})` | 43   | Generic poll-with-interval primitive (reusability backbone); throws on timeout           |
| `waitUntilVisible(selector, maxWaitMs)`                       | 73   | Poll until visible (delegates to `waitUntil`)                                            |
| `waitUntilHidden(selector, maxWaitMs)`                        | 81   | Poll until hidden                                                                        |
| `waitUntilTextContains(selector, text, maxWaitMs)`            | 88   | Poll until text contains                                                                 |
| `waitForLoading()`                                            | 102  | Poll up to 30s for `mat-spinner` / `.platform-mat-mdc-spinner` / `.loading-spinner` gone |
| `getErrorMessage()`                                           | 118  | Read `.error-message, mat-error, [class*="error"]`                                       |
| `isElementVisible(selector)`                                  | 129  | Visibility check                                                                         |
| `waitForElement(selector, timeout)`                           | 136  | Native `waitFor({ state: 'visible' })`                                                   |
| `clickAndWait(selector)`                                      | 145  | Click + `waitForLoading`                                                                 |
| `fillField(selector, value)`                                  | 153  | Clear + fill                                                                             |
| `getText(selector)`                                           | 162  | `textContent`                                                                            |
| `getSnackbarMessage()`                                        | 169  | Read `mat-snack-bar-container`                                                           |
| `waitForSnackbar(timeout)`                                    | 180  | `waitFor` snackbar + return text                                                         |
| `takeScreenshot(name)`                                        | 189  | Full-page screenshot to relative `screenshots/{name}.png` (cwd-dependent)                |

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

| Method (line)                                   | Purpose                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `isApiHealthy()` (18)                           | GET `/api/TextSnippet/search` health probe                           |
| `getTextSnippets(searchText?, skip, take)` (30) | GET `/api/TextSnippet/search` with paging                            |
| `createTextSnippet(data)` (46)                  | POST `/api/TextSnippet/save` (throws on `!ok`)                       |
| `deleteTextSnippet(id)` (68)                    | DELETE `/api/TextSnippet/{id}`                                       |
| `getTasks(params)` (76)                         | GET `/api/TaskItem/list` with status/priority/search/deleted filters |
| `createTask(data)` (103)                        | POST `/api/TaskItem/save` (defaults Todo/Medium)                     |
| `deleteTask(id)` (121)                          | POST `/api/TaskItem/delete` `{ permanentDelete: true }`              |
| `restoreTask(id, data)` (131)                   | POST `/api/TaskItem/restore`                                         |
| `getTaskStatistics()` (141)                     | GET `/api/TaskItem/stats`                                            |
| `cleanupTestData(prefix = 'TEST-')` (149)       | Search + delete all snippets & tasks matching prefix                 |

Module function `waitForApi(request, maxWaitMs = 30000)` (`api-helpers.ts:171`) polls `isApiHealthy` every 1s — used in smoke tests to gate on backend readiness. `ApiHelpers` is the fast API-level arrange/cleanup path (API arrange, UI act/assert).

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

Every `test.describe` and `test` is priority-tagged — enumerate with `grep -roE "@P[0-3]" tests/`. Selective runs depend on this.

**Feature tags** (observed in describe titles / JSDoc `@tags`): `@Smoke`, `@API`, `@TextSnippet`, `@Task`, `@CRUD`, `@Search`, `@Filter`, `@SubTask`, `@SoftDelete`, `@Completion`, `@Validation`, `@EdgeCase`. Enumerate current set with `grep -rhoE "@[A-Z][A-Za-z]+" tests/`.

**Test ID format — UNSTANDARDIZED (known gap):** two styles coexist, sometimes in the same file (`tests/task/crud.spec.ts:36` `TC-TSK-CRT-001` vs `:68` `TS-TASK-P1-001`). The dominant style is `TS-{MODULE}-{Pn}-{NNN}` (priority-encoded), NOT the `TC-{MODULE}-{AREA}-{NNN}` form in `project-config.json`. There is no enforced traceability scheme — locate IDs with `grep -rnoE "T[CS]-[A-Z]+-[A-Z0-9]+-[0-9]+" tests/`. New tests SHOULD standardize on one format; the suite currently relies on `@Pn` priority tags + descriptive titles for selection, not on TC IDs.

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

### Known Gaps & Brittleness (scan-observed)

- **No `data-testid` anywhere** (`grep -rn data-testid` → 0) — selectors couple to BEM app-classes + Angular Material DOM internals (`.mat-mdc-*`) + `formcontrolname` + visible text. Highest maintainability risk; prefer stable hooks for new selectors.
- **`consoleTracker` runs passively** — `assertNoConsoleErrors`/`withConsoleErrorCheck` (`utils/test-helpers.ts:237,195`) are built but no spec calls them (`grep -rn consoleTracker tests/` → 0). Tests can pass while the app logs uncaught exceptions; errors are only attached to failure reports.
- **`STATUS_DISPLAY_MAP` DRY violation** — API-enum→UI-label map duplicated 3×: `task-list.page.ts:105`, `task-detail.page.ts:25`, inline in `selectStatus` `task-detail.page.ts:432`. Centralize when touched.
- **Single browser** — chromium only (`playwright.config.ts` projects); no Firefox/WebKit/mobile coverage.
- **Hardcoded ports** — `API_BASE_URL` (`api-helpers.ts:3`) and `baseURL` (`playwright.config.ts`) are not env-configurable; backend is NOT auto-started by `webServer`.
- **tsconfig path aliases unused** — `@page-objects/*`, `@fixtures/*`, `@utils/*` declared (`tsconfig.json:15-17`) but specs use relative imports.
- **Residual fixed sleeps** — `waitForTimeout` used alongside smarter waits (throttle-settle buffers); a residual flakiness source.
- **`selectTaskByTitle`** (`task-list.page.ts`) is a large multi-strategy method (API verify + UI fallbacks) needed because backend sort pushes new tasks off page 1 — signals pagination/sync friction.

**CRITICAL RULES (closing anchor):** MUST extend `BasePage`. MUST use factory functions for test data. MUST clean up in `afterEach`. MUST import `test`/`expect` from `utils/test-helpers`. MUST priority-tag (`@P0`–`@P3`) every describe/test. NEVER use `networkidle`. NEVER hardcode selectors in spec files. NEVER add `data-testid`-free fragile selectors without need — prefer `formcontrolname`/role over Material DOM internals.

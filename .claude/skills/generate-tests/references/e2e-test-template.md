# E2E Test Template (Playwright TypeScript)

> Reference template for generating frontend E2E tests from TC-IDs.
> Based on real patterns from `src/Frontend/e2e/tests/`.

## Project Structure

```
src/Frontend/e2e/
  fixtures/
    test-data.ts              -- Test data factories (createTestSnippet, createTestTask, generateTestId)
  page-objects/
    base.page.ts              -- BasePage with waitForLoading, waitUntil, waitUntilVisible
    app.page.ts               -- AppPage with goToHome, goToTextSnippets, goToTasks
    text-snippet.page.ts      -- TextSnippetPage with CRUD + search methods
    task-list.page.ts          -- TaskListPage with task list operations
    task-detail.page.ts        -- TaskDetailPage with form operations
    index.ts                   -- Barrel exports
  utils/
    test-helpers.ts            -- Extended test with ConsoleErrorTracker
    api-helpers.ts             -- ApiHelpers for direct API calls in setup/teardown
  tests/
    text-snippet/
      crud.spec.ts             -- CRUD E2E tests
      search.spec.ts           -- Search E2E tests
      edge-cases.spec.ts       -- Edge case tests
    task/
      crud.spec.ts             -- Task CRUD tests
      filtering.spec.ts        -- Filtering tests
      completion.spec.ts       -- Task completion tests
      subtasks.spec.ts         -- Subtask tests
      soft-delete.spec.ts      -- Soft delete tests
    smoke/
      app-load.spec.ts         -- App load smoke test
      api-health.spec.ts       -- API health smoke test
```

## Required Imports

```typescript
// Always import test and expect from custom test-helpers (not @playwright/test directly)
import { expect, test } from '../../utils/test-helpers';

// Import page objects from barrel export
import { AppPage, TextSnippetPage } from '../../page-objects';

// Import API helpers for setup/teardown via API
import { ApiHelpers } from '../../utils/api-helpers';

// Import test data factories
import { createTestSnippet, createTestTask, generateTestId } from '../../fixtures/test-data';
```

## Page Object API Reference

### BasePage (all page objects extend this)
```typescript
waitForLoading(): Promise<void>           // Wait for spinners to disappear (30s max)
waitUntil(condition, opts): Promise<bool>  // Poll condition with interval
waitUntilVisible(selector): Promise<Locator>
waitUntilHidden(selector): Promise<void>
navigateTo(path): Promise<void>
getErrorMessage(): Promise<string | null>
```

### AppPage
```typescript
goToHome(): Promise<void>
goToTextSnippets(): Promise<void>
goToTasks(): Promise<void>
```

### TextSnippetPage
```typescript
// List operations
searchSnippets(text): Promise<void>
clearSearch(): Promise<void>
getSnippetCount(): Promise<number>
getSnippetList(): Promise<string[]>
selectSnippet(index): Promise<void>
selectSnippetByText(text): Promise<void>
verifySnippetInList(text): Promise<boolean>

// Form operations
createSnippet(data: TextSnippetData): Promise<void>
updateSnippet(data: Partial<TextSnippetData>): Promise<void>
resetForm(): Promise<void>
getSnippetTextValue(): Promise<string>
getFullTextValue(): Promise<string>
isCreateMode(): Promise<boolean>
isUpdateMode(): Promise<boolean>
isSearchVisible(): Promise<boolean>
getFieldError(fieldName): Promise<string | null>

// Locators (accessible as properties)
searchInput, snippetList, snippetItems
snippetTextField, fullTextField, categoryField
createButton, updateButton, resetButton
```

### ApiHelpers (for test setup/teardown via API)
```typescript
createTextSnippet({ snippetText, fullText }): Promise<any>
getTextSnippets(searchText?, skip?, take?): Promise<any>
deleteTextSnippet(id): Promise<boolean>
createTask({ title, description?, status?, priority? }): Promise<any>
getTasks(params?): Promise<any>
deleteTask(id): Promise<boolean>
cleanupTestData(testIdPrefix): Promise<void>
```

### Test Data Factories
```typescript
generateTestId(prefix?: string): string
// Returns: "PREFIX-1708123456789-abc123"

createTestSnippet(overrides?): TextSnippetData
// Returns: { snippetText: "SNIPPET-...", fullText: "Test snippet created at ..." }

createTestTask(overrides?): TaskFormData
// Returns: { title: "Test-Task TEST-...", description: "Created at ...", status: "Todo", priority: "Medium" }
```

## Full Template -- CRUD Test File

```typescript
import { createTestSnippet } from '../../fixtures/test-data';
import { AppPage, TextSnippetPage } from '../../page-objects';
import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

/**
 * {FeatureName} {Feature} Tests
 * Auto-generated from docs/test-specs/{FeatureName}/README.md
 *
 * @tags @{Priority} @{FeatureName} @{Feature}
 */
test.describe('@{Priority} @{FeatureName} - {Feature} Operations', () => {
    let appPage: AppPage;
    let featurePage: TextSnippetPage; // or TaskListPage, etc.
    let apiHelper: ApiHelpers;
    let currentTestData: string[] = []; // Track for cleanup

    test.beforeEach(async ({ page, request }) => {
        appPage = new AppPage(page);
        featurePage = new TextSnippetPage(page);
        apiHelper = new ApiHelpers(request);
        currentTestData = [];

        await appPage.goToHome();
        await appPage.goToTextSnippets(); // Navigate to feature
    });

    test.afterEach(async ({ request }) => {
        const apiHelper = new ApiHelpers(request);
        for (const testId of currentTestData) {
            await apiHelper.cleanupTestData(testId);
        }
    });

    test('{TC-ID}: @{Priority} {Title}', async ({ page }) => {
        /**
         * @scenario {Title}
         * @given {Given step from Gherkin}
         * @when {When step from Gherkin}
         * @then {Then step from Gherkin}
         */
        // Arrange
        const testData = createTestSnippet();
        currentTestData.push(testData.snippetText);

        // Act
        await featurePage.createSnippet(testData);

        // Assert
        expect(await featurePage.isCreateMode()).toBeTruthy();
        expect(await featurePage.verifySnippetInList(testData.snippetText)).toBeTruthy();
    });
});
```

## Full Template -- Search Test

```typescript
test('{TC-ID}: @{Priority} {Title}', async ({ page, request }) => {
    /**
     * @scenario {Title}
     * @given {Given steps}
     * @when {When steps}
     * @then {Then steps}
     */
    const apiHelper = new ApiHelpers(request);

    // Arrange -- create data via API for speed
    const snippetText = 'SEARCH-{CONTEXT}-' + Date.now();
    currentTestData.push(snippetText);
    await apiHelper.createTextSnippet({
        snippetText: snippetText,
        fullText: '{Search content for test}'
    });

    // Reload to see new data
    await page.reload();
    await appPage.goToTextSnippets();

    // Act
    await featurePage.searchSnippets('{search term}');

    // Assert
    const snippets = await featurePage.getSnippetList();
    const hasMatch = snippets.some(s => s.includes('{expected match}'));
    expect(hasMatch).toBeTruthy();
});
```

## Full Template -- Form Validation Test

```typescript
test('{TC-ID}: @{Priority} {Title}', async ({ page }) => {
    /**
     * @scenario {Title}
     * @given the user is on the form
     * @when the user submits invalid data
     * @then validation errors should appear
     */
    // Arrange -- leave required field empty or fill with invalid data
    await featurePage.snippetTextField.fill('');
    await featurePage.snippetTextField.blur();

    // Act -- attempt to submit (button may be disabled)
    // Assert -- verify error message content, not just presence
    const error = await featurePage.getFieldError('snippetText');
    expect(error).not.toBeNull();
    expect(error).toContain('{expected error text, e.g., "required"}');
});
```

## Full Template -- Update Test (Create-Select-Update)

```typescript
test('{TC-ID}: @{Priority} {Title}', async ({ page }) => {
    /**
     * @scenario {Title}
     * @given a record exists
     * @when the user selects and modifies it
     * @then the changes should be saved
     */
    // Arrange -- create a record first
    const testData = createTestSnippet();
    currentTestData.push(testData.snippetText);
    await featurePage.createSnippet(testData);

    // Wait and select
    await featurePage.waitForLoading();
    await featurePage.selectSnippetByText(testData.snippetText);
    expect(await featurePage.isUpdateMode()).toBeTruthy();

    // Act -- update
    const updatedFullText = 'Updated content ' + Date.now();
    await featurePage.updateSnippet({ fullText: updatedFullText });

    // Assert -- MUST re-read field value after mutation
    await featurePage.waitForLoading();

    // Re-select the updated item to verify persisted state
    await featurePage.selectSnippetByText(testData.snippetText);
    await featurePage.waitForLoading();

    const displayedFullText = await featurePage.getFullTextValue();
    expect(displayedFullText).toBe(updatedFullText);
});
```

## Full Template -- Edge Case Test

```typescript
test('{TC-ID}: @{Priority} {Title}', async ({ page }) => {
    /**
     * @scenario {Title}
     * @given the user is on the form
     * @when the user enters edge case data
     * @then the system should handle it gracefully
     */
    // Arrange -- prepare edge case data
    const edgeCaseData = createTestSnippet({
        snippetText: '{edge case value}',
        fullText: '{edge case content}'
    });
    currentTestData.push(edgeCaseData.snippetText);

    // Act
    await featurePage.createSnippet(edgeCaseData);

    // Assert -- verify no errors, data handled correctly
    expect(await featurePage.verifySnippetInList(edgeCaseData.snippetText)).toBeTruthy();
});
```

## Post-Mutation Verification (MANDATORY)

After ANY E2E create/update/delete action + `waitForLoading()`, you MUST verify the result:

### After Create -- verify item appears in list
```typescript
await featurePage.waitForLoading();
expect(await featurePage.verifySnippetInList(testData.snippetText)).toBeTruthy();
```

### After Update -- re-read field value
```typescript
await featurePage.waitForLoading();
// Re-select to verify persisted state (PREFERRED: proves data round-trips through DB)
await featurePage.selectSnippetByText(testData.snippetText);
await featurePage.waitForLoading();
const displayedValue = await featurePage.getFullTextValue();
expect(displayedValue).toBe(updatedFullText);
```

### After Delete -- verify item removed from list
```typescript
await featurePage.waitForLoading();
expect(await featurePage.verifySnippetInList(deletedSnippetText)).toBeFalsy();
```

### After Form Validation Error -- verify error message content
```typescript
const error = await featurePage.getFieldError('snippetText');
expect(error).not.toBeNull();
expect(error).toContain('required');
```

**Priority:** Re-reading field values after mutation (re-select + getValue) is PREFERRED over just checking list presence, because it proves the data round-trips through the database.

## Minimum Assertion Rules (E2E)

| Operation | Required Assertions |
|-----------|-------------------|
| E2E Create | UI action + `waitForLoading()` + `verifySnippetInList()` or equivalent |
| E2E Update | UI action + `waitForLoading()` + re-select + re-read field value |
| E2E Delete | UI action + `waitForLoading()` + verify item absent from list |
| E2E Search | Search action + verify matched item contains search term (not just count) |
| E2E Form Validation | Submit invalid data + verify error message text content (not just presence) |

## Anti-Patterns (Weak vs Strong)

| Weak (DO NOT) | Strong (DO) |
|---------------|-------------|
| End test at `waitForLoading()` after update | Re-select item + re-read field value: `expect(await getFullTextValue()).toBe(updated)` |
| `expect(error).toBeTruthy()` only | `expect(error).toContain('required')` -- verify error text content |
| Check list length only after search | Verify matched item text: `snippets.some(s => s.includes(searchTerm))` |
| No verification after create | `expect(await verifySnippetInList(text)).toBeTruthy()` |
| No verification after delete | `expect(await verifySnippetInList(text)).toBeFalsy()` |
| No setup step assertion | Verify API helper create response before proceeding |

## Naming Convention Rules

| Element | Convention | Example |
|---------|-----------|---------|
| File | `{feature-kebab-case}.spec.ts` | `crud.spec.ts`, `search.spec.ts` |
| Describe | `@{Priority} @{Feature} - {SubFeature} Operations` | `@P0 @P1 @TextSnippet - CRUD Operations` |
| Test title | `{TC-ID}: @{Priority} {Title}` | `TC-SNP-CRT-001: @P0 Create new text snippet` |
| Variable | camelCase with descriptive names | `currentTestSnippets`, `snippetText` |
| Test data | Unique per test, tracked for cleanup | `createTestSnippet()`, `generateTestId()` |

## Rules

1. Every test MUST have a JSDoc block with `@scenario`, `@given`, `@when`, `@then`
2. Every test title MUST start with the TC-ID
3. Use `createTestSnippet()` or `createTestTask()` for test data -- never hardcode
4. Always track created data in `currentTestData` for cleanup in `afterEach`
5. Import `test` and `expect` from `../../utils/test-helpers` (NOT from `@playwright/test`)
6. Use page objects for ALL interactions -- never use raw `page.locator()` in tests
7. Use `ApiHelpers` for setup data when UI creation is not the thing being tested
8. Always call `waitForLoading()` after actions that trigger API calls
9. One `test.describe` per file, matching the feature area
10. Use `page.reload()` + navigation after API-created data to ensure list is fresh
11. Every mutation test MUST include post-mutation verification (never end at `waitForLoading()`)
12. Update tests MUST re-read at least one field value to confirm persistence
13. Form validation tests MUST verify error message text content, not just presence
14. Prefer re-selecting and re-reading field values over list-only verification (proves DB round-trip)

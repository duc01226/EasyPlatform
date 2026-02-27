---
name: e2e-record
description: Record browser interactions with Playwright codegen and refactor into POM-based E2E tests.
allowed-tools: [Bash, Read, Write, Edit, Grep, Glob]
---

# E2E Test Recording & Refactoring

## Workflow

1. **Launch codegen**: `cd src/Frontend/e2e && npx playwright codegen http://localhost:4001`
2. **Save raw recording** to `src/Frontend/e2e/recordings/{feature-name}.spec.ts`
3. **Refactor into POM**: Reuse existing page objects from `src/Frontend/e2e/page-objects/`
4. **Add TC-ID**: Annotate with `TC-{MOD}-{FEAT}-{NUM}: description @P{n}`
5. **Move to tests/**: Place in correct folder `src/Frontend/e2e/tests/{module}/`

## Existing Page Objects
- `base.page.ts` — Navigation, wait helpers, loading detection
- `app.page.ts` — Tab navigation, app-level operations
- `task-list.page.ts` — Task list, filters, search
- `task-detail.page.ts` — Task form fields, validation
- `text-snippet.page.ts` — Snippet CRUD operations

## Recording Directory
Raw codegen outputs go to `src/Frontend/e2e/recordings/` (gitignored).

## Test Conventions
- Use `test.describe('TC-XXX: Feature', () => { ... })` for grouping
- Use `test('TC-XXX: description @P1', ...)` for individual tests
- Use `page.getByTestId()` or `page.getByRole()` for selectors
- Follow existing patterns in `src/Frontend/e2e/tests/`

import { AppPage, TaskListPage, TextSnippetPage } from '../../page-objects';
import { expect, test } from '../../utils/test-helpers';

/**
 * P0 Smoke Tests - Application Loading
 * These tests verify the core application loads and basic functionality works.
 *
 * @tags @P0 @Smoke
 */
test.describe('@P0 @Smoke - App Load Tests', () => {
    let appPage: AppPage;

    test.beforeEach(async ({ page }) => {
        appPage = new AppPage(page);
    });

    test('TS-APP-P0-001 - App loads and displays main content', async ({ page }) => {
        /**
         * @scenario App loads and displays text snippets
         * @given the frontend app is accessible at localhost:4001
         * @when the user navigates to the app
         * @then the app should load without errors
         * @and the tab navigation should be visible
         */
        await appPage.goToHome();

        // App should load without errors
        expect(await appPage.isAppLoaded()).toBeTruthy();

        // Tab group should be visible
        await expect(appPage.tabGroup).toBeVisible();

        // No global errors should be present
        expect(await appPage.hasGlobalError()).toBeFalsy();
    });

    test('TS-SNIPPET-P0-001 - Text Snippets tab loads correctly', async ({ page }) => {
        /**
         * @scenario Text Snippets tab loads and displays list
         * @given the user is on the app
         * @when the user navigates to the Text Snippets tab
         * @then the text snippet list should load
         * @and the search input should be visible
         * @and the detail panel should show create mode
         */
        const snippetPage = new TextSnippetPage(page);
        await appPage.goToHome();
        await appPage.goToTextSnippets();

        // Verify Text Snippets tab is active
        expect(await appPage.isTextSnippetsTabActive()).toBeTruthy();

        // Search input should be visible
        expect(await snippetPage.isSearchVisible()).toBeTruthy();

        // Detail panel should be in create mode
        expect(await snippetPage.isCreateMode()).toBeTruthy();
    });

    test('TS-TASK-P0-001 - Tasks tab loads correctly', async ({ page }) => {
        /**
         * @scenario Tasks tab loads and displays task list
         * @given the backend API is running
         * @when the user navigates to the Tasks tab
         * @then the task list should load
         * @and statistics cards should display (Total, Active, Completed, Overdue)
         * @and filter chips should be visible
         */
        const taskPage = new TaskListPage(page);
        await appPage.goToHome();
        await appPage.goToTasks();

        // Verify Tasks tab is active
        expect(await appPage.isTasksTabActive()).toBeTruthy();

        // Statistics container should be visible
        await expect(taskPage.statsContainer).toBeVisible();

        // Filter container should be visible
        await expect(taskPage.filterContainer).toBeVisible();
    });

    test('TS-NAV-P0-001 - Tab navigation works correctly', async ({ page }) => {
        /**
         * @scenario Tab navigation switches between Text Snippets and Tasks
         * @given the user is on the app
         * @when the user clicks on different tabs
         * @then the content should switch accordingly
         */
        await appPage.goToHome();

        // Start with Text Snippets tab
        await appPage.goToTextSnippets();
        expect(await appPage.isTextSnippetsTabActive()).toBeTruthy();

        // Switch to Tasks tab
        await appPage.goToTasks();
        expect(await appPage.isTasksTabActive()).toBeTruthy();

        // Switch back to Text Snippets
        await appPage.goToTextSnippets();
        expect(await appPage.isTextSnippetsTabActive()).toBeTruthy();
    });

    test('TS-RESPONSIVE-P0-001 - App is responsive and usable', async ({ page }) => {
        /**
         * @scenario App works on different viewport sizes
         * @given the app is loaded
         * @when the viewport is resized
         * @then the app should remain usable
         */
        await appPage.goToHome();

        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        expect(await appPage.isAppLoaded()).toBeTruthy();
        await expect(appPage.tabGroup).toBeVisible();

        // Test tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        expect(await appPage.isAppLoaded()).toBeTruthy();
        await expect(appPage.tabGroup).toBeVisible();

        // Test desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        expect(await appPage.isAppLoaded()).toBeTruthy();
        await expect(appPage.tabGroup).toBeVisible();
    });
});

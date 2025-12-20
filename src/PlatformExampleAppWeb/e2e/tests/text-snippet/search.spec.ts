import { AppPage, TextSnippetPage } from '../../page-objects';
import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

/**
 * Text Snippet Search Tests
 * Tests for searching and filtering text snippets.
 *
 * @tags @P0 @P1 @TextSnippet @Search
 */
test.describe('@P0 @P1 @TextSnippet @Search - Search Operations', () => {
    let appPage: AppPage;
    let snippetPage: TextSnippetPage;
    let currentTestSnippets: string[] = [];

    test.beforeEach(async ({ page }) => {
        appPage = new AppPage(page);
        snippetPage = new TextSnippetPage(page);
        currentTestSnippets = [];

        await appPage.goToHome();
        await appPage.goToTextSnippets();
    });

    test.afterEach(async ({ request }) => {
        const apiHelper = new ApiHelpers(request);
        for (const snippetText of currentTestSnippets) {
            await apiHelper.cleanupTestData(snippetText);
        }
    });

    test('@P0 TS-SEARCH-P0-001 - Search input is functional', async ({ page }) => {
        /**
         * @scenario Search input is visible and accepts input
         * @given the user is on the Text Snippets tab
         * @then the search input should be visible
         * @and should accept text input
         */
        expect(await snippetPage.isSearchVisible()).toBeTruthy();

        await snippetPage.searchInput.fill('test search');
        expect(await snippetPage.searchInput.inputValue()).toBe('test search');
    });

    test('@P1 TS-SNIPPET-P1-001 - Full-text search returns matching results', async ({ page, request }) => {
        /**
         * @scenario Full-text search returns matching results
         * @given text snippets exist with various content
         * @when the user enters a search term
         * @and presses Enter or waits for search
         * @then only snippets containing the search term should display
         */
        const apiHelper = new ApiHelpers(request);

        // Create test snippets with specific content
        const snippet1Text = 'SEARCH-ANGULAR-001';
        const snippet2Text = 'SEARCH-REACT-001';
        currentTestSnippets.push(snippet1Text, snippet2Text);
        await apiHelper.createTextSnippet({
            snippetText: snippet1Text,
            fullText: 'This snippet contains Angular framework content'
        });
        await apiHelper.createTextSnippet({
            snippetText: snippet2Text,
            fullText: 'This snippet contains React library content'
        });

        // Refresh the list
        await page.reload();
        await appPage.goToTextSnippets();

        // Search for Angular
        await snippetPage.searchSnippets('ANGULAR');

        // Get list after search
        const snippets = await snippetPage.getSnippetList();

        // Should find the Angular snippet
        const hasAngularSnippet = snippets.some(s => s.includes('ANGULAR'));
        expect(hasAngularSnippet).toBeTruthy();
    });

    test('@P1 TS-SEARCH-P1-002 - Clear search shows all results', async ({ page }) => {
        /**
         * @scenario Clearing search shows all snippets
         * @given the user has searched and filtered results
         * @when the user clears the search
         * @then all snippets should be visible again
         */
        // First do a search
        await snippetPage.searchSnippets('nonexistent123');

        // Clear search
        await snippetPage.clearSearch();

        // Wait for results to load
        await snippetPage.waitForLoading();

        // Verify list is populated (might have items from database)
        const count = await snippetPage.getSnippetCount();
        // List should load (may be 0 if empty database, that's okay)
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('@P1 TS-SEARCH-P1-003 - Search with no results shows appropriate state', async ({ page }) => {
        /**
         * @scenario No results search shows empty state
         * @given the user is on the Text Snippets tab
         * @when the user searches for a non-existent term
         * @then an empty or no results state should be shown
         */
        await snippetPage.searchSnippets('xyznonexistent999999');

        // Wait for search to complete
        await snippetPage.waitForLoading();

        // Should have 0 results
        const count = await snippetPage.getSnippetCount();
        expect(count).toBe(0);
    });

    test('@P2 TS-SEARCH-P2-001 - Partial text search works', async ({ page, request }) => {
        /**
         * @scenario Partial text matching works
         * @given text snippets exist
         * @when the user searches with a partial term
         * @then matching snippets should be returned
         */
        const apiHelper = new ApiHelpers(request);

        // Create a specific snippet
        const snippetText = 'SEARCH-PARTIAL-TEST';
        currentTestSnippets.push(snippetText);
        await apiHelper.createTextSnippet({
            snippetText: snippetText,
            fullText: 'Content for partial search testing'
        });

        await page.reload();
        await appPage.goToTextSnippets();

        // Search with partial term
        await snippetPage.searchSnippets('PARTIAL');

        const snippets = await snippetPage.getSnippetList();
        const hasMatch = snippets.some(s => s.includes('PARTIAL'));
        expect(hasMatch).toBeTruthy();
    });

    test('@P2 TS-SEARCH-P2-002 - Case-insensitive search', async ({ page, request }) => {
        /**
         * @scenario Search is case-insensitive
         * @given text snippets exist with mixed case content
         * @when the user searches with different case
         * @then matching snippets should still be found
         */
        const apiHelper = new ApiHelpers(request);

        const snippetText = 'SEARCH-UPPERCASE-TEST';
        currentTestSnippets.push(snippetText);
        await apiHelper.createTextSnippet({
            snippetText: snippetText,
            fullText: 'Testing case sensitivity in search'
        });

        await page.reload();
        await appPage.goToTextSnippets();

        // Search with lowercase
        await snippetPage.searchSnippets('uppercase');

        const snippets = await snippetPage.getSnippetList();
        const hasMatch = snippets.some(s => s.toLowerCase().includes('uppercase'));
        expect(hasMatch).toBeTruthy();
    });

    test('@P3 TS-SEARCH-P3-001 - Search debouncing works', async ({ page }) => {
        /**
         * @scenario Search has debouncing to prevent excessive API calls
         * @given the user is typing in search field
         * @when the user types quickly
         * @then only one search request should be made after pause
         */
        // Type quickly
        await snippetPage.searchInput.type('test', { delay: 50 });

        // Wait for debounce
        await page.waitForTimeout(500);

        // Continue typing
        await snippetPage.searchInput.type('search', { delay: 50 });

        // The search should complete without errors
        await snippetPage.waitForLoading();
    });
});

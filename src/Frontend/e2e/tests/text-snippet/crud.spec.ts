import { createTestSnippet } from '../../fixtures/test-data';
import { AppPage, TextSnippetPage } from '../../page-objects';
import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

/**
 * Text Snippet CRUD Tests
 * Tests for creating, reading, updating text snippets.
 *
 * @tags @P0 @P1 @TextSnippet @CRUD
 */
test.describe('@P0 @P1 @TextSnippet - CRUD Operations', () => {
    let appPage: AppPage;
    let snippetPage: TextSnippetPage;
    let apiHelper: ApiHelpers;
    let currentTestSnippets: string[] = [];

    test.beforeEach(async ({ page, request }) => {
        appPage = new AppPage(page);
        snippetPage = new TextSnippetPage(page);
        apiHelper = new ApiHelpers(request);
        currentTestSnippets = [];

        await appPage.goToHome();
        await appPage.goToTextSnippets();
    });

    test.afterEach(async () => {
        for (const snippetText of currentTestSnippets) {
            await apiHelper.cleanupTestData(snippetText);
        }
    });

    test('TC-SNP-CRT-001: Create new text snippet @P1', async ({ page }) => {
        /**
         * @scenario Create new text snippet
         * @given the user is on the Text Snippets tab
         * @when the user enters "TEST001" in Snippet Text field
         * @and enters "Test full text content" in Full Text field
         * @and clicks the Create button
         * @then a new snippet should be created
         * @and the snippet should appear in the list
         * @and the form should reset to create mode
         */
        const testSnippet = createTestSnippet();
        currentTestSnippets.push(testSnippet.snippetText);

        // Fill form and create
        await snippetPage.createSnippet(testSnippet);

        // Verify form resets to create mode
        expect(await snippetPage.isCreateMode()).toBeTruthy();

        // Verify snippet appears in list
        expect(await snippetPage.verifySnippetInList(testSnippet.snippetText)).toBeTruthy();
    });

    test('TC-SNP-UPD-001: Update existing text snippet @P1', async ({ page }) => {
        /**
         * @scenario Update existing text snippet
         * @given a text snippet exists in the list
         * @when the user clicks on the snippet in the list
         * @and modifies the Full Text content
         * @and clicks Update button
         * @then the snippet should be updated
         * @and the list should reflect changes
         */
        // First create a snippet
        const testSnippet = createTestSnippet();
        currentTestSnippets.push(testSnippet.snippetText);
        await snippetPage.createSnippet(testSnippet);

        // Wait for list to update
        await snippetPage.waitForLoading();

        // Select the snippet
        await snippetPage.selectSnippetByText(testSnippet.snippetText);

        // Verify we're in update mode
        expect(await snippetPage.isUpdateMode()).toBeTruthy();

        // Update the full text
        const updatedFullText = 'Updated content ' + Date.now();
        await snippetPage.updateSnippet({ fullText: updatedFullText });

        // Verify update was successful by re-reading the field value from the UI
        await snippetPage.waitForLoading();
        const currentFullText = await snippetPage.getFullTextValue();
        expect(currentFullText).toBe(updatedFullText);
    });

    test('@P1 TS-SNIPPET-P1-003 - Reset form clears fields', async ({ page }) => {
        /**
         * @scenario Reset form returns to create mode
         * @given the user has selected a snippet for editing
         * @when the user clicks Reset button
         * @then the form should clear and revert to original values
         * @and all buttons in form is disabled
         */
        // First create and select a snippet
        const testSnippet = createTestSnippet();
        currentTestSnippets.push(testSnippet.snippetText);
        await snippetPage.createSnippet(testSnippet);
        await snippetPage.selectSnippetByText(testSnippet.snippetText);
        await snippetPage.fullTextField.fill(testSnippet.fullText + ' Updated content ' + Date.now());
        await snippetPage.fullTextField.blur();

        // Reset form
        await snippetPage.resetForm();

        // Verify form is in update mode with original values
        expect(await snippetPage.isUpdateMode()).toBeTruthy();
        expect(await snippetPage.getFullTextValue()).toBe(testSnippet.fullText);
    });

    test('@P1 TS-SNIPPET-P1-004 - Select snippet loads details', async ({ page }) => {
        /**
         * @scenario Selecting a snippet loads its details
         * @given text snippets exist in the list
         * @when the user clicks on a snippet
         * @then the snippet details should load in the form
         * @and the form should be in update mode
         */
        // Create a snippet with known content
        const testSnippet = createTestSnippet({
            snippetText: 'DETAIL-TEST-' + Date.now(),
            fullText: 'This is the full text content for testing'
        });
        currentTestSnippets.push(testSnippet.snippetText);
        await snippetPage.createSnippet(testSnippet);

        // Select the snippet
        await snippetPage.selectSnippetByText(testSnippet.snippetText);

        // Verify details are loaded
        expect(await snippetPage.getSnippetTextValue()).toBe(testSnippet.snippetText);

        // Verify update mode
        expect(await snippetPage.isUpdateMode()).toBeTruthy();
    });

    test('@P2 TS-SNIPPET-P2-001 - Create snippet with all fields', async ({ page }) => {
        /**
         * @scenario Create snippet with category
         * @given the user is on the Text Snippets tab
         * @when the user fills all available fields
         * @and clicks Create button
         * @then the snippet should be created with all data
         */
        const testSnippet = createTestSnippet({
            snippetText: 'FULL-DATA-' + Date.now(),
            fullText: 'Complete snippet with all fields filled for comprehensive testing'
        });
        currentTestSnippets.push(testSnippet.snippetText);

        await snippetPage.createSnippet(testSnippet);

        // Verify creation
        expect(await snippetPage.verifySnippetInList(testSnippet.snippetText)).toBeTruthy();
    });

    test('@P2 TS-SNIPPET-P2-002 - Create multiple snippets', async ({ page }) => {
        /**
         * @scenario Create multiple snippets in sequence
         * @given the user is on the Text Snippets tab
         * @when the user creates multiple snippets
         * @then all snippets should appear in the list
         */
        const snippets = [
            createTestSnippet({ snippetText: 'MULTI-1-' + Date.now() }),
            createTestSnippet({ snippetText: 'MULTI-2-' + Date.now() }),
            createTestSnippet({ snippetText: 'MULTI-3-' + Date.now() })
        ];
        currentTestSnippets.push(...snippets.map(s => s.snippetText));

        for (const snippet of snippets) {
            await snippetPage.createSnippet(snippet);
        }

        // Verify all snippets exist
        for (const snippet of snippets) {
            expect(await snippetPage.verifySnippetInList(snippet.snippetText)).toBeTruthy();
        }
    });
});

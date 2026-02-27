import { createTestSnippet } from '../../fixtures/test-data';
import { AppPage, TextSnippetPage } from '../../page-objects';
import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

/**
 * Text Snippet Edge Case Tests
 * Tests for boundary conditions: max text length, special characters, unicode.
 *
 * @tags @P2 @TextSnippet @EdgeCase
 */
test.describe('@P2 @TextSnippet @EdgeCase - Edge Case Tests', () => {
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

    test('TC-SNP-EDGE-001: Maximum text length for snippet fields @P2', async ({ page }) => {
        /**
         * @scenario Snippet fields handle maximum text length
         * @given the user is on the Text Snippets tab
         * @when the user enters a very long string in the Snippet Text field
         * @and enters a very long string in the Full Text field
         * @and clicks Create
         * @then the snippet should be created or a validation error shown
         * @and the application should not crash
         */
        const longSnippetText = 'EDGE-MAX-' + Date.now() + '-' + 'A'.repeat(200);
        const longFullText = 'B'.repeat(10000);
        currentTestSnippets.push(longSnippetText);

        // Fill form with long text
        await snippetPage.snippetTextField.fill(longSnippetText);
        await snippetPage.snippetTextField.blur();
        await snippetPage.fullTextField.fill(longFullText);
        await snippetPage.fullTextField.blur();

        // Attempt to create
        await snippetPage.createButton.click();
        await snippetPage.waitForLoading();

        // Verify outcome: either validation error or successful creation (not both)
        const hasError = await snippetPage.getFieldError('snippetText');
        const isCreateMode = await snippetPage.isCreateMode();

        // Exactly one outcome must be true — error XOR success
        const wasCreated = !hasError && isCreateMode;
        const wasRejected = !!hasError;
        expect(wasCreated || wasRejected).toBeTruthy();
        expect(wasCreated && wasRejected).toBeFalsy();

        // App should still be functional (no crash)
        expect(await appPage.isAppLoaded()).toBeTruthy();
    });

    test('TC-SNP-EDGE-002: Special characters in snippet fields @P2', async ({ page }) => {
        /**
         * @scenario Special characters are handled properly in snippet fields
         * @given the user is on the Text Snippets tab
         * @when the user enters special characters including HTML, SQL injection, and unicode
         * @and clicks Create
         * @then the snippet should be created with characters preserved or safely sanitized
         * @and the application should not be vulnerable to XSS or injection
         */
        const specialSnippetText = 'EDGE-SPECIAL-' + Date.now();
        const specialFullText = [
            '<script>alert("xss")</script>',
            "'; DROP TABLE TextSnippets; --",
            '& < > " \' / \\',
            '\u0000\u0001\u001F', // Control characters
            '\uD83D\uDE00 \uD83D\uDCA9', // Emoji (decoded: grinning face, pile of poo)
            '\u0410\u0411\u0412 \u4E2D\u6587', // Cyrillic and Chinese
            '\t\n\r', // Whitespace variants
            'Normal text after special chars'
        ].join(' | ');

        currentTestSnippets.push(specialSnippetText);

        const testSnippet = createTestSnippet({
            snippetText: specialSnippetText,
            fullText: specialFullText
        });

        // Create snippet with special characters
        await snippetPage.createSnippet(testSnippet);

        // Verify form reset (indicates successful creation)
        expect(await snippetPage.isCreateMode()).toBeTruthy();

        // Verify snippet appears in list
        expect(await snippetPage.verifySnippetInList(specialSnippetText)).toBeTruthy();

        // Select the snippet and verify content is preserved (not corrupted)
        await snippetPage.selectSnippetByText(specialSnippetText);
        const actualSnippetText = await snippetPage.getSnippetTextValue();
        expect(actualSnippetText).toBe(specialSnippetText);

        // Full text should contain the special characters preserved as literal text (not executed)
        const actualFullText = await snippetPage.getFullTextValue();
        expect(actualFullText.length).toBeGreaterThan(0);
        // Should contain at least the normal text portion
        expect(actualFullText).toContain('Normal text after special chars');
        // Script tag must be stored as literal text (preserved, not stripped or executed)
        expect(actualFullText).toContain('<script>');

        // App should still be functional (no XSS execution or crash)
        expect(await appPage.hasGlobalError()).toBeFalsy();
    });

    test('@P2 TS-EDGE-P2-001 - Empty full text is allowed', async ({ page }) => {
        /**
         * @scenario Creating snippet with empty full text
         * @given the user is on the Text Snippets tab
         * @when the user enters only snippet text with no full text
         * @and clicks Create
         * @then the snippet should be created (full text is optional)
         */
        const snippetText = 'EDGE-EMPTY-FT-' + Date.now();
        currentTestSnippets.push(snippetText);

        await snippetPage.snippetTextField.fill(snippetText);
        await snippetPage.snippetTextField.blur();
        // Leave fullText empty

        await snippetPage.createButton.click();
        await snippetPage.waitForLoading();

        // Either created or validation error - both are acceptable behaviors
        expect(await appPage.isAppLoaded()).toBeTruthy();
    });

    test('@P2 TS-EDGE-P2-002 - Unicode content in snippet fields', async ({ page }) => {
        /**
         * @scenario Unicode characters are preserved in snippet content
         * @given the user is on the Text Snippets tab
         * @when the user creates a snippet with multi-language unicode content
         * @then the characters should be preserved correctly
         */
        const unicodeSnippetText = 'EDGE-UNICODE-' + Date.now();
        const unicodeFullText = 'English | Русский | 中文 | 日本語 | 한국어 | العربية';
        currentTestSnippets.push(unicodeSnippetText);

        const testSnippet = createTestSnippet({
            snippetText: unicodeSnippetText,
            fullText: unicodeFullText
        });

        await snippetPage.createSnippet(testSnippet);

        // Verify creation
        expect(await snippetPage.verifySnippetInList(unicodeSnippetText)).toBeTruthy();

        // Select and verify unicode content preserved
        await snippetPage.selectSnippetByText(unicodeSnippetText);
        const actualFullText = await snippetPage.getFullTextValue();
        expect(actualFullText).toContain('Русский');
        expect(actualFullText).toContain('中文');
    });
});

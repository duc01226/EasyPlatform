import { Locator, Page } from '@playwright/test';

/**
 * Base Page Object with common utilities for all pages.
 */
export class BasePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigate to a specific path
     */
    async navigateTo(path: string = '/'): Promise<void> {
        await this.page.goto(path);
        await this.waitForPageLoad();
    }

    /**
     * Wait for page to fully load.
     * Uses domcontentloaded instead of networkidle because Angular apps with
     * background polling never become truly "network idle".
     */
    async waitForPageLoad(): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded');
        // Small delay for Angular to bootstrap
        await this.page.waitForTimeout(300);
    }

    /**
     * Wait until a condition is met, mimicking real human waiting behavior.
     * Like a real tester, waits with interval checks up to a max timeout.
     *
     * @param condition - Async function that returns true when condition is met
     * @param options - Configuration options
     * @param options.maxWaitMs - Maximum wait time (default: 5000ms like real human)
     * @param options.intervalMs - Check interval (default: 1000ms)
     * @param options.errorMessage - Message for timeout error
     * @returns true if condition was met, throws if timeout
     */
    async waitUntil(condition: () => Promise<boolean>, options: { maxWaitMs?: number; intervalMs?: number; errorMessage?: string } = {}): Promise<boolean> {
        const { maxWaitMs = 5000, intervalMs = 1000, errorMessage = 'Condition not met within timeout' } = options;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            try {
                if (await condition()) {
                    return true;
                }
            } catch {
                // Condition threw an error, keep waiting
            }
            await this.page.waitForTimeout(intervalMs);
        }

        // One final check
        try {
            if (await condition()) {
                return true;
            }
        } catch {
            // ignore
        }

        throw new Error(`${errorMessage} (waited ${maxWaitMs}ms)`);
    }

    /**
     * Wait until element is visible, with human-like patience.
     */
    async waitUntilVisible(selector: string, maxWaitMs: number = 5000): Promise<Locator> {
        await this.waitUntil(async () => await this.page.locator(selector).isVisible(), { maxWaitMs, errorMessage: `Element "${selector}" not visible` });
        return this.page.locator(selector);
    }

    /**
     * Wait until element is hidden, with human-like patience.
     */
    async waitUntilHidden(selector: string, maxWaitMs: number = 5000): Promise<void> {
        await this.waitUntil(async () => !(await this.page.locator(selector).isVisible()), { maxWaitMs, errorMessage: `Element "${selector}" still visible` });
    }

    /**
     * Wait until element contains expected text.
     */
    async waitUntilTextContains(selector: string, expectedText: string, maxWaitMs: number = 5000): Promise<void> {
        await this.waitUntil(
            async () => {
                const text = await this.page.locator(selector).textContent();
                return text?.includes(expectedText) ?? false;
            },
            { maxWaitMs, errorMessage: `Element "${selector}" does not contain "${expectedText}"` }
        );
    }

    /**
     * Wait for loading spinner to disappear.
     * Uses human-like waiting pattern (up to 5 seconds with 500ms checks).
     */
    async waitForLoading(): Promise<void> {
        // Small delay to let Angular start any loading operations
        await this.page.waitForTimeout(300);

        // Wait for spinners to disappear using human-like patience
        const spinner = this.page.locator('mat-spinner, .platform-mat-mdc-spinner, .loading-spinner');
        await this.waitUntil(async () => (await spinner.count()) === 0 || !((await spinner.first()?.isVisible()) == true), {
            maxWaitMs: 30000,
            intervalMs: 500,
            errorMessage: 'Loading spinner still visible'
        });
    }

    /**
     * Get error message if displayed
     */
    async getErrorMessage(): Promise<string | null> {
        const errorLocator = this.page.locator('.error-message, mat-error, [class*="error"]').first();
        if (await errorLocator.isVisible()) {
            return await errorLocator.textContent();
        }
        return null;
    }

    /**
     * Check if element is visible
     */
    async isElementVisible(selector: string): Promise<boolean> {
        return await this.page.locator(selector).isVisible();
    }

    /**
     * Wait for element to be visible
     */
    async waitForElement(selector: string, timeout: number = 10000): Promise<Locator> {
        const locator = this.page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout });
        return locator;
    }

    /**
     * Click element and wait for navigation/load
     */
    async clickAndWait(selector: string): Promise<void> {
        await this.page.locator(selector).click();
        await this.waitForLoading();
    }

    /**
     * Fill form field
     */
    async fillField(selector: string, value: string): Promise<void> {
        const field = this.page.locator(selector);
        await field.clear();
        await field.fill(value);
    }

    /**
     * Get text content of element
     */
    async getText(selector: string): Promise<string> {
        return (await this.page.locator(selector).textContent()) ?? '';
    }

    /**
     * Check if toast/snackbar message is displayed
     */
    async getSnackbarMessage(): Promise<string | null> {
        const snackbar = this.page.locator('mat-snack-bar-container, .mat-mdc-snack-bar-container');
        if (await snackbar.isVisible()) {
            return await snackbar.textContent();
        }
        return null;
    }

    /**
     * Wait for snackbar to appear and return its message
     */
    async waitForSnackbar(timeout: number = 5000): Promise<string> {
        const snackbar = this.page.locator('mat-snack-bar-container, .mat-mdc-snack-bar-container');
        await snackbar.waitFor({ state: 'visible', timeout });
        return (await snackbar.textContent()) ?? '';
    }

    /**
     * Take screenshot for debugging
     */
    async takeScreenshot(name: string): Promise<void> {
        await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
    }
}

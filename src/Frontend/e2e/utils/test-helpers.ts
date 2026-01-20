import { test as baseTest, Page, ConsoleMessage, expect as baseExpect } from '@playwright/test';

/**
 * Console error entry captured during test execution.
 */
export interface ConsoleError {
    type: string;
    text: string;
    location: string;
    timestamp: Date;
}

/**
 * Console error tracker that collects console errors/warnings during test execution.
 * This helps diagnose test failures by showing any JavaScript errors that occurred.
 */
export class ConsoleErrorTracker {
    private errors: ConsoleError[] = [];
    private page: Page | null = null;
    private consoleHandler: ((msg: ConsoleMessage) => void) | null = null;

    /**
     * Start tracking console errors on the given page.
     */
    attach(page: Page): void {
        this.page = page;
        this.errors = [];

        this.consoleHandler = (msg: ConsoleMessage) => {
            const type = msg.type();
            // Track errors, warnings, and uncaught exceptions
            if (type === 'error' || type === 'warning') {
                this.errors.push({
                    type: type.toUpperCase(),
                    text: msg.text(),
                    location: msg.location() ? `${msg.location().url}:${msg.location().lineNumber}:${msg.location().columnNumber}` : 'unknown',
                    timestamp: new Date()
                });
            }
        };

        page.on('console', this.consoleHandler);

        // Also track page errors (uncaught exceptions)
        page.on('pageerror', (error: Error) => {
            this.errors.push({
                type: 'UNCAUGHT_EXCEPTION',
                text: `${error.name}: ${error.message}\n${error.stack || ''}`,
                location: 'page',
                timestamp: new Date()
            });
        });
    }

    /**
     * Detach from the page and stop tracking.
     */
    detach(): void {
        if (this.page && this.consoleHandler) {
            this.page.removeListener('console', this.consoleHandler);
        }
        this.page = null;
        this.consoleHandler = null;
    }

    /**
     * Get all captured console errors.
     */
    getErrors(): ConsoleError[] {
        return [...this.errors];
    }

    /**
     * Check if there are any console errors.
     */
    hasErrors(): boolean {
        return this.errors.some(e => e.type === 'ERROR' || e.type === 'UNCAUGHT_EXCEPTION');
    }

    /**
     * Check if there are any console warnings.
     */
    hasWarnings(): boolean {
        return this.errors.some(e => e.type === 'WARNING');
    }

    /**
     * Format errors as a readable string for test output.
     */
    formatErrors(): string {
        if (this.errors.length === 0) {
            return 'No console errors captured.';
        }

        const lines: string[] = [
            '',
            '═══════════════════════════════════════════════════════════════════',
            '                    CONSOLE ERRORS DURING TEST                      ',
            '═══════════════════════════════════════════════════════════════════',
            ''
        ];

        this.errors.forEach((error, index) => {
            lines.push(`[${index + 1}] ${error.type} at ${error.timestamp.toISOString()}`);
            lines.push(`    Location: ${error.location}`);
            lines.push(`    Message: ${error.text}`);
            lines.push('');
        });

        lines.push('═══════════════════════════════════════════════════════════════════');
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Clear all captured errors.
     */
    clear(): void {
        this.errors = [];
    }
}

/**
 * Extended test fixtures with console error tracking.
 */
type TestFixtures = {
    consoleTracker: ConsoleErrorTracker;
};

/**
 * Extended test with automatic console error tracking.
 * When a test fails, console errors are automatically attached to the test report.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../utils/test-helpers';
 *
 * test('my test', async ({ page, consoleTracker }) => {
 *   // Test code...
 *   // Console errors are automatically shown on test failure
 * });
 * ```
 */
export const test = baseTest.extend<TestFixtures>({
    consoleTracker: async ({ page }, use, testInfo) => {
        const tracker = new ConsoleErrorTracker();
        tracker.attach(page);

        // Run the test
        await use(tracker);

        // After test: if failed, attach console errors to report
        if (testInfo.status !== testInfo.expectedStatus) {
            const errors = tracker.getErrors();
            if (errors.length > 0) {
                // Attach errors to test report as text
                await testInfo.attach('console-errors', {
                    body: tracker.formatErrors(),
                    contentType: 'text/plain'
                });

                // Also attach as JSON for programmatic access
                await testInfo.attach('console-errors-json', {
                    body: JSON.stringify(errors, null, 2),
                    contentType: 'application/json'
                });

                // Log to console for immediate visibility
                console.error(tracker.formatErrors());
            }
        }

        tracker.detach();
    }
});

/**
 * Re-export expect for convenience.
 */
export const expect = baseExpect;

/**
 * Helper function to wrap an async test body with console error checking.
 * Use this if you want to check for console errors during specific operations.
 *
 * @example
 * ```typescript
 * await withConsoleErrorCheck(page, async () => {
 *   await page.click('#submit');
 *   await page.waitForSelector('.success');
 * });
 * ```
 */
export async function withConsoleErrorCheck<T>(
    page: Page,
    operation: () => Promise<T>,
    options: { failOnError?: boolean; failOnWarning?: boolean } = {}
): Promise<{ result: T; errors: ConsoleError[] }> {
    const { failOnError = false, failOnWarning = false } = options;

    const tracker = new ConsoleErrorTracker();
    tracker.attach(page);

    try {
        const result = await operation();
        const errors = tracker.getErrors();

        if (failOnError && tracker.hasErrors()) {
            throw new Error(`Console errors occurred during operation:\n${tracker.formatErrors()}`);
        }

        if (failOnWarning && tracker.hasWarnings()) {
            throw new Error(`Console warnings occurred during operation:\n${tracker.formatErrors()}`);
        }

        return { result, errors };
    } finally {
        tracker.detach();
    }
}

/**
 * Assert that no console errors occurred.
 * Use at the end of a test to verify no JavaScript errors happened.
 *
 * @example
 * ```typescript
 * test('my test', async ({ page, consoleTracker }) => {
 *   // Test operations...
 *
 *   // At the end, verify no errors
 *   assertNoConsoleErrors(consoleTracker);
 * });
 * ```
 */
export function assertNoConsoleErrors(tracker: ConsoleErrorTracker, options: { allowWarnings?: boolean } = {}): void {
    const { allowWarnings = true } = options;

    const errors = tracker.getErrors();
    const relevantErrors = allowWarnings ? errors.filter(e => e.type === 'ERROR' || e.type === 'UNCAUGHT_EXCEPTION') : errors;

    if (relevantErrors.length > 0) {
        throw new Error(`Console errors occurred during test:\n${tracker.formatErrors()}`);
    }
}

/**
 * Filter console errors to exclude known/expected errors.
 * Useful when certain errors are expected in the application.
 *
 * @example
 * ```typescript
 * const errors = filterConsoleErrors(tracker.getErrors(), [
 *   /Failed to load resource/,
 *   /favicon.ico/
 * ]);
 * ```
 */
export function filterConsoleErrors(errors: ConsoleError[], excludePatterns: (string | RegExp)[]): ConsoleError[] {
    return errors.filter(error => {
        return !excludePatterns.some(pattern => {
            if (typeof pattern === 'string') {
                return error.text.includes(pattern);
            }
            return pattern.test(error.text);
        });
    });
}

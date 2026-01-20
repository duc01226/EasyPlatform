import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Playground Text Snippet App E2E tests.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
    use: {
        baseURL: 'http://localhost:4001',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'on-first-retry',
        actionTimeout: 10000,
        navigationTimeout: 30000
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ],
    webServer: {
        command: 'npx nx serve playground-text-snippet',
        url: 'http://localhost:4001',
        reuseExistingServer: !process.env.CI,
        timeout: 120000
    },
    /* Test timeout */
    timeout: 120000, // 2 minutes
    expect: {
        timeout: 10000
    }
});

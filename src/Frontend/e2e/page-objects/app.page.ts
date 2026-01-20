import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Main App Page Object - handles tab navigation and global elements
 */
export class AppPage extends BasePage {
    // Tab navigation
    readonly textSnippetsTab: Locator;
    readonly tasksTab: Locator;
    readonly tabGroup: Locator;

    // Global elements
    readonly appTitle: Locator;
    readonly loadingIndicator: Locator;
    readonly errorIndicator: Locator;

    constructor(page: Page) {
        super(page);
        this.tabGroup = page.locator('mat-tab-group.app__tabs');
        // Use more specific tab label selectors - Angular Material tabs
        this.textSnippetsTab = page.locator('.mat-mdc-tab').filter({ hasText: 'Text Snippets' });
        this.tasksTab = page.locator('.mat-mdc-tab').filter({ hasText: 'Task Management' });
        this.appTitle = page.locator('h1').first();
        this.loadingIndicator = page.locator('mat-spinner, .loading-indicator');
        this.errorIndicator = page.locator('.app__errors, platform-loading-error-indicator');
    }

    /**
     * Navigate to home page
     */
    async goToHome(): Promise<void> {
        await this.navigateTo('/');
    }

    /**
     * Navigate to Text Snippets tab
     */
    async goToTextSnippets(): Promise<void> {
        await this.textSnippetsTab.click();
        await this.waitForLoading();
    }

    /**
     * Navigate to Tasks tab
     */
    async goToTasks(): Promise<void> {
        await this.tasksTab.click();
        await this.waitForLoading();
    }

    /**
     * Check if Text Snippets tab is active
     */
    async isTextSnippetsTabActive(): Promise<boolean> {
        const ariaSelected = await this.textSnippetsTab.getAttribute('aria-selected');
        return ariaSelected === 'true';
    }

    /**
     * Check if Tasks tab is active
     */
    async isTasksTabActive(): Promise<boolean> {
        const ariaSelected = await this.tasksTab.getAttribute('aria-selected');
        return ariaSelected === 'true';
    }

    /**
     * Get current active tab name
     */
    async getActiveTabName(): Promise<string> {
        const activeTab = this.page.locator('[role="tab"][aria-selected="true"]');
        return (await activeTab.textContent()) ?? '';
    }

    /**
     * Check if app is loaded (tabs visible)
     */
    async isAppLoaded(): Promise<boolean> {
        await this.waitForPageLoad();
        // Wait for Angular to render the tab group (inside ngIf)
        try {
            await this.tabGroup.waitFor({ state: 'visible', timeout: 15000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if there's a global error
     */
    async hasGlobalError(): Promise<boolean> {
        return await this.errorIndicator.isVisible();
    }

    /**
     * Get global error message
     */
    async getGlobalErrorMessage(): Promise<string | null> {
        if (await this.hasGlobalError()) {
            return await this.errorIndicator.textContent();
        }
        return null;
    }
}

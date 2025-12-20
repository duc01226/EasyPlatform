import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export interface TextSnippetData {
    snippetText: string;
    fullText: string;
    category?: string;
    tags?: string[];
}

/**
 * Text Snippet Page Object - handles snippet CRUD and search operations
 */
export class TextSnippetPage extends BasePage {
    // List elements
    readonly snippetList: Locator;
    readonly snippetItems: Locator;
    readonly searchInput: Locator;
    readonly searchButton: Locator;
    readonly paginationInfo: Locator;

    // Detail/Form elements
    readonly detailPanel: Locator;
    readonly snippetTextField: Locator;
    readonly fullTextField: Locator;
    readonly categoryField: Locator;
    readonly tagsField: Locator;

    // Action buttons
    readonly createButton: Locator;
    readonly updateButton: Locator;
    readonly resetButton: Locator;

    // Status indicators
    readonly formModeIndicator: Locator;

    constructor(page: Page) {
        super(page);

        // List elements - using actual class names from app.component.html
        this.snippetList = page.locator('.app__text-snippet-items-grid table');
        this.snippetItems = page.locator('.app__text-snippet-items-grid-row');
        this.searchInput = page.locator('.app__search-input input');
        this.searchButton = page.locator('button:has(mat-icon:text("search"))');
        this.paginationInfo = page.locator('mat-paginator');

        // Detail panel elements - using actual names from app-text-snippet-detail component
        this.detailPanel = page.locator('.app__detail');
        this.snippetTextField = page.locator('input[name="snippetText"]');
        this.fullTextField = page.locator('textarea[name="fullText"]');
        this.categoryField = page.locator('mat-select[formcontrolname="categoryId"]');
        this.tagsField = page.locator('input[formcontrolname="tags"], mat-chip-grid');

        // Action buttons - using actual class names from app-text-snippet-detail
        this.createButton = page.locator('.text-snippet-detail__main-form-submit-btn:has-text("Create")');
        this.updateButton = page.locator('.text-snippet-detail__main-form-submit-btn:has-text("Update")');
        this.resetButton = page.locator('.text-snippet-detail__main-form-reset-btn');

        // Status
        this.formModeIndicator = page.locator('h2');
    }

    /**
     * Search for snippets
     */
    async searchSnippets(searchText: string): Promise<void> {
        await this.searchInput.fill(searchText);
        // Trigger search (may be debounced)
        await this.page.keyboard.press('Enter');
        await this.waitForLoading();
    }

    /**
     * Clear search
     */
    async clearSearch(): Promise<void> {
        await this.searchInput.clear();
        await this.page.keyboard.press('Enter');
        await this.waitForLoading();
    }

    /**
     * Get snippet count in list
     */
    async getSnippetCount(): Promise<number> {
        await this.waitForLoading();
        return await this.snippetItems.count();
    }

    /**
     * Get all snippet texts from list
     */
    async getSnippetList(): Promise<string[]> {
        await this.waitForLoading();
        const items = await this.snippetItems.all();
        const texts: string[] = [];
        for (const item of items) {
            texts.push((await item.textContent()) ?? '');
        }
        return texts;
    }

    /**
     * Select a snippet by index (0-based)
     */
    async selectSnippet(index: number): Promise<void> {
        await this.snippetItems.nth(index).click();
        await this.waitForLoading();
    }

    /**
     * Select snippet by text content
     */
    async selectSnippetByText(text: string): Promise<void> {
        await this.searchSnippets(text);
        await this.snippetItems.filter({ hasText: text }).first().click();
        await this.waitForLoading();
    }

    /**
     * Create a new snippet
     */
    async createSnippet(data: TextSnippetData): Promise<void> {
        // Fill form
        await this.snippetTextField.fill(data.snippetText);
        await this.snippetTextField.blur();
        await this.fullTextField.fill(data.fullText);
        await this.fullTextField.blur();

        if (data.category) {
            await this.categoryField.click();
            await this.page.locator(`mat-option:has-text("${data.category}")`).click();
        }

        // Click create button
        await this.createButton.click();
        await this.waitForLoading();
    }

    /**
     * Update current snippet
     */
    async updateSnippet(data: Partial<TextSnippetData>): Promise<void> {
        if (data.snippetText !== undefined) {
            await this.snippetTextField.fill(data.snippetText);
            await this.snippetTextField.blur();
        }
        if (data.fullText !== undefined) {
            await this.fullTextField.fill(data.fullText);
            await this.fullTextField.blur();
        }

        await this.updateButton.click();
        await this.waitForLoading();
    }

    /**
     * Reset form to create mode
     */
    async resetForm(): Promise<void> {
        await this.resetButton.click();
        await this.waitForLoading();
    }

    /**
     * Get current snippet text value
     */
    async getSnippetTextValue(): Promise<string> {
        return await this.snippetTextField.inputValue();
    }

    /**
     * Get current full text value
     */
    async getFullTextValue(): Promise<string> {
        return await this.fullTextField.inputValue();
    }

    /**
     * Check if form is in create mode
     */
    async isCreateMode(): Promise<boolean> {
        // Create button visible and enabled
        return await this.createButton.isVisible();
    }

    /**
     * Check if form is in update mode
     */
    async isUpdateMode(): Promise<boolean> {
        return await this.updateButton.isVisible();
    }

    /**
     * Check if search input is visible
     */
    async isSearchVisible(): Promise<boolean> {
        return await this.searchInput.isVisible();
    }

    /**
     * Get validation error message for a field
     */
    async getFieldError(fieldName: string): Promise<string | null> {
        const errorLocator = this.page.locator(`mat-error:near([formcontrolname="${fieldName}"])`);
        if (await errorLocator.isVisible()) {
            return await errorLocator.textContent();
        }
        return null;
    }

    /**
     * Verify snippet appears in list
     */
    async verifySnippetInList(snippetText: string): Promise<boolean> {
        await this.searchSnippets(snippetText);

        const snippets = await this.getSnippetList();
        return snippets.some(s => s.includes(snippetText));
    }
}

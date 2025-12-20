import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { TaskPriority, TaskStatus } from './task-list.page';

export interface TaskFormData {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    startDate?: string;
    dueDate?: string;
    tags?: string[];
}

export interface SubTask {
    title: string;
    isCompleted?: boolean;
}

/**
 * Task Detail Page Object - handles task form and subtask operations
 */
export class TaskDetailPage extends BasePage {
    // Status display text mapping (API values to UI labels)
    private static readonly STATUS_DISPLAY_MAP: Record<string, string> = {
        Todo: 'To Do',
        InProgress: 'In Progress',
        Completed: 'Completed',
        Cancelled: 'Cancelled'
    };

    // Form fields
    readonly titleField: Locator;
    readonly descriptionField: Locator;
    readonly statusField: Locator;
    readonly priorityField: Locator;
    readonly startDateField: Locator;
    readonly dueDateField: Locator;
    readonly tagsField: Locator;

    // Subtasks
    readonly subtasksList: Locator;
    readonly subtaskItems: Locator;
    readonly addSubtaskButton: Locator;
    readonly subtaskTitleInput: Locator;
    readonly completionPercentage: Locator;

    // Action buttons
    readonly saveButton: Locator;
    readonly cancelButton: Locator;
    readonly deleteButton: Locator;
    readonly restoreButton: Locator;
    readonly backButton: Locator;

    // Status indicators
    readonly deletedBanner: Locator;
    readonly formErrors: Locator;
    readonly draftIndicator: Locator;

    constructor(page: Page) {
        super(page);

        // Form fields - using actual formcontrolname values from the template
        this.titleField = page.locator('input[formcontrolname="title"]');
        this.descriptionField = page.locator('textarea[formcontrolname="description"]');
        this.statusField = page.locator('mat-select[formcontrolname="taskStatus"]');
        this.priorityField = page.locator('mat-select[formcontrolname="priority"]');
        this.startDateField = page.locator('input[formcontrolname="startDate"]');
        this.dueDateField = page.locator('input[formcontrolname="dueDate"]');
        this.tagsField = page.locator('mat-chip-grid[formcontrolname="tags"], input[formcontrolname="tags"]');

        // Subtasks - using actual class names from template
        // Use parent section instead of list (list may be empty/hidden initially)
        this.subtasksList = page.locator('.task-detail__subtasks');
        this.subtaskItems = page.locator('.subtask-item');
        this.addSubtaskButton = page.locator('button:has-text("Add Subtask")');
        this.subtaskTitleInput = page.locator('.subtask-item__title input');
        this.completionPercentage = page.locator('.task-detail__subtasks-progress');

        // Action buttons - using actual button text from template
        this.saveButton = page.locator('button[type="submit"]');
        this.cancelButton = page.locator('button[mat-stroked-button]:has-text("Cancel")');
        // Delete button is in the task-list table row, target only the selected row
        // Use exact text match (:text-is) to avoid matching "delete_forever"
        this.deleteButton = page.locator('tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))');
        this.restoreButton = page.locator('button:has-text("Restore Task")');
        this.backButton = page.locator('button:has(mat-icon:text("arrow_back"))');

        // Status indicators - using actual class names from template
        this.deletedBanner = page.locator('.task-detail__deleted-banner');
        this.formErrors = page.locator('mat-error');
        this.draftIndicator = page.locator('.mode-badge--dirty');
    }

    /**
     * Helper to fill input field with proper Angular form change detection
     */
    private async fillInputWithAngular(locator: Locator, value: string): Promise<void> {
        await locator.click();
        await locator.clear();
        // Use fill() for speed, then verify with pressSequentially for Angular detection
        await locator.fill(value);
        // Wait for Angular to process
        await this.page.waitForTimeout(50);
        // Verify value was set correctly
        const currentValue = await locator.inputValue();
        if (currentValue !== value) {
            console.log(`fillInputWithAngular: Value mismatch, expected "${value}", got "${currentValue}". Retrying...`);
            await locator.clear();
            await locator.pressSequentially(value, { delay: 20 });
        }
        // Trigger blur to finalize the change for Angular
        await locator.blur();
    }

    /**
     * Fill task form with data
     */
    async fillTaskForm(data: TaskFormData): Promise<void> {
        console.log('fillTaskForm: Starting with data:', JSON.stringify(data));

        // Wait for form to be ready
        await this.page.waitForSelector('form.task-detail__form', { timeout: 5000 });
        console.log('fillTaskForm: Form ready');

        // Title (required) - use pressSequentially for proper Angular detection
        console.log('fillTaskForm: Setting title:', data.title);
        await this.fillInputWithAngular(this.titleField, data.title);

        // Description (optional)
        if (data.description !== undefined) {
            console.log('fillTaskForm: Setting description');
            await this.fillInputWithAngular(this.descriptionField, data.description);
        }

        // Status - Select using mat-select properly
        if (data.status !== undefined) {
            console.log('fillTaskForm: Setting status:', data.status);
            await this.statusField.click();
            // Wait for dropdown panel to appear
            await this.page.waitForSelector('.mat-mdc-select-panel', { state: 'visible', timeout: 3000 });
            const displayStatus = TaskDetailPage.STATUS_DISPLAY_MAP[data.status] || data.status;
            console.log('fillTaskForm: Clicking status option:', displayStatus);
            await this.page.locator(`mat-option:has-text("${displayStatus}")`).click();
            // Wait for panel to close
            await this.page.waitForSelector('.mat-mdc-select-panel', { state: 'hidden', timeout: 3000 }).catch(() => {});
            console.log('fillTaskForm: Status set');
        }

        // Priority - Select using mat-select properly
        if (data.priority !== undefined) {
            console.log('fillTaskForm: Setting priority:', data.priority);
            await this.priorityField.click();
            // Wait for dropdown panel to appear
            await this.page.waitForSelector('.mat-mdc-select-panel', { state: 'visible', timeout: 3000 });
            console.log('fillTaskForm: Clicking priority option:', data.priority);
            await this.page.locator(`mat-option:has-text("${data.priority}")`).click();
            // Wait for panel to close
            await this.page.waitForSelector('.mat-mdc-select-panel', { state: 'hidden', timeout: 3000 }).catch(() => {});
            console.log('fillTaskForm: Priority set');
        }

        // Start Date - set first and wait for Angular to process
        if (data.startDate !== undefined) {
            console.log('fillTaskForm: Setting start date:', data.startDate);
            await this.startDateField.fill(data.startDate);
            await this.startDateField.blur();
            // Wait for Angular form to validate
            await this.page.waitForTimeout(200);
            console.log('fillTaskForm: Start date set');
        }

        // Due Date - set after start date is fully registered
        if (data.dueDate !== undefined) {
            console.log('fillTaskForm: Setting due date:', data.dueDate);
            await this.dueDateField.fill(data.dueDate);
            await this.dueDateField.blur();
            // Wait for Angular form to validate
            await this.page.waitForTimeout(200);
            console.log('fillTaskForm: Due date set');
        }

        // Tags
        if (data.tags && data.tags.length > 0) {
            for (const tag of data.tags) {
                await this.tagsField.click();
                await this.tagsField.pressSequentially(tag, { delay: 10 });
                await this.page.keyboard.press('Enter');
            }
        }

        // Give Angular time to process form changes
        await this.page.waitForTimeout(300);
        console.log('fillTaskForm: Complete');
    }

    /**
     * Add a subtask
     */
    async addSubtask(title: string): Promise<void> {
        const countBefore = await this.subtaskItems.count();
        await this.addSubtaskButton.click();
        // Wait for Angular to add the new subtask item
        await this.page.waitForFunction(expectedCount => document.querySelectorAll('.subtask-item').length === expectedCount, countBefore + 1, {
            timeout: 5000
        });
        // Use formControlName="title" to specifically target the text input, not the checkbox
        const newSubtaskInput = this.subtaskItems.last().locator('input[formcontrolname="title"]');
        await newSubtaskInput.fill(title);
    }

    /**
     * Toggle subtask completion by index
     */
    async toggleSubtaskComplete(index: number): Promise<void> {
        const subtaskItem = this.subtaskItems.nth(index);
        // Use only mat-checkbox (not the internal input element inside it)
        const checkbox = subtaskItem.locator('mat-checkbox').first();
        await checkbox.click();
        // Wait for Angular to update the completion count
        await this.page.waitForTimeout(100);
    }

    /**
     * Get subtask count
     */
    async getSubtaskCount(): Promise<number> {
        return await this.subtaskItems.count();
    }

    /**
     * Get completion percentage
     * Text format is "X of Y completed"
     */
    async getCompletionPercentage(): Promise<number> {
        // Wait for progress element to be visible (only shown when subtasks exist)
        if (!(await this.completionPercentage.isVisible({ timeout: 1000 }).catch(() => false))) {
            return 0;
        }
        const text = (await this.completionPercentage.textContent()) ?? '0 of 0';
        // Parse "X of Y completed" format
        const match = text.match(/(\d+)\s+of\s+(\d+)/);
        if (match) {
            const completed = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            return total > 0 ? Math.round((completed / total) * 100) : 0;
        }
        return 0;
    }

    /**
     * Save the task and wait for confirmation
     */
    async saveTask(): Promise<void> {
        const buttonText = await this.saveButton.textContent();
        console.log('saveTask: Button text:', buttonText);

        const isCreate = buttonText?.includes('Create Task');
        console.log('saveTask: Is create mode:', isCreate);

        // Check for validation errors before clicking
        const errors = await this.formErrors.allTextContents();
        if (errors.length > 0) {
            console.log('saveTask: Form has validation errors:', errors);
        }

        // Check if button is disabled
        const isDisabled = await this.saveButton.isDisabled();
        console.log('saveTask: Button is disabled:', isDisabled);

        // Intercept API calls
        const responsePromise = this.page
            .waitForResponse(resp => resp.url().includes('/api/TaskItem') && resp.request().method() !== 'GET', { timeout: 10000 })
            .catch(() => null);

        await this.saveButton.click();
        console.log('saveTask: Clicked save button');

        // Wait for API response
        const response = await responsePromise;
        if (response) {
            console.log('saveTask: API response status:', response.status());
            const body = await response.json().catch(() => null);
            if (body) {
                console.log('saveTask: API response:', JSON.stringify(body).substring(0, 200));
            }
        } else {
            console.log('saveTask: No API call detected');
        }

        await this.waitForLoading();

        // If creating, wait for button to change to "Save Changes" (indicates save succeeded)
        if (isCreate) {
            await this.page
                .waitForFunction(
                    () => {
                        const btn = document.querySelector('button[type="submit"]');
                        return btn && btn.textContent?.includes('Save Changes');
                    },
                    { timeout: 10000 }
                )
                .catch(() => {
                    console.log('saveTask: Timeout waiting for button to change to Save Changes');
                });
        }

        // Give the task list time to reload (it auto-refreshes via store)
        await this.page.waitForTimeout(500);
        console.log('saveTask: Complete');
    }

    /**
     * Cancel and go back
     */
    async cancel(): Promise<void> {
        await this.cancelButton.click();
        await this.waitForLoading();
    }

    /**
     * Delete the task
     */
    async deleteTask(): Promise<void> {
        await this.deleteButton.click();

        // Confirm if dialog appears
        const confirmButton = this.page.locator(
            'mat-dialog-actions button:has-text("Confirm"), mat-dialog-actions button:has-text("Yes"), mat-dialog-actions button:has-text("Delete")'
        );
        if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await confirmButton.click();
        }
        await this.waitForLoading();
    }

    /**
     * Restore deleted task
     */
    async restoreTask(): Promise<void> {
        await this.restoreButton.click();
        await this.waitForLoading();
    }

    /**
     * Get form values
     */
    async getFormValues(): Promise<TaskFormData> {
        const title = await this.titleField.inputValue();
        const description = await this.descriptionField.inputValue();
        const status = await this.statusField.locator('.mat-mdc-select-value-text').textContent();
        const priority = await this.priorityField.locator('.mat-mdc-select-value-text').textContent();

        return {
            title,
            description,
            status: (status?.trim() as TaskStatus) || undefined,
            priority: (priority?.trim() as TaskPriority) || undefined
        };
    }

    /**
     * Get all validation errors
     */
    async getValidationErrors(): Promise<string[]> {
        const errors = await this.formErrors.allTextContents();
        return errors.filter(e => e.trim().length > 0);
    }

    /**
     * Check if form has errors
     */
    async hasValidationErrors(): Promise<boolean> {
        return (await this.getValidationErrors()).length > 0;
    }

    /**
     * Check if task is deleted (shows deleted banner)
     * Waits for the deleted banner to appear before checking
     */
    async isTaskDeleted(): Promise<boolean> {
        // Wait for the banner to potentially appear (up to 5 seconds)
        try {
            await this.deletedBanner.waitFor({ state: 'visible', timeout: 5000 });
            return true;
        } catch {
            // Banner didn't appear within timeout
            return false;
        }
    }

    /**
     * Check if restore button is visible
     * Waits for the restore button to appear before checking
     */
    async canRestore(): Promise<boolean> {
        // Wait for the restore button to potentially appear (up to 5 seconds)
        try {
            await this.restoreButton.waitFor({ state: 'visible', timeout: 5000 });
            return true;
        } catch {
            // Restore button didn't appear within timeout
            return false;
        }
    }

    /**
     * Check if draft indicator is visible
     */
    async hasDraft(): Promise<boolean> {
        return await this.draftIndicator.isVisible();
    }

    /**
     * Get field validation error
     */
    async getFieldError(fieldName: string): Promise<string | null> {
        const fieldContainer = this.page.locator(`[formcontrolname="${fieldName}"]`).locator('..');
        const error = fieldContainer.locator('mat-error');
        if (await error.isVisible()) {
            return await error.textContent();
        }
        return null;
    }

    /**
     * Select status
     */
    async selectStatus(status: string): Promise<void> {
        await this.statusField.click();
        // Map display text to match actual options
        const statusMap: Record<string, string> = {
            Todo: 'To Do',
            InProgress: 'In Progress',
            Completed: 'Completed',
            Cancelled: 'Cancelled'
        };
        const displayStatus = statusMap[status] || status;
        await this.page.locator(`mat-option:has-text("${displayStatus}")`).click();
    }

    /**
     * Select priority
     */
    async selectPriority(priority: TaskPriority): Promise<void> {
        await this.priorityField.click();
        await this.page.locator(`mat-option:has-text("${priority}")`).click();
    }

    /**
     * Remove subtask by index
     */
    async removeSubtask(index: number): Promise<void> {
        const countBefore = await this.subtaskItems.count();
        const subtaskItem = this.subtaskItems.nth(index);
        // Use mat-icon-button with color="warn" which is unique to delete button
        const removeButton = subtaskItem.locator('button[mat-icon-button][color="warn"]');
        await removeButton.click();
        // Wait for Angular to remove the subtask item
        await this.page.waitForFunction(expectedCount => document.querySelectorAll('.subtask-item').length === expectedCount, countBefore - 1, {
            timeout: 5000
        });
    }
}

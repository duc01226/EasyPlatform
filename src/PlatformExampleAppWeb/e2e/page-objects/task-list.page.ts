import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export interface TaskStatistics {
    total: number;
    active: number;
    completed: number;
    overdue: number;
}

export type TaskStatus = 'Todo' | 'InProgress' | 'Completed' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

/**
 * Task List Page Object - handles task list, filtering, and statistics
 */
export class TaskListPage extends BasePage {
    // Statistics cards
    readonly statsContainer: Locator;
    readonly totalStatsCard: Locator;
    readonly activeStatsCard: Locator;
    readonly completedStatsCard: Locator;
    readonly overdueStatsCard: Locator;

    // Filter chips
    readonly filterContainer: Locator;
    readonly statusFilterChips: Locator;
    readonly priorityFilterChips: Locator;
    readonly overdueFilterChip: Locator;
    readonly dueSoonFilterChip: Locator;
    readonly includeDeletedToggle: Locator;

    // Search
    readonly searchInput: Locator;
    readonly tagsFilterInput: Locator;

    // Task list
    readonly taskList: Locator;
    readonly taskItems: Locator;
    readonly emptyState: Locator;

    // Action buttons
    readonly newTaskButton: Locator;
    readonly refreshButton: Locator;

    // Pagination
    readonly paginator: Locator;

    constructor(page: Page) {
        super(page);

        // Statistics - using actual class names from the template
        this.statsContainer = page.locator('.task-list__statistics');
        this.totalStatsCard = page.locator('.stat-card:has-text("Total Tasks")');
        this.activeStatsCard = page.locator('.stat-card--active');
        this.completedStatsCard = page.locator('.stat-card--completed');
        this.overdueStatsCard = page.locator('.stat-card--overdue');

        // Filters
        this.filterContainer = page.locator('.task-list__filters');
        this.statusFilterChips = page.locator('mat-chip-listbox[aria-label="Status filter"] mat-chip-option');
        this.priorityFilterChips = page.locator('mat-chip-listbox[aria-label="Priority filter"] mat-chip-option');
        this.overdueFilterChip = page.locator('mat-button-toggle:has-text("Overdue")');
        this.dueSoonFilterChip = page.locator('mat-button-toggle:has-text("Due Soon")');
        this.includeDeletedToggle = page.locator('mat-button-toggle:has-text("Include Deleted")');

        // Search - using placeholder for reliable selection
        this.searchInput = page.getByPlaceholder('Search by title or description...');
        this.tagsFilterInput = page.locator('input[placeholder*="tag" i]');

        // Task list - using mat-table rows
        this.taskList = page.locator('.task-list__table');
        this.taskItems = page.locator('.task-list__table tr.mat-mdc-row');
        this.emptyState = page.locator('.no-data-row');

        // Actions - using actual button text
        this.newTaskButton = page.locator('button:has-text("New Task")');
        this.refreshButton = page.locator('.task-list__actions button:has(mat-icon:text("refresh"))');

        // Pagination
        this.paginator = page.locator('mat-paginator');
    }

    /**
     * Get statistics values
     */
    async getStatistics(): Promise<TaskStatistics> {
        await this.waitForLoading();

        const extractNumber = async (locator: Locator): Promise<number> => {
            const text = (await locator.textContent()) ?? '0';
            const match = text.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        };

        return {
            total: await extractNumber(this.totalStatsCard),
            active: await extractNumber(this.activeStatsCard),
            completed: await extractNumber(this.completedStatsCard),
            overdue: await extractNumber(this.overdueStatsCard)
        };
    }

    // Status display text mapping (API values to UI labels)
    private static readonly STATUS_DISPLAY_MAP: Record<string, string> = {
        Todo: 'To Do',
        InProgress: 'In Progress',
        Completed: 'Completed',
        Cancelled: 'Cancelled'
    };

    /**
     * Filter by status
     */
    async filterByStatus(status: TaskStatus): Promise<void> {
        const displayText = TaskListPage.STATUS_DISPLAY_MAP[status] || status;
        const statusFilter = this.page.getByRole('listbox', { name: 'Status filter' });
        const option = statusFilter.getByRole('option', { name: displayText });
        await option.click();
        await this.waitForLoading();
    }

    /**
     * Filter by priority
     */
    async filterByPriority(priority: TaskPriority): Promise<void> {
        const priorityFilter = this.page.getByRole('listbox', { name: 'Priority filter' });
        const option = priorityFilter.getByRole('option', { name: priority });
        await option.click();
        await this.waitForLoading();
    }

    /**
     * Toggle overdue only filter
     */
    async toggleOverdueOnly(): Promise<void> {
        await this.overdueFilterChip.click();
        await this.waitForLoading();
    }

    /**
     * Toggle include deleted filter
     */
    async toggleIncludeDeleted(): Promise<void> {
        await this.includeDeletedToggle.click();
        await this.waitForLoading();
    }

    /**
     * Search tasks
     * The Angular store uses throttleTime(500) which emits on leading edge.
     * We wait for the actual API response to ensure results are loaded.
     */
    async searchTasks(searchText: string): Promise<void> {
        // Clear the input first and wait for throttle window to expire
        await this.searchInput.click();
        await this.searchInput.fill('');
        await this.page.waitForTimeout(600); // Wait for throttle to expire

        // Set up response waiter before triggering search
        const responsePromise = this.page
            .waitForResponse(resp => resp.url().includes('/api/TaskItem/list') && resp.status() === 200, { timeout: 15000 })
            .catch(() => null);

        // Type the full text using keyboard for proper Angular detection
        await this.searchInput.pressSequentially(searchText, { delay: 20 });

        // Wait for the API response
        await responsePromise;

        // Give Angular time to update the DOM
        await this.page.waitForTimeout(300);
        await this.waitForLoading();
    }

    /**
     * Clear all filters
     */
    async clearFilters(): Promise<void> {
        // Click any active chips to deselect
        const activeChips = this.page.locator('mat-chip-option[aria-selected="true"]');
        const count = await activeChips.count();
        for (let i = 0; i < count; i++) {
            await activeChips.nth(i).click();
        }
        // Clear search input properly for Angular
        await this.searchInput.click();
        await this.searchInput.clear();
        await this.searchInput.blur();
        // Wait for throttleTime(500) + API call
        await this.page.waitForTimeout(700);
        await this.waitForLoading();
    }

    /**
     * Get task count
     */
    async getTaskCount(): Promise<number> {
        await this.waitForLoading();
        return await this.taskItems.count();
    }

    /**
     * Get task list items
     */
    async getTaskList(): Promise<string[]> {
        await this.waitForLoading();
        const items = await this.taskItems.all();
        const texts: string[] = [];
        for (const item of items) {
            texts.push((await item.textContent()) ?? '');
        }
        return texts;
    }

    /**
     * Select task by index
     */
    async selectTask(index: number): Promise<void> {
        await this.taskItems.nth(index).click();
        await this.waitForLoading();
    }

    /**
     * Select task by title - uses API to get task ID, then finds and clicks in UI
     * Uses multiple strategies to locate the task in the UI
     * @param title - Task title to find
     * @param includeDeleted - Whether to include deleted tasks in the search (default: false)
     */
    async selectTaskByTitle(title: string, includeDeleted: boolean = false): Promise<void> {
        console.log('selectTaskByTitle: Finding task:', title, 'includeDeleted:', includeDeleted);

        // Get task from API to verify it exists
        const response = await this.page.request.get('http://localhost:5001/api/TaskItem/list', {
            params: {
                maxResultCount: '500',
                skipCount: '0',
                includeDeleted: includeDeleted ? 'true' : 'false'
            }
        });
        const data = await response.json();
        const items = data.items || [];
        const task = items.find((t: any) => t.title === title);

        if (!task) {
            throw new Error(`Task not found in API with title: ${title}`);
        }
        console.log('selectTaskByTitle: Found task via API, id:', task.id, 'status:', task.taskStatus);

        // Strategy 1: Refresh list and try direct row click using cell text
        await this.refreshList();
        await this.page.waitForTimeout(500);

        // Use a more specific selector - look for the title cell content
        let taskRow = this.page.locator(`tr.mat-mdc-row:has(td:has-text("${title}"))`);
        let isVisible = await taskRow
            .first()
            .isVisible({ timeout: 1000 })
            .catch(() => false);
        console.log('selectTaskByTitle: After refresh, task visible:', isVisible);

        if (!isVisible) {
            // Strategy 2: Go to first page and set max page size
            console.log('selectTaskByTitle: Setting max page size and going to page 1...');

            // First, go to first page
            const firstPageBtn = this.page.locator('button[aria-label="First page"]');
            if ((await firstPageBtn.isVisible()) && !(await firstPageBtn.isDisabled())) {
                await firstPageBtn.click();
                await this.waitForLoading();
                console.log('selectTaskByTitle: Navigated to first page');
            }

            // Set maximum page size
            const pageSizeSelect = this.paginator.locator('.mat-mdc-paginator-page-size-select');
            if (await pageSizeSelect.isVisible()) {
                await pageSizeSelect.click();
                await this.page.waitForTimeout(200);

                // Select highest option (usually 100 or 50)
                const options = this.page.locator('.mat-mdc-option');
                const optionTexts = await options.allTextContents();
                console.log('selectTaskByTitle: Page size options:', optionTexts);

                if (optionTexts.length > 0) {
                    await options.last().click();
                    await this.waitForLoading();
                    await this.page.waitForTimeout(500);
                }
            }

            // Check again after page size change
            taskRow = this.page.locator(`tr.mat-mdc-row:has(td:has-text("${title}"))`);
            isVisible = await taskRow
                .first()
                .isVisible({ timeout: 2000 })
                .catch(() => false);
            console.log('selectTaskByTitle: After max page size, task visible:', isVisible);
        }

        if (!isVisible) {
            // Strategy 3: Paginate through ALL pages from the beginning
            console.log('selectTaskByTitle: Paginating through all pages from start...');

            // Go to first page again - use a more reliable method
            const firstPageBtn = this.page.locator('button[aria-label="First page"]');
            if ((await firstPageBtn.isVisible()) && !(await firstPageBtn.isDisabled())) {
                // Wait for response when clicking first page
                const firstPageResponse = this.page.waitForResponse(resp => resp.url().includes('/api/TaskItem/list'), { timeout: 10000 }).catch(() => null);
                await firstPageBtn.click();
                await firstPageResponse;
                await this.page.waitForTimeout(500);
                await this.waitForLoading();
            }

            // Get total count from paginator
            const paginatorLabel = await this.paginator.locator('.mat-mdc-paginator-range-label').textContent();
            console.log('selectTaskByTitle: Paginator range:', paginatorLabel);

            // Track previous titles to detect if page actually changed
            let previousFirstTitle = '';

            // Check each page
            let pageNum = 1;
            while (true) {
                // Get all visible row titles for debugging
                const rowTitles = await this.page.locator('tr.mat-mdc-row td:nth-child(3)').allTextContents();
                const currentFirstTitle = rowTitles[0] || '';

                // Detect if page actually changed
                if (pageNum > 1 && currentFirstTitle === previousFirstTitle) {
                    console.log('selectTaskByTitle: Page content unchanged, pagination may not be working');
                }
                previousFirstTitle = currentFirstTitle;

                console.log(`selectTaskByTitle: Page ${pageNum}, rows: ${rowTitles.length}, first title: "${currentFirstTitle.substring(0, 30)}..."`);

                // Check if task is on this page - use exact match in case hasText is too loose
                for (const rowTitle of rowTitles) {
                    if (rowTitle.trim() === title) {
                        console.log('selectTaskByTitle: Found exact match on page', pageNum);
                        taskRow = this.page.locator(`tr.mat-mdc-row:has(td:text-is("${title}"))`);
                        isVisible = true;
                        break;
                    }
                }

                if (isVisible) break;

                // Try next page
                const nextButton = this.page.locator('button[aria-label="Next page"]');
                if (await nextButton.isDisabled()) {
                    console.log('selectTaskByTitle: Reached last page (', pageNum, ')');

                    // Last resort: Check ALL titles from API against what's in the UI
                    console.log('selectTaskByTitle: Checking if task is missing from UI list...');
                    const allUiTitles = await this.page.locator('tr.mat-mdc-row td:nth-child(3)').allTextContents();
                    const taskInUi = allUiTitles.some(t => t.trim() === title);
                    console.log('selectTaskByTitle: Task found in current UI titles:', taskInUi);

                    break;
                }

                // Click next page and WAIT for API response
                const nextPageResponse = this.page.waitForResponse(resp => resp.url().includes('/api/TaskItem/list'), { timeout: 10000 }).catch(() => null);

                await nextButton.click();
                await nextPageResponse;
                await this.page.waitForTimeout(300);
                await this.waitForLoading();

                pageNum++;

                if (pageNum > 30) {
                    console.log('selectTaskByTitle: Exceeded max pages');
                    break;
                }
            }
        }

        if (isVisible) {
            await taskRow.first().click();
            await this.waitForLoading();
            await this.page.waitForSelector('form.task-detail__form', { timeout: 5000 });

            // Wait for the form to actually show the selected task's title
            // This ensures Angular has finished updating the form with the new task data
            console.log('selectTaskByTitle: Waiting for form to show task title...');
            await this.page.waitForFunction(
                expectedTitle => {
                    const titleInput = document.querySelector('input[formcontrolname="title"]') as HTMLInputElement;
                    return titleInput && titleInput.value === expectedTitle;
                },
                title,
                { timeout: 5000 }
            );
            console.log('selectTaskByTitle: Complete - task selected and form updated');
        } else {
            // Final debug: list all task titles from the last page
            const allTitles = await this.page.locator('tr.mat-mdc-row td:nth-child(3)').allTextContents();
            console.log('selectTaskByTitle: All visible titles on last page:', allTitles);

            throw new Error(`Task exists in API (${task.id}) but not found in UI: ${title}`);
        }
    }

    /**
     * Refresh the task list
     */
    async refreshList(): Promise<void> {
        await this.refreshButton.click();
        await this.waitForLoading();
    }

    /**
     * Delete task by index
     */
    async deleteTask(index: number): Promise<void> {
        const taskItem = this.taskItems.nth(index);
        const deleteButton = taskItem.locator('button:has(mat-icon:text("delete")), button[aria-label*="delete" i]');
        await deleteButton.click();

        // Confirm deletion if dialog appears
        const confirmButton = this.page.locator(
            'mat-dialog-actions button:has-text("Confirm"), mat-dialog-actions button:has-text("Yes"), mat-dialog-actions button:has-text("Delete")'
        );
        if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await confirmButton.click();
        }
        await this.waitForLoading();
    }

    /**
     * Click new task button
     */
    async createNewTask(): Promise<void> {
        await this.newTaskButton.click();
        await this.waitForLoading();
    }

    /**
     * Check if empty state is visible
     */
    async isEmptyStateVisible(): Promise<boolean> {
        return await this.emptyState.isVisible();
    }

    /**
     * Check if task exists by verifying via API.
     * The backend sorting (Status → Priority → DueDate → CreatedDate) means
     * newly created tasks may not appear on the first page of UI results.
     * Using API verification is more reliable than UI search.
     * @param title - Task title to search for
     * @param includeDeleted - Whether to include deleted tasks in the search (default: false)
     */
    async taskExistsInList(title: string, includeDeleted: boolean = false): Promise<boolean> {
        // Extract unique part for full-text search (e.g., "TEST-1766212682958")
        const parts = title.split(' ');
        const uniquePart = parts.find(p => p.startsWith('TEST-')) || parts[parts.length - 1];

        console.log('taskExistsInList: Searching for title:', title, 'includeDeleted:', includeDeleted);
        console.log('Using search term:', uniquePart);

        // First, try to search by the unique part
        let response = await this.page.request.get('http://localhost:5001/api/TaskItem/list', {
            params: {
                searchText: uniquePart,
                maxResultCount: '200',
                skipCount: '0',
                includeDeleted: includeDeleted ? 'true' : 'false'
            }
        });

        if (!response.ok()) {
            console.log('API request failed:', response.status());
            return false;
        }

        let data = await response.json();
        let items = data.items || [];
        console.log('API search returned', items.length, 'items');

        console.log(
            'First 5 titles:',
            items.slice(0, 5).map((t: any) => t.title)
        );

        // Check if any task matches the exact title
        const found = items.some((t: any) => t.title === title);
        console.log('Exact match found:', found);

        return found;
    }

    /**
     * Get task status badge text
     */
    async getTaskStatus(index: number): Promise<string> {
        const taskItem = this.taskItems.nth(index);
        const statusBadge = taskItem.locator('.status-badge, [class*="status"]');
        return (await statusBadge.textContent()) ?? '';
    }

    /**
     * Get task priority badge
     */
    async getTaskPriority(index: number): Promise<string> {
        const taskItem = this.taskItems.nth(index);
        const priorityBadge = taskItem.locator('.priority-badge, [class*="priority"]');
        return (await priorityBadge.textContent()) ?? '';
    }
}

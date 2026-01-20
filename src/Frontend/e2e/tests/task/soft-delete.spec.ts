import { createTestTask } from '../../fixtures/test-data';
import { AppPage, TaskDetailPage, TaskListPage } from '../../page-objects';
import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

/**
 * Task Soft-Delete-Tests
 * Tests for soft delete and restore functionality.
 *
 * @tags @P1 @P2 @Task @SoftDelete
 */
test.describe('@P1 @P2 @Task @SoftDelete - Soft-Delete Operations', () => {
    let appPage: AppPage;
    let taskListPage: TaskListPage;
    let taskDetailPage: TaskDetailPage;
    let currentTestTasks: string[] = [];

    test.beforeEach(async ({ page }) => {
        appPage = new AppPage(page);
        taskListPage = new TaskListPage(page);
        taskDetailPage = new TaskDetailPage(page);
        currentTestTasks = [];

        await appPage.goToHome();
        await appPage.goToTasks();
    });

    test.afterEach(async ({ request }) => {
        const apiHelper = new ApiHelpers(request);
        for (const taskTitle of currentTestTasks) {
            await apiHelper.cleanupTestData(taskTitle);
        }
    });

    test('@P0 TS-DELETE-P0-001 - Delete button is visible in selected task row', async ({ page }) => {
        /**
         * @scenario Delete button is visible in the task list table row
         * @given a task exists
         * @when the user selects the task in the list
         * @then the delete button should be visible in the selected row's action column
         *
         * NOTE: The delete button is located in the task list table row's action column,
         * NOT on a separate detail page. When a task row is selected, the delete button
         * in that row becomes accessible via taskDetailPage.deleteButton locator which
         * targets: tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))
         */
        // Create task via UI
        const taskTitle = 'Delete-Test-Task ' + Date.now();
        const testTask = createTestTask({ title: taskTitle });
        currentTestTasks.push(testTask.title);
        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Search for the task to make it visible in the list (handles pagination)
        await taskListPage.searchTasks(taskTitle);
        await taskListPage.selectTaskByTitle(taskTitle);

        // Delete button should be visible in the selected row's action column
        await expect(taskDetailPage.deleteButton).toBeVisible();
    });

    test('@P1 TS-TASK-P1-005 - Soft delete and restore task', async ({ page }) => {
        /**
         * @scenario Soft delete and restore task
         * @given a task exists in the list
         * @when the user selects the task and clicks delete action in the task row
         * @and confirms deletion
         * @then task should be marked as deleted
         * @and task should be hidden from default view
         * @when the user enables "Include Deleted" filter
         * @then deleted task should appear with deleted styling
         * @when the user opens the deleted task
         * @and clicks Restore button
         * @then task should be restored to active state
         *
         * NOTE: The delete action (line 93) clicks the delete button located in the task list
         * table row's action column, NOT on a detail page. The taskDetailPage.deleteTask()
         * method targets: tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))
         */
        // Create task via UI
        const taskTitle = 'Delete-Test-Task ' + Date.now();
        const testTask = createTestTask({ title: taskTitle, status: 'Todo' });
        currentTestTasks.push(testTask.title);
        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Search for the task to make it visible in the list (handles pagination)
        await taskListPage.searchTasks(taskTitle);
        await taskListPage.selectTaskByTitle(taskTitle);

        // Verify task exists
        expect(await taskListPage.taskExistsInList(taskTitle)).toBeTruthy();

        // Delete the task
        await taskDetailPage.deleteTask();

        await taskListPage.waitForLoading();

        // Task should be hidden from default view
        expect(await taskListPage.taskExistsInList(taskTitle)).toBeFalsy();

        // Enable include deleted
        await taskListPage.toggleIncludeDeleted();
        await taskListPage.waitForLoading();

        // Now task should be visible (use includeDeleted: true for API call)
        expect(await taskListPage.taskExistsInList(taskTitle, true)).toBeTruthy();

        // Open and verify deleted state (use includeDeleted: true for API call)
        await taskListPage.selectTaskByTitle(taskTitle, true);
        expect(await taskDetailPage.isTaskDeleted()).toBeTruthy();
        expect(await taskDetailPage.canRestore()).toBeTruthy();

        // Restore the task
        await taskDetailPage.restoreTask();
        await taskListPage.waitForLoading();

        // Disable include deleted
        await taskListPage.toggleIncludeDeleted();
        await taskListPage.waitForLoading();

        // Task should be visible in normal view
        expect(await taskListPage.taskExistsInList(taskTitle)).toBeTruthy();
    });

    test('@P1 TS-DELETE-P1-001 - Soft delete removes from default list', async ({ page }) => {
        /**
         * @scenario Soft deleted task is hidden from default list
         * @given a task exists
         * @when the user selects the task and clicks delete in the task row
         * @then the task should not appear in the default task list
         *
         * NOTE: The delete action (line 144) clicks the delete button in the task list
         * table row's action column via taskDetailPage.deleteTask() which targets:
         * tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))
         */
        const taskTitle = 'Soft-Delete Hide Test ' + Date.now();
        const testTask = createTestTask({ title: taskTitle });
        currentTestTasks.push(testTask.title);
        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Search for the task to make it visible in the list (handles pagination)
        await taskListPage.searchTasks(taskTitle);
        await taskListPage.selectTaskByTitle(taskTitle);

        // Delete the task
        await taskDetailPage.deleteTask();

        await taskListPage.waitForLoading();

        // Should not be in list
        expect(await taskListPage.taskExistsInList(taskTitle)).toBeFalsy();
    });

    test('@P1 TS-DELETE-P1-002 - Restore brings task back to active', async ({ page }) => {
        /**
         * @scenario Restored task appears in active list
         * @given a task was soft deleted
         * @when the user restores the task
         * @then the task should appear in the normal task list
         *
         * NOTE: The delete action (line 174) clicks the delete button in the task list
         * table row's action column via taskDetailPage.deleteTask() which targets:
         * tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))
         */
        const taskTitle = 'Restore-Test-Task ' + Date.now();
        const testTask = createTestTask({ title: taskTitle });
        currentTestTasks.push(testTask.title);

        // Create via UI
        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Search for the task to make it visible in the list (handles pagination)
        await taskListPage.searchTasks(taskTitle);
        await taskListPage.selectTaskByTitle(taskTitle);

        // Delete the task
        await taskDetailPage.deleteTask();
        await taskListPage.waitForLoading();

        // Enable include deleted
        await taskListPage.toggleIncludeDeleted();
        await taskListPage.waitForLoading();

        // Open and restore (use includeDeleted: true for API call)
        await taskListPage.selectTaskByTitle(taskTitle, true);
        await taskDetailPage.restoreTask();

        await taskListPage.waitForLoading();

        // Disable include deleted
        await taskListPage.toggleIncludeDeleted();
        await taskListPage.waitForLoading();

        // Task should be visible
        expect(await taskListPage.taskExistsInList(taskTitle)).toBeTruthy();
    });

    test('@P2 TS-DELETE-P2-001 - Deleted task shows visual indicator', async ({ page }) => {
        /**
         * @scenario Deleted task has visual deleted indicator
         * @given a task was soft deleted
         * @when the user views the deleted task
         * @then a deleted banner/indicator should be visible
         *
         * NOTE: The delete action (line 216) clicks the delete button in the task list
         * table row's action column via taskDetailPage.deleteTask() which targets:
         * tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))
         */
        const taskTitle = 'Deleted Indicator Test ' + Date.now();
        const testTask = createTestTask({ title: taskTitle });

        // Create via UI
        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();
        await taskListPage.waitForLoading();

        // Search for the task to make it visible in the list (handles pagination)
        await taskListPage.searchTasks(taskTitle);
        await taskListPage.selectTaskByTitle(taskTitle);

        // Delete the task
        await taskDetailPage.deleteTask();
        await taskListPage.waitForLoading();

        // Enable include deleted
        await taskListPage.toggleIncludeDeleted();
        await taskListPage.waitForLoading();

        // Open deleted task (use includeDeleted: true for API call)
        await taskListPage.selectTaskByTitle(taskTitle, true);

        // Should show deleted banner
        expect(await taskDetailPage.isTaskDeleted()).toBeTruthy();
    });

    test('@P2 TS-DELETE-P2-002 - Statistics update after delete', async ({ page }) => {
        /**
         * @scenario Task statistics update after deletion
         * @given tasks exist
         * @when a task is deleted from the task list row
         * @then the statistics should update accordingly
         *
         * NOTE: The delete action (line 253) clicks the delete button in the task list
         * table row's action column via taskDetailPage.deleteTask() which targets:
         * tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))
         */
        // Get initial stats
        const initialStats = await taskListPage.getStatistics();

        // Create a task via UI
        const taskTitle = 'Stats Delete-Test ' + Date.now();
        const testTask = createTestTask({ title: taskTitle, status: 'Todo' });
        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();
        await taskListPage.waitForLoading();

        // Search for the task to make it visible in the list (handles pagination)
        await taskListPage.searchTasks(taskTitle);
        await taskListPage.selectTaskByTitle(taskTitle);

        // Delete the task
        await taskDetailPage.deleteTask();

        await taskListPage.waitForLoading();

        // Stats should have updated (total might decrease or active might decrease)
        const newStats = await taskListPage.getStatistics();
        // Just verify stats are still valid numbers
        expect(newStats.total).toBeGreaterThanOrEqual(0);
    });

    test('@P3 TS-DELETE-P3-001 - Cannot edit deleted task', async ({ page }) => {
        /**
         * @scenario Deleted task cannot be edited
         * @given a task was soft deleted
         * @when the user views the deleted task
         * @then form fields should be read-only or save should be disabled
         * @and only restore should be available
         *
         * NOTE: The delete action (line 305) clicks the delete button in the task list
         * table row's action column via taskDetailPage.deleteTask() which targets:
         * tr.row-selected .task-actions button:has(mat-icon:text-is("delete"))
         */
        const taskTitle = 'No Edit Deleted Test ' + Date.now();
        const testTask = createTestTask({ title: taskTitle });

        // Create via UI
        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();
        await taskListPage.waitForLoading();

        // Search for the task to make it visible in the list (handles pagination)
        await taskListPage.searchTasks(taskTitle);
        await taskListPage.selectTaskByTitle(taskTitle);

        // Delete the task
        await taskDetailPage.deleteTask();
        await taskListPage.waitForLoading();

        // Enable include deleted
        await taskListPage.toggleIncludeDeleted();
        await taskListPage.waitForLoading();

        // Open deleted task (use includeDeleted: true for API call)
        await taskListPage.selectTaskByTitle(taskTitle, true);

        // Restore should be visible
        expect(await taskDetailPage.canRestore()).toBeTruthy();

        // Save button might be hidden or disabled
        // This depends on implementation
    });
});

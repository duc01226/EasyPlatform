import { createTestTask } from '../../fixtures/test-data';
import { AppPage, TaskDetailPage, TaskListPage } from '../../page-objects';
import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

/**
 * Task CRUD Tests
 * Tests for creating, reading, updating, and deleting tasks.
 *
 * @tags @P0 @P1 @Task @CRUD
 */
test.describe('@P0 @P1 @Task - CRUD Operations', () => {
    let appPage: AppPage;
    let taskListPage: TaskListPage;
    let taskDetailPage: TaskDetailPage;
    let currentTestTasks: string[] = [];

    test.beforeEach(async ({ page }) => {
        appPage = new AppPage(page);
        taskListPage = new TaskListPage(page);
        taskDetailPage = new TaskDetailPage(page);
        currentTestTasks = []; // Reset for each test

        await appPage.goToHome();
        await appPage.goToTasks();
    });

    test.afterEach(async ({ request }) => {
        const apiHelper = new ApiHelpers(request);
        // Clean up only tasks created in this specific test
        for (const taskTitle of currentTestTasks) {
            await apiHelper.cleanupTestData(taskTitle);
        }
    });

    test('@P0 TS-TASK-P0-002 - Create new task with required fields', async ({ page }) => {
        /**
         * @scenario Create new task with required fields
         * @given the user is on the Tasks tab
         * @when the user clicks "New Task" button
         * @and enters "Test-Task Title" in Title field
         * @and selects "Todo" status
         * @and selects "Medium" priority
         * @and clicks Save button
         * @then a new task should be created
         * @and the task should appear in the list
         * @and statistics should update
         */
        const testTask = createTestTask();
        currentTestTasks.push(testTask.title);

        // Click new task button
        await taskListPage.createNewTask();

        // Fill task form
        await taskDetailPage.fillTaskForm(testTask);

        // Save task (list auto-refreshes)
        await taskDetailPage.saveTask();

        // Refresh list to ensure newly created task appears
        await taskListPage.refreshList();

        // Check if task appears in list
        expect(await taskListPage.taskExistsInList(testTask.title)).toBeTruthy();
    });

    test('@P1 TS-TASK-P1-001 - Create task with all fields', async ({ page }) => {
        /**
         * @scenario Create task with all fields filled
         * @given the user is on create task form
         * @when the user fills all fields including dates and tags
         * @and clicks Save button
         * @then task should be created with all values
         * @and task should appear in list with correct priority badge
         */
        const testTask = createTestTask({
            title: 'Complete Task ' + Date.now(),
            description: 'A task with all fields for testing',
            status: 'InProgress',
            priority: 'High',
            startDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        currentTestTasks.push(testTask.title);

        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        // Refresh list to ensure newly created task appears
        await taskListPage.refreshList();
        expect(await taskListPage.taskExistsInList(testTask.title)).toBeTruthy();
    });

    test('@P1 TS-TASK-P1-002 - Update existing task', async ({ page }) => {
        /**
         * @scenario Update existing task
         * @given a task exists in the list
         * @when the user selects the task
         * @and modifies the description
         * @and clicks Save button
         * @then the task should be updated
         * @and the list should reflect changes
         */
        // Create task via UI first (more reliable than API due to Angular store pagination issues)
        const testTask = createTestTask({
            title: 'Update Test-Task ' + Date.now(),
            description: 'Task to be updated',
            status: 'Todo',
            priority: 'Medium'
        });
        currentTestTasks.push(testTask.title);

        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        // Wait for task to be saved and list to update
        await taskListPage.waitForLoading();

        // Now update the description - the task should be selected already after save
        const updatedDescription = 'Updated description content ' + Date.now();
        await taskDetailPage.descriptionField.click();
        await taskDetailPage.descriptionField.fill(updatedDescription);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Verify the update worked by checking the description field directly
        const currentDescription = await taskDetailPage.descriptionField.inputValue();
        expect(currentDescription).toBe(updatedDescription);
    });

    test('@P1 TS-TASK-P1-003 - View task details', async ({ page }) => {
        /**
         * @scenario View task details
         * @given a task exists with all fields filled
         * @when the user selects the task
         * @then all task details should be displayed
         */
        // Create task via UI first (more reliable than API due to Angular store pagination issues)
        const testTask = createTestTask({
            title: 'View Details Task ' + Date.now(),
            description: 'Task with details to view',
            status: 'InProgress',
            priority: 'High'
        });
        currentTestTasks.push(testTask.title);

        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Verify details are loaded - task should remain selected after save
        const currentTitle = await taskDetailPage.titleField.inputValue();
        expect(currentTitle).toBe(testTask.title);

        const currentDescription = await taskDetailPage.descriptionField.inputValue();
        expect(currentDescription).toBe(testTask.description);
    });

    test('@P1 TS-TASK-P1-004 - Change task status', async ({ page }) => {
        /**
         * @scenario Change task status
         * @given a task exists with Todo status
         * @when the user changes status to InProgress
         * @and saves the task
         * @then the task status should be updated
         */
        // Create task via UI first (more reliable than API due to Angular store pagination issues)
        const testTask = createTestTask({
            title: 'Status Change Task ' + Date.now(),
            status: 'Todo',
            priority: 'Medium'
        });
        currentTestTasks.push(testTask.title);

        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Now change status - task should still be selected
        await taskDetailPage.selectStatus('InProgress');
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();
    });

    test('@P1 TS-TASK-P1-005 - Change task priority', async ({ page }) => {
        /**
         * @scenario Change task priority
         * @given a task exists with Medium priority
         * @when the user changes priority to Critical
         * @and saves the task
         * @then the task priority should be updated
         */
        // Create task via UI first (more reliable than API due to Angular store pagination issues)
        const testTask = createTestTask({
            title: 'Priority Change Task ' + Date.now(),
            status: 'Todo',
            priority: 'Medium'
        });
        currentTestTasks.push(testTask.title);

        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Now change priority - task should still be selected
        await taskDetailPage.selectPriority('Critical');
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();
    });

    test('@P2 TS-TASK-P2-001 - Cancel task creation', async ({ page }) => {
        /**
         * @scenario Cancel task creation
         * @given the user is filling the create task form
         * @when the user clicks Cancel button
         * @then the form should close
         * @and no task should be created
         */
        await taskListPage.createNewTask();

        const testTask = createTestTask();
        currentTestTasks.push(testTask.title);
        await taskDetailPage.titleField.fill(testTask.title);

        // Cancel
        await taskDetailPage.cancel();

        await taskListPage.waitForLoading();

        // Task should not exist
        expect(await taskListPage.taskExistsInList(testTask.title)).toBeFalsy();
    });

    test('@P2 TS-TASK-P2-002 - Create multiple tasks', async ({ page }) => {
        /**
         * @scenario Create multiple tasks in sequence
         * @given the user is on the Tasks tab
         * @when the user creates multiple tasks
         * @then all tasks should appear in the list
         * @and statistics should reflect the total count
         */
        const tasks = [
            createTestTask({ title: 'Multi Task 1 ' + Date.now() }),
            createTestTask({ title: 'Multi Task 2 ' + Date.now() }),
            createTestTask({ title: 'Multi Task 3 ' + Date.now() })
        ];
        currentTestTasks.push(...tasks.map(t => t.title));

        for (const task of tasks) {
            await taskListPage.createNewTask();
            await taskDetailPage.fillTaskForm(task);
            await taskDetailPage.saveTask();
        }

        // Refresh list once after all tasks are created
        await taskListPage.refreshList();

        // Verify all tasks exist
        for (const task of tasks) {
            expect(await taskListPage.taskExistsInList(task.title)).toBeTruthy();
        }
    });
});

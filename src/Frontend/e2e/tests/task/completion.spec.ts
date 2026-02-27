import { createTestTask } from '../../fixtures/test-data';
import { AppPage, TaskDetailPage, TaskListPage } from '../../page-objects';
import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

/**
 * Task Completion Tests
 * Tests for completing tasks and verifying status transitions.
 *
 * @tags @P1 @Task @Completion
 */
test.describe('@P1 @Task @Completion - Task Completion Operations', () => {
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

    test('TC-TSK-CMP-001: Complete task by changing status to Completed @P1', async ({ page }) => {
        /**
         * @scenario Complete a task by changing its status to Completed
         * @given a task exists with Todo status
         * @when the user selects the task
         * @and changes status to Completed
         * @and saves the task
         * @then the task status should be Completed
         * @and the completed statistics count should update
         */
        // Create task via UI
        const testTask = createTestTask({
            title: 'Complete-Task-Test ' + Date.now(),
            description: 'Task to be completed',
            status: 'Todo',
            priority: 'Medium'
        });
        currentTestTasks.push(testTask.title);

        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Change status to Completed
        await taskDetailPage.selectStatus('Completed');
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Verify task still exists in the list (completed tasks remain visible)
        expect(await taskListPage.taskExistsInList(testTask.title)).toBeTruthy();

        // Verify the status field shows "Completed"
        const formValues = await taskDetailPage.getFormValues();
        expect(formValues.status).toBe('Completed');
    });

    test('@P1 TS-COMPLETE-P1-001 - Complete task updates statistics', async ({ page }) => {
        /**
         * @scenario Completing a task updates the statistics cards
         * @given a task exists with InProgress status
         * @when the user changes status to Completed and saves
         * @then the Completed statistics card value should increase
         */
        // Get initial stats
        const initialStats = await taskListPage.getStatistics();

        // Create task via UI with InProgress status
        const testTask = createTestTask({
            title: 'Stats Complete-Test ' + Date.now(),
            description: 'Task for stats testing',
            status: 'InProgress',
            priority: 'Medium'
        });
        currentTestTasks.push(testTask.title);

        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Change to Completed
        await taskDetailPage.selectStatus('Completed');
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Get updated stats
        const updatedStats = await taskListPage.getStatistics();

        // Completed count should have increased
        expect(updatedStats.completed).toBeGreaterThan(initialStats.completed);
    });

    test('@P2 TS-COMPLETE-P2-001 - Complete task with subtasks', async ({ page }) => {
        /**
         * @scenario A task with subtasks can be marked as Completed
         * @given a task exists with subtasks (some incomplete)
         * @when the user changes status to Completed and saves
         * @then the task should be saved as Completed
         */
        const testTask = createTestTask({
            title: 'Complete-With-Subtasks ' + Date.now(),
            description: 'Task with subtasks to complete',
            status: 'InProgress',
            priority: 'High'
        });
        currentTestTasks.push(testTask.title);

        await taskListPage.createNewTask();
        await taskDetailPage.fillTaskForm(testTask);

        // Add subtasks
        await taskDetailPage.addSubtask('Subtask 1');
        await taskDetailPage.addSubtask('Subtask 2');

        // Complete one subtask
        await taskDetailPage.toggleSubtaskComplete(0);

        // Save first
        await taskDetailPage.saveTask();
        await taskListPage.waitForLoading();

        // Change status to Completed
        await taskDetailPage.selectStatus('Completed');
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Verify task exists
        expect(await taskListPage.taskExistsInList(testTask.title)).toBeTruthy();

        // Verify the status field shows "Completed"
        const formValues = await taskDetailPage.getFormValues();
        expect(formValues.status).toBe('Completed');
    });
});

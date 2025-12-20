import { createTestTask } from '../../fixtures/test-data';
import { AppPage, TaskDetailPage, TaskListPage } from '../../page-objects';
import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

/**
 * Task Subtasks Tests
 * Tests for subtask management within tasks.
 *
 * @tags @P1 @P2 @Task @SubTask
 */
test.describe('@P1 @P2 @Task @SubTask - Subtask Operations', () => {
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

    test('@P0 TS-SUBTASK-P0-001 - Subtask section is visible', async ({ page }) => {
        /**
         * @scenario Subtask section is visible in task detail
         * @given the user opens a task detail form
         * @then the subtasks section should be visible
         * @and the Add Subtask button should be available
         */
        await taskListPage.createNewTask();

        // Subtask section should exist
        await expect(taskDetailPage.subtasksList).toBeVisible();
        await expect(taskDetailPage.addSubtaskButton).toBeVisible();
    });

    test('@P1 TS-TASK-P1-004 - Add and complete subtasks', async ({ page }) => {
        /**
         * @scenario Add and complete subtasks
         * @given the user is editing a task
         * @when the user clicks "Add Subtask" button
         * @and enters subtask title "Review code"
         * @and adds another subtask "Write tests"
         * @and marks first subtask as complete
         * @then completion percentage should show 50%
         * @and completed subtask should have checkmark
         */
        await taskListPage.createNewTask();

        // Fill basic task info
        const testTask = createTestTask({ title: 'Subtask-Test-Task ' + Date.now() });
        currentTestTasks.push(testTask.title);
        await taskDetailPage.fillTaskForm(testTask);

        // Add subtasks
        await taskDetailPage.addSubtask('Review code');
        await taskDetailPage.addSubtask('Write tests');

        // Verify subtask count
        const subtaskCount = await taskDetailPage.getSubtaskCount();
        expect(subtaskCount).toBe(2);

        // Complete first subtask
        await taskDetailPage.toggleSubtaskComplete(0);

        // Verify completion percentage
        const percentage = await taskDetailPage.getCompletionPercentage();
        expect(percentage).toBe(50);
    });

    test('@P1 TS-SUBTASK-P1-001 - Add single subtask', async ({ page }) => {
        /**
         * @scenario Add a single subtask to a task
         * @given the user is on the task detail form
         * @when the user clicks Add Subtask button
         * @and enters a subtask title
         * @then the subtask should appear in the list
         */
        await taskListPage.createNewTask();

        const testTask = createTestTask({ title: 'Single Subtask-Test ' + Date.now() });
        currentTestTasks.push(testTask.title);
        await taskDetailPage.fillTaskForm(testTask);

        // Add a subtask
        await taskDetailPage.addSubtask('First subtask');

        const count = await taskDetailPage.getSubtaskCount();
        expect(count).toBe(1);
    });

    test('@P1 TS-SUBTASK-P1-002 - Toggle subtask completion', async ({ page }) => {
        /**
         * @scenario Toggle subtask completion status
         * @given a task has subtasks
         * @when the user toggles a subtask checkbox
         * @then the subtask should be marked as complete/incomplete
         * @and the completion percentage should update
         */
        await taskListPage.createNewTask();

        const testTask = createTestTask({ title: 'Toggle Subtask-Test ' + Date.now() });
        currentTestTasks.push(testTask.title);
        await taskDetailPage.fillTaskForm(testTask);

        // Add subtasks
        await taskDetailPage.addSubtask('Subtask 1');
        await taskDetailPage.addSubtask('Subtask 2');

        // Initially 0% complete
        let percentage = await taskDetailPage.getCompletionPercentage();
        expect(percentage).toBe(0);

        // Complete first subtask
        await taskDetailPage.toggleSubtaskComplete(0);
        percentage = await taskDetailPage.getCompletionPercentage();
        expect(percentage).toBe(50);

        // Complete second subtask
        await taskDetailPage.toggleSubtaskComplete(1);
        percentage = await taskDetailPage.getCompletionPercentage();
        expect(percentage).toBe(100);
    });

    test('@P2 TS-SUBTASK-P2-001 - Remove subtask', async ({ page }) => {
        /**
         * @scenario Remove a subtask
         * @given a task has subtasks
         * @when the user clicks remove on a subtask
         * @then the subtask should be removed
         * @and the count should decrease
         */
        await taskListPage.createNewTask();

        const testTask = createTestTask({ title: 'Remove Subtask-Test ' + Date.now() });
        currentTestTasks.push(testTask.title);
        await taskDetailPage.fillTaskForm(testTask);

        // Add subtasks
        await taskDetailPage.addSubtask('Subtask to keep');
        await taskDetailPage.addSubtask('Subtask to remove');

        expect(await taskDetailPage.getSubtaskCount()).toBe(2);

        // Remove second subtask
        await taskDetailPage.removeSubtask(1);

        expect(await taskDetailPage.getSubtaskCount()).toBe(1);
    });

    test('@P2 TS-SUBTASK-P2-002 - Subtasks persist after save', async ({ page }) => {
        /**
         * @scenario Subtasks are saved with the task
         * @given a task has subtasks
         * @when the user saves the task
         * @then the subtasks should still be present (task remains selected after save)
         */
        await taskListPage.createNewTask();

        const testTask = createTestTask({ title: 'Persist Subtask-Test ' + Date.now() });
        currentTestTasks.push(testTask.title);
        await taskDetailPage.fillTaskForm(testTask);

        // Add subtasks
        await taskDetailPage.addSubtask('Persistent subtask 1');
        await taskDetailPage.addSubtask('Persistent subtask 2');

        // Save the task
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // After save, task remains selected - verify subtasks are still there
        const count = await taskDetailPage.getSubtaskCount();
        expect(count).toBe(2);

        // Also verify task exists in API (uses API-based verification)
        const exists = await taskListPage.taskExistsInList(testTask.title);
        expect(exists).toBeTruthy();
    });

    test('@P3 TS-SUBTASK-P3-001 - Multiple subtasks completion tracking', async ({ page }) => {
        /**
         * @scenario Track completion of multiple subtasks
         * @given a task has 4 subtasks
         * @when the user completes them one by one
         * @then the completion percentage should update correctly (25%, 50%, 75%, 100%)
         */
        await taskListPage.createNewTask();

        const testTask = createTestTask({ title: 'Multi Subtask-Test ' + Date.now() });
        currentTestTasks.push(testTask.title);
        await taskDetailPage.fillTaskForm(testTask);

        // Add 4 subtasks
        const subtasks = ['Step 1', 'Step 2', 'Step 3', 'Step 4'];
        for (const subtask of subtasks) {
            await taskDetailPage.addSubtask(subtask);
        }

        expect(await taskDetailPage.getSubtaskCount()).toBe(4);

        // Complete each and verify percentage
        const expectedPercentages = [25, 50, 75, 100];
        for (let i = 0; i < 4; i++) {
            await taskDetailPage.toggleSubtaskComplete(i);
            const percentage = await taskDetailPage.getCompletionPercentage();
            expect(percentage).toBe(expectedPercentages[i]);
        }
    });
});

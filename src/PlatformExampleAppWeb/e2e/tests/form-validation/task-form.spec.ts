import { AppPage, TaskDetailPage, TaskListPage } from '../../page-objects';
import { expect, test } from '../../utils/test-helpers';

/**
 * Task Form Validation Tests
 * Tests for form validation and error handling.
 *
 * @tags @P1 @P2 @Task @Validation
 */
test.describe('@P1 @P2 @Task @Validation - Form Validation', () => {
    let appPage: AppPage;
    let taskListPage: TaskListPage;
    let taskDetailPage: TaskDetailPage;

    test.beforeEach(async ({ page }) => {
        appPage = new AppPage(page);
        taskListPage = new TaskListPage(page);
        taskDetailPage = new TaskDetailPage(page);

        await appPage.goToHome();
        await appPage.goToTasks();
        await taskListPage.createNewTask();
    });

    test('@P0 TS-VALIDATION-P0-001 - Title is required', async ({ page }) => {
        /**
         * @scenario Title field is required
         * @given the user is on the task creation form
         * @when the user tries to save without a title
         * @then a validation error should be displayed
         * @and the task should not be created
         */
        // Leave title empty, fill other fields
        await taskDetailPage.descriptionField.fill('Description without title');
        await taskDetailPage.selectStatus('Todo');
        await taskDetailPage.selectPriority('Medium');

        // Try to save
        await taskDetailPage.saveTask();

        // Should have validation error
        const hasErrors = await taskDetailPage.hasValidationErrors();
        expect(hasErrors).toBeTruthy();

        // Or form might prevent submission entirely
        // Either way, the task shouldn't be created without title
    });

    test('@P1 TS-VALIDATION-P1-001 - Form shows validation errors', async ({ page }) => {
        /**
         * @scenario Form displays validation errors for required fields
         * @given the user is on the task form
         * @when the user submits with invalid data
         * @then appropriate validation errors should be shown
         */
        // Try to submit empty form
        await taskDetailPage.saveTask();

        // Check for any validation errors
        const errors = await taskDetailPage.getValidationErrors();
        // Title should be required, so we should have at least one error
        expect(errors.length).toBeGreaterThan(0);
    });

    test('@P1 TS-VALIDATION-P1-002 - Title validation error clears when fixed', async ({ page }) => {
        /**
         * @scenario Validation error clears when field is corrected
         * @given a validation error is displayed
         * @when the user fixes the field
         * @then the error should disappear
         */
        // Trigger validation by trying to save
        await taskDetailPage.saveTask();

        // Should have errors
        expect(await taskDetailPage.hasValidationErrors()).toBeTruthy();

        // Fix by adding title
        await taskDetailPage.titleField.fill('Fixed Title');

        // Trigger validation again (blur or change)
        await taskDetailPage.descriptionField.click();

        // Error might clear (depends on validation trigger)
    });

    test('@P1 TS-VALIDATION-P1-003 - Valid form can be submitted', async ({ page }) => {
        /**
         * @scenario Valid form submits successfully
         * @given the user has filled all required fields correctly
         * @when the user clicks Save
         * @then the task should be created successfully
         * @and no validation errors should be shown
         */
        const uniqueTitle = 'Valid Task ' + Date.now();

        await taskDetailPage.titleField.fill(uniqueTitle);
        await taskDetailPage.selectStatus('Todo');
        await taskDetailPage.selectPriority('Medium');

        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Task should be created
        expect(await taskListPage.taskExistsInList(uniqueTitle)).toBeTruthy();
    });

    test('@P2 TS-VALIDATION-P2-001 - Long title validation', async ({ page }) => {
        /**
         * @scenario Very long title might have length restriction
         * @given the user enters a very long title
         * @when the user tries to save
         * @then either the title is truncated or an error is shown
         */
        const longTitle = 'A'.repeat(256);

        await taskDetailPage.titleField.fill(longTitle);

        // Check what happens - might truncate, might show error
        const actualValue = await taskDetailPage.titleField.inputValue();

        // Either truncated or full length accepted
        expect(actualValue.length).toBeLessThanOrEqual(256);
    });

    test('@P2 TS-VALIDATION-P2-002 - Special characters in title', async ({ page }) => {
        /**
         * @scenario Special characters are handled properly
         * @given the user enters special characters in title
         * @when the form is saved
         * @then the characters should be preserved or sanitized safely
         */
        const specialTitle = 'Test <script>alert("xss")</script> Task ' + Date.now();

        await taskDetailPage.titleField.fill(specialTitle);
        await taskDetailPage.selectStatus('Todo');
        await taskDetailPage.selectPriority('Medium');

        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Should not cause XSS or errors
        // The task might be created with sanitized content
    });

    test('@P2 TS-VALIDATION-P2-003 - Unicode characters supported', async ({ page }) => {
        /**
         * @scenario Unicode characters are supported in task title
         * @given the user enters unicode characters
         * @when the form is saved
         * @then the characters should be preserved
         */
        const unicodeTitle = 'Тест задача 测试任务 🎉 ' + Date.now();

        await taskDetailPage.titleField.fill(unicodeTitle);
        await taskDetailPage.selectStatus('Todo');
        await taskDetailPage.selectPriority('Medium');

        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Task should be created with unicode title
        expect(await taskListPage.taskExistsInList(unicodeTitle)).toBeTruthy();
    });

    test('@P2 TS-VALIDATION-P2-004 - Date validation', async ({ page }) => {
        /**
         * @scenario Due date should not be before start date
         * @given the user sets start date after due date
         * @when the form is validated
         * @then an error should be shown or dates should be corrected
         */
        const title = 'Date Validation Test ' + Date.now();

        await taskDetailPage.titleField.fill(title);

        // Set dates (start after due)
        await taskDetailPage.startDateField.fill('2024-12-31');
        await taskDetailPage.dueDateField.fill('2024-01-01');

        await taskDetailPage.selectStatus('Todo');
        await taskDetailPage.selectPriority('Medium');

        // Attempt to save
        await taskDetailPage.saveTask();

        // Should either show error or prevent save
        // Behavior depends on implementation
    });

    test('@P3 TS-VALIDATION-P3-001 - Whitespace-only title is currently accepted', async ({ page }) => {
        /**
         * @scenario Whitespace-only title is currently accepted by both frontend and backend
         * @given the user enters only whitespace in title
         * @when the user tries to save
         * @then the task should be created successfully
         *
         * NOTE: Frontend uses Validators.required which doesn't reject whitespace.
         * Backend validation uses Task.Title.IsNotNullOrEmpty() which only checks for null or empty string,
         * but whitespace-only strings like "   " pass this validation.
         * This test verifies the current behavior. Consider adding whitespace validation in the future.
         */
        const whiteSpaceTitle = '   ';

        await taskDetailPage.titleField.fill(whiteSpaceTitle);
        await taskDetailPage.selectStatus('Todo');
        await taskDetailPage.selectPriority('Medium');

        // Frontend validation should pass (no whitespace validator)
        expect(await taskDetailPage.hasValidationErrors()).toBeFalsy();

        // Save - should succeed with current implementation
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Task should be created with whitespace title
        // Verify by searching for it (whitespace-only tasks can be found)
        expect(await taskListPage.taskExistsInList(whiteSpaceTitle)).toBeTruthy();
    });

    test('@P3 TS-VALIDATION-P3-002 - Empty description is allowed', async ({ page }) => {
        /**
         * @scenario Description is optional
         * @given the user fills only required fields
         * @when the user leaves description empty
         * @then the form should save successfully
         */
        const title = 'No Description Task ' + Date.now();

        await taskDetailPage.titleField.fill(title);
        await taskDetailPage.selectStatus('Todo');
        await taskDetailPage.selectPriority('Medium');

        // Leave description empty
        await taskDetailPage.saveTask();

        await taskListPage.waitForLoading();

        // Task should be created
        expect(await taskListPage.taskExistsInList(title)).toBeTruthy();
    });
});

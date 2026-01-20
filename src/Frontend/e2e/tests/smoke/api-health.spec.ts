import { ApiHelpers } from '../../utils/api-helpers';
import { expect, test } from '../../utils/test-helpers';

/**
 * P0 Smoke Tests - API Health Check
 * These tests verify the backend API is running and accessible.
 *
 * @tags @P0 @Smoke @API
 */
test.describe('@P0 @Smoke @API - API Health Tests', () => {
    test('TS-API-P0-001 - Backend API is accessible', async ({ request }) => {
        /**
         * @scenario Backend API health check
         * @given the backend server is running on port 5001
         * @when a GET request is sent to /api/TextSnippet/search
         * @then the response status should be 200
         * @and the response should contain paged results
         */
        const apiHelper = new ApiHelpers(request);

        const isHealthy = await apiHelper.isApiHealthy();
        expect(isHealthy).toBeTruthy();
    });

    test('TS-API-P0-002 - TextSnippet API returns valid response', async ({ request }) => {
        /**
         * @scenario TextSnippet search API works
         * @given the API is running
         * @when a search request is made
         * @then the response should have valid structure
         */
        const apiHelper = new ApiHelpers(request);

        const response = await apiHelper.getTextSnippets();

        // Response should have expected structure
        expect(response).toHaveProperty('items');
        expect(response).toHaveProperty('totalCount');
        expect(Array.isArray(response.items)).toBeTruthy();
    });

    test('TS-API-P0-003 - TaskItem API returns valid response', async ({ request }) => {
        /**
         * @scenario TaskItem search API works
         * @given the API is running
         * @when a task search request is made
         * @then the response should have valid structure
         */
        const apiHelper = new ApiHelpers(request);

        const response = await apiHelper.getTasks();

        // Response should have expected structure
        expect(response).toHaveProperty('items');
        expect(response).toHaveProperty('totalCount');
        expect(Array.isArray(response.items)).toBeTruthy();
    });

    test('TS-API-P0-004 - TaskItem statistics API works', async ({ request }) => {
        /**
         * @scenario TaskItem statistics API returns valid data
         * @given the API is running
         * @when a statistics request is made
         * @then the response should contain statistics data
         */
        const apiHelper = new ApiHelpers(request);

        const response = await apiHelper.getTaskStatistics();

        // Response should have statistics properties
        expect(response).toHaveProperty('totalCount');
        expect(typeof response.totalCount).toBe('number');
    });
});

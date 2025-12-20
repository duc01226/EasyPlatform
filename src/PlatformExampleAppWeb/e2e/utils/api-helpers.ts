import { APIRequestContext } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5001/api';

/**
 * API helper functions for E2E tests
 */
export class ApiHelpers {
    private request: APIRequestContext;

    constructor(request: APIRequestContext) {
        this.request = request;
    }

    /**
     * Check if backend API is healthy
     */
    async isApiHealthy(): Promise<boolean> {
        try {
            const response = await this.request.get(`${API_BASE_URL}/TextSnippet/search`);
            return response.ok();
        } catch {
            return false;
        }
    }

    /**
     * Get text snippets from API
     */
    async getTextSnippets(searchText?: string, skip = 0, take = 10) {
        const params = new URLSearchParams({
            skipCount: skip.toString(),
            maxResultCount: take.toString()
        });
        if (searchText) {
            params.append('searchText', searchText);
        }

        const response = await this.request.get(`${API_BASE_URL}/TextSnippet/search?${params}`);
        return response.json();
    }

    /**
     * Create a text snippet via API
     */
    async createTextSnippet(data: { snippetText: string; fullText: string }) {
        const response = await this.request.post(`${API_BASE_URL}/TextSnippet/save`, {
            data: {
                data: {
                    snippetText: data.snippetText,
                    fullText: data.fullText
                }
            }
        });

        if (!response.ok()) {
            const errorText = await response.text();
            throw new Error(`Failed to create text snippet: ${response.status()} ${response.statusText()}\nResponse: ${errorText}`);
        }

        const json = await response.json();
        return json.savedData || json;
    }

    /**
     * Delete a text snippet via API
     */
    async deleteTextSnippet(id: string) {
        const response = await this.request.delete(`${API_BASE_URL}/TextSnippet/${id}`);
        return response.ok();
    }

    /**
     * Get tasks from API
     */
    async getTasks(params?: { statuses?: string[]; priorities?: string[]; searchText?: string; includeDeleted?: boolean }) {
        const queryParams = new URLSearchParams({
            skipCount: '0',
            maxResultCount: '1000'
        });

        if (params?.statuses) {
            params.statuses.forEach(s => queryParams.append('statuses', s));
        }
        if (params?.priorities) {
            params.priorities.forEach(p => queryParams.append('priorities', p));
        }
        if (params?.searchText) {
            queryParams.append('searchText', params.searchText);
        }
        if (params?.includeDeleted) {
            queryParams.append('includeDeleted', 'true');
        }

        const response = await this.request.get(`${API_BASE_URL}/TaskItem/list?${queryParams}`);
        return response.json();
    }

    /**
     * Create a task via API
     * Returns { data: TaskItemDataModel } for convenient access
     */
    async createTask(data: { title: string; description?: string; status?: string; priority?: string }) {
        const response = await this.request.post(`${API_BASE_URL}/TaskItem/save`, {
            data: {
                task: {
                    ...data,
                    taskStatus: data.status || 'Todo',
                    priority: data.priority || 'Medium'
                }
            }
        });
        const json = await response.json();
        // Normalize response: API returns { savedTask: {...} }, we return { data: {...} }
        return { data: json.savedTask, raw: json };
    }

    /**
     * Delete a task via API (soft delete)
     */
    async deleteTask(id: string) {
        const response = await this.request.post(`${API_BASE_URL}/TaskItem/delete`, {
            data: { taskId: id, permanentDelete: true }
        });
        return response.ok();
    }

    /**
     * Restore a deleted task via API
     */
    async restoreTask(id: string, taskData: any) {
        const response = await this.request.post(`${API_BASE_URL}/TaskItem/restore`, {
            data: { task: { ...taskData, id } }
        });
        return response.json();
    }

    /**
     * Get task statistics from API
     */
    async getTaskStatistics() {
        const response = await this.request.get(`${API_BASE_URL}/TaskItem/stats`);
        return response.json();
    }

    /**
     * Clean up test data created during tests
     */
    async cleanupTestData(testIdPrefix: string = 'TEST-') {
        // Get all snippets and delete test ones
        const snippets = await this.getTextSnippets(testIdPrefix, 0, 1000);
        if (snippets.items) {
            for (const snippet of snippets.items) {
                await this.deleteTextSnippet(snippet.id);
            }
        }

        // Get all tasks and delete test ones
        const tasks = await this.getTasks({ includeDeleted: true, searchText: testIdPrefix });
        if (tasks.items) {
            for (const task of tasks.items) {
                await this.deleteTask(task.id);
            }
        }
    }
}

/**
 * Wait for API to be available
 */
export async function waitForApi(request: APIRequestContext, maxWaitMs = 30000): Promise<boolean> {
    const helper = new ApiHelpers(request);
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        if (await helper.isApiHealthy()) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
}

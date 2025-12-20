import { TaskFormData } from '../page-objects/task-detail.page';
import { TextSnippetData } from '../page-objects/text-snippet.page';

/**
 * Test data fixtures for E2E tests
 */
export const TestData = {
    textSnippets: {
        basic: {
            snippetText: 'TEST-SNIPPET-001',
            fullText: 'This is a test snippet with full text content for E2E testing.'
        } as TextSnippetData,

        withCategory: {
            snippetText: 'CATEGORIZED-SNIPPET',
            fullText: 'A categorized snippet for testing category functionality.',
            category: 'General'
        } as TextSnippetData,

        forSearch: {
            snippetText: 'SEARCHABLE-ANGULAR',
            fullText: 'This snippet contains Angular framework content for full-text search testing.'
        } as TextSnippetData,

        updated: {
            snippetText: 'UPDATED-SNIPPET',
            fullText: 'Updated content after modification.'
        } as TextSnippetData
    },

    tasks: {
        basic: {
            title: 'Basic Test-Task',
            description: 'A simple test task for E2E testing',
            status: 'Todo',
            priority: 'Medium'
        } as TaskFormData,

        complete: {
            title: 'Complete Test-Task',
            description: 'A task with all fields filled for comprehensive testing',
            status: 'InProgress',
            priority: 'High',
            startDate: '2024-01-15',
            dueDate: '2024-01-30',
            tags: ['e2e', 'testing']
        } as TaskFormData,

        highPriority: {
            title: 'High Priority Task',
            description: 'An urgent task that needs immediate attention',
            status: 'Todo',
            priority: 'Critical'
        } as TaskFormData,

        lowPriority: {
            title: 'Low Priority Task',
            description: 'A task that can wait',
            status: 'Todo',
            priority: 'Low'
        } as TaskFormData,

        completed: {
            title: 'Completed Task',
            description: 'A task that has been completed',
            status: 'Completed',
            priority: 'Medium'
        } as TaskFormData,

        withSubtasks: {
            title: 'Task With Subtasks',
            description: 'A task that will have multiple subtasks',
            status: 'InProgress',
            priority: 'High'
        } as TaskFormData,

        overdue: {
            title: 'Overdue Task',
            description: 'A task with a past due date',
            status: 'Todo',
            priority: 'High',
            dueDate: '2024-01-01' // Past date
        } as TaskFormData
    },

    subtasks: {
        list: [
            { title: 'Review documentation', isCompleted: false },
            { title: 'Write unit tests', isCompleted: false },
            { title: 'Code review', isCompleted: true },
            { title: 'Deploy to staging', isCompleted: false }
        ]
    },

    search: {
        validTerms: ['angular', 'test', 'task'],
        noResultTerms: ['xyznonexistent123'],
        partialMatch: 'ang'
    },

    validation: {
        emptyTitle: '',
        longTitle: 'A'.repeat(256),
        specialCharacters: '<script>alert("xss")</script>',
        unicodeText: 'Тест задача 测试任务 🎉'
    }
};

/**
 * Generate unique test identifiers
 */
export function generateTestId(prefix: string = 'TEST'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Create test snippet with unique identifier
 */
export function createTestSnippet(overrides?: Partial<TextSnippetData>): TextSnippetData {
    return {
        snippetText: generateTestId('SNIPPET'),
        fullText: `Test snippet created at ${new Date().toISOString()}`,
        ...overrides
    };
}

/**
 * Create test task with unique identifier
 */
export function createTestTask(overrides?: Partial<TaskFormData>): TaskFormData {
    return {
        title: `Test-Task ${generateTestId()}`,
        description: `Created at ${new Date().toISOString()}`,
        status: 'Todo',
        priority: 'Medium',
        ...overrides
    };
}

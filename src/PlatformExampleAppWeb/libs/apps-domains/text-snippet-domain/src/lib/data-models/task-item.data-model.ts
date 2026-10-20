import { PlatformDataModel } from '@libs/platform-core';

/**
 * Task status enum matching backend TaskItemStatus.
 */
export enum TaskItemStatus {
    Todo = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}

/**
 * Task priority enum matching backend TaskItemPriority.
 */
export enum TaskItemPriority {
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

/**
 * Parse status value from API (handles both string and numeric values).
 * API uses JsonStringEnumConverter, so status comes as "Todo", "InProgress", etc.
 */
function parseTaskItemStatus(value: TaskItemStatus | string | undefined | null): TaskItemStatus {
    if (value === undefined || value === null) return TaskItemStatus.Todo;
    if (typeof value === 'number') return value;
    // Handle string enum values from API
    const statusMap: Record<string, TaskItemStatus> = {
        Todo: TaskItemStatus.Todo,
        InProgress: TaskItemStatus.InProgress,
        Completed: TaskItemStatus.Completed,
        Cancelled: TaskItemStatus.Cancelled
    };
    return statusMap[value] ?? TaskItemStatus.Todo;
}

/**
 * Parse priority value from API (handles both string and numeric values).
 * API uses JsonStringEnumConverter, so priority comes as "Low", "Medium", etc.
 */
function parseTaskItemPriority(value: TaskItemPriority | string | undefined | null): TaskItemPriority {
    if (value === undefined || value === null) return TaskItemPriority.Medium;
    if (typeof value === 'number') return value;
    // Handle string enum values from API
    const priorityMap: Record<string, TaskItemPriority> = {
        Low: TaskItemPriority.Low,
        Medium: TaskItemPriority.Medium,
        High: TaskItemPriority.High,
        Critical: TaskItemPriority.Critical
    };
    return priorityMap[value] ?? TaskItemPriority.Medium;
}

/**
 * Get property value handling both camelCase and PascalCase.
 * API is configured with useCamelCaseNaming: false, so it returns PascalCase property names.
 * This helper allows the frontend to work with both cases.
 */
function getProperty<T>(data: Record<string, unknown>, camelCaseName: string, pascalCaseName: string): T | undefined {
    return (data[camelCaseName] ?? data[pascalCaseName]) as T | undefined;
}

/**
 * Get boolean property with default value, handling both cases.
 */
function getBooleanProperty(data: Record<string, unknown>, camelCaseName: string, pascalCaseName: string, defaultValue: boolean): boolean {
    const value = getProperty<boolean>(data, camelCaseName, pascalCaseName);
    return value ?? defaultValue;
}

/**
 * Get date property handling both cases.
 */
function getDateProperty(data: Record<string, unknown>, camelCaseName: string, pascalCaseName: string): Date | null {
    const value = getProperty<string | Date>(data, camelCaseName, pascalCaseName);
    return value != null ? new Date(value) : null;
}

/**
 * SubTask data model - represents a subtask within a task.
 * Demonstrates hierarchical data pattern with value objects.
 */
export class SubTaskItemDataModel extends PlatformDataModel {
    public title: string = '';
    public isCompleted: boolean = false;
    public order: number = 0;
    public completedDate?: Date | null;

    public constructor(data?: Partial<SubTaskItemDataModel>) {
        super(data);
        if (data) {
            this.title = data.title ?? this.title;
            this.isCompleted = data.isCompleted ?? this.isCompleted;
            this.order = data.order ?? this.order;
            this.completedDate = data.completedDate;
        }
    }

    /**
     * Factory method to create a new subtask with generated ID.
     */
    public static createNew(title: string, order: number): SubTaskItemDataModel {
        return new SubTaskItemDataModel({
            id: crypto.randomUUID(),
            title,
            order,
            isCompleted: false
        });
    }
}

/**
 * TaskItem data model matching backend TaskItemEntityDto.
 * Demonstrates:
 * - Full property mapping with backend DTO
 * - SubTasks as hierarchical data (value object list)
 * - Computed properties mirrored from backend
 * - Optional loaded properties
 */
export class TaskItemDataModel extends PlatformDataModel {
    // Core properties
    public title: string = '';
    public description?: string | null;
    public status: TaskItemStatus = TaskItemStatus.Todo;
    public priority: TaskItemPriority = TaskItemPriority.Medium;
    public dueDate?: Date | null;
    public startDate?: Date | null;
    public completedDate?: Date | null;
    public assigneeId?: string | null;
    public relatedSnippetId?: string | null;
    public tags: string[] = [];
    public createdDate?: Date | null;
    public lastUpdatedDate?: Date | null;

    // Soft delete properties
    public isDeleted: boolean = false;
    public deletedDate?: Date | null;
    public deletedBy?: string | null;

    // SubTasks (hierarchical data)
    public subTasks: SubTaskItemDataModel[] = [];

    // Computed properties (read-only from backend)
    public isOverdue: boolean = false;
    public daysUntilDue?: number | null;
    public completionPercentage: number = 0;
    public isDueSoon: boolean = false;
    public isActive: boolean = true;

    // Optional loaded properties
    public relatedSnippetTitle?: string | null;
    public relatedSnippetPreview?: string | null;
    public assigneeName?: string | null;
    public assigneeEmail?: string | null;
    public createdByUserName?: string | null;

    public constructor(data?: Partial<TaskItemDataModel>) {
        super(data);
        if (data) {
            // Core properties
            this.title = data.title ?? this.title;
            this.description = data.description;
            // Parse enum values (API returns strings due to JsonStringEnumConverter)
            this.status = parseTaskItemStatus(data.status);
            this.priority = parseTaskItemPriority(data.priority);
            this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
            this.startDate = data.startDate ? new Date(data.startDate) : null;
            this.completedDate = data.completedDate ? new Date(data.completedDate) : null;
            this.assigneeId = data.assigneeId;
            this.relatedSnippetId = data.relatedSnippetId;
            this.tags = data.tags ?? this.tags;
            this.createdDate = data.createdDate ? new Date(data.createdDate) : null;
            this.lastUpdatedDate = data.lastUpdatedDate ? new Date(data.lastUpdatedDate) : null;

            // Soft delete - handle both camelCase and PascalCase from API
            const apiData = data as Record<string, unknown>;
            this.isDeleted = getBooleanProperty(apiData, 'isDeleted', 'IsDeleted', this.isDeleted);
            this.deletedDate = getDateProperty(apiData, 'deletedDate', 'DeletedDate');
            this.deletedBy = getProperty<string>(apiData, 'deletedBy', 'DeletedBy') ?? null;

            // SubTasks
            this.subTasks = (data.subTasks ?? []).map(st => new SubTaskItemDataModel(st));

            // Computed properties
            this.isOverdue = data.isOverdue ?? this.isOverdue;
            this.daysUntilDue = data.daysUntilDue;
            this.completionPercentage = data.completionPercentage ?? this.completionPercentage;
            this.isDueSoon = data.isDueSoon ?? this.isDueSoon;
            this.isActive = data.isActive ?? this.isActive;

            // Optional loaded
            this.relatedSnippetTitle = data.relatedSnippetTitle;
            this.relatedSnippetPreview = data.relatedSnippetPreview;
            this.assigneeName = data.assigneeName;
            this.assigneeEmail = data.assigneeEmail;
            this.createdByUserName = data.createdByUserName;
        }
    }

    /**
     * Factory method to create a new task with defaults.
     */
    public static createNew(title: string = ''): TaskItemDataModel {
        return new TaskItemDataModel({
            id: null,
            title,
            status: TaskItemStatus.Todo,
            priority: TaskItemPriority.Medium,
            tags: [],
            subTasks: []
        });
    }

    /**
     * Get display status text.
     */
    public getStatusText(): string {
        switch (this.status) {
            case TaskItemStatus.Todo:
                return 'To Do';
            case TaskItemStatus.InProgress:
                return 'In Progress';
            case TaskItemStatus.Completed:
                return 'Completed';
            case TaskItemStatus.Cancelled:
                return 'Cancelled';
            default:
                return 'Unknown';
        }
    }

    /**
     * Get display priority text.
     */
    public getPriorityText(): string {
        switch (this.priority) {
            case TaskItemPriority.Low:
                return 'Low';
            case TaskItemPriority.Medium:
                return 'Medium';
            case TaskItemPriority.High:
                return 'High';
            case TaskItemPriority.Critical:
                return 'Critical';
            default:
                return 'Unknown';
        }
    }

    /**
     * Check if task can be edited.
     */
    public canEdit(): boolean {
        return !this.isDeleted && this.status !== TaskItemStatus.Cancelled;
    }

    /**
     * Check if task can be completed.
     */
    public canComplete(): boolean {
        return !this.isDeleted && this.status !== TaskItemStatus.Completed && this.status !== TaskItemStatus.Cancelled;
    }

    /**
     * Add a new subtask.
     */
    public addSubTask(title: string): void {
        const maxOrder = this.subTasks.length > 0 ? Math.max(...this.subTasks.map(st => st.order)) : 0;
        this.subTasks.push(SubTaskItemDataModel.createNew(title, maxOrder + 1));
    }

    /**
     * Remove a subtask by ID.
     */
    public removeSubTask(id: string): void {
        this.subTasks = this.subTasks.filter(st => st.id !== id);
    }

    /**
     * Toggle subtask completion.
     */
    public toggleSubTaskCompletion(id: string): void {
        const subTask = this.subTasks.find(st => st.id === id);
        if (subTask) {
            subTask.isCompleted = !subTask.isCompleted;
            subTask.completedDate = subTask.isCompleted ? new Date() : null;
        }
    }
}

/**
 * Task statistics model matching backend GetTaskStatisticsQueryResult.
 */
export class TaskStatisticsDataModel {
    // Overall counts
    public totalCount: number = 0;
    public activeCount: number = 0;
    public completedCount: number = 0;
    public completionRate: number = 0;

    // Time-based
    public overdueCount: number = 0;
    public dueTodayCount: number = 0;
    public dueSoonCount: number = 0;
    public noDueDateCount: number = 0;

    // Grouped
    public countsByStatus: Map<TaskItemStatus, number> = new Map();
    public countsByPriority: Map<TaskItemPriority, number> = new Map();
    public countsByAssignee: Map<string, number> = new Map();

    // Trends
    public createdLast7Days: number = 0;
    public completedLast7Days: number = 0;

    public constructor(data?: Partial<TaskStatisticsDataModel>) {
        if (data) {
            this.totalCount = data.totalCount ?? this.totalCount;
            this.activeCount = data.activeCount ?? this.activeCount;
            this.completedCount = data.completedCount ?? this.completedCount;
            this.completionRate = data.completionRate ?? this.completionRate;
            this.overdueCount = data.overdueCount ?? this.overdueCount;
            this.dueTodayCount = data.dueTodayCount ?? this.dueTodayCount;
            this.dueSoonCount = data.dueSoonCount ?? this.dueSoonCount;
            this.noDueDateCount = data.noDueDateCount ?? this.noDueDateCount;
            this.createdLast7Days = data.createdLast7Days ?? this.createdLast7Days;
            this.completedLast7Days = data.completedLast7Days ?? this.completedLast7Days;

            // Convert object to Map for grouped counts
            if (data.countsByStatus) {
                this.countsByStatus = new Map(Object.entries(data.countsByStatus).map(([key, value]) => [parseInt(key) as TaskItemStatus, value as number]));
            }
            if (data.countsByPriority) {
                this.countsByPriority = new Map(
                    Object.entries(data.countsByPriority).map(([key, value]) => [parseInt(key) as TaskItemPriority, value as number])
                );
            }
            if (data.countsByAssignee) {
                this.countsByAssignee = new Map(Object.entries(data.countsByAssignee));
            }
        }
    }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
    IPlatformPagedResultDto,
    PlatformApiService,
    PlatformCommandDto,
    PlatformCoreModuleConfig,
    PlatformEventManager,
    PlatformHttpOptionsConfigService,
    PlatformPagedQueryDto,
    PlatformPagedResultDto,
    PlatformResultDto
} from '@libs/platform-core';

import { AppsTextSnippetDomainModuleConfig } from '../apps-text-snippet-domain.config';
import { TaskItemDataModel, TaskItemPriority, TaskItemStatus, TaskStatisticsDataModel } from '../data-models/task-item.data-model';

/**
 * API service for TaskItem operations.
 * Demonstrates:
 * - Paged queries with multiple filters
 * - Statistics/aggregate endpoint
 * - Save with restore capability
 * - Soft delete endpoint
 */
@Injectable()
export class TaskItemApi extends PlatformApiService {
    public constructor(
        moduleConfig: PlatformCoreModuleConfig,
        http: HttpClient,
        httpOptionsConfigService: PlatformHttpOptionsConfigService,
        eventManager: PlatformEventManager,
        private domainModuleConfig: AppsTextSnippetDomainModuleConfig
    ) {
        super(http, moduleConfig, httpOptionsConfigService, eventManager);
    }

    protected get apiUrl(): string {
        return `${this.domainModuleConfig.textSnippetApiHost}/api/TaskItem`;
    }

    /**
     * Get paginated list of tasks with filtering.
     */
    public getList(query: GetTaskListQuery): Observable<GetTaskListQueryResult> {
        return this.get<IGetTaskListQueryResult>('/list', query).pipe(map(result => new GetTaskListQueryResult(result)));
    }

    /**
     * Get task statistics and aggregates.
     */
    public getStatistics(query?: GetTaskStatisticsQuery): Observable<TaskStatisticsDataModel> {
        return this.get<TaskStatisticsDataModel>('/stats', query).pipe(map(result => new TaskStatisticsDataModel(result)));
    }

    /**
     * Create or update a task.
     */
    public save(command: SaveTaskItemCommand): Observable<SaveTaskItemCommandResult> {
        return this.post<SaveTaskItemCommandResult>('/save', command, { enableCache: false }).pipe(map(result => new SaveTaskItemCommandResult(result)));
    }

    /**
     * Soft delete or permanently delete a task.
     */
    public deleteTask(command: DeleteTaskItemCommand): Observable<DeleteTaskItemCommandResult> {
        return this.post<DeleteTaskItemCommandResult>('/delete', command, { enableCache: false }).pipe(map(result => new DeleteTaskItemCommandResult(result)));
    }

    /**
     * Restore a soft-deleted task.
     */
    public restore(task: TaskItemDataModel): Observable<SaveTaskItemCommandResult> {
        return this.post<SaveTaskItemCommandResult>('/restore', { task }, { enableCache: false }).pipe(map(result => new SaveTaskItemCommandResult(result)));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query for listing tasks with multiple filter options.
 */
export class GetTaskListQuery extends PlatformPagedQueryDto {
    public constructor(data?: Partial<GetTaskListQuery>) {
        super(data);
        if (data) {
            this.statuses = data.statuses ?? [];
            this.priorities = data.priorities ?? [];
            this.assigneeId = data.assigneeId;
            this.searchText = data.searchText;
            this.overdueOnly = data.overdueOnly ?? false;
            this.dueSoonOnly = data.dueSoonOnly ?? false;
            this.dueSoonDays = data.dueSoonDays ?? 3;
            this.relatedSnippetId = data.relatedSnippetId;
            this.includeDeleted = data.includeDeleted ?? false;
            this.tag = data.tag;
        }
    }

    /** Filter by status(es) */
    public statuses: TaskItemStatus[] = [];

    /** Filter by priority(ies) */
    public priorities: TaskItemPriority[] = [];

    /** Filter by assignee ID */
    public assigneeId?: string | null;

    /** Full-text search on title and description */
    public searchText?: string | null;

    /** Filter to only overdue tasks */
    public overdueOnly: boolean = false;

    /** Filter to tasks due within specified days */
    public dueSoonOnly: boolean = false;

    /** Number of days for "due soon" filter (default 3) */
    public dueSoonDays: number = 3;

    /** Filter by related snippet ID */
    public relatedSnippetId?: string | null;

    /** Include soft-deleted tasks */
    public includeDeleted: boolean = false;

    /** Filter by tag */
    public tag?: string | null;
}

/**
 * Query for getting task statistics.
 */
export class GetTaskStatisticsQuery {
    public constructor(data?: Partial<GetTaskStatisticsQuery>) {
        if (data) {
            this.assigneeId = data.assigneeId;
            this.includeDeleted = data.includeDeleted ?? false;
        }
    }

    /** Optional filter by assignee */
    public assigneeId?: string | null;

    /** Include deleted tasks in statistics */
    public includeDeleted: boolean = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

interface IGetTaskListQueryResult extends IPlatformPagedResultDto<TaskItemDataModel> {
    statusCounts: Record<TaskItemStatus, number>;
    overdueCount: number;
}

/**
 * Result for GetTaskListQuery with additional summary statistics.
 */
export class GetTaskListQueryResult extends PlatformPagedResultDto<TaskItemDataModel> {
    public constructor(data?: Partial<IGetTaskListQueryResult>) {
        super({
            data: data,
            itemInstanceCreator: item => new TaskItemDataModel(item)
        });
        if (data) {
            this.statusCounts = new Map(Object.entries(data.statusCounts ?? {}).map(([key, value]) => [parseInt(key) as TaskItemStatus, value as number]));
            this.overdueCount = data.overdueCount ?? 0;
        }
    }

    /** Summary counts by status (from filtered set) */
    public statusCounts: Map<TaskItemStatus, number> = new Map();

    /** Count of overdue tasks (from filtered set) */
    public overdueCount: number = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND DTOs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Command for saving (create or update) a task.
 */
export class SaveTaskItemCommand extends PlatformCommandDto {
    public constructor(data?: Partial<SaveTaskItemCommand>) {
        super();
        if (data) {
            this.task = data.task ? new TaskItemDataModel(data.task) : new TaskItemDataModel();
            this.restoreDeleted = data.restoreDeleted ?? false;
        } else {
            this.task = new TaskItemDataModel();
        }
    }

    /** Task data to save */
    public task: TaskItemDataModel;

    /** Whether to restore a soft-deleted task */
    public restoreDeleted: boolean = false;
}

/**
 * Result of SaveTaskItemCommand.
 */
export class SaveTaskItemCommandResult extends PlatformResultDto {
    public constructor(data?: Partial<SaveTaskItemCommandResult>) {
        super();
        if (data) {
            this.savedTask = new TaskItemDataModel(data.savedTask);
            this.wasRestored = data.wasRestored ?? false;
            this.wasCreated = data.wasCreated ?? false;
        } else {
            this.savedTask = new TaskItemDataModel();
        }
    }

    /** The saved task data */
    public savedTask: TaskItemDataModel;

    /** Whether the task was restored from soft-deleted state */
    public wasRestored: boolean = false;

    /** Whether the task was newly created */
    public wasCreated: boolean = false;
}

/**
 * Command for deleting a task.
 */
export class DeleteTaskItemCommand extends PlatformCommandDto {
    public constructor(data?: Partial<DeleteTaskItemCommand>) {
        super();
        if (data) {
            this.taskId = data.taskId ?? '';
            this.permanentDelete = data.permanentDelete ?? false;
        }
    }

    /** ID of the task to delete */
    public taskId: string = '';

    /** Whether to permanently delete vs soft delete */
    public permanentDelete: boolean = false;
}

/**
 * Result of DeleteTaskItemCommand.
 */
export class DeleteTaskItemCommandResult extends PlatformResultDto {
    public constructor(data?: Partial<DeleteTaskItemCommandResult>) {
        super();
        if (data) {
            this.wasSoftDeleted = data.wasSoftDeleted ?? false;
        }
    }

    /** Whether the task was soft deleted (vs hard deleted) */
    public wasSoftDeleted: boolean = false;
}

import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';

import {
    DeleteTaskItemCommand,
    GetTaskListQuery,
    GetTaskStatisticsQuery,
    SaveTaskItemCommand,
    TaskItemApi,
    TaskItemDataModel,
    TaskItemPriority,
    TaskItemStatus,
    TaskStatisticsDataModel
} from '@libs/apps-domains/text-snippet-domain';
import { PlatformVm, PlatformVmStore, cloneDeep, distinctUntilObjectValuesChanged } from '@libs/platform-core';

/**
 * ViewModel for TaskList component.
 * Demonstrates:
 * - Multiple filter states
 * - Statistics tracking
 * - Pagination state
 * - Selected item tracking
 */
export class TaskListVm extends PlatformVm {
    public static readonly pageSize = 10;

    public constructor(data?: Partial<TaskListVm>) {
        super();
        if (data) {
            this.searchText = data.searchText ?? '';
            this.selectedStatuses = data.selectedStatuses ?? [];
            this.selectedPriorities = data.selectedPriorities ?? [];
            this.overdueOnly = data.overdueOnly ?? false;
            this.dueSoonOnly = data.dueSoonOnly ?? false;
            this.includeDeleted = data.includeDeleted ?? false;
            this.tasks = data.tasks?.map(t => new TaskItemDataModel(t)) ?? [];
            this.totalTasks = data.totalTasks ?? 0;
            this.currentPageNumber = data.currentPageNumber ?? 0;
            this.statistics = data.statistics ? new TaskStatisticsDataModel(data.statistics) : undefined;
            this.selectedTaskId = data.selectedTaskId ?? null;
            this.statusCounts = data.statusCounts ?? new Map();
            this.overdueCount = data.overdueCount ?? 0;
        }
    }

    // Filter states
    public searchText: string = '';
    public selectedStatuses: TaskItemStatus[] = [];
    public selectedPriorities: TaskItemPriority[] = [];
    public overdueOnly: boolean = false;
    public dueSoonOnly: boolean = false;
    public includeDeleted: boolean = false;

    // Data states
    public tasks: TaskItemDataModel[] = [];
    public totalTasks: number = 0;
    public currentPageNumber: number = 0;
    public statistics?: TaskStatisticsDataModel;

    // Selection
    public selectedTaskId: string | null = null;

    // Summary from query result
    public statusCounts: Map<TaskItemStatus, number> = new Map();
    public overdueCount: number = 0;

    public get pageSize(): number {
        return TaskListVm.pageSize;
    }

    public get skipCount(): number {
        return this.pageSize * this.currentPageNumber;
    }

    public get selectedTask(): TaskItemDataModel | undefined {
        return this.tasks.find(t => t.id === this.selectedTaskId);
    }

    public buildQuery(): GetTaskListQuery {
        return new GetTaskListQuery({
            maxResultCount: this.pageSize,
            skipCount: this.skipCount,
            searchText: this.searchText || undefined,
            statuses: this.selectedStatuses,
            priorities: this.selectedPriorities,
            overdueOnly: this.overdueOnly,
            dueSoonOnly: this.dueSoonOnly,
            includeDeleted: this.includeDeleted
        });
    }

    public hasActiveFilters(): boolean {
        return this.searchText.length > 0 || this.selectedStatuses.length > 0 || this.selectedPriorities.length > 0 || this.overdueOnly || this.dueSoonOnly;
    }

    public clearFilters(): TaskListVm {
        return new TaskListVm({
            ...this,
            searchText: '',
            selectedStatuses: [],
            selectedPriorities: [],
            overdueOnly: false,
            dueSoonOnly: false,
            currentPageNumber: 0
        });
    }
}

/**
 * Store for TaskList component.
 * Demonstrates:
 * - PlatformVmStore patterns
 * - Multiple effects for different operations
 * - Query change tracking with distinctUntilObjectValuesChanged
 * - Statistics loading
 */
@Injectable()
export class TaskListStore extends PlatformVmStore<TaskListVm> {
    // Reactive query selector
    public query$ = this.select(vm => vm.buildQuery()).pipe(distinctUntilObjectValuesChanged());

    public constructor(private taskApi: TaskItemApi) {
        super(new TaskListVm());
    }

    public vmConstructor = (data?: Partial<TaskListVm>) => new TaskListVm(data);

    protected cachedStateKeyName = () => 'TaskListStore';

    protected beforeInitVm = () => {
        // Load tasks when query changes
        this.loadTasks(this.query$);
    };

    public override initOrReloadVm = (isReload: boolean): Observable<unknown> => {
        return of(combineLatest([this.loadTasks(this.currentState().buildQuery(), isReload), this.loadStatistics(undefined, isReload)]));
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // EFFECTS
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Load tasks with current filters.
     */
    public loadTasks = this.effectSimple((query: GetTaskListQuery, isReloading?: boolean) => {
        return this.taskApi.getList(query).pipe(
            this.tapResponse(result => {
                this.updateState({
                    tasks: result.items,
                    totalTasks: result.totalCount,
                    statusCounts: result.statusCounts,
                    overdueCount: result.overdueCount
                });
            })
        );
    }, 'loadTasks');

    /**
     * Load task statistics.
     */
    public loadStatistics = this.effectSimple((_, isReloading?: boolean) => {
        return this.taskApi
            .getStatistics(
                new GetTaskStatisticsQuery({
                    includeDeleted: this.currentState().includeDeleted
                })
            )
            .pipe(
                this.tapResponse(stats => {
                    this.updateState({ statistics: stats });
                })
            );
    }, 'loadStatistics');

    /**
     * Save a task (create or update).
     */
    public saveTask = this.effectSimple((task: TaskItemDataModel) => {
        return this.taskApi
            .save(
                new SaveTaskItemCommand({
                    task: cloneDeep(task)
                })
            )
            .pipe(
                this.tapResponse(result => {
                    // Update the task in the list or add if new
                    const tasks = [...this.currentState().tasks];
                    const existingIndex = tasks.findIndex(t => t.id === result.savedTask.id);

                    if (existingIndex >= 0) {
                        tasks[existingIndex] = result.savedTask;
                    } else if (result.wasCreated) {
                        tasks.unshift(result.savedTask);
                    }

                    this.updateState({
                        tasks,
                        selectedTaskId: result.savedTask.id,
                        totalTasks: result.wasCreated ? this.currentState().totalTasks + 1 : this.currentState().totalTasks
                    });

                    // Refresh statistics after save
                    this.loadStatistics();
                })
            );
    }, 'saveTask');

    /**
     * Delete a task (soft or hard).
     */
    public deleteTask = this.effectSimple((params: { taskId: string; permanent: boolean }) => {
        return this.taskApi
            .deleteTask(
                new DeleteTaskItemCommand({
                    taskId: params.taskId,
                    permanentDelete: params.permanent
                })
            )
            .pipe(
                this.tapResponse(() => {
                    this.reload();
                })
            );
    }, 'deleteTask');

    /**
     * Restore a soft-deleted task.
     */
    public restoreTask = this.effectSimple((task: TaskItemDataModel) => {
        return this.taskApi.restore(task).pipe(
            this.tapResponse(result => {
                // Update the task in the list
                const tasks = this.currentState().tasks.map(t => (t.id === result.savedTask.id ? result.savedTask : t));
                this.updateState({ tasks });
                this.loadStatistics();
            })
        );
    }, 'restoreTask');

    // ═══════════════════════════════════════════════════════════════════════════════
    // STATE UPDATERS
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Change search text with throttling.
     */
    public changeSearchText = this.effectSimple((searchText: string) => {
        if (searchText === this.currentState().searchText) return;

        this.updateState({
            searchText,
            currentPageNumber: 0
        });
    }, 'changeSearchText');

    /**
     * Change page number.
     */
    public changePage = this.effectSimple((pageIndex: number) => {
        if (pageIndex === this.currentState().currentPageNumber) return;

        this.updateState({ currentPageNumber: pageIndex });
    }, 'changePage');

    /**
     * Toggle status filter.
     */
    public toggleStatusFilter(status: TaskItemStatus): void {
        const current = this.currentState().selectedStatuses;
        const selectedStatuses = current.includes(status) ? current.filter(s => s !== status) : [...current, status];
        this.updateState({ selectedStatuses, currentPageNumber: 0 });
    }

    /**
     * Toggle priority filter.
     */
    public togglePriorityFilter(priority: TaskItemPriority): void {
        const current = this.currentState().selectedPriorities;
        const selectedPriorities = current.includes(priority) ? current.filter(p => p !== priority) : [...current, priority];
        this.updateState({ selectedPriorities, currentPageNumber: 0 });
    }

    /**
     * Toggle overdue only filter.
     */
    public toggleOverdueOnly(): void {
        this.updateState({
            overdueOnly: !this.currentState().overdueOnly,
            dueSoonOnly: false, // Mutually exclusive
            currentPageNumber: 0
        });
    }

    /**
     * Toggle due soon filter.
     */
    public toggleDueSoonOnly(): void {
        this.updateState({
            dueSoonOnly: !this.currentState().dueSoonOnly,
            overdueOnly: false, // Mutually exclusive
            currentPageNumber: 0
        });
    }

    /**
     * Toggle include deleted filter.
     */
    public toggleIncludeDeleted(): void {
        this.updateState({
            includeDeleted: !this.currentState().includeDeleted,
            currentPageNumber: 0
        });
    }

    /**
     * Clear all filters.
     */
    public clearFilters(): void {
        this.updateState(this.currentState().clearFilters());
    }

    /**
     * Select a task.
     */
    public selectTask(taskId: string | null | undefined): void {
        this.updateState({ selectedTaskId: taskId });
    }

    /**
     * Create a new task (set selected to null for create mode).
     */
    public createNewTask(): void {
        this.updateState({ selectedTaskId: null });
    }
}

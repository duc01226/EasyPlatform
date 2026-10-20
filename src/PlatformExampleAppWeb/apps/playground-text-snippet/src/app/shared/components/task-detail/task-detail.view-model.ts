import { SubTaskItemDataModel, TaskItemDataModel, TaskItemPriority, TaskItemStatus } from '@libs/apps-domains/text-snippet-domain';
import { cloneDeep, isDifferent, PlatformVm } from '@libs/platform-core';

/**
 * View model for TaskDetail form component.
 * Demonstrates:
 * - Form state tracking
 * - SubTasks list management (for FormArray)
 * - Dirty checking
 * - Create vs Update mode detection
 */
export class TaskDetailFormVm extends PlatformVm {
    public constructor(data?: Partial<TaskDetailFormVm>) {
        super();
        if (data) {
            this.task = data.task ? new TaskItemDataModel(data.task) : TaskItemDataModel.createNew();
            this.originalTask = cloneDeep(this.task);
            this.saveError = data.saveError ?? null;
            this.draftKey = data.draftKey ?? null;
        } else {
            this.task = TaskItemDataModel.createNew();
            this.originalTask = cloneDeep(this.task);
        }
    }

    // The task being edited
    private _task: TaskItemDataModel = TaskItemDataModel.createNew();
    public get task(): TaskItemDataModel {
        return this._task;
    }
    public set task(value: TaskItemDataModel) {
        this._task = value;
    }

    // Original task for dirty checking
    public originalTask: TaskItemDataModel;

    // Error message from save operation
    public saveError: string | null = null;

    // Key for draft storage
    public draftKey: string | null = null;

    // ═══════════════════════════════════════════════════════════════════════════════
    // FORM FIELD ACCESSORS (for two-way binding)
    // ═══════════════════════════════════════════════════════════════════════════════

    public get title(): string {
        return this.task.title;
    }
    public set title(value: string) {
        this.task.title = value;
    }

    public get description(): string | null | undefined {
        return this.task.description;
    }
    public set description(value: string | null | undefined) {
        this.task.description = value;
    }

    public get taskStatus(): TaskItemStatus {
        return this.task.status;
    }
    public set taskStatus(value: TaskItemStatus) {
        this.task.status = value;
    }

    public get priority(): TaskItemPriority {
        return this.task.priority;
    }
    public set priority(value: TaskItemPriority) {
        this.task.priority = value;
    }

    public get startDate(): Date | null | undefined {
        return this.task.startDate;
    }
    public set startDate(value: Date | null | undefined) {
        this.task.startDate = value;
    }

    public get dueDate(): Date | null | undefined {
        return this.task.dueDate;
    }
    public set dueDate(value: Date | null | undefined) {
        this.task.dueDate = value;
    }

    public get tags(): string[] {
        return this.task.tags;
    }
    public set tags(value: string[]) {
        this.task.tags = value;
    }

    public get subTasks(): SubTaskItemDataModel[] {
        return this.task.subTasks;
    }
    public set subTasks(value: SubTaskItemDataModel[]) {
        this.task.subTasks = value;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // COMPUTED PROPERTIES
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Check if this is a new task (create mode).
     */
    public isCreateMode(): boolean {
        return this.task.id === null || this.task.id === undefined || this.task.id === '';
    }

    /**
     * Check if form has unsaved changes.
     */
    public isDirty(): boolean {
        return isDifferent(this.task, this.originalTask);
    }

    /**
     * Check if task is soft deleted.
     */
    public get isDeleted(): boolean {
        return this.task.isDeleted;
    }

    /**
     * Check if task can be edited (not deleted, not cancelled).
     */
    public canEdit(): boolean {
        return this.task.canEdit();
    }

    /**
     * Check if task can be completed.
     */
    public canComplete(): boolean {
        return this.task.canComplete();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // SUBTASK METHODS
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Add a new subtask.
     */
    public addSubTask(title: string = ''): void {
        this.task.addSubTask(title);
    }

    /**
     * Remove a subtask by ID.
     */
    public removeSubTask(id: string): void {
        this.task.removeSubTask(id);
    }

    /**
     * Toggle subtask completion.
     */
    public toggleSubTaskCompletion(id: string): void {
        this.task.toggleSubTaskCompletion(id);
    }

    /**
     * Reorder subtasks (for drag-drop).
     */
    public reorderSubTasks(fromIndex: number, toIndex: number): void {
        if (fromIndex === toIndex) return;

        const subTasks = [...this.subTasks];
        const removed = subTasks.splice(fromIndex, 1)[0];
        if (removed === undefined) return;
        subTasks.splice(toIndex, 0, removed);

        // Update order property
        subTasks.forEach((st, index) => {
            st.order = index;
        });

        this.subTasks = subTasks;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // STATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Reset to original state.
     */
    public reset(): void {
        this.task = cloneDeep(this.originalTask);
        this.saveError = null;
    }

    /**
     * Mark current state as saved (update originalTask).
     */
    public markAsSaved(): void {
        this.originalTask = cloneDeep(this.task);
        this.saveError = null;
    }

    /**
     * Create a new empty form.
     */
    public static createNew(): TaskDetailFormVm {
        return new TaskDetailFormVm({
            task: TaskItemDataModel.createNew()
        });
    }

    /**
     * Create form for editing an existing task.
     */
    public static fromTask(task: TaskItemDataModel): TaskDetailFormVm {
        const clonedTask = cloneDeep(task);
        return new TaskDetailFormVm({
            task: clonedTask
        });
    }
}

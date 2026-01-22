import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TaskItemDataModel, TaskItemPriority, TaskItemStatus } from '@libs/apps-domains/text-snippet-domain';
import { PlatformCoreModule } from '@libs/platform-core';
import { AppBaseVmStoreComponent } from '../../base';

import { TaskListStore, TaskListVm } from './task-list.store';

/**
 * Task list component demonstrating:
 * - PlatformVmStoreComponent with store pattern
 * - Multiple filter controls (status chips, priority, overdue)
 * - Data table with conditional styling
 * - Statistics display cards
 * - Selection for editing
 */
@Component({
    selector: 'app-task-list',
    standalone: true,
    templateUrl: './task-list.component.html',
    styleUrls: ['./task-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PlatformCoreModule,

        MatTableModule,
        MatInputModule,
        MatFormFieldModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatButtonToggleModule,
        MatBadgeModule,
        MatTooltipModule
    ],
    providers: [TaskListStore]
})
export class TaskListComponent extends AppBaseVmStoreComponent<TaskListVm, TaskListStore> {
    // Event emitters for parent component communication
    @Output() public taskSelected = new EventEmitter<TaskItemDataModel>();
    @Output() public createTask = new EventEmitter<void>();

    public displayedColumns = ['status', 'priority', 'title', 'dueDate', 'actions'];

    // Expose enums to template
    public TaskItemStatus = TaskItemStatus;
    public TaskItemPriority = TaskItemPriority;

    // Status options for filter chips
    public statusOptions = [
        { value: TaskItemStatus.Todo, label: 'To Do', icon: 'radio_button_unchecked' },
        { value: TaskItemStatus.InProgress, label: 'In Progress', icon: 'pending' },
        { value: TaskItemStatus.Completed, label: 'Completed', icon: 'check_circle' },
        { value: TaskItemStatus.Cancelled, label: 'Cancelled', icon: 'cancel' }
    ];

    // Priority options
    public priorityOptions = [
        { value: TaskItemPriority.Low, label: 'Low', color: 'primary' },
        { value: TaskItemPriority.Medium, label: 'Medium', color: 'accent' },
        { value: TaskItemPriority.High, label: 'High', color: 'warn' },
        { value: TaskItemPriority.Critical, label: 'Critical', color: 'warn' }
    ];

    public constructor(store: TaskListStore) {
        super(store);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════

    public onSearchTextChange(newValue: string): void {
        this.store.changeSearchText(newValue);
    }

    public onPageChange(event: PageEvent): void {
        this.store.changePage(event.pageIndex);
    }

    public onToggleStatus(status: TaskItemStatus): void {
        this.store.toggleStatusFilter(status);
    }

    public onTogglePriority(priority: TaskItemPriority): void {
        this.store.togglePriorityFilter(priority);
    }

    public onToggleOverdueOnly(): void {
        this.store.toggleOverdueOnly();
    }

    public onToggleDueSoonOnly(): void {
        this.store.toggleDueSoonOnly();
    }

    public onToggleIncludeDeleted(): void {
        this.store.toggleIncludeDeleted();
    }

    public onClearFilters(): void {
        this.store.clearFilters();
    }

    public onSelectTask(task: TaskItemDataModel): void {
        const currentSelectedId = this.currentVm().selectedTaskId;
        const isSameTask = currentSelectedId === task.id;
        const isDeselecting = isSameTask && !task.isDeleted;

        // Update store selection
        this.store.selectTask(isDeselecting ? null : task.id);

        // Emit event to parent component
        // Always emit if:
        // - Selecting a new task (!isSameTask)
        // - Re-selecting a deleted task to update the form (isSameTask && task.isDeleted)
        if (!isDeselecting) {
            this.taskSelected.emit(task);
        }
    }

    public onCreateNewTask(): void {
        this.store.createNewTask();
        this.createTask.emit();
    }

    public onDeleteTask(task: TaskItemDataModel, permanent: boolean = false): void {
        if (task.id !== null && task.id !== undefined && task.id !== '') {
            this.store.deleteTask({ taskId: task.id, permanent });
        }
    }

    public onRestoreTask(task: TaskItemDataModel): void {
        this.store.restoreTask(task);
    }

    public onRefresh(): void {
        this.reload();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════

    public isStatusSelected(status: TaskItemStatus): boolean {
        return this.currentVm().selectedStatuses.includes(status);
    }

    public isPrioritySelected(priority: TaskItemPriority): boolean {
        return this.currentVm().selectedPriorities.includes(priority);
    }

    public getStatusIcon(status: TaskItemStatus): string {
        return this.statusOptions.find(s => s.value === status)?.icon ?? 'help';
    }

    public getStatusLabel(status: TaskItemStatus): string {
        return this.statusOptions.find(s => s.value === status)?.label ?? 'Unknown';
    }

    public getPriorityLabel(priority: TaskItemPriority): string {
        return this.priorityOptions.find(p => p.value === priority)?.label ?? 'Unknown';
    }

    public getPriorityClass(priority: TaskItemPriority): string {
        switch (priority) {
            case TaskItemPriority.Low:
                return 'priority-low';
            case TaskItemPriority.Medium:
                return 'priority-medium';
            case TaskItemPriority.High:
                return 'priority-high';
            case TaskItemPriority.Critical:
                return 'priority-critical';
            default:
                return '';
        }
    }

    public getRowClass(task: TaskItemDataModel): string {
        const classes: string[] = [];

        if (task.isOverdue) {
            classes.push('row-overdue');
        }
        if (task.isDueSoon && !task.isOverdue) {
            classes.push('row-due-soon');
        }
        if (task.isDeleted) {
            classes.push('row-deleted');
        }
        if (task.id === this.currentVm().selectedTaskId) {
            classes.push('row-selected');
        }

        return classes.join(' ');
    }

    public formatDate(date: Date | null | undefined): string {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString();
    }

    public trackByTaskId(index: number, task: TaskItemDataModel): string {
        return task.id ?? index.toString();
    }
}

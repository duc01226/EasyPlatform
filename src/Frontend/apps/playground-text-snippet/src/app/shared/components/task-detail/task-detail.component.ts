import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Observable, of } from 'rxjs';
import { debounceTime, tap } from 'rxjs/operators';

import {
    SaveTaskItemCommand,
    SubTaskItemDataModel,
    TaskItemApi,
    TaskItemDataModel,
    TaskItemPriority,
    TaskItemStatus
} from '@libs/apps-domains/text-snippet-domain';
import {
    cloneDeep,
    PlatformApiServiceErrorResponse,
    PlatformCoreModule,
    PlatformFormConfig,
    startEndValidator
} from '@libs/platform-core';
import { AppBaseFormComponent } from '../../base';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { TaskDetailFormVm } from './task-detail.view-model';

/**
 * Form value type for subtask items.
 */
interface SubTaskFormValue {
    id?: string | null;
    title?: string | null;
    isCompleted?: boolean | null;
    order?: number | null;
    completedDate?: Date | null;
}

/**
 * Form value type for task detail form.
 */
interface TaskDetailFormValue {
    title?: string | null;
    description?: string | null;
    taskStatus?: TaskItemStatus | null;
    priority?: TaskItemPriority | null;
    startDate?: Date | null;
    dueDate?: Date | null;
    tags?: string[] | null;
    subTasks?: SubTaskFormValue[] | null;
}

/**
 * Task detail form component demonstrating:
 * - PlatformFormComponent base class
 * - FormArray for subtasks (hierarchical data)
 * - Dependent validation (startDate <= dueDate)
 * - Create vs Update mode
 * - Soft delete indicator with restore
 * - Auto-save draft pattern (using localStorage)
 */
@Component({
    selector: 'app-task-detail',
    standalone: true,
    templateUrl: './task-detail.component.html',
    styleUrls: ['./task-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PlatformCoreModule,

        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatTableModule,
        MatPaginatorModule,
        MatProgressBarModule,
        MatButtonToggleModule,
        MatBadgeModule
    ]
})
export class TaskDetailComponent extends AppBaseFormComponent<TaskDetailFormVm> implements OnInit {
    // Task to edit (null for create mode)
    @Input() public set task(value: TaskItemDataModel | null | undefined) {
        const newVm = value ? TaskDetailFormVm.fromTask(value) : TaskDetailFormVm.createNew();

        this.internalSetVm(newVm);
        if (this.initiated()) this.initForm(true);
    }

    // Event emitted when task is saved
    @Output() public taskSaved = new EventEmitter<TaskItemDataModel>();

    // Event emitted when user requests cancel
    @Output() public cancelled = new EventEmitter<void>();

    // Event emitted when task is restored
    @Output() public taskRestored = new EventEmitter<TaskItemDataModel>();

    // Expose enums to template
    public TaskItemStatus = TaskItemStatus;
    public TaskItemPriority = TaskItemPriority;

    // Status options for dropdown
    public statusOptions = [
        { value: TaskItemStatus.Todo, label: 'To Do' },
        { value: TaskItemStatus.InProgress, label: 'In Progress' },
        { value: TaskItemStatus.Completed, label: 'Completed' },
        { value: TaskItemStatus.Cancelled, label: 'Cancelled' }
    ];

    // Priority options for dropdown
    public priorityOptions = [
        { value: TaskItemPriority.Low, label: 'Low' },
        { value: TaskItemPriority.Medium, label: 'Medium' },
        { value: TaskItemPriority.High, label: 'High' },
        { value: TaskItemPriority.Critical, label: 'Critical' }
    ];

    // Draft storage key
    private readonly draftStorageKey = 'task-detail-draft';

    public constructor(private taskApi: TaskItemApi) {
        super();
    }

    public override ngOnInit(): void {
        super.ngOnInit();
        this.loadDraft();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // FORM CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════

    protected override initOrReloadVm = (isReload: boolean): Observable<TaskDetailFormVm | undefined> => {
        return of(this._vm);
    };

    /**
     * Form configuration demonstrating:
     * - Multiple validators per field
     * - Dependent validation (dueDate depends on startDate)
     * - Custom async validators could be added here
     */
    protected initialFormConfig = (): PlatformFormConfig<TaskDetailFormVm> => {
        const vm = this.currentVm();
        return {
            controls: {
                title: new FormControl(vm.title, [Validators.required, Validators.maxLength(200)]),
                description: new FormControl(vm.description, [Validators.maxLength(2000)]),
                taskStatus: new FormControl(vm.taskStatus, [Validators.required]),
                priority: new FormControl(vm.priority, [Validators.required]),
                startDate: new FormControl(vm.startDate),
                dueDate: new FormControl(vm.dueDate, [
                    // Custom validator: dueDate must be >= startDate
                    startEndValidator(
                        'dateRangeInvalid',
                        ctrl => ctrl.parent?.get('startDate')?.value,
                        ctrl => ctrl.value,
                        { allowEqual: true }
                    )
                ]),
                tags: new FormControl(vm.tags),
                subTasks: {
                    modelItems: () => vm.subTasks,
                    itemControl: (item: SubTaskItemDataModel, index: number) => this.createSubTaskFormControls(item, index)
                }
            },
            // Dependent validation: when startDate changes, revalidate dueDate
            dependentValidations: {
                dueDate: ['startDate']
            },
            afterInit: () => {
                // Subscribe to form changes for auto-save draft
                this.form.valueChanges
                    .pipe(
                        debounceTime(500),
                        tap(() => this.saveDraft()),
                        this.untilDestroyed()
                    )
                    .subscribe();
            }
        };
    };

    /**
     * Create form controls for a single subtask.
     */
    private createSubTaskFormControls(subTask: SubTaskItemDataModel, _index: number) {
        return {
            id: new FormControl(subTask.id),
            title: new FormControl(subTask.title, [Validators.required, Validators.maxLength(200)]),
            isCompleted: new FormControl(subTask.isCompleted),
            order: new FormControl(subTask.order),
            completedDate: new FormControl(subTask.completedDate)
        };
    }

    /**
     * Create a FormGroup for a single subtask (used for dynamic additions).
     */
    private createSubTaskFormGroup(subTask: SubTaskItemDataModel): FormGroup {
        return new FormGroup(this.createSubTaskFormControls(subTask, 0));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // SUBTASK METHODS
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Get the subtasks FormArray.
     */
    public get subTasksArray(): FormArray<FormGroup> {
        return this.form.get('subTasks') as FormArray<FormGroup>;
    }

    /**
     * Get count of completed subtasks.
     */
    public get completedSubTasksCount(): number {
        return this.subTasksArray.controls.filter(c => c.get('isCompleted')?.value === true).length;
    }

    /**
     * Add a new subtask to the form.
     */
    public addSubTask(): void {
        const newSubTask = SubTaskItemDataModel.createNew('', this.subTasksArray.length);
        this.subTasksArray.push(this.createSubTaskFormGroup(newSubTask));
    }

    /**
     * Remove a subtask from the form.
     */
    public removeSubTask(index: number): void {
        this.subTasksArray.removeAt(index);
    }

    /**
     * Toggle subtask completion.
     */
    public toggleSubTaskCompletion(index: number): void {
        const subTaskGroup = this.subTasksArray.at(index);
        const isCompleted = subTaskGroup.get('isCompleted')?.value !== true;
        subTaskGroup.patchValue({
            isCompleted,
            completedDate: isCompleted ? new Date() : null
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // DRAFT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Save current form state as draft to localStorage.
     */
    private saveDraft(): void {
        if (!this.currentVm().isCreateMode()) return; // Only save drafts for new tasks

        try {
            const draftData = this.form.value;
            localStorage.setItem(this.draftStorageKey, JSON.stringify(draftData));
        } catch {
            // Ignore localStorage errors
        }
    }

    /**
     * Load draft from localStorage if available.
     */
    private loadDraft(): void {
        if (!this.currentVm().isCreateMode()) return;

        try {
            const draftJson = localStorage.getItem(this.draftStorageKey);
            if (draftJson !== null && draftJson !== '') {
                const draftData = JSON.parse(draftJson);
                this.form.patchValue(draftData);
            }
        } catch {
            // Ignore localStorage errors
        }
    }

    /**
     * Clear saved draft.
     */
    private clearDraft(): void {
        try {
            localStorage.removeItem(this.draftStorageKey);
        } catch {
            // Ignore localStorage errors
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // FORM ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Save the task (create or update).
     */
    public onSave = this.effectSimple(() => {
        // Validate form
        if (!this.validateForm()) {
            return of(null);
        }

        // Build task from form values
        const formValue = this.form.value as TaskDetailFormValue;
        const taskToSave = this.buildTaskFromForm(formValue);

        return this.taskApi
            .save(
                new SaveTaskItemCommand({
                    task: taskToSave
                })
            )
            .pipe(
                this.tapResponse(
                    result => {
                        this.clearDraft();
                        this.updateVm(vm => {
                            vm.task = result.savedTask;
                            vm.markAsSaved();
                            return vm;
                        });
                        this.taskSaved.emit(result.savedTask);
                    },
                    err => {
                        this.updateVm({
                            saveError: PlatformApiServiceErrorResponse.getDefaultFormattedMessage(err)
                        });
                    }
                )
            );
    }, 'saveTask');

    /**
     * Restore a soft-deleted task.
     */
    public onRestore = this.effectSimple(() => {
        return this.taskApi.restore(this.currentVm().task).pipe(
            this.tapResponse(
                result => {
                    this.updateVm(vm => {
                        vm.task = result.savedTask;
                        vm.markAsSaved();
                        return vm;
                    });
                    this.taskRestored.emit(result.savedTask);
                },
                err => {
                    this.updateVm({
                        saveError: PlatformApiServiceErrorResponse.getDefaultFormattedMessage(err)
                    });
                }
            )
        );
    }, 'restoreTask');

    /**
     * Cancel editing.
     */
    public onCancel(): void {
        if (this.currentVm().isCreateMode()) {
            this.clearDraft();
        }
        this.cancelled.emit();
    }

    /**
     * Reset form to original state.
     */
    public onReset(): void {
        this.updateVm(vm => {
            vm.reset();
            return vm;
        });
        this.initForm(true);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Build TaskItemDataModel from form values.
     */
    private buildTaskFromForm(formValue: TaskDetailFormValue): TaskItemDataModel {
        const vm = this.currentVm();
        const task = cloneDeep(vm.task);

        task.title = formValue.title ?? '';
        task.description = formValue.description;
        task.status = formValue.taskStatus ?? TaskItemStatus.Todo;
        task.priority = formValue.priority ?? TaskItemPriority.Medium;
        task.startDate = formValue.startDate;
        task.dueDate = formValue.dueDate;
        task.tags = formValue.tags ?? [];
        task.subTasks = (formValue.subTasks ?? []).map(
            (st: SubTaskFormValue) =>
                new SubTaskItemDataModel({
                    id: st.id ?? undefined,
                    title: st.title ?? '',
                    isCompleted: st.isCompleted ?? false,
                    order: st.order ?? 0,
                    completedDate: st.completedDate
                })
        );

        return task;
    }

    /**
     * Check if form has validation error for a field.
     */
    public hasError(field: string, error: string): boolean {
        const control = this.form.get(field);
        return (control?.hasError(error) && (control?.touched || control?.dirty)) ?? false;
    }

    /**
     * Get error message for a field.
     */
    public getErrorMessage(field: string): string {
        const control = this.form.get(field);
        if (!control?.errors) return '';

        if (control.hasError('required')) return 'This field is required';
        if (control.hasError('maxlength')) {
            const maxLength = control.errors['maxlength'].requiredLength;
            return `Maximum ${maxLength} characters allowed`;
        }
        if (control.hasError('dateRangeInvalid')) return 'Due date must be on or after start date';

        return 'Invalid value';
    }

    /**
     * Track subtasks by ID for ngFor optimization.
     */
    public trackBySubTaskId(index: number, control: FormGroup): string {
        return control.get('id')?.value ?? index.toString();
    }
}

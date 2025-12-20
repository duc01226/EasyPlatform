/**
 * @fileoverview Platform Form Component for reactive form management with advanced features.
 *
 * This module provides a sophisticated base class for managing reactive forms with automatic
 * view model synchronization, validation handling, mode management, and child form support.
 * It extends the PlatformVmComponent to provide comprehensive form functionality.
 *
 * @module PlatformFormComponent
 * @since 1.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, Directive, EventEmitter, Input, OnInit, Output, QueryList, signal, Signal, WritableSignal } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormControlStatus, FormGroup, ValidatorFn } from '@angular/forms';

import { asyncScheduler, delay, filter, map, merge, Observable, throttleTime } from 'rxjs';

import { clone } from 'lodash-es';
import { PartialDeep } from 'type-fest';
import { ArrayElement } from 'type-fest/source/internal';
import { Dictionary } from '../../common-types';
import { IPlatformFormValidationError } from '../../form-validators';
import { FormHelpers } from '../../helpers';
import { distinctUntilObjectValuesChanged } from '../../rxjs';
import { immutableUpdate, ImmutableUpdateOptions, isDifferent, isSinglePrimitiveOrImmutableType, keys, task_delay, toPlainObj } from '../../utils';
import { IPlatformVm, PlatformFormMode, requestStateDefaultKey } from '../../view-models';
import { ComponentStateStatus, PlatformComponent } from './platform.component';
import { PlatformVmComponent } from './platform.vm-component';

/**
 * Interface contract for platform form components that provides essential form operations.
 *
 * This interface defines the core methods that any platform form component must implement
 * to support form validation, child form management, form control access, and error handling.
 * It ensures consistent behavior across all form components in the platform.
 *
 * @interface IPlatformFormComponent
 * @template TViewModel - The view model type that extends IPlatformVm
 *
 * @example
 * ```typescript
 * // Implementation in a custom form component
 * export class MyFormComponent implements IPlatformFormComponent<MyViewModel> {
 *
 *   isFormValid(): boolean {
 *     return this.form.valid && this.customValidation();
 *   }
 *
 *   validateForm(): boolean {
 *     this.form.markAllAsTouched();
 *     return this.isFormValid();
 *   }
 *
 *   formControls(key: keyof MyViewModel): FormControl {
 *     return this.form.get(key as string) as FormControl;
 *   }
 *
 *   formControlsError(controlKey: keyof MyViewModel, errorKey: string): IPlatformFormValidationError | null {
 *     const control = this.formControls(controlKey);
 *     return control?.errors?.[errorKey] || null;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Real-world usage in form template management
 * export class UpsertFormTemplateQuestionComponent
 *   extends AppBaseFormComponent<UpsertFormTemplateQuestionFormVm>
 *   implements IPlatformFormComponent<UpsertFormTemplateQuestionFormVm> {
 *
 *   // Implementation ensures consistent form behavior across the platform
 *   validateForm(): boolean {
 *     this.form.markAllAsTouched();
 *     return this.isFormValid() && this.validateQuestionAnswerOptions();
 *   }
 * }
 * ```
 */
export interface IPlatformFormComponent<TViewModel extends IPlatformVm> {
    /**
     * Checks if the form is currently valid without triggering validation.
     *
     * This method performs a passive validation check, examining the current state
     * of the form without modifying it. It should return true only if all form
     * controls are valid and any custom validation logic passes.
     *
     * @returns {boolean} True if the form is valid, false otherwise
     *
     * @example
     * ```typescript
     * if (this.isFormValid()) {
     *   // Proceed with form submission
     *   this.submitForm();
     * } else {
     *   // Show validation errors
     *   this.showErrors();
     * }
     * ```
     */
    isFormValid(): boolean;

    /**
     * Validates all child forms in the component.
     *
     * This method recursively validates all child form components, ensuring that
     * complex forms with nested components are fully validated. It's particularly
     * useful for multi-step forms or forms with dynamic child components.
     *
     * @param {QueryList<IPlatformFormComponent<IPlatformVm>>[]} forms - Array of QueryLists containing child form components
     * @returns {boolean} True if all child forms are valid, false otherwise
     *
     * @example
     * ```typescript
     * @ViewChildren(ChildFormComponent) childForms!: QueryList<ChildFormComponent>;
     *
     * validateAllForms(): boolean {
     *   return this.isAllChildFormsValid([this.childForms]);
     * }
     * ```
     */
    isAllChildFormsValid(forms: QueryList<IPlatformFormComponent<IPlatformVm>>[]): boolean;

    /**
     * Triggers form validation and marks controls as touched.
     *
     * This method actively validates the form by marking all controls as touched
     * and running validation logic. It should be called when the user attempts
     * to submit the form or when explicit validation is required.
     *
     * @returns {boolean} True if validation passes, false otherwise
     *
     * @example
     * ```typescript
     * onSubmit() {
     *   if (this.validateForm()) {
     *     this.processFormData();
     *   } else {
     *     this.highlightErrors();
     *   }
     * }
     * ```
     */
    validateForm(): boolean;

    /**
     * Validates all child forms and marks them as touched.
     *
     * This method extends validateForm() to include child form validation,
     * ensuring that the entire form hierarchy is validated before submission.
     *
     * @param {QueryList<IPlatformFormComponent<IPlatformVm>>[]} forms - Array of QueryLists containing child form components
     * @returns {boolean} True if all forms (including children) are valid, false otherwise
     *
     * @example
     * ```typescript
     * onCompleteValidation() {
     *   const allChildForms = [this.sectionForms, this.dynamicForms];
     *   return this.validateAllChildForms(allChildForms);
     * }
     * ```
     */
    validateAllChildForms(forms: QueryList<IPlatformFormComponent<IPlatformVm>>[]): boolean;

    /**
     * Retrieves a specific form control by view model property key.
     *
     * This method provides type-safe access to form controls using the view model's
     * property names. It ensures that form controls are properly typed and accessible.
     *
     * @param {keyof TViewModel} key - The property key from the view model
     * @returns {FormControl} The form control associated with the specified key
     *
     * @example
     * ```typescript
     * // Access the 'email' form control
     * const emailControl = this.formControls('email');
     * emailControl.setValue('new@email.com');
     *
     * // Check if control is disabled
     * if (this.formControls('status').disabled) {
     *   // Handle disabled state
     * }
     * ```
     */
    formControls(key: keyof TViewModel): FormControl;

    /**
     * Retrieves a specific validation error from a form control.
     *
     * This method provides easy access to validation errors for displaying
     * user-friendly error messages. It returns the error object if present,
     * or null if the specified error doesn't exist.
     *
     * @param {keyof TViewModel} controlKey - The form control's property key
     * @param {string} errorKey - The specific error type to retrieve
     * @returns {IPlatformFormValidationError | null} The error object or null if not found
     *
     * @example
     * ```typescript
     * // Check for required field error
     * const requiredError = this.formControlsError('email', 'required');
     * if (requiredError) {
     *   this.showError('Email is required');
     * }
     *
     * // Check for custom validation error
     * const customError = this.formControlsError('password', 'passwordStrength');
     * if (customError) {
     *   this.showError(customError.message);
     * }
     * ```
     */
    formControlsError(controlKey: keyof TViewModel, errorKey: string): IPlatformFormValidationError | null;
}

/**
 * Key Features:
 *
 * Form Initialization and Configuration:
 *
 * The class initializes and configures the Angular reactive form based on the provided formConfig and form inputs.
 * If the formConfig and form are not provided via input, it initializes an empty form.
 * Throttles user input changes using RxJS throttleTime to enhance performance.
 *
 * Dynamic Form Control Handling:
 *
 * Dynamically handles different types of form controls, including regular form controls and form arrays.
 * Utilizes reactive form features like value changes subscriptions to update the view model and trigger validations.
 *
 * Form Validation:
 *
 * Provides methods for validating the entire form (validateForm) and all child forms (validateAllChildForms).
 * Supports group validations and dependent validations, allowing one control's validation to depend on others.
 *
 * Mode Management:
 *
 * Manages different modes for the form, such as 'create', 'update', and 'view'.
 * Automatically enables and disables the form based on the mode, triggering necessary updates and validations.
 *
 * Integration with ViewModel:
 *
 * Bridges the gap between the reactive form and the underlying view model (IPlatformVm).
 * Facilitates the synchronization of form values with the view model and vice versa.
 *
 * Event Emission:
 * Emits events when the view model changes (vmChangeEvent).
 */
@Directive()
export abstract class PlatformFormComponent<TViewModel extends IPlatformVm>
    extends PlatformVmComponent<TViewModel>
    implements IPlatformFormComponent<TViewModel>, OnInit
{
    /**
     * Delay in milliseconds for updating the view model when form values change.
     *
     * This small delay ensures that form value updates are properly scheduled in the event queue,
     * allowing Angular to complete other operations before processing view model updates.
     * It helps maintain a responsive user interface during rapid form interactions.
     *
     * @static
     * @readonly
     * @type {number}
     * @default 1
     */
    public static readonly updateVmOnFormValuesChangeDelayMs = 1;

    /**
     * Delay in milliseconds for processing form validations after form values change.
     *
     * This delay is necessary because we're using Angular signals for the view model.
     * When updateVmOnFormValuesChange runs, we need to ensure the value in the vm signal
     * is fully updated before running validations. This is especially important when
     * validation logic depends on vm signal values.
     *
     * @static
     * @readonly
     * @type {number}
     * @default 10
     */
    public static readonly processFormValidationsDelays = 10;

    /**
     * Creates an instance of PlatformFormComponent.
     *
     * The constructor initializes the base PlatformVmComponent class and prepares
     * the form infrastructure. Form initialization is deferred to the ngOnInit lifecycle
     * method to ensure proper setup and dependency availability.
     *
     * @constructor
     */
    public constructor() {
        super();
    }

    /**
     * Reactive signal that represents the current form validation status.
     *
     * This signal emits the Angular FormControlStatus value which can be 'VALID', 'INVALID',
     * 'PENDING', or 'DISABLED'. It's updated whenever the form status changes, and can be
     * used in templates to reactively display form status information.
     *
     * @public
     * @type {WritableSignal<FormControlStatus>}
     * @default 'VALID'
     *
     * @example
     * ```typescript
     * // In component class
     * if (this.formStatus$() === 'INVALID') {
     *   // Handle invalid form
     * }
     * ```
     *
     * @example
     * ```html
     * <!-- In component template -->
     * <div *ngIf="formStatus$() === 'PENDING'">Loading...</div>
     * <div *ngIf="formStatus$() === 'INVALID'">Please fix the errors</div>
     * ```
     */
    public formStatus$: WritableSignal<FormControlStatus> = signal('VALID');

    /**
     * Internal storage for the current form mode.
     * @protected
     * @type {PlatformFormMode}
     * @default 'create'
     */
    protected _mode: PlatformFormMode = 'create';

    /**
     * Gets the current form mode.
     *
     * The form mode determines the behavior and appearance of the form. Possible values are:
     * - 'create': Form is used for creating new entities
     * - 'update': Form is used for updating existing entities
     * - 'view': Form is used for read-only display of data
     *
     * @public
     * @returns {PlatformFormMode} The current form mode
     */
    public get mode(): PlatformFormMode {
        return this._mode;
    }

    /**
     * Sets the current form mode and applies appropriate behavior changes.
     *
     * When changing from 'view' mode to either 'create' or 'update' mode:
     * 1. The form controls are enabled to allow editing
     * 2. View model values are patched to the form
     * 3. Form validation is triggered
     *
     * @public
     * @param {PlatformFormMode} v - The new form mode to set
     *
     * @example
     * ```typescript
     * // Switch to edit mode
     * this.mode = 'update';
     *
     * // Switch to read-only mode
     * this.mode = 'view';
     * ```
     */
    @Input()
    public set mode(v: PlatformFormMode) {
        const prevMode = this._mode;
        this._mode = v;

        if (!this.initiated$.value) return;

        if (prevMode == 'view' && (v == 'create' || v == 'update')) {
            this.form.enable();
            this.patchVmValuesToForm(this.currentVm());
            this.validateForm();
        }
    }

    /**
     * Internal storage for the Angular reactive form instance.
     * @private
     * @type {FormGroup<PlatformFormGroupControls<TViewModel>>}
     */
    private _form!: FormGroup<PlatformFormGroupControls<TViewModel>>;

    /**
     * Gets the Angular reactive FormGroup instance for this form component.
     *
     * This FormGroup contains all the form controls that match the structure of the view model.
     * It provides access to form validation, value changes, and other form functionalities.
     *
     * @public
     * @returns {FormGroup<PlatformFormGroupControls<TViewModel>>} The FormGroup instance
     *
     * @example
     * ```typescript
     * // Check if form is valid
     * if (this.form.valid) {
     *   // Submit form
     * }
     *
     * // Access specific form control
     * const emailControl = this.form.get('email');
     * ```
     */
    public get form(): FormGroup<PlatformFormGroupControls<TViewModel>> {
        return this._form;
    }

    /**
     * Sets the Angular reactive FormGroup instance for this form component.
     *
     * When a new form instance is provided (typically via @Input binding), this setter
     * updates the internal form reference and triggers necessary initialization if the
     * component has already been initialized.
     *
     * @public
     * @param {FormGroup<PlatformFormGroupControls<TViewModel>>} v - The new FormGroup instance
     */
    @Input()
    public set form(v: FormGroup<PlatformFormGroupControls<TViewModel>>) {
        this._form = v;
        if (this.initiated$.value) this.onFormInputChanged();
    }

    /**
     * Event emitted when the form's values or status change.
     *
     * This output event allows parent components to listen to changes in the form state,
     * including value changes, validation status changes, and touched/dirty state changes.
     * It emits the complete FormGroup instance when any change occurs.
     *
     * @public
     * @type {EventEmitter<FormGroup<PlatformFormGroupControls<TViewModel>>>}
     *
     * @example
     * ```html
     * <!-- In parent component template -->
     * <my-form (formChange)="onFormChanged($event)"></my-form>
     * ```
     *
     * @example
     * ```typescript
     * // In parent component class
     * onFormChanged(form: FormGroup) {
     *   console.log('Form changed:', form.value);
     *   console.log('Form valid:', form.valid);
     *   this.updateFormState(form);
     * }
     * ```
     */
    @Output('formChange')
    public formChangeEvent = new EventEmitter<FormGroup<PlatformFormGroupControls<TViewModel>>>();

    /**
     * Configuration object that defines the form structure, validations, and behavior.
     *
     * This input property allows parent components to provide a complete form configuration
     * that includes form controls, validation rules, and lifecycle callbacks. When provided,
     * this configuration is used to build and initialize the reactive form.
     *
     * @public
     * @type {PlatformFormConfig<TViewModel>}
     *
     * @example
     * ```typescript
     * // In parent component template
     * <my-form [formConfig]="myFormConfiguration"></my-form>
     *
     * // In parent component class
     * myFormConfiguration: PlatformFormConfig<MyViewModel> = {
     *   controls: {
     *     name: new FormControl('', [Validators.required]),
     *     email: new FormControl('', [Validators.required, Validators.email])
     *   },
     *   groupValidations: [['password', 'confirmPassword']],
     *   afterInit: () => console.log('Form ready')
     * };
     * ```
     */
    @Input() public formConfig!: PlatformFormConfig<TViewModel>;

    /**
     * Indicates whether the form is currently in 'view' mode (read-only).
     *
     * When in view mode, form controls are disabled and the form cannot be edited.
     * This is useful for displaying information without allowing changes.
     *
     * @public
     * @returns {boolean} True if the form is in view mode, false otherwise
     *
     * @example
     * ```html
     * <!-- In component template -->
     * <div *ngIf="isViewMode" class="view-mode-indicator">Read Only</div>
     * <button *ngIf="isViewMode" (click)="mode = 'update'">Edit</button>
     * ```
     */
    public get isViewMode(): boolean {
        return this.mode === 'view';
    }

    /**
     * Indicates whether the form is currently in 'create' mode.
     *
     * Create mode is used when creating new entities. In this mode, the form is enabled
     * for editing and typically starts with default or empty values.
     *
     * @public
     * @returns {boolean} True if the form is in create mode, false otherwise
     *
     * @example
     * ```typescript
     * // In component class
     * if (this.isCreateMode) {
     *   this.setDefaultValues();
     * }
     * ```
     */
    public get isCreateMode(): boolean {
        return this.mode === 'create';
    }

    /**
     * Indicates whether the form is currently in 'update' mode.
     *
     * Update mode is used when editing existing entities. In this mode, the form is enabled
     * for editing and typically starts with the current values of the entity being edited.
     *
     * @public
     * @returns {boolean} True if the form is in update mode, false otherwise
     *
     * @example
     * ```typescript
     * // In component class
     * submitForm() {
     *   if (this.isUpdateMode) {
     *     this.updateExistingEntity();
     *   } else {
     *     this.createNewEntity();
     *   }
     * }
     * ```
     */
    public get isUpdateMode(): boolean {
        return this.mode === 'update';
    }

    /**
     * Flag indicating whether the form was provided via input binding.
     *
     * When true, the form initialization logic will respect the provided form structure
     * instead of creating a new form based on the initialFormConfig.
     *
     * @public
     * @type {boolean}
     * @default false
     */
    public isFormGivenFromInput = false;

    /**
     * Computed signal that indicates whether the form is currently in a loading state.
     *
     * A form is considered to be loading when either:
     * 1. The form status is 'PENDING' and the underlying form's status is also 'PENDING'
     * 2. The component's status is 'Loading'
     *
     * This signal can be used in templates to show loading indicators during async operations.
     *
     * @public
     * @type {Signal<boolean>}
     *
     * @example
     * ```html
     * <div *ngIf="isFormLoading()">Loading form data...</div>
     * <form *ngIf="!isFormLoading()"><!-- Form content --></form>
     * ```
     */
    public isFormLoading = computed(
        () => (this.formStatus$() == 'PENDING' && this.form?.status == 'PENDING') || this.status$() == ComponentStateStatus.Loading
    );

    /**
     * Cache for form loading signals organized by request key.
     *
     * This cache prevents recreating signals for the same request key,
     * improving performance by reusing existing signals.
     *
     * @protected
     * @type {Dictionary<Signal<boolean | null>>}
     */
    protected cachedFormLoading$: Dictionary<Signal<boolean | null>> = {};

    /**
     * Updates the view model with partial state changes and optionally marks the form as dirty.
     *
     * This override of the base updateVm method adds form-specific behavior: when the view model
     * is updated, the form can be automatically marked as dirty to indicate unsaved changes.
     *
     * @protected
     * @param {PartialDeep<TViewModel> | Partial<TViewModel> | ((state: TViewModel) => void | PartialDeep<TViewModel>)} partialStateOrUpdaterFn -
     *        The partial state or updater function to apply to the current view model
     * @param {(vm: TViewModel) => unknown} [onVmChanged] - Optional callback function called after the view model has been updated
     * @param {ImmutableUpdateOptions} [immutableUpdateOptions] - Options for controlling the immutable update behavior
     * @param {boolean} [markFormDirty=true] - Whether to mark the form as dirty after updating the view model
     * @returns {TViewModel} The updated view model
     *
     * @example
     * ```typescript
     * // Update user name and mark form dirty
     * this.updateVm({ name: 'John Doe' });
     *
     * // Update user name without marking form dirty
     * this.updateVm({ name: 'John Doe' }, undefined, undefined, false);
     *
     * // Update with callback
     * this.updateVm({ name: 'John Doe' }, (vm) => {
     *   console.log('Name updated to:', vm.name);
     * });
     * ```
     */
    protected override updateVm(
        partialStateOrUpdaterFn: PartialDeep<TViewModel> | Partial<TViewModel> | ((state: TViewModel) => void | PartialDeep<TViewModel>),
        onVmChanged?: (vm: TViewModel) => unknown,
        immutableUpdateOptions?: ImmutableUpdateOptions,
        markFormDirty: boolean = true
    ): TViewModel {
        return super.updateVm(
            partialStateOrUpdaterFn,
            vm => {
                if (onVmChanged != undefined) onVmChanged(vm);
                if (markFormDirty && this.form != undefined) this.form.markAsDirty();
            },
            immutableUpdateOptions
        );
    }

    /**
     * Returns a Signal that emits the form loading state (true or false) associated with the specified request key.
     *
     * This method provides a way to track loading states for specific operations within the form.
     * It creates and caches computed signals based on the combination of form pending status
     * and component loading status for a given request key.
     *
     * @public
     * @param {string} [requestKey=requestStateDefaultKey] - A key to identify the request
     * @returns {Signal<boolean | null>} A signal that emits true when loading, false when not loading, or null if unavailable
     *
     * @example
     * ```typescript
     * // Track loading state for the default request
     * const isLoading = this.isFormLoading$();
     *
     * // Track loading state for a specific operation
     * const isSavingUser = this.isFormLoading$('saveUser');
     * ```
     *
     * @example
     * ```html
     * <!-- In component template -->
     * <button [disabled]="isFormLoading$('saveUser')()">
     *   {{ isFormLoading$('saveUser')() ? 'Saving...' : 'Save' }}
     * </button>
     * ```
     */
    public isFormLoading$(requestKey: string = requestStateDefaultKey): Signal<boolean | null> {
        if (this.cachedFormLoading$[requestKey] == null) {
            this.cachedFormLoading$[requestKey] = computed(() => this.form.pending || this.isLoading$(requestKey)());
        }
        return this.cachedFormLoading$[requestKey]!;
    }

    /**
     * Abstract method responsible for providing the initial configuration for the platform form.
     *
     * @remarks
     * This method is meant to be implemented by derived classes to define the initial form configuration,
     * including form controls, group validations, dependent validations, and any other relevant settings.
     * It is crucial for initializing the platform form with the correct structure and settings.
     *
     * @example
     * // Example implementation in a derived class:
     * protected initialFormConfig(): PlatformFormConfig<TViewModel> | undefined {
     *    return {
     *        controls: {
     *            username: new FormControl('', [Validators.required, Validators.minLength(3)]),
     *            email: new FormControl('', [Validators.required, Validators.email]),
     *            // ... other form controls ...
     *        },
     *        groupValidations: [
     *            ['password', 'confirmPassword'], // Validation for matching passwords
     *            // ... other group validations ...
     *        ],
     *        dependentValidations: {
     *            dependentProp: ['dependedOnProp1', 'dependedOnProp2'],
     *            // ... other dependent validations ...
     *        },
     *        afterInit: () => {
     *            console.log('Form initialized successfully');
     *            // ... other initialization logic ...
     *        },
     *        childForms: () => [childForm1, childForm2, ...],
     *    };
     * }
     *
     * @returns Initial configuration for the platform form, including form controls and related settings.
     * @throws Error if the method is not implemented in the derived class or returns an undefined value.
     *
     * @typeparam TViewModel - The type representing the view model for the form.
     */
    protected abstract initialFormConfig: () => PlatformFormConfig<TViewModel> | undefined;

    /**
     * Internal flag to track whether the form was provided via input binding.
     * @private
     * @type {boolean}
     */
    private isFormGivenViaInput?: boolean;

    /**
     * Initializes the component and sets up form infrastructure.
     *
     * This method determines whether the form should be initialized from external inputs
     * (formConfig and form properties) or created internally using the abstract initialFormConfig method.
     * It also sets up the proper initialization flow based on component readiness.
     *
     * @public
     * @override
     */
    public override ngOnInit(): void {
        this.isFormGivenViaInput = this.formConfig != null && this.form != null;

        this.initVm(undefined, () => {
            // If form and formConfig has NOT been given via input
            if (!this.isFormGivenViaInput) {
                if (this.initiated$.value && this.vm() != null) {
                    this.initForm();
                } else {
                    // Init empty form
                    this._form = new FormGroup<PlatformFormGroupControls<TViewModel>>(<any>{});

                    this.storeAnonymousSubscription(
                        this.initiated$.pipe(filter(initiated => initiated)).subscribe(() => {
                            this.initForm(true);
                        })
                    );
                }
            } else {
                this.setUpInputForm();
            }
        });

        this.ngOnInitCalled$.next(true);
    }

    /**
     * Handles changes to the form input binding.
     *
     * This method is called when a new form is provided via input binding after
     * the component has been initialized. It sets up the form for proper usage.
     *
     * @public
     */
    public onFormInputChanged() {
        this.setUpInputForm();
    }

    /**
     * Sets up a form that was provided via input binding.
     *
     * This method:
     * 1. Registers event handlers and change detection for the form
     * 2. Marks the form as externally provided
     * 3. Performs initial validation to show errors if needed
     * 4. Sets the form to pristine state (as if it was never touched)
     *
     * @public
     */
    public setUpInputForm() {
        // Register on case child form given from parent but not self init
        // need to register activate change detection to show form info correctly on html
        this.registerFormEventsSignalAndChangeDetection();
        this.isFormGivenFromInput = true;

        this.selfValidateForm(false);
        // First time try validate form just to show errors but still want to mark form as pristine like it's never touched
        this.form.markAsPristine();
    }

    /**
     * Validates the form if not in view mode.
     *
     * This method validates the form and optionally marks it as touched and dirty.
     * If the form is in view mode, validation is skipped since the form is read-only.
     *
     * @public
     * @param {boolean} [markAsTouchedAndDirty=true] - Whether to mark the form controls as touched and dirty during validation
     */
    public selfValidateForm(markAsTouchedAndDirty: boolean = true) {
        if (!this.isViewMode) this.validateForm(markAsTouchedAndDirty);
    }

    /**
     * Registers event handlers for form status and value changes.
     *
     * This method sets up subscriptions to:
     * 1. Form status changes (valid/invalid/pending)
     * 2. Form value changes
     * 3. Individual control status changes
     * 4. Individual control value changes
     *
     * When any of these events occur, it:
     * - Updates the formStatus$ signal
     * - Emits the formChangeEvent
     * - Triggers change detection
     *
     * All events are throttled to improve performance during rapid form interactions.
     *
     * @public
     *
     * @example
     * ```typescript
     * // This is typically called automatically, but can be called manually if needed
     * this.registerFormEventsSignalAndChangeDetection();
     * ```
     */
    public registerFormEventsSignalAndChangeDetection() {
        this.cancelStoredSubscription('registerFormEventsChangeDetection');

        if (this.form != undefined) {
            this.formStatus$.set(this.form.status);

            this.storeSubscription(
                'registerFormEventsChangeDetection',
                merge(
                    ...[
                        this.form.statusChanges,
                        this.form.valueChanges,
                        ...Object.keys(this.form.controls).map(ctrKey => this.form.get(ctrKey)!.statusChanges),
                        ...Object.keys(this.form.controls).map(ctrKey => this.form.get(ctrKey)!.valueChanges)
                    ]
                )
                    .pipe(
                        this.untilDestroyed(),
                        throttleTime(PlatformComponent.defaultDetectChangesThrottleTime, asyncScheduler, {
                            leading: true,
                            trailing: true
                        })
                    )
                    .subscribe(v => {
                        this.formStatus$.set(this.form.status);
                        this.formChangeEvent.emit(this.form);
                        this.detectChanges();
                    })
            );
        }
    }

    /**
     * Reloads the platform form component by reinitializing the underlying view model, form, and clearing error messages.
     * This method is useful when you need to reset the form to its initial state, such as when navigating to a new item or
     * resetting the form after a submission.
     *
     * @remarks
     * This method triggers the initialization of the view model (`initVm`), the form (`initForm`), and clears all error
     * messages associated with the form (`clearAllErrorMsgs`). It is typically called when there is a need to reset the
     * state of the form, ensuring that it reflects the intended initial state.
     *
     * @example
     * // Example usage:
     * const platformForm = new MyPlatformFormComponent();
     * platformForm.reload(); // Reloads the form to its initial state.
     */
    public override reload() {
        this.clearAllErrorMsgs();
        this.initVm(true, () => {
            this.initForm(true);
        });
    }

    /**
     * Initializes the Angular reactive form associated with the platform form component.
     *
     * @param forceReinit - If set to true, forces the reinitialization of the form even if it has been previously initialized.
     *
     * @remarks
     * This method is responsible for constructing and configuring the reactive form based on the provided `formConfig`. If
     * the `formConfig` and `form` are not provided via input, it initializes an empty form. It also sets up throttling for
     * user input changes using RxJS `throttleTime` to enhance performance by reducing unnecessary emissions during fast typing.
     *
     * The method dynamically handles different types of form controls, including regular form controls and form arrays.
     * It utilizes reactive form features like value changes subscriptions to update the view model and trigger validations.
     *
     * Additionally, this method is part of the lifecycle of the platform form component and is automatically called during
     * the Angular component lifecycle (`ngOnInit`), ensuring that the form is properly initialized when the component is
     * created.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> implements OnInit {
     *    ngOnInit(): void {
     *        this.initForm();
     *    }
     * }
     * ```
     *
     * @throws {Error} Throws an error if the initial form configuration is undefined or if both the form and formConfig
     *                are not provided via input.
     */
    protected initForm(forceReinit: boolean = false) {
        if (this.formConfig != null && this.form != null && !forceReinit) return;

        const initialFormConfig = this.initialFormConfig();
        if (initialFormConfig == undefined) throw new Error('initialFormConfig must not be undefined or formConfig and form must be input');

        this.formConfig = initialFormConfig;
        this._form = <FormGroup<PlatformFormGroupControls<TViewModel>>>this.buildForm(this.formConfig);

        this.registerFormEventsSignalAndChangeDetection();

        if (forceReinit) {
            keys(this.form.controls).forEach(formControlKey => {
                this.cancelStoredSubscription(buildControlValueChangesSubscriptionKey(formControlKey));
            });
        }

        /***
         ThrottleTime explain: Delay to enhance performance when user typing fast do not need to emit
         { leading: true, trailing: true } <=> emit the first item to ensure ui is not delay, but also ignore the sub-sequence,
         and still emit the latest item to ensure data is latest

         source_1:          --0--1-----2--3----4--5-6---7------------8-------9---------
         throttle interval: --[~~~~~~~~~~~I~~~~~~~~~~~I~~~~~~~~~~~I~~~~~~~~~~~I~~~~~~~~
         output:            --0-----------3-----------6-----------7-----------9--------

         source_2:          --0--------1------------------2--------------3---4---------
         throttle interval: --[~~~~~~~~~~~I~~~~~~~~~~~]---[~~~~~~~~~~~]--[~~~~~~~~~~~I~
         output_2:          --0-----------1---------------2--------------3-----------4-

		 */
        keys(this.form.controls).forEach(formControlKey => {
            this.storeSubscription(
                buildControlValueChangesSubscriptionKey(formControlKey),
                (<FormControl>(<Dictionary<unknown>>this.form.controls)[formControlKey]).valueChanges
                    .pipe(
                        throttleTime(PlatformComponent.defaultDetectChangesThrottleTime, asyncScheduler, {
                            leading: true,
                            trailing: true
                        }),
                        distinctUntilObjectValuesChanged(),
                        map(value => {
                            const currentReactiveFormValues = <Dictionary<TViewModel[keyof TViewModel]>>this.getCurrentReactiveFormControlValues();
                            const hasVmChanged = this.updateVmOnFormValuesChange(<Partial<TViewModel>>{ [formControlKey]: value }, currentReactiveFormValues);

                            return hasVmChanged;
                        }),
                        delay(PlatformFormComponent.updateVmOnFormValuesChangeDelayMs) // Delay updateVmOnFormValuesChangeDelayMs to push item in async queue to ensure control value has been updated to run processMainFormValidations
                    )
                    .subscribe(hasVmChanged => {
                        if (hasVmChanged) this.processMainFormOtherRelatedValidations(<keyof TViewModel>formControlKey);
                    })
            );
        });

        this.patchVmValuesToForm(this.currentVm(), false);

        if (this.isViewMode) this.form.disable();

        if (this.formConfig.afterInit != null && this.form != undefined) this.formConfig.afterInit();

        // setTimeout to ensure revalidate form after form directive view rendered
        // validate form to trigger form-status change check and emit
        setTimeout(() => this.selfValidateForm(false));

        function buildControlValueChangesSubscriptionKey(formControlKey: string): string {
            return `initForm_${formControlKey}_valueChanges`;
        }
    }

    protected override internalSetVm = (
        v: TViewModel | undefined,
        shallowCheckDiff: boolean = true,
        onVmChanged?: (vm: TViewModel | undefined) => unknown,
        currentReactiveFormValues?: Dictionary<TViewModel[keyof TViewModel]>
    ): boolean => {
        if (shallowCheckDiff == false || this._vm != v) {
            const prevVm = this._vm;

            this._vm = v;
            this.vm.set(v);

            if (v != undefined && this.initiated$.value && this.formConfig != undefined) this.patchVmValuesToForm(v, true, currentReactiveFormValues);
            if (this.initiated$.value || prevVm == undefined) this.vmChangeEvent.emit(v);

            if (onVmChanged != undefined) onVmChanged(this._vm);

            this.detectChanges();

            return true;
        }

        return false;
    };

    /**
     * Checks if the current form is valid, including all child forms if configured.
     *
     * This method provides a comprehensive validation check that considers:
     * 1. The validity of the main form (this.form?.valid)
     * 2. The validity of all child forms if childForms are defined in formConfig
     *
     * The method is designed to handle cases where the form or formConfig might not be
     * fully initialized yet (e.g., during async initialization), returning false safely.
     *
     * @public
     * @returns {boolean} True if both the main form and all child forms are valid, false otherwise
     *
     * @example
     * ```typescript
     * // Check if form is ready for submission
     * if (this.isFormValid()) {
     *   this.enableSubmitButton();
     * } else {
     *   this.disableSubmitButton();
     * }
     *
     * // Use in template to conditionally show content
     * // Template: <div *ngIf="isFormValid()">Form is ready!</div>
     * ```
     */
    public isFormValid(): boolean {
        // form or formConfig if it's initiated asynchronous, waiting call api but the component template use isFormValid
        // so that it could be undefined. check to prevent the bug
        return this.form?.valid && (this.formConfig?.childForms == undefined || this.isAllChildFormsValid(this.formConfig.childForms()));
    }

    /**
     * Determines whether the form can be submitted based on its current state.
     *
     * A form is considered submittable when:
     * 1. It is valid (passes all validations)
     * 2. It is not currently loading
     * 3. Either it has been modified (not pristine) OR canSubmitPristineForm returns true
     *
     * This method is useful for controlling the enabled state of submit buttons.
     *
     * @public
     * @returns {boolean} True if the form can be submitted, false otherwise
     *
     * @example
     * ```html
     * <!-- In component template -->
     * <button type="submit" [disabled]="!canSubmitForm()">Submit</button>
     * ```
     */
    public canSubmitForm() {
        return this.isFormValid() && !this.isFormLoading() && (this.canSubmitPristineForm || !this.form.pristine);
    }

    /**
     * Determines whether pristine (unmodified) forms can be submitted.
     *
     * By default, pristine forms cannot be submitted as a safeguard against
     * submitting forms that the user hasn't interacted with. Override this
     * property in derived classes to allow submitting pristine forms when needed.
     *
     * @public
     * @returns {boolean} True if pristine forms can be submitted, false otherwise (default: false)
     *
     * @example
     * ```typescript
     * // In derived class
     * public get canSubmitPristineForm() {
     *   return true; // Allow submitting even when form is pristine
     * }
     * ```
     */
    public get canSubmitPristineForm() {
        return false;
    }

    /**
     * Validates all child forms to ensure they are in a valid state.
     *
     * This method recursively checks the validity of all child form components,
     * supporting both individual form components and QueryLists of form components.
     * It's used internally by form validation logic to ensure comprehensive validation.
     *
     * @public
     * @param {(QueryList<IPlatformFormComponent<IPlatformVm>> | IPlatformFormComponent<IPlatformVm>)[]} forms - Array containing child form components or QueryLists
     * @returns {boolean} True if all child forms are valid, false if any child form is invalid
     *
     * @example
     * ```typescript
     * // Check validity of multiple child form groups
     * const allValid = this.isAllChildFormsValid([
     *   this.personalInfoForms,
     *   this.addressForms,
     *   this.emergencyContactForm
     * ]);
     * ```
     */
    public isAllChildFormsValid(forms: (QueryList<IPlatformFormComponent<IPlatformVm>> | IPlatformFormComponent<IPlatformVm>)[]): boolean {
        const invalidChildFormsGroup = forms.find(childFormOrFormsGroup =>
            childFormOrFormsGroup instanceof QueryList
                ? childFormOrFormsGroup.find(formComponent => !formComponent.isFormValid()) != undefined
                : !childFormOrFormsGroup.isFormValid()
        );

        return invalidChildFormsGroup == undefined;
    }

    /**
     * Validates the current form and marks all controls as touched and dirty if needed.
     *
     * This method performs comprehensive form validation by:
     * 1. Calling FormHelpers.validateAllFormControls to validate all controls
     * 2. Optionally marking all controls as touched and dirty
     * 3. Returning the overall validity status
     *
     * @public
     * @param {boolean} [markAsTouchedAndDirty=true] - Whether to mark all controls as touched and dirty during validation
     * @returns {boolean} True if the form is valid after validation, false otherwise
     *
     * @example
     * ```typescript
     * // Validate form before submission
     * if (this.validateForm()) {
     *   this.submitForm();
     * } else {
     *   this.showValidationErrors();
     * }
     *
     * // Validate without marking as touched (silent validation)
     * const isValid = this.validateForm(false);
     * ```
     */
    public validateForm(markAsTouchedAndDirty: boolean = true): boolean {
        FormHelpers.validateAllFormControls(this.form, markAsTouchedAndDirty);

        return this.isFormValid();
    }

    /**
     * Validates all child forms and triggers their validation logic.
     *
     * This method iterates through all provided child forms (whether individual components
     * or QueryLists) and calls validateForm() on each one. It's used to ensure that
     * complex forms with nested components are fully validated before submission.
     *
     * @public
     * @param {(QueryList<IPlatformFormComponent<IPlatformVm>> | IPlatformFormComponent<IPlatformVm>)[]} forms - Array of child forms to validate
     * @returns {boolean} True if all child forms are valid after validation, false if any child form is invalid
     *
     * @example
     * ```typescript
     * // Validate all child forms before submitting main form
     * const allChildFormsValid = this.validateAllChildForms([
     *   this.userDetailsForms,
     *   this.preferenceForms,
     *   this.securityForm
     * ]);
     *
     * if (allChildFormsValid && this.validateForm()) {
     *   this.submitCompleteForm();
     * }
     * ```
     */
    public validateAllChildForms(forms: (QueryList<IPlatformFormComponent<IPlatformVm>> | IPlatformFormComponent<IPlatformVm>)[]): boolean {
        const invalidChildFormsGroup = forms.find(childFormOrFormsGroup =>
            childFormOrFormsGroup instanceof QueryList
                ? childFormOrFormsGroup.find(formComponent => !formComponent.validateForm()) != undefined
                : !childFormOrFormsGroup.validateForm()
        );

        return invalidChildFormsGroup == undefined;
    }

    /**
     * Updates the values of the Angular reactive form based on the provided view model (`vm`).
     *
     * @param vm - The view model containing the values to be patched into the form.
     * @param runFormValidation - If set to true, triggers form validation after patching the values.
     *
     * @remarks
     * This method synchronizes the values between the view model (`vm`) and the reactive form. It iterates through the
     * properties of the view model and updates the corresponding form controls with the values from the view model. It
     * supports dynamic handling of different types of form controls, including regular form controls and form arrays.
     *
     * The `runFormValidation` parameter determines whether form validation should be triggered after updating the values.
     * If `runFormValidation` is set to true and the form is not in view mode, it also processes group validations and
     * dependent validations, ensuring that the form remains in a valid state.
     *
     * This method is a crucial part of maintaining the bidirectional data flow between the reactive form and the view model
     * within the platform form component. It is typically called after changes to the view model to reflect those changes
     * in the form.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> {
     *    // Other component methods...
     *
     *    someEventHandler(): void {
     *        // Assume vm is an instance of MyViewModel
     *        this.patchVmValuesToForm(vm);
     *    }
     * }
     * ```
     */
    public patchVmValuesToForm(vm: TViewModel, runFormValidation: boolean = true, currentReactiveFormValues?: Dictionary<TViewModel[keyof TViewModel]>): void {
        currentReactiveFormValues ??= <Dictionary<TViewModel[keyof TViewModel]>>this.getCurrentReactiveFormControlValues();
        const vmFormValues = <Dictionary<TViewModel[keyof TViewModel]>>this.getFromVmFormValues(vm, currentReactiveFormValues);

        const formControls = <PlatformFormGroupControls<TViewModel>>this.form.controls;

        keys(vmFormValues).forEach(formKey => {
            const vmFormKey = <keyof TViewModel>formKey;

            const vmFormKeyValue = vmFormValues[formKey];
            const formControl = formControls[vmFormKey];

            if (isDifferent(vmFormKeyValue, currentReactiveFormValues[formKey], false, true)) {
                if (formControl instanceof FormArray && vmFormKeyValue instanceof Array) {
                    const listControlformConfig = <PlatformFormGroupControlConfigPropArray<ArrayElement<TViewModel[keyof TViewModel]>>>(
                        this.formConfig.controls[vmFormKey]
                    );
                    const previousControls = clone((<FormArray>formControl).controls);

                    formControl.clear({ emitEvent: false });
                    vmFormKeyValue.forEach((modelItem: ArrayElement<TViewModel[keyof TViewModel]>, index) => {
                        const fromArrayControlItem = this.buildFromArrayControlItem(vmFormKey, listControlformConfig, modelItem, index);

                        formControl.push(fromArrayControlItem, {
                            emitEvent: false
                        });

                        if (previousControls[index] != null && previousControls[index]!.touched) formControl.at(index)!.markAllAsTouched();
                        if (previousControls[index] != null && previousControls[index]!.dirty) formControl.at(index)!.markAsDirty();
                        if (previousControls[index] != null && previousControls[index]!.pristine) formControl.at(index)!.markAsPristine();
                    });
                }

                this.form.patchValue(<any>{ [formKey]: vmFormKeyValue }, {
                    emitEvent: false
                });

                if (!this.isViewMode && runFormValidation) {
                    setTimeout(() => {
                        this.validateFormControl(this.form, vmFormKey);
                    }, PlatformFormComponent.processFormValidationsDelays);
                    this.processMainFormOtherRelatedValidations(vmFormKey);
                }
            }
        });
    }

    private processMainFormOtherRelatedValidations(vmFormKey: keyof TViewModel) {
        this.processGroupValidation(this.formConfig.groupValidations, 'mainForm', this.form, vmFormKey);
        this.processDependentValidations(this.formConfig.dependentValidations, 'mainForm', this.form, vmFormKey);
    }

    /**
     * Gets the current values from all reactive form controls.
     *
     * This method extracts the raw values from all form controls, including disabled controls,
     * and returns them as a partial view model object. It's useful for getting the complete
     * current state of the form.
     *
     * @public
     * @returns {Partial<TViewModel>} An object containing the current values of all form controls
     *
     * @example
     * ```typescript
     * // Get current form values for saving
     * const currentValues = this.getCurrentReactiveFormControlValues();
     * console.log('Current form state:', currentValues);
     *
     * // Compare with original values
     * const hasChanges = !isEqual(currentValues, this.originalValues);
     * ```
     */
    public getCurrentReactiveFormControlValues(): Partial<TViewModel> {
        const reactiveFormValues: Partial<TViewModel> = {};

        keys(this.formConfig.controls).forEach(formControlKey => {
            (<Dictionary<unknown>>reactiveFormValues)[formControlKey] = this.form.controls[formControlKey].getRawValue();
        });

        return reactiveFormValues;
    }

    /**
     * Extracts form values from a view model with the same structure as current reactive form values.
     *
     * This method creates a form-compatible representation of view model data by matching
     * the structure of the current reactive form. It handles nested objects, arrays, and
     * ensures proper null handling for missing properties.
     *
     * @public
     * @param {TViewModel | Dictionary<unknown> | unknown[]} vmValue - The view model value to extract from
     * @param {Dictionary<TViewModel[keyof TViewModel]> | Dictionary<unknown> | unknown[]} currentReactiveFormValues - The current form values for structure reference
     * @returns {Partial<TViewModel>} Form-compatible representation of the view model data
     */
    public getFromVmFormValues(
        vmValue: TViewModel | Dictionary<unknown> | unknown[],
        currentReactiveFormValues: Dictionary<TViewModel[keyof TViewModel]> | Dictionary<unknown> | unknown[]
    ): Partial<TViewModel> {
        const vmFormValues: Partial<TViewModel> = {};

        // Explain 1: keys(currentReactiveFormValues)
        // use currentReactiveFormValues as object to get keys from to build object get value from view model with structure (count and order of properties) same as structure
        // from currentReactiveFormValues => so that when compare isValueDifferent would be correct
        keys(currentReactiveFormValues).forEach(formControlKey => {
            const vmValueItem = (<Dictionary<unknown>>(<unknown>vmValue))[formControlKey];

            // vmValueItem === undefined => return null to make sure the vmFormValues result return must exist property formControlKey.
            // If set undefine => key in the object will not exist. Need to set null the make the key exist in the return result
            if (currentReactiveFormValues[formControlKey] instanceof Array || vmValueItem instanceof Array) {
                (<Dictionary<unknown>>vmFormValues)[formControlKey] =
                    vmValueItem === undefined
                        ? null
                        : (<unknown[]>vmValueItem).map((vmValueArrayItem, index) => {
                              const currentReactiveFormValueArrayItem =
                                  <unknown[]>currentReactiveFormValues[formControlKey] != null
                                      ? (<unknown[]>currentReactiveFormValues[formControlKey])[index]
                                      : null;

                              if (!isSinglePrimitiveOrImmutableType(vmValueArrayItem) && !isSinglePrimitiveOrImmutableType(currentReactiveFormValueArrayItem)) {
                                  return this.getFromVmFormValues(
                                      <Dictionary<unknown>>vmValueArrayItem,
                                      <Dictionary<unknown>>currentReactiveFormValueArrayItem
                                  );
                              }

                              return vmValueArrayItem;
                          });
            } else if (!isSinglePrimitiveOrImmutableType(vmValueItem) && !isSinglePrimitiveOrImmutableType(currentReactiveFormValues[formControlKey])) {
                (<Dictionary<unknown>>vmFormValues)[formControlKey] = this.getFromVmFormValues(
                    <Dictionary<unknown>>vmValueItem,
                    <Dictionary<unknown>>currentReactiveFormValues[formControlKey]
                );
            } else {
                // vmValueItem === undefined => return null to make sure the vmFormValues result return must exist property formControlKey.
                // If set undefine => key in the object will not exist. Need to set null the make the key exist in the return result
                (<Dictionary<unknown>>vmFormValues)[formControlKey] = vmValueItem === undefined ? null : vmValueItem;
            }
        });

        // To toPlainObj to ensure removing getter/setter which help angular lib can read prop keys and apply data from vm to form
        return toPlainObj(vmFormValues);
    }

    /**
     * Retrieves the Angular reactive form control associated with a specific key from the platform form component's form.
     *
     * @param key - The key (property name) corresponding to the control in the view model.
     *
     * @returns The Angular `FormControl` associated with the specified key.
     *
     * @remarks
     * This method provides a convenient way to access a specific form control within the platform form component's form.
     * It is especially useful for interacting with individual controls, such as getting or setting their values, checking
     * their validity, or applying specific actions based on user interactions with the form.
     *
     * The `key` parameter should match the property name in the view model for which you want to retrieve the form control.
     * If the property is an array, this method works with both regular form controls and form arrays, allowing dynamic
     * handling of different types of controls within the form.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> {
     *    // Other component methods...
     *
     *    someEventHandler(): void {
     *        // Assume 'propertyName' is a key in the view model
     *        const control = this.formControls('propertyName');
     *        // Now you can interact with the 'control' as needed
     *    }
     * }
     * ```
     */
    public formControls<TKey extends keyof TViewModel>(key: TKey): FormControl<TViewModel[TKey]> {
        return <FormControl<TViewModel[TKey]>>this.form.get(<string>key);
    }

    /**
     * Retrieves a form control from a specific form group using type-safe key access.
     *
     * This generic method allows accessing form controls from any form group within the component,
     * providing type safety and reusability across different form structures.
     *
     * @public
     * @template TFormModel - The type of the form model for the specific form group
     * @template TKey - The key type extending keyof TFormModel
     * @param {FormGroup<PlatformFormGroupControls<TFormModel>>} formGroup - The form group to search within
     * @param {TKey} key - The key identifying the form control
     * @returns {FormControl<TFormModel[TKey]>} The typed form control
     *
     * @example
     * ```typescript
     * // Access control from a nested form group
     * const nestedGroup = this.formChildGroups('address');
     * const cityControl = this.getFormControls(nestedGroup, 'city');
     * ```
     */
    public getFormControls<TFormModel, TKey extends keyof TFormModel>(
        formGroup: FormGroup<PlatformFormGroupControls<TFormModel>>,
        key: TKey
    ): FormControl<TFormModel[TKey]> {
        return <FormControl<TFormModel[TKey]>>formGroup.get(<string>key);
    }

    /**
     * Safely attempts to retrieve a form control, returning undefined if the form is not initialized.
     *
     * This method provides a safe way to access form controls when the form might not be
     * fully initialized yet. It's useful in early component lifecycle hooks or conditional scenarios.
     *
     * @public
     * @template TKey - The key type extending keyof TViewModel
     * @param {TKey} key - The key identifying the form control
     * @returns {FormControl<TViewModel[TKey]> | undefined} The form control or undefined if form is not ready
     *
     * @example
     * ```typescript
     * // Safe access during initialization
     * const emailControl = this.tryFormControls('email');
     * if (emailControl) {
     *   emailControl.setValue('default@example.com');
     * }
     * ```
     */
    public tryFormControls<TKey extends keyof TViewModel>(key: TKey): FormControl<TViewModel[TKey]> | undefined {
        if (this.form == undefined) return undefined;
        return this.formControls(key);
    }

    /**
     * Creates an observable stream of value changes for a specific form control.
     *
     * This method provides a reactive stream of value changes for a specific form control,
     * with built-in optimizations including delay, distinct value checking, and automatic cleanup.
     *
     * @public
     * @template TKey - The key type extending keyof TViewModel
     * @param {TKey} key - The key identifying the form control
     * @returns {Observable<TViewModel[TKey]>} Observable stream of control value changes
     *
     * @example
     * ```typescript
     * // React to email changes
     * this.formControlValueChanges('email').subscribe(email => {
     *   console.log('Email changed to:', email);
     *   this.validateEmailUniqueness(email);
     * });
     *
     * // Chain with other operators
     * this.formControlValueChanges('searchTerm').pipe(
     *   debounceTime(300),
     *   switchMap(term => this.searchService.search(term))
     * ).subscribe(results => {
     *   this.searchResults = results;
     * });
     * ```
     */
    public formControlValueChanges<TKey extends keyof TViewModel>(key: TKey): Observable<TViewModel[TKey]> {
        return this.formControls(key).valueChanges.pipe(
            delay(PlatformFormComponent.updateVmOnFormValuesChangeDelayMs, asyncScheduler), // Delay PlatformFormComponent.updateVmOnFormValuesChangeDelayMs to push item in async queue to ensure control value has been updated,
            distinctUntilObjectValuesChanged(),
            this.untilDestroyed()
        );
    }

    /**
     * Retrieves the Angular reactive form group control associated with a specific key from the platform form component's form.
     *
     * @param {TKey} key - The key (property name) corresponding to the form group control in the view model.
     *
     * @returns {FormGroup<PlatformFormGroupControls<TViewModel[TKey]>>} The Angular `FormGroup` control associated with the specified key.
     *
     * @remarks
     * This method provides a convenient way to access a specific form group control within the platform form component's form.
     * It is especially useful for interacting with a group of controls as a single unit, such as getting or setting their values,
     * checking their validity, or applying specific actions based on user interactions with the form.
     *
     * The `key` parameter should match the property name in the view model for which you want to retrieve the form group control.
     * If the property is an array, this method works with both regular form groups and nested form arrays, allowing dynamic
     * handling of different types of groups within the form.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> {
     *    // Other component methods...
     *
     *    someEventHandler(): void {
     *        // Assume 'groupPropertyName' is a key in the view model
     *        const groupControl = this.formChildGroups('groupPropertyName');
     *        // Now you can interact with the 'groupControl' as needed
     *    }
     * }
     */
    public formChildGroups<TKey extends keyof TViewModel>(key: TKey): FormGroup<PlatformFormGroupControls<TViewModel[TKey]>> {
        return <FormGroup<PlatformFormGroupControls<TViewModel[TKey]>>>(<unknown>this.form.get(<string>key));
    }

    /**
     * Retrieves the Angular reactive form array control associated with a specific key from the platform form component's form.
     *
     * @param key - The key (property name) corresponding to the form array control in the view model.
     *
     * @returns The Angular `FormArray` control associated with the specified key.
     *
     * @remarks
     * This method provides a convenient way to access a specific form array control within the platform form component's form.
     * It is especially useful for working with array controls, such as iterating over array elements, pushing new elements,
     * or accessing specific elements within the array.
     *
     * The `key` parameter should match the property name in the view model for which you want to retrieve the form array control.
     * This method is designed for cases where the property in the view model is an array, and it allows dynamic handling of
     * form array controls within the form.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> {
     *    // Other component methods...
     *
     *    someEventHandler(): void {
     *        // Assume 'arrayPropertyName' is an array key in the view model
     *        const arrayControl = this.formArrayControls('arrayPropertyName');
     *        // Now you can interact with the 'arrayControl' as needed
     *    }
     * }
     * ```
     */
    public formArrayControls<TKey extends keyof TViewModel>(key: TKey): FormArray<FormControl<ArrayElement<TViewModel[TKey]>>> {
        return <FormArray<FormControl<ArrayElement<TViewModel[TKey]>>>>(<unknown>this.form.get(<string>key));
    }

    /**
     * Retrieves a specific Angular reactive form control within a form array associated with a key from the platform form component's form.
     *
     * @param key - The key (property name) corresponding to the form array control in the view model.
     * @param index - The index of the form array element for which to retrieve the form control.
     *
     * @returns The Angular `FormControl` associated with the specified index in the form array control.
     *
     * @remarks
     * This method allows accessing a specific form control within a form array associated with the given key.
     * It is useful for scenarios where dynamic manipulation or validation of individual array elements is required.
     *
     * The `key` parameter should match the property name in the view model representing the form array,
     * and the `index` parameter specifies the position of the desired array element.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> {
     *    // Other component methods...
     *
     *    someEventHandler(): void {
     *        // Assume 'arrayPropertyName' is an array key in the view model
     *        // and 'desiredIndex' is the index of the specific array element
     *        const specificControl = this.formArrayControlsItem('arrayPropertyName', desiredIndex);
     *        // Now you can interact with the 'specificControl' as needed
     *    }
     * }
     * ```
     */
    public formArrayControlsItem<TKey extends keyof TViewModel>(key: TKey, index: number): FormControl<ArrayElement<TViewModel[TKey]>> {
        return this.formArrayControls(key).at(index);
    }

    /**
     * Retrieves the Angular reactive form array containing groups of form controls associated with a key from the platform form component's form.
     *
     * @param key - The key (property name) corresponding to the form array of groups in the view model.
     *
     * @returns The Angular `FormArray` containing groups of form controls associated with the specified key.
     *
     * @remarks
     * This method allows accessing a form array that contains groups of form controls associated with the given key.
     * It is particularly useful when dealing with complex nested forms where each element of the array represents a group of controls.
     *
     * The `key` parameter should match the property name in the view model representing the form array of groups.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> {
     *    // Other component methods...
     *
     *    someEventHandler(): void {
     *        // Assume 'arrayOfGroups' is an array key in the view model
     *        const groupArray = this.formArrayGroups('arrayOfGroups');
     *        // Now you can interact with the 'groupArray' and its contained form groups
     *    }
     * }
     * ```
     */
    public formArrayGroups<TKey extends keyof TViewModel>(key: TKey): FormArray<FormGroup<PlatformFormGroupControls<ArrayElement<TViewModel[TKey]>>>> {
        return <FormArray<FormGroup<PlatformFormGroupControls<ArrayElement<TViewModel[TKey]>>>>>(<unknown>this.form.get(<string>key));
    }

    /**
     * Retrieves a form array containing form groups from a specific form group using type-safe key access.
     *
     * This generic method allows accessing form arrays that contain form groups from any form group
     * within the component, providing type safety and reusability across different form structures.
     * It's particularly useful for complex nested forms with arrays of grouped controls.
     *
     * @public
     * @template TFormModel - The type of the form model for the specific form group
     * @template TKey - The key type extending keyof TFormModel
     * @param {FormGroup<PlatformFormGroupControls<TFormModel>>} formGroup - The form group to search within
     * @param {TKey} key - The key identifying the form array
     * @returns {FormArray<FormGroup<PlatformFormGroupControls<ArrayElement<TFormModel[TKey]>>>>} The typed form array containing form groups
     *
     * @example
     * ```typescript
     * // Access array of address groups from a nested form
     * const userFormGroup = this.formChildGroups('userDetails');
     * const addressArray = this.getFormArrayGroups(userFormGroup, 'addresses');
     *
     * // Iterate through each address group
     * addressArray.controls.forEach((addressGroup, index) => {
     *   console.log(`Address ${index}:`, addressGroup.value);
     * });
     * ```
     */
    public getFormArrayGroups<TFormModel, TKey extends keyof TFormModel>(
        formGroup: FormGroup<PlatformFormGroupControls<TFormModel>>,
        key: TKey
    ): FormArray<FormGroup<PlatformFormGroupControls<ArrayElement<TFormModel[TKey]>>>> {
        return <FormArray<FormGroup<PlatformFormGroupControls<ArrayElement<TFormModel[TKey]>>>>>(<unknown>formGroup.get(<string>key));
    }

    /**
     * Retrieves a specific form group from the Angular reactive form array containing groups of form controls associated with a key from the platform form component's form.
     *
     * @param key - The key (property name) corresponding to the form array of groups in the view model.
     * @param index - The index of the form group to retrieve within the form array.
     *
     * @returns The Angular `FormGroup` representing a specific group of form controls associated with the specified key and index.
     *
     * @remarks
     * This method allows accessing a specific form group within the form array that contains groups of form controls associated with the given key.
     * It is particularly useful when dealing with complex nested forms where each element of the array represents a group of controls.
     *
     * The `key` parameter should match the property name in the view model representing the form array of groups.
     * The `index` parameter represents the position of the desired form group within the form array.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> {
     *    // Other component methods...
     *
     *    someEventHandler(): void {
     *        // Assume 'arrayOfGroups' is an array key in the view model, and you want to access the form group at index 0
     *        const groupAtIndex = this.formArrayGroupsItem('arrayOfGroups', 0);
     *        // Now you can interact with the 'groupAtIndex' and its contained form controls
     *    }
     * }
     * ```
     */
    public formArrayGroupsItem<TKey extends keyof TViewModel>(key: TKey, index: number): FormGroup<PlatformFormGroupControls<ArrayElement<TViewModel[TKey]>>> {
        return this.formArrayGroups(key).at(index);
    }

    /**
     * Retrieves a specific form control from a nested form group within the Angular reactive form array containing groups of form controls associated with a key from the platform form component's form.
     *
     * @param key - The key (property name) corresponding to the form array of groups in the view model.
     * @param index - The index of the form group to retrieve within the form array.
     * @param arrayItemControlKey - The key (property name) corresponding to the specific form control within the nested form group.
     *
     * @returns The Angular `FormControl` representing a specific form control within a nested group associated with the specified key, index, and control key.
     *
     * @remarks
     * This method allows accessing a specific form control within a nested form group of the form array that contains groups of form controls associated with the given key.
     * It is particularly useful when dealing with complex nested forms where each element of the array represents a group of controls and each group contains specific controls.
     *
     * The `key` parameter should match the property name in the view model representing the form array of groups.
     * The `index` parameter represents the position of the desired form group within the form array.
     * The `arrayItemControlKey` parameter corresponds to the property name of the specific form control within the nested form group.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> {
     *    // Other component methods...
     *
     *    someEventHandler(): void {
     *        // Assume 'arrayOfGroups' is an array key in the view model, 'groupControl' is a control key in the nested group, and you want to access the form control at index 0
     *        const controlAtIndex = this.formArrayGroupsControlsItem('arrayOfGroups', 0, 'groupControl');
     *        // Now you can interact with the 'controlAtIndex' and its properties
     *    }
     * }
     * ```
     */
    public formArrayGroupsControlsItem<TKey extends keyof TViewModel, TItemKey extends keyof ArrayElement<TViewModel[TKey]>>(
        key: TKey,
        index: number,
        arrayItemControlKey: TItemKey
    ): FormControl<ArrayElement<TViewModel[TKey]>[TItemKey]> {
        return <FormControl<ArrayElement<TViewModel[TKey]>[TItemKey]>>this.formArrayGroups(key)
            .at(index)
            .get(<string>arrayItemControlKey);
    }

    /**
     * Retrieves the validation error associated with a specific form control key and error key within the Angular reactive form of the platform form component.
     *
     * @param controlKey - The key (property name) corresponding to the form control in the view model for which the validation error is to be retrieved.
     * @param errorKey - The key (property name) corresponding to the specific validation error within the form control.
     * @param onlyWhenTouchedOrDirty - Optional. If `true`, the method returns the validation error only when the form control has been touched or is dirty.
     * @param formToFind - Optional. The specific form group to search for the form control. If not provided, the method searches for the form control within the main form of the platform form component.
     *
     * @returns The validation error associated with the specified control key and error key, or `null` if no error is found.
     *
     * @remarks
     * This method allows retrieving validation errors for a specific form control within the Angular reactive form of the platform form component.
     * The `controlKey` parameter should match the property name in the view model representing the desired form control.
     * The `errorKey` parameter corresponds to the property name of the specific validation error within the form control's errors object.
     * The optional `onlyWhenTouchedOrDirty` parameter can be used to conditionally return the error only when the form control has been touched or is dirty.
     * The optional `formToFind` parameter allows specifying a particular form group in case the form control is nested within a subgroup.
     *
     * @example
     * // Example usage within the Angular component:
     * class MyPlatformFormComponent extends PlatformFormComponent<MyViewModel> {
     *    // Other component methods...
     *
     *    someEventHandler(): void {
     *        // Assume 'controlKey' is a key in the view model representing a form control, and 'errorKey' is a specific validation error key
     *        const validationError = this.formControlsError('controlKey', 'errorKey');
     *        if (validationError) {
     *            // Handle the validation error...
     *        }
     *    }
     * }
     * ```
     */
    public formControlsError(controlKey: keyof TViewModel, errorKey: string, onlyWhenTouchedOrDirty: boolean = false): IPlatformFormValidationError | null {
        const form = this.form != null ? this.formControls(controlKey) : undefined;
        if (onlyWhenTouchedOrDirty && form?.touched == false && form?.dirty == false) return null;

        return form?.errors?.[errorKey];
    }

    /**
     * Retrieves the validation error associated with a specific form control key and error key within the provided form group.
     *
     * @template TFormModel - The type of the form model associated with the form group.
     *
     * @param {FormGroup<PlatformFormGroupControls<TFormModel>>} formGroup - The form group in which the form control resides.
     * @param {keyof TFormModel} controlKey - The key (property name) corresponding to the form control for which the validation error is to be retrieved.
     * @param {string} errorKey - The key (property name) corresponding to the specific validation error within the form control.
     * @param {boolean} [onlyWhenTouchedOrDirty=false] - Optional. If `true`, the method returns the validation error only when the form control has been touched or is dirty.
     *
     * @returns {IPlatformFormValidationError | null} The validation error associated with the specified control key and error key, or `null` if no error is found.
     */
    public getFormControlsError<TFormModel>(
        formGroup: FormGroup<PlatformFormGroupControls<TFormModel>>,
        controlKey: keyof TFormModel,
        errorKey: string,
        onlyWhenTouchedOrDirty: boolean = false
    ): IPlatformFormValidationError | null {
        const form = formGroup.get(<string>controlKey);
        if (onlyWhenTouchedOrDirty && form?.touched == false && form?.dirty == false) return null;

        return form?.errors?.[errorKey];
    }

    /**
     * Processes group validation for related form controls within a form group.
     *
     * This method handles group validation scenarios where multiple form controls
     * need to be validated together when any control in the group changes. It:
     * 1. Cancels any existing group validation subscriptions for the control
     * 2. Sets up a delayed validation task to avoid excessive validation calls
     * 3. Validates all controls in the same validation group
     * 4. Triggers change detection to update the UI
     *
     * @public
     * @template TFormModel - The type of the form model
     * @param {(keyof TFormModel)[][] | undefined} groupValidations - Array of validation groups, each containing control keys
     * @param {string} formGroupName - Name identifier for the form group (used in subscription keys)
     * @param {FormGroup<PlatformFormGroupControls<TFormModel>>} formGroup - The form group containing the controls
     * @param {keyof TFormModel} formControlKey - The key of the form control that triggered the validation
     *
     * @example
     * ```typescript
     * // Example group validation configuration
     * const groupValidations = [
     *   ['password', 'confirmPassword'], // Password confirmation group
     *   ['startDate', 'endDate']         // Date range validation group
     * ];
     *
     * // This method is typically called automatically when form values change
     * this.processGroupValidation(groupValidations, 'mainForm', this.form, 'password');
     * ```
     */
    public processGroupValidation<TFormModel>(
        groupValidations: (keyof TFormModel)[][] | undefined,
        formGroupName: string,
        formGroup: FormGroup<PlatformFormGroupControls<TFormModel>>,
        formControlKey: keyof TFormModel
    ) {
        if (groupValidations == null) return;

        this.cancelStoredSubscription(`processGroupValidation_${formControlKey.toString()}`);

        this.storeSubscription(
            `processGroupValidation_${formGroupName}_${formControlKey.toString()}`,
            task_delay(() => {
                groupValidations?.forEach(groupValidators => {
                    if (groupValidators.includes(formControlKey))
                        groupValidators.forEach(groupValidatorControlKey => {
                            this.validateFormControl<TFormModel>(formGroup, groupValidatorControlKey);
                        });
                });

                this.detectChanges();
            }, PlatformFormComponent.processFormValidationsDelays)
        );
    }

    /**
     * Processes dependent validation for form controls that depend on other controls' values.
     *
     * This method handles scenarios where the validation of certain form controls
     * depends on the values or states of other form controls. When a control changes,
     * this method triggers validation for all controls that depend on it. It:
     * 1. Cancels any existing dependent validation subscriptions for the control
     * 2. Sets up a delayed validation task to avoid excessive validation calls
     * 3. Validates all controls that depend on the changed control
     * 4. Triggers change detection to update the UI
     *
     * @public
     * @template TFormModel - The type of the form model
     * @param {Partial<Record<keyof TFormModel, (keyof TFormModel)[] | undefined>> | undefined} dependentValidations -
     *        Object mapping dependent controls to arrays of controls they depend on
     * @param {string} formGroupName - Name identifier for the form group (used in subscription keys)
     * @param {FormGroup<PlatformFormGroupControls<TFormModel>>} formGroup - The form group containing the controls
     * @param {keyof TFormModel} formControlKey - The key of the form control that triggered the validation
     *
     * @example
     * ```typescript
     * // Example dependent validation configuration
     * const dependentValidations = {
     *   endDate: ['startDate'],           // endDate validation depends on startDate
     *   confirmEmail: ['email'],          // confirmEmail validation depends on email
     *   maxItems: ['category', 'type']    // maxItems validation depends on category and type
     * };
     *
     * // When 'startDate' changes, 'endDate' will be re-validated
     * this.processDependentValidations(dependentValidations, 'mainForm', this.form, 'startDate');
     * ```
     */
    public processDependentValidations<TFormModel>(
        dependentValidations: Partial<Record<keyof TFormModel, (keyof TFormModel)[] | undefined>> | undefined,
        formGroupName: string,
        formGroup: FormGroup<PlatformFormGroupControls<TFormModel>>,
        formControlKey: keyof TFormModel
    ) {
        if (dependentValidations == null) return;

        this.cancelStoredSubscription(`processDependentValidations_${formControlKey.toString()}`);

        this.storeSubscription(
            `processDependentValidations_${formGroupName}_${formControlKey.toString()}`,
            task_delay(() => {
                if (dependentValidations == undefined) return;

                Object.keys(dependentValidations).forEach(dependentValidationControlKey => {
                    const dependedOnOtherControlKeys = dependentValidations[<keyof TFormModel>dependentValidationControlKey]!;

                    if (dependedOnOtherControlKeys.includes(formControlKey)) {
                        this.validateFormControl(formGroup, <keyof TFormModel>dependentValidationControlKey);
                    }
                });

                this.detectChanges();
            }, PlatformFormComponent.processFormValidationsDelays)
        );
    }

    /**
     * Provides an Observable that emits when form values change.
     *
     * This method returns a throttled and optimized observable that emits form values
     * when they change. It includes several performance optimizations:
     * 1. Automatic cleanup via untilDestroyed()
     * 2. Throttling to reduce emissions during rapid changes
     * 3. Only emits when actual values change (not reference changes)
     *
     * @public
     * @returns {Observable<Partial<TViewModel>>} An observable that emits form values when they change
     *
     * @example
     * ```typescript
     * // In component class
     * this.formValueChanges().subscribe(values => {
     *   console.log('Form values changed:', values);
     *   this.performCalculations(values);
     * });
     * ```
     */
    public formValueChanges() {
        return this.form.valueChanges.pipe(
            this.untilDestroyed(),
            throttleTime(PlatformComponent.defaultDetectChangesThrottleTime, asyncScheduler, {
                leading: true,
                trailing: true
            }),
            distinctUntilObjectValuesChanged()
        );
    }

    /**
     * Validates a specific form control within a form group.
     *
     * This method:
     * 1. Retrieves the form control using the provided key
     * 2. Calls validateAbstractControl to perform the validation
     * 3. Triggers change detection to update the UI
     *
     * @protected
     * @template TFormModel - The type of the form model
     * @param {FormGroup<PlatformFormGroupControls<TFormModel>>} formGroup - The form group containing the control
     * @param {keyof TFormModel} formControlKey - The key identifying the form control to validate
     */
    protected validateFormControl<TFormModel>(formGroup: FormGroup<PlatformFormGroupControls<TFormModel>>, formControlKey: keyof TFormModel) {
        const formControl = this.getFormControls(formGroup, formControlKey);

        this.validateAbstractControl(formControl);

        this.detectChanges();
    }

    /**
     * Validates all controls within a form array.
     *
     * This method iterates through all controls in the form array and validates each one
     * by calling validateAbstractControl.
     *
     * @protected
     * @param {FormArray<AbstractControl<unknown>>} formArrayControl - The form array to validate
     */
    protected validateFormArrayControl(formArrayControl: FormArray<AbstractControl<unknown>>) {
        formArrayControl.controls.forEach(childControl => {
            this.validateAbstractControl(childControl);
        });
    }

    /**
     * Validates all controls within a form group.
     *
     * This method iterates through all child controls in the form group and validates each one
     * by calling validateAbstractControl.
     *
     * @protected
     * @param {FormGroup<any>} formGroupControl - The form group to validate
     */
    protected validateFormGroupControl(formGroupControl: FormGroup<any>) {
        Object.keys(formGroupControl.controls).forEach(childControlKey => {
            const childControl = formGroupControl.controls[childControlKey]!;

            this.validateAbstractControl(childControl);
        });
    }

    /**
     * Validates an abstract form control, handling different control types appropriately.
     *
     * This method:
     * 1. Detects if the control is a FormGroup or FormArray and validates recursively
     * 2. Updates the control's value and validity, triggering validation
     * 3. Ensures validation events are emitted properly
     *
     * @protected
     * @param {AbstractControl<unknown, unknown>} childControl - The abstract control to validate
     */
    protected validateAbstractControl(childControl: AbstractControl<unknown, unknown>) {
        if (childControl instanceof FormGroup) this.validateFormGroupControl(<FormGroup>childControl);
        else if (childControl instanceof FormArray) this.validateFormArrayControl(childControl);

        childControl.updateValueAndValidity({
            emitEvent: true,
            onlySelf: false
        });
    }

    /**
     * Creates a form array containing form groups for each item in the provided array, based on the specified form item group controls.
     *
     * @template TItemModel - The type of the item model associated with each form group in the array.
     *
     * @param {TItemModel[]} items - The array of items for which form groups are to be created.
     * @param {(item: TItemModel) => PlatformPartialFormGroupControls<TItemModel>} formItemGroupControls - A function that returns the form controls for each item.
     *
     * @returns {FormArray<FormGroup<PlatformFormGroupControls<TItemModel>>>} A form array containing form groups for each item in the provided array.
     */

    /**
     * Creates a FormArray containing FormGroups for each item in the provided array.
     *
     * This helper method simplifies the creation of form arrays where each item in the source
     * array needs to be represented as a form group with multiple controls.
     *
     * @protected
     * @template TItemModel - The type of each item in the array
     * @param {TItemModel[]} items - Array of items to create form groups for
     * @param {(item: TItemModel) => PlatformPartialFormGroupControls<TItemModel>} formItemGroupControls - Function that returns form controls for each item
     * @returns {FormArray<FormGroup<PlatformFormGroupControls<TItemModel>>>} FormArray containing FormGroups for each item
     *
     * @example
     * ```typescript
     * // Create form array for address list
     * const addressFormArray = this.formGroupArrayFor(
     *   this.vm().addresses,
     *   (address) => ({
     *     street: new FormControl(address.street, [Validators.required]),
     *     city: new FormControl(address.city, [Validators.required]),
     *     zipCode: new FormControl(address.zipCode, [Validators.required])
     *   })
     * );
     * ```
     */
    protected formGroupArrayFor<TItemModel>(
        items: TItemModel[],
        formItemGroupControls: (item: TItemModel) => PlatformPartialFormGroupControls<TItemModel>
    ): FormArray<FormGroup<PlatformFormGroupControls<TItemModel>>> {
        return new FormArray(items.map(item => new FormGroup(<PlatformFormGroupControls<TItemModel>>formItemGroupControls(item))));
    }

    /**
     * Creates a FormArray containing FormControls for each item in the provided array.
     *
     * This helper method simplifies the creation of form arrays where each item in the source
     * array needs to be represented as a single form control. It's useful for handling arrays
     * of primitive values or simple objects that can be represented with a single control.
     *
     * @protected
     * @template TItemModel - The type of each item in the array
     * @param {TItemModel[]} items - Array of items to create form controls for
     * @param {(item: TItemModel) => FormControl<TItemModel>} formItemControl - Function that returns a form control for each item
     * @returns {FormArray<FormControl<TItemModel>>} FormArray containing FormControls for each item
     *
     * @example
     * ```typescript
     * // Create form array for tags (array of strings)
     * const tagsFormArray = this.formControlArrayFor(
     *   this.vm().tags,
     *   (tag) => new FormControl(tag, [Validators.required, Validators.minLength(2)])
     * );
     *
     * // Create form array for skill levels (array of numbers)
     * const skillLevelsArray = this.formControlArrayFor(
     *   this.vm().skillLevels,
     *   (level) => new FormControl(level, [Validators.min(1), Validators.max(10)])
     * );
     * ```
     */
    protected formControlArrayFor<TItemModel>(
        items: TItemModel[],
        formItemControl: (item: TItemModel) => FormControl<TItemModel>
    ): FormArray<FormControl<TItemModel>> {
        return new FormArray(items.map(item => formItemControl(item)));
    }

    /**
     * Updates the view model based on changes in form values.
     *
     * This method:
     * 1. Creates a new immutable view model by applying the changed values to the current view model
     * 2. If the resulting view model is different from the current one, updates the internal view model
     * 3. Returns true if the view model was updated, false otherwise
     *
     * This method is crucial for maintaining synchronization between form values and the view model.
     *
     * @protected
     * @param {Partial<TViewModel>} values - The partial view model containing changed values
     * @param {Dictionary<TViewModel[keyof TViewModel]>} currentReactiveFormValues - The current values from reactive form controls
     * @returns {boolean} True if the view model was updated, false otherwise
     */
    protected updateVmOnFormValuesChange(values: Partial<TViewModel>, currentReactiveFormValues: Dictionary<TViewModel[keyof TViewModel]>) {
        const newUpdatedVm: TViewModel = immutableUpdate(this.currentVm(), values);

        if (newUpdatedVm != this._vm) {
            this.internalSetVm(newUpdatedVm, false, undefined, currentReactiveFormValues);
            return true;
        }

        return false;
    }

    /**
     * Builds a reactive FormGroup from a form configuration or control configuration.
     *
     * This method creates the Angular reactive form structure based on the provided configuration.
     * It handles both regular form controls and form arrays, setting up the complete form hierarchy
     * with proper typing and validation.
     *
     * @protected
     * @param {PlatformFormConfig<TViewModel> | PlatformPartialFormGroupControlsConfig<TViewModel[keyof TViewModel]>} formOrInnerFromGroupConfig - Configuration for building the form
     * @returns {FormGroup<PlatformFormGroupControls<TViewModel>> | FormGroup<PlatformFormGroupControls<TViewModel[keyof TViewModel]>>} The constructed FormGroup
     *
     * @example
     * ```typescript
     * // Build form from configuration
     * const formConfig: PlatformFormConfig<UserVm> = {
     *   controls: {
     *     name: new FormControl('', [Validators.required]),
     *     emails: {
     *       modelItems: () => this.vm().emails,
     *       itemControl: (email) => new FormControl(email.address, [Validators.email])
     *     }
     *   }
     * };
     * const form = this.buildForm(formConfig);
     * ```
     */
    protected buildForm(
        formOrInnerFromGroupConfig: PlatformFormConfig<TViewModel> | PlatformPartialFormGroupControlsConfig<TViewModel[keyof TViewModel]>
    ): FormGroup<PlatformFormGroupControls<TViewModel>> | FormGroup<PlatformFormGroupControls<TViewModel[keyof TViewModel]>> {
        const formConfig = <PlatformFormConfig<TViewModel>>formOrInnerFromGroupConfig;

        if (formConfig.controls != undefined) {
            const controls = <PlatformFormGroupControls<TViewModel>>{};

            keys(formConfig.controls).forEach((key: keyof TViewModel) => {
                const formControlConfigItem = <PlatformFormGroupControlConfigProp<TViewModel[keyof TViewModel]>>formConfig.controls[key];
                const formArrayConfigItem = <PlatformFormGroupControlConfigPropArray<ArrayElement<TViewModel[keyof TViewModel]>>>formConfig.controls[key];

                // TODO: comment pending experiment support inner form group ideal
                // const innerFormGroupConfigItem = <PlatformPartialFormGroupControlsConfig<TViewModel[keyof TViewModel]>>(
                //     formConfig.controls[key]
                // );

                if (formControlConfigItem instanceof FormControl) {
                    (<FormControl<TViewModel[keyof TViewModel]>>controls[key]) = <FormControl<TViewModel[keyof TViewModel]>>formControlConfigItem;
                } else if (formArrayConfigItem.itemControl != undefined && formArrayConfigItem.modelItems != undefined) {
                    (<PlatformFormGroupControlsFormArray<TViewModel[keyof TViewModel]>>controls[key]) = new FormArray(
                        formArrayConfigItem.modelItems().map((modelItem, index) => {
                            return this.buildFromArrayControlItem(key, formArrayConfigItem, modelItem, index);
                        }),
                        formArrayConfigItem.validators
                    );
                }

                // TODO: comment pending experiment support inner form group ideal
                // else if (typeof innerFormGroupConfigItem == 'object') {
                //     (<FormGroup<PlatformFormGroupControls<TViewModel[keyof TViewModel]>>>controls[key]) = <
                //         FormGroup<PlatformFormGroupControls<TViewModel[keyof TViewModel]>>
                //     >this.buildForm(innerFormGroupConfigItem);
                // }
            });

            return new FormGroup(controls);
        } else {
            const controls = <PlatformFormGroupControls<TViewModel[keyof TViewModel]>>formOrInnerFromGroupConfig;

            return new FormGroup(controls);
        }
    }

    /**
     * Creates a single form control or form group for an array item within a FormArray.
     *
     * This protected method is used internally to build individual controls or groups within FormArrays.
     * It handles both single FormControls and FormGroups, and sets up validation subscriptions for complex
     * form groups that require group or dependent validations.
     *
     * @protected
     * @template TFormModel - The type of the parent form model
     * @template TItemModel - The type of the array item model
     * @param {keyof TFormModel} formArrayControlKey - The key identifying the FormArray in the parent form
     * @param {PlatformFormGroupControlConfigPropArray<TItemModel>} formConfigControlsConfigArrayItem - Configuration for the array items
     * @param {TItemModel} modelItem - The data item to create the control for
     * @param {number} modelItemIndex - The index of the item within the array
     * @returns {PlatformFormSingleControlOrGroupItem<TItemModel>} Either a FormControl or FormGroup for the item
     *
     * @example
     * ```typescript
     * // This method is typically called internally during form array building
     * // For an array of address objects:
     * const addressControl = this.buildFromArrayControlItem(
     *   'addresses',
     *   this.formConfig.controls.addresses as PlatformFormGroupControlConfigPropArray<Address>,
     *   addressData,
     *   0
     * );
     * ```
     */
    protected buildFromArrayControlItem<TFormModel, TItemModel extends ArrayElement<TFormModel[keyof TFormModel]>>(
        formArrayControlKey: keyof TFormModel,
        formConfigControlsConfigArrayItem: PlatformFormGroupControlConfigPropArray<TItemModel>,
        modelItem: TItemModel,
        modelItemIndex: number
    ): PlatformFormSingleControlOrGroupItem<TItemModel> {
        const formControlOrGroup = formConfigControlsConfigArrayItem.itemControl(modelItem, modelItemIndex);

        const result =
            formControlOrGroup instanceof FormControl
                ? <PlatformFormSingleControlOrGroupItem<TItemModel>>formControlOrGroup
                : <PlatformFormSingleControlOrGroupItem<TItemModel>>new FormGroup(<PlatformFormGroupControls<TItemModel>>formControlOrGroup);

        // Setup form array item validations
        if (
            (formConfigControlsConfigArrayItem.groupValidations != undefined || formConfigControlsConfigArrayItem.dependentValidations != undefined) &&
            result instanceof FormGroup
        ) {
            keys(result.controls).forEach(formControlKey => {
                this.cancelStoredSubscription(buildFromArrayControlItemValueChangesSubscriptionKey(formArrayControlKey, formControlKey, modelItemIndex));
                this.storeSubscription(
                    buildFromArrayControlItemValueChangesSubscriptionKey(formArrayControlKey, formControlKey, modelItemIndex),
                    (<FormControl>(<Dictionary<unknown>>result.controls)[formControlKey]).valueChanges
                        .pipe(
                            delay(PlatformFormComponent.updateVmOnFormValuesChangeDelayMs, asyncScheduler), // Delay PlatformFormComponent.updateVmOnFormValuesChangeDelayMs to push item in async queue to ensure control value has been updated
                            throttleTime(PlatformComponent.defaultDetectChangesThrottleTime, asyncScheduler, {
                                leading: true,
                                trailing: true
                            }),
                            distinctUntilObjectValuesChanged()
                        )
                        .subscribe(value => {
                            this.processGroupValidation(
                                formConfigControlsConfigArrayItem.groupValidations,
                                `formArrayControl_${formArrayControlKey.toString()}`,
                                result,
                                <keyof TItemModel>formControlKey
                            );
                            this.processDependentValidations(
                                formConfigControlsConfigArrayItem.dependentValidations,
                                `formArrayControl_${formArrayControlKey.toString()}`,
                                result,
                                <keyof TItemModel>formControlKey
                            );
                        })
                );
            });
        }

        function buildFromArrayControlItemValueChangesSubscriptionKey(
            formArrayControlKey: keyof TFormModel,
            formControlKey: string,
            modelItemIndex: number
        ): string {
            return `buildFromArrayControlItemValueChanges_${formArrayControlKey.toString()}_${formControlKey}_${modelItemIndex}`;
        }

        return result;
    }
}

/**
 * Configuration object for the platform form component, specifying form controls, validations, and additional settings.
 *
 * @typeparam TFormModel - The type representing the view model for the form.
 */
export type PlatformFormConfig<TFormModel> = {
    /**
     * Definition of form controls and their configuration within the reactive form.
     *
     * @remarks
     * This property defines the structure and configuration of form controls in the reactive form,
     * including their initial values, validators, and other settings.
     * The shape of this property corresponds to the view model type `TFormModel`.
     *
     * @example
     * // Example usage:
     * controls: {
     *    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
     *    email: new FormControl('', [Validators.required, Validators.email]),
     *    // ... other form controls ...
     * }
     */
    controls: PlatformPartialFormGroupControlsConfig<TFormModel>;

    /**
     * Optional group-level validations specifying relationships between form controls.
     *
     * @remarks
     * This property allows defining group validations, where the validity of one or more form controls
     * is dependent on the state of other form controls. It is an array of arrays, where each inner array
     * contains the keys (property names) of the form controls involved in the group validation.
     *
     * @example
     * // Example usage:
     * groupValidations: [
     *    ['password', 'confirmPassword'], // Validation for matching passwords
     *    // ... other group validations ...
     * ]
     */
    groupValidations?: (keyof TFormModel)[][];

    /**
     * Used to config that one control key validation is depended on other control values changes.
     *
     * @remarks
     * This property allows configuring dependent validations, where the validation of a specific form control
     * is triggered when the values or states of other specified form controls change.
     * It is represented as a partial record where keys are the control keys to be validated,
     * and values are arrays of control keys whose changes trigger the validation.
     *
     * @example
     * dependentValidations: {
     *    dependentProp: ['dependedOnProp1', 'dependedOnProp2']
     * }
     *
     * This mean that dependentProp will trigger validation when dependedOnProp1 or dependedOnProp2 changed
     */
    dependentValidations?: Partial<Record<keyof TFormModel, (keyof TFormModel)[] | undefined>>;

    /**
     * Callback function executed after the initialization of the form.
     *
     * @remarks
     * This property allows executing custom logic or actions after the platform form component has been initialized.
     * It is useful for performing additional setup or handling specific scenarios post-form initialization.
     *
     * @example
     * // Example usage:
     * afterInit: () => {
     *    console.log('Form initialized successfully');
     *    // ... other initialization logic ...
     * }
     */
    afterInit?: () => void;

    /**
     * Callback function returning an array of child form components or their query lists. Define validateForm help when form run validation, it will invoke validation of all childForms, also affect logic check isFormValid mean that all childForms need to be valid too
     *
     * @remarks
     * This property is a callback function that, when provided, returns an array of child form components
     * or their query lists. It is useful for obtaining references to child forms within the platform form component.
     *
     * @example
     * // Example usage:
     * childForms: () => [childForm1, childForm2, ...],
     * // or
     * childForms: () => formQueryList.toArray(),
     */
    childForms?: () => (QueryList<IPlatformFormComponent<IPlatformVm>> | IPlatformFormComponent<IPlatformVm>)[];
};

export type PlatformPartialFormGroupControlsConfig<TFormModel> = {
    [P in keyof TFormModel]?: TFormModel[P] extends unknown[]
        ? FormControl<TFormModel[P] | null | undefined> | PlatformFormGroupControlConfigPropArray<ArrayElement<TFormModel[P]>>
        : FormControl<TFormModel[P] | null | undefined>;
};

// Need to be code duplicated used in "export type PlatformPartialFormGroupControlsConfig<TFormModel> = {"
// "[P in keyof TFormModel]?: TFormModel[P] ..." should be equal to PlatformFormGroupControlProp<TFormModel[P]>
// dont know why it will get type errors when using if TFormModel[P] is enum
export type PlatformFormGroupControlConfigProp<TFormModelProp> = TFormModelProp extends unknown[]
    ? FormControl<TFormModelProp> | PlatformFormGroupControlConfigPropArray<ArrayElement<TFormModelProp>>
    : FormControl<TFormModelProp | null | undefined>;

export type PlatformFormGroupControlConfigPropArray<TItemModel> = {
    modelItems: () => TItemModel[];
    itemControl: PlatformFormGroupControlConfigPropArrayItemControlFn<TItemModel>;
    /**
     * Optional group-level validations specifying relationships between form controls.
     *
     * @remarks
     * This property allows defining group validations, where the validity of one or more form controls
     * is dependent on the state of other form controls. It is an array of arrays, where each inner array
     * contains the keys (property names) of the form controls involved in the group validation.
     *
     * @example
     * // Example usage:
     * groupValidations: [
     *    ['password', 'confirmPassword'], // Validation for matching passwords
     *    // ... other group validations ...
     * ]
     */
    groupValidations?: (keyof TItemModel)[][];

    /**
     * Used to config that one control key validation is depended on other control values changes.
     *
     * @remarks
     * This property allows configuring dependent validations, where the validation of a specific form control
     * is triggered when the values or states of other specified form controls change.
     * It is represented as a partial record where keys are the control keys to be validated,
     * and values are arrays of control keys whose changes trigger the validation.
     *
     * @example
     * dependentValidations: {
     *    dependentProp: ['dependedOnProp1', 'dependedOnProp2']
     * }
     *
     * This mean that dependentProp will trigger validation when dependedOnProp1 or dependedOnProp2 changed
     */
    dependentValidations?: Partial<Record<keyof TItemModel, (keyof TItemModel)[] | undefined>>;
    validators?: ValidatorFn | ValidatorFn[] | null;
};

export type PlatformFormGroupControlConfigPropArrayItemControlFn<TItemModel> = (
    item: TItemModel,
    itemIndex: number
) => PlatformPartialFormGroupControls<TItemModel> | FormControl<TItemModel>;

export type PlatformFormGroupControls<TFormModel> = {
    [P in keyof TFormModel]: TFormModel[P] extends unknown[]
        ? FormControl<TFormModel[P]> | PlatformFormGroupControlsFormArray<TFormModel[P]>
        : FormControl<TFormModel[P] | null | undefined>;
};

// Temp comment to find out how to support inner child form group
export type PlatformFormSingleControlOrGroupItem<T> = FormControl<T | null | undefined> | FormGroup<PlatformFormGroupControls<T>>;

export type PlatformFormGroupControlsFormArray<T> = FormArray<PlatformFormSingleControlOrGroupItem<ArrayElement<T>>>;

export type PlatformPartialFormGroupControls<TFormModel> = {
    [P in keyof TFormModel]?: TFormModel[P] extends unknown[]
        ? FormControl<TFormModel[P]> | FormArray<PlatformFormSingleControlOrGroupItem<ArrayElement<TFormModel[P]>>>
        : FormControl<TFormModel[P] | null | undefined>;
};

// Need to be code duplicated used in "export type PlatformFormGroupControls<TFormModel> = {", "export type
// PlatformPartialFormGroupControls<TFormModel> = {" "[P in keyof TFormModel]: TFormModel[P] ..." should be equal to
// PlatformFormGroupControlProp<TFormModel[P]> dont know why it will get type errors when using if TFormModel[P] is
// enum, boolean
export type PlatformFormGroupControlProp<TFormModelProp> = TFormModelProp extends unknown[]
    ? FormControl<TFormModelProp> | PlatformFormGroupControlsFormArray<TFormModelProp>
    : FormControl<TFormModelProp | null | undefined>;

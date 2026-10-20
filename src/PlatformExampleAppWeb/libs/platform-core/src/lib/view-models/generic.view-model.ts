/**
 * @fileoverview Core view model classes and interfaces for platform state management.
 *
 * This module provides the foundation for managing component state across the platform,
 * including error handling, loading states, and request tracking capabilities.
 *
 * @module PlatformViewModels
 * @since 1.0.0
 */

import { PlatformApiServiceErrorResponse } from '../api-services';
import { Dictionary } from '../common-types';
import { immutableUpdate, keys, list_distinct } from '../utils';

const requestStateDefaultKey = 'Default';

/**
 * Represents the various states a view model can be in during its lifecycle.
 *
 * This type union defines the standard states used across platform components
 * to track data loading, processing, and error states.
 *
 * @typedef {('Pending' | 'Loading' | 'Success' | 'Error' | 'Reloading')} StateStatus
 *
 * @example
 * ```typescript
 * // Component state checking
 * if (this.vm.status === 'Loading') {
 *   this.showSpinner = true;
 * } else if (this.vm.status === 'Error') {
 *   this.showErrorMessage = true;
 * }
 * ```
 *
 * @since 1.0.0
 */
export type StateStatus = 'Pending' | 'Loading' | 'Success' | 'Error' | 'Reloading';

/**
 * Core interface defining the essential properties for platform view models.
 *
 * This interface establishes the basic contract that all view models must follow
 * to provide consistent state management and error tracking capabilities.
 *
 * @interface IPlatformVm
 *
 * @property {StateStatus} [status] - Current state of the view model
 * @property {string | null} [error] - Error message if any operation failed
 *
 * @example
 * ```typescript
 * // Custom view model implementing the interface
 * export class CustomViewModel implements IPlatformVm {
 *   status: StateStatus = 'Pending';
 *   error: string | null = null;
 *
 *   // Additional custom properties
 *   data: MyData[] = [];
 *   selectedItem?: MyData;
 * }
 * ```
 *
 * @since 1.0.0
 * @see {@link PlatformVm} For the concrete implementation
 */
export interface IPlatformVm {
    status?: StateStatus;
    error?: string | null;
}

/**
 * Core view model class providing comprehensive state management for platform components.
 *
 * PlatformVm serves as the foundation for all view models in the platform, offering
 * robust state tracking, error management, and multi-request coordination capabilities.
 * It manages loading states, error messages, and provides utilities for handling
 * multiple concurrent operations with individual state tracking.
 *
 * @class PlatformVm
 * @implements {IPlatformVm}
 *
 * @example
 * ```typescript
 * // Basic view model extension
 * export class UserListViewModel extends PlatformVm {
 *   public users: User[] = [];
 *   public selectedUser?: User;
 *
 *   constructor(data?: Partial<UserListViewModel>) {
 *     super(data);
 *     if (data?.users) this.users = data.users.map(u => new User(u));
 *     if (data?.selectedUser) this.selectedUser = new User(data.selectedUser);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Multi-request state management
 * export class FormTemplateViewModel extends PlatformVm {
 *   public formTemplate?: FormTemplate;
 *
 *   // Handle multiple operations with individual tracking
 *   public saveTemplate(): void {
 *     this.setLoading(true, 'saveTemplate');
 *     this.apiService.save(this.formTemplate)
 *       .subscribe({
 *         next: (result) => {
 *           this.formTemplate = result;
 *           this.setLoading(false, 'saveTemplate');
 *         },
 *         error: (error) => {
 *           this.setErrorMsg(error, 'saveTemplate');
 *           this.setLoading(false, 'saveTemplate');
 *         }
 *       });
 *   }
 *
 *   public deleteTemplate(): void {
 *     this.setLoading(true, 'deleteTemplate');
 *     // ... deletion logic
 *   }
 *
 *   // Check specific operation states
 *   get isSaving(): boolean {
 *     return this.isLoading('saveTemplate');
 *   }
 *
 *   get isDeleting(): boolean {
 *     return this.isLoading('deleteTemplate');
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Real-world usage in form template response
 * export class FormTemplateResponseFormVm extends PlatformVm {
 *   public formTemplateResponse!: FormTemplateResponse;
 *   public formTemplate!: FormTemplate;
 *   public questionResponses!: FormTemplateQuestionResponse[];
 *
 *   constructor(data: Partial<FormTemplateResponseFormVm>) {
 *     super(data);
 *
 *     if (data.formTemplateResponse) {
 *       this.formTemplateResponse = new FormTemplateResponse(data.formTemplateResponse);
 *     }
 *
 *     if (data.formTemplate) {
 *       this.formTemplate = new FormTemplate(data.formTemplate);
 *       this.questionResponses = this.buildAnswer();
 *     }
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 * @see {@link IPlatformVm} For the interface definition
 * @see {@link PlatformVmStore} For store implementation using this view model
 * @see {@link StateStatus} For available status values
 */
export class PlatformVm implements IPlatformVm {
    /**
     * Default key used for request state tracking when no specific key is provided.
     * @static
     * @readonly
     */
    public static readonly requestStateDefaultKey = requestStateDefaultKey;

    /**
     * Current overall status of the view model.
     *
     * @type {StateStatus}
     * @default 'Pending'
     *
     * @example
     * ```typescript
     * // Check overall status
     * if (viewModel.status === 'Loading') {
     *   showGlobalSpinner();
     * }
     * ```
     */
    public status: StateStatus = 'Pending';

    /**
     * Primary error message for the view model.
     *
     * @type {string | undefined | null}
     * @default null
     *
     * @example
     * ```typescript
     * // Display primary error
     * if (viewModel.error) {
     *   this.toastr.error(viewModel.error);
     * }
     * ```
     */
    public error: string | undefined | null = null;

    /**
     * Dictionary mapping request keys to their specific error messages.
     *
     * Enables tracking individual error states for multiple concurrent operations
     * within the same component, providing granular error handling.
     *
     * @type {Dictionary<string | undefined>}
     * @default {}
     *
     * @example
     * ```typescript
     * // Set specific error for save operation
     * viewModel.setErrorMsg('Save failed: Invalid data', 'saveUser');
     *
     * // Check for specific error
     * const saveError = viewModel.getErrorMsg('saveUser');
     * if (saveError) {
     *   this.showSaveErrorDialog(saveError);
     * }
     * ```
     */
    public errorMsgMap: Dictionary<string | undefined> = {};

    /**
     * Dictionary mapping request keys to their loading states.
     *
     * Tracks which specific operations are currently in progress,
     * allowing fine-grained control over loading indicators.
     *
     * @type {Dictionary<boolean | undefined>}
     * @default {}
     *
     * @example
     * ```typescript
     * // Set loading for specific operation
     * viewModel.setLoading(true, 'loadUsers');
     *
     * // Check if specific operation is loading
     * const isLoadingUsers = viewModel.isLoading('loadUsers');
     * ```
     */
    public loadingMap: Dictionary<boolean | undefined> = {};

    /**
     * Dictionary mapping request keys to their reloading states.
     *
     * Differentiates between initial loading and reloading operations,
     * useful for showing different UI indicators.
     *
     * @type {Dictionary<boolean | undefined>}
     * @default {}
     *
     * @example
     * ```typescript
     * // Set reloading for refresh operation
     * viewModel.setReloading(true, 'refreshData');
     *
     * // Show different spinner for reload vs initial load
     * const isReloading = viewModel.isReloading('refreshData');
     * if (isReloading) {
     *   this.showReloadSpinner();
     * }
     * ```
     */
    public reloadingMap: Dictionary<boolean | undefined> = {};

    /**
     * Concatenated error messages from all request keys.
     *
     * Provides a convenient way to display all current errors
     * in a single message or notification.
     *
     * @type {string | undefined}
     *
     * @example
     * ```typescript
     * // Show all errors at once
     * if (viewModel.allErrorMsgs) {
     *   this.toastr.error(viewModel.allErrorMsgs);
     * }
     * ```
     */
    public allErrorMsgs?: string | null;

    /**
     * Creates a new PlatformVm instance with optional initial data.
     *
     * @param {Partial<IPlatformVm>} [data] - Initial data to populate the view model
     *
     * @example
     * ```typescript
     * // Create with initial state
     * const viewModel = new PlatformVm({
     *   status: 'Loading',
     *   error: null
     * });
     * ```
     */
    constructor(data?: Partial<IPlatformVm>) {
        if (data == null) return;

        if (data.status !== undefined) this.status = data.status;
        if (data.error !== undefined) this.error = data.error;
    } /**
     * Checks if the view model is in pending state.
     *
     * @returns {boolean} True if status is 'Pending'
     *
     * @example
     * ```typescript
     * // Show initial loading message
     * if (viewModel.isStatePending) {
     *   this.message = 'Initializing...';
     * }
     * ```
     */
    public get isStatePending(): boolean {
        return this.status == 'Pending';
    }

    /**
     * Checks if the view model is in loading state.
     *
     * @returns {boolean} True if status is 'Loading'
     *
     * @example
     * ```typescript
     * // Show loading spinner
     * if (viewModel.isStateLoading) {
     *   this.showSpinner = true;
     * }
     * ```
     */
    public get isStateLoading(): boolean {
        return this.status == 'Loading';
    }

    /**
     * Checks if the view model is in reloading state.
     *
     * @returns {boolean} True if status is 'Reloading'
     *
     * @example
     * ```typescript
     * // Show refresh indicator
     * if (viewModel.isStateReloading) {
     *   this.showRefreshIndicator = true;
     * }
     * ```
     */
    public get isStateReloading(): boolean {
        return this.status == 'Reloading';
    }

    /**
     * Checks if the view model is in successful state.
     *
     * @returns {boolean} True if status is 'Success' and no error exists
     *
     * @example
     * ```typescript
     * // Show data content
     * if (viewModel.isStateSuccess) {
     *   this.displayData();
     * }
     * ```
     */
    public get isStateSuccess(): boolean {
        return this.status == 'Success' && this.error == undefined;
    }

    /**
     * Checks if the view model is in successful state or reloading.
     *
     * Useful for showing data while a refresh operation is in progress.
     *
     * @returns {boolean} True if status is 'Success' or 'Reloading' and no error exists
     *
     * @example
     * ```typescript
     * // Show data even during reload
     * if (viewModel.isStateSuccessOrReloading) {
     *   this.renderDataTable();
     *
     *   if (viewModel.isStateReloading) {
     *     this.showReloadingOverlay();
     *   }
     * }
     * ```
     */
    public get isStateSuccessOrReloading(): boolean {
        return (this.status == 'Success' || this.status == 'Reloading') && this.error == undefined;
    }

    /**
     * Checks if the view model has any error.
     *
     * @returns {boolean} True if status is 'Error' or any error message exists
     *
     * @example
     * ```typescript
     * // Show error UI
     * if (viewModel.isStateError) {
     *   this.showErrorMessage();
     * }
     * ```
     */
    public get isStateError(): boolean {
        return this.status == 'Error' || this.error != undefined;
    } /**
     * Retrieves concatenated error messages for specified request keys.
     *
     * Combines all error messages from the specified request keys into a single
     * string, optionally filtering by inclusion/exclusion criteria.
     *
     * @param {string[]} [requestKeys] - Specific request keys to include. If undefined, includes all keys
     * @param {string[]} [excludeKeys] - Request keys to exclude from the result
     * @returns {string | undefined} Concatenated error messages or undefined if no errors
     *
     * @example
     * ```typescript
     * // Get all error messages
     * const allErrors = viewModel.getAllErrorMsgs();
     * if (allErrors) {
     *   this.toastr.error(allErrors);
     * }
     *
     * // Get errors for specific operations only
     * const saveErrors = viewModel.getAllErrorMsgs(['saveUser', 'saveProfile']);
     *
     * // Get all errors except certain ones
     * const criticalErrors = viewModel.getAllErrorMsgs(undefined, ['warning']);
     * ```
     */
    public getAllErrorMsgs(requestKeys?: string[], excludeKeys?: string[]): string | undefined {
        const joinedErrorsStr = list_distinct(
            keys(this.errorMsgMap)
                .map(key => {
                    if ((requestKeys != undefined && !requestKeys.includes(key)) || excludeKeys?.includes(key) == true) return '';

                    return this.errorMsgMap[key] ?? '';
                })
                .concat([this.error ?? ''])
                .filter(msg => msg != null && msg.trim() != '')
        ).join('; ');

        return joinedErrorsStr == '' ? undefined : joinedErrorsStr;
    }

    /**
     * Sets an error message for a specific request operation.
     *
     * Stores error information for individual operations, enabling granular
     * error tracking and display. Automatically updates the main error property
     * and concatenated error messages.
     *
     * @param {string | null | PlatformApiServiceErrorResponse | Error} error - Error to set
     * @param {string} [requestKey='Default'] - Unique identifier for the request operation
     *
     * @example
     * ```typescript
     * // Set error for user save operation
     * viewModel.setErrorMsg('Failed to save user: Email already exists', 'saveUser');
     *
     * // Set error from API response
     * apiService.saveUser(user).subscribe({
     *   error: (apiError) => {
     *     viewModel.setErrorMsg(apiError, 'saveUser');
     *   }
     * });
     *
     * // Clear error for specific operation
     * viewModel.setErrorMsg(null, 'saveUser');
     * ```
     */
    public setErrorMsg(error: string | null | PlatformApiServiceErrorResponse | Error, requestKey: string = requestStateDefaultKey) {
        const errorMsg =
            typeof error == 'string' || error == null ? <string | undefined>error : PlatformApiServiceErrorResponse.getDefaultFormattedMessage(error);

        this.errorMsgMap = immutableUpdate(
            this.errorMsgMap,
            _ => {
                _[requestKey] = errorMsg;
            },
            { updaterNotDeepMutate: true }
        );

        this.allErrorMsgs = this.getAllErrorMsgs();
        this.error = errorMsg;
    }

    /**
     * Retrieves the error message for a specific request operation.
     *
     * @param {string} [requestKey='Default'] - Request key to get error for
     * @returns {string | undefined} Error message for the specified request or undefined
     *
     * @example
     * ```typescript
     * // Get error for specific operation
     * const saveError = viewModel.getErrorMsg('saveUser');
     * if (saveError) {
     *   this.showFieldError('user-form', saveError);
     * }
     *
     * // Get default error
     * const generalError = viewModel.getErrorMsg();
     * ```
     */
    public getErrorMsg(requestKey: string = requestStateDefaultKey): string | undefined {
        if (this.errorMsgMap[requestKey] == null && requestKey == requestStateDefaultKey) return <string | undefined>this.error;

        return this.errorMsgMap[requestKey];
    } /**
     * Sets the loading state for a specific request operation.
     *
     * Tracks loading states individually for different operations,
     * enabling granular loading indicator control.
     *
     * @param {boolean | undefined} value - Loading state to set
     * @param {string} [requestKey='Default'] - Unique identifier for the request operation
     *
     * @example
     * ```typescript
     * // Start loading for user save
     * viewModel.setLoading(true, 'saveUser');
     *
     * // Complete loading
     * viewModel.setLoading(false, 'saveUser');
     *
     * // Clear loading state
     * viewModel.setLoading(undefined, 'saveUser');
     *
     * // Multiple operations
     * viewModel.setLoading(true, 'loadUsers');
     * viewModel.setLoading(true, 'loadRoles');
     * // Both operations tracked independently
     * ```
     */
    public setLoading(value: boolean | undefined, requestKey: string = requestStateDefaultKey) {
        this.loadingMap = immutableUpdate(
            this.loadingMap,
            _ => {
                _[requestKey] = value;
            },
            { updaterNotDeepMutate: true }
        );
    }

    /**
     * Sets the reloading state for a specific request operation.
     *
     * Differentiates between initial loading and refresh operations,
     * useful for showing different UI indicators.
     *
     * @param {boolean | undefined} value - Reloading state to set
     * @param {string} [requestKey='Default'] - Unique identifier for the request operation
     *
     * @example
     * ```typescript
     * // Start reloading for data refresh
     * viewModel.setReloading(true, 'refreshData');
     *
     * // Show data with reload indicator
     * if (viewModel.isReloading('refreshData')) {
     *   this.showReloadSpinner();
     * }
     *
     * // Complete reloading
     * viewModel.setReloading(false, 'refreshData');
     * ```
     */
    public setReloading(value: boolean | undefined, requestKey: string = requestStateDefaultKey) {
        this.reloadingMap = immutableUpdate(
            this.reloadingMap,
            _ => {
                _[requestKey] = value;
            },
            { updaterNotDeepMutate: true }
        );
    }

    /**
     * Checks if a specific request operation is currently loading.
     *
     * @param {string} [requestKey='Default'] - Request key to check
     * @returns {boolean} True if the specified operation is loading
     *
     * @example
     * ```typescript
     * // Check specific operation loading state
     * if (viewModel.isLoading('saveUser')) {
     *   this.disableSaveButton();
     * }
     *
     * // Show operation-specific loading indicator
     * const isLoadingUsers = viewModel.isLoading('loadUsers');
     * const isLoadingRoles = viewModel.isLoading('loadRoles');
     * ```
     */
    public isLoading(requestKey: string = requestStateDefaultKey): boolean {
        return this.loadingMap[requestKey] == true;
    }

    /**
     * Checks if a specific request operation is currently reloading.
     *
     * @param {string} [requestKey='Default'] - Request key to check
     * @returns {boolean} True if the specified operation is reloading
     *
     * @example
     * ```typescript
     * // Check reload state
     * if (viewModel.isReloading('refreshData')) {
     *   this.showInlineRefreshSpinner();
     * }
     * ```
     */
    public isReloading(requestKey: string = requestStateDefaultKey): boolean {
        return this.reloadingMap[requestKey] == true;
    }

    /**
     * Checks if any request operation is currently loading.
     *
     * Useful for showing global loading indicators when any operation
     * is in progress.
     *
     * @returns {boolean | undefined} True if any operation is loading
     *
     * @example
     * ```typescript
     * // Show global loading overlay
     * if (viewModel.isAnyLoadingRequest()) {
     *   this.showGlobalSpinner();
     * }
     *
     * // Disable form while any operation is running
     * this.formGroup.disabled = viewModel.isAnyLoadingRequest();
     * ```
     */
    public isAnyLoadingRequest(): boolean | undefined {
        return keys(this.loadingMap).find(requestKey => this.loadingMap[requestKey] == true) != undefined;
    }

    /**
     * Checks if any request operation is currently reloading.
     *
     * @returns {boolean | undefined} True if any operation is reloading
     *
     * @example
     * ```typescript
     * // Show global refresh indicator
     * if (viewModel.isAnyReloadingRequest()) {
     *   this.showGlobalRefreshIndicator();
     * }
     * ```
     */
    public isAnyReloadingRequest(): boolean | undefined {
        return keys(this.reloadingMap).find(requestKey => this.reloadingMap[requestKey] == true) != undefined;
    }

    /**
     * Clears all error messages from the view model.
     *
     * Resets all error-related properties to their initial state,
     * effectively clearing all error information.
     *
     * @returns {PlatformVm} Returns this instance for method chaining
     *
     * @example
     * ```typescript
     * // Clear all errors before new operation
     * viewModel.clearAllErrorMsgs();
     *
     * // Method chaining
     * viewModel
     *   .clearAllErrorMsgs()
     *   .setLoading(true, 'newOperation');
     * ```
     */
    public clearAllErrorMsgs() {
        this.allErrorMsgs = null;
        this.errorMsgMap = {};
        this.error = null;

        return this;
    }
}

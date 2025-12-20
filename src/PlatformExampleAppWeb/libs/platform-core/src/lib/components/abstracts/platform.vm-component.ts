import { computed, Directive, EventEmitter, Input, OnInit, Output, Signal, signal, WritableSignal } from '@angular/core';

import { cloneDeep } from 'lodash-es';
import { filter, map, Observable, share } from 'rxjs';
import { PartialDeep } from 'type-fest';

import { toObservable } from '@angular/core/rxjs-interop';
import { PlatformApiServiceErrorResponse } from '../../api-services';
import { distinctUntilObjectValuesChanged, tapOnce } from '../../rxjs';
import { immutableUpdate, ImmutableUpdateOptions, isDifferent } from '../../utils';
import { IPlatformVm } from '../../view-models';
import { ComponentStateStatus, PlatformComponent } from './platform.component';

/**
 * Abstract base class for Angular components that manage view model state.
 *
 * ## Architecture Overview
 *
 * `PlatformVmComponent` extends `PlatformComponent` to provide view model management capabilities
 * for Angular components. It implements the Model-View-ViewModel (MVVM) pattern by managing
 * a strongly-typed view model that contains the component's state and business logic.
 *
 * ## Key Features
 *
 * - **Reactive View Model Management**: Uses Angular signals for reactive state management
 * - **Async Data Loading**: Supports loading view models from observables or direct assignment
 * - **Change Detection**: Automatically handles change detection when view model updates
 * - **State Status Tracking**: Tracks loading, success, error states during VM initialization
 * - **Memory Management**: Proper cleanup and subscription management
 * - **Type Safety**: Strongly-typed view model with generic constraints
 *
 * ## View Model Lifecycle
 *
 * 1. **Initialization**: `initVm()` called during `ngOnInit`
 * 2. **Loading**: `initOrReloadVm()` returns Observable or direct value
 * 3. **Status Management**: Auto-sets status to 'Success' if 'Pending'
 * 4. **Original Copy**: Stores `originalInitVm` for reset/comparison purposes
 * 5. **Updates**: `updateVm()` for partial state updates with immutability
 * 6. **Events**: Emits `vmChange` events when view model changes
 *
 * ## Usage Patterns
 *
 * ### Basic Implementation
 * ```typescript
 * @Component({
 *   selector: 'user-profile',
 *   template: `<div *ngIf="vm()">{{vm()?.name}}</div>`
 * })
 * export class UserProfileComponent extends PlatformVmComponent<UserProfileVm> {
 *   protected initOrReloadVm = (isReload: boolean) => {
 *     return this.userService.getUserProfile();
 *   };
 * }
 * ```
 *
 * ### With Input Binding
 * ```typescript
 * @Component({
 *   selector: 'user-details',
 *   template: `<div [vm]="userVm">...</div>`
 * })
 * export class UserDetailsComponent extends PlatformVmComponent<UserVm> {
 *   @Input() userVm?: UserVm;
 *
 *   protected initOrReloadVm = () => of(this.userVm);
 * }
 * ```
 *
 * ### With State Updates
 * ```typescript
 * onNameChange(name: string) {
 *   this.updateVm({ name }, (updatedVm) => {
 *     console.log('VM updated:', updatedVm);
 *   });
 * }
 * ```
 *
 * ## Real-World Usage Examples
 *
 * This class is extensively used throughout the application:
 * - **User Management**: `UserManagementComponent` for managing user lists and details
 * - **Goal Management**: `GoalManagementComponent` for tracking and updating goals
 * - **Check-ins**: `CheckInsOverviewComponent` for employee check-in management
 * - **Request Management**: Various request management components for leave, attendance
 *
 * ## State Management Integration
 *
 * Works seamlessly with:
 * - **NgRx Signals**: For reactive state updates
 * - **ComponentStore**: Through `PlatformVmStoreComponent` extension
 * - **Form Controls**: Through `PlatformFormComponent` extension
 * - **API Services**: Through `PlatformApiService` integration
 *
 * ## Performance Considerations
 *
 * - Uses Angular signals for efficient change detection
 * - Implements shallow checking for performance optimization
 * - Proper cleanup prevents memory leaks
 * - Immutable updates ensure predictable state changes
 *
 * ## Related Classes
 *
 * - {@link PlatformComponent} - Base component class
 * - {@link PlatformVmStoreComponent} - NgRx ComponentStore integration
 * - {@link PlatformFormComponent} - Form-specific view model management
 * - {@link IPlatformVm} - View model interface definition
 *
 * @template TViewModel - The view model type that extends IPlatformVm
 *
 * @example
 * ```typescript
 * // Define your view model
 * interface ProductVm extends IPlatformVm {
 *   id: string;
 *   name: string;
 *   price: number;
 * }
 *
 * // Implement component
 * @Component({
 *   selector: 'product-detail',
 *   template: `
 *     <div *ngIf="vm() as product">
 *       <h1>{{product.name}}</h1>
 *       <p>Price: {{product.price | currency}}</p>
 *       <button (click)="updatePrice(99.99)">Update Price</button>
 *     </div>
 *   `
 * })
 * export class ProductDetailComponent extends PlatformVmComponent<ProductVm> {
 *   @Input() productId!: string;
 *
 *   protected initOrReloadVm = (isReload: boolean) => {
 *     return this.productService.getProduct(this.productId);
 *   };
 *
 *   updatePrice(newPrice: number) {
 *     this.updateVm({ price: newPrice });
 *   }
 * }
 * ```
 *
 * @see {@link https://angular.io/guide/signals} Angular Signals Documentation
 * @see {@link https://ngrx.io/guide/component-store} NgRx ComponentStore Pattern
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */
@Directive()
export abstract class PlatformVmComponent<TViewModel extends IPlatformVm> extends PlatformComponent implements OnInit {
    /**
     * Creates an instance of PlatformVmComponent.
     *
     * Initializes the component and sets up the view model management infrastructure.
     * The actual view model initialization happens during `ngOnInit()`.
     */
    public constructor() {
        super();
    }

    /**
     * Internal signal storage for the view model.
     * Created lazily when first accessed to optimize performance.
     *
     * @private
     */
    private _vmSignal?: WritableSignal<TViewModel | undefined>;

    /**
     * Gets the view model as an Angular signal for reactive programming.
     *
     * The signal is created lazily on first access and provides reactive updates
     * whenever the view model changes. This enables efficient change detection
     * and reactive template updates.
     *
     * ## Usage Examples
     *
     * ### In Templates
     * ```html
     * <!-- Direct access -->
     * <div *ngIf="vm() as viewModel">
     *   <h1>{{viewModel.title}}</h1>
     * </div>
     *
     * <!-- With async pipe alternative -->
     * <div *ngIf="vm()?.isLoaded">Content loaded!</div>
     * ```
     *
     * ### In Component Logic
     * ```typescript
     * ngOnInit() {
     *   // Create computed signals based on VM
     *   this.isUserAdmin = computed(() =>
     *     this.vm()?.user?.role === 'admin'
     *   );
     * }
     *
     * onSave() {
     *   const currentVm = this.vm();
     *   if (currentVm?.isDirty) {
     *     this.saveData(currentVm);
     *   }
     * }
     * ```
     *
     * ### Reactive Effects
     * ```typescript
     * ngOnInit() {
     *   effect(() => {
     *     const vm = this.vm();
     *     if (vm?.error) {
     *       this.showErrorMessage(vm.error);
     *     }
     *   });
     * }
     * ```
     *
     * @returns A WritableSignal containing the current view model or undefined
     *
     * @see {@link https://angular.io/guide/signals} Angular Signals Guide
     */
    public get vm(): WritableSignal<TViewModel | undefined> {
        this._vmSignal ??= signal(this._vm);
        return this._vmSignal;
    }

    /**
     * Internal storage for the current view model instance.
     *
     * This is the backing field for the view model. Direct access should be avoided
     * in favor of using the `vm()` signal or the `currentVm()` method for type safety.
     *
     * @private
     */
    protected _vm?: TViewModel;

    /**
     * Sets the view model from external input and triggers change detection if different.
     *
     * This input property allows parent components to pass view models directly,
     * useful for scenarios where the view model is managed externally or passed
     * down from a parent component.
     *
     * The setter performs a deep comparison using `isDifferent()` to avoid unnecessary
     * updates and change detection cycles.
     *
     * ## Usage Patterns
     *
     * ### Parent-Child Communication
     * ```typescript
     * // Parent component template
     * <user-profile [vm]="selectedUser"></user-profile>
     *
     * // Child component
     * @Component({
     *   selector: 'user-profile',
     *   template: `<div>{{vm()?.name}}</div>`
     * })
     * export class UserProfileComponent extends PlatformVmComponent<UserVm> {
     *   // Input handled automatically by this setter
     * }
     * ```
     *
     * ### Dynamic View Model Assignment
     * ```typescript
     * // Programmatic assignment
     * userProfileComponent.vmInput = newUserData;
     * ```
     *
     * @param v - The new view model to assign, or undefined to clear
     *
     * @example
     * ```typescript
     * // In parent component
     * @Component({
     *   template: `
     *     <user-list>
     *       <user-detail
     *         *ngFor="let user of users"
     *         [vm]="user">
     *       </user-detail>
     *     </user-list>
     *   `
     * })
     * export class UserListComponent {
     *   users: UserVm[] = [];
     * }
     * ```
     */
    @Input('vm')
    public set vmInput(v: TViewModel | undefined) {
        if (isDifferent(this._vm, v)) {
            this.internalSetVm(v, false);
        }
    }

    /**
     * Internal observable cache for the view model stream.
     * Created lazily and shared across subscribers for performance.
     *
     * @private
     */
    private _vm$?: Observable<TViewModel>;

    /**
     * Returns an observable stream of the view model for reactive programming.
     *
     * This method provides an RxJS observable that emits view model updates,
     * useful for reactive patterns, async operations, and integration with
     * RxJS operators. The observable is cached and shared to prevent multiple
     * subscriptions from creating duplicate streams.
     *
     * ## Features
     *
     * - **Filtered Stream**: Only emits non-undefined values
     * - **Automatic Cleanup**: Subscription automatically completes on component destroy
     * - **Shared Observable**: Multiple subscriptions share the same source
     * - **Memory Efficient**: Cached to prevent recreation
     *
     * ## Usage Examples
     *
     * ### Basic Subscription
     * ```typescript
     * ngOnInit() {
     *   this.vm$().subscribe(vm => {
     *     console.log('View model updated:', vm);
     *     this.processViewModelChange(vm);
     *   });
     * }
     * ```
     *
     * ### With RxJS Operators
     * ```typescript
     * ngOnInit() {
     *   this.vm$().pipe(
     *     debounceTime(300),
     *     distinctUntilChanged(),
     *     switchMap(vm => this.saveService.save(vm))
     *   ).subscribe();
     * }
     * ```
     *
     * ### Template Usage with Async Pipe
     * ```html
     * <div *ngIf="vm$() | async as viewModel">
     *   <h1>{{viewModel.title}}</h1>
     * </div>
     * ```
     *
     * ### Combining Multiple Streams
     * ```typescript
     * ngOnInit() {
     *   combineLatest([
     *     this.vm$(),
     *     this.permissionService.permissions$
     *   ]).pipe(
     *     map(([vm, permissions]) => ({
     *       vm,
     *       canEdit: permissions.includes('edit')
     *     }))
     *   ).subscribe(state => {
     *     this.viewState = state;
     *   });
     * }
     * ```
     *
     * @returns Observable<TViewModel> - Stream of view model updates
     *
     * @see {@link https://rxjs.dev/guide/observable} RxJS Observable Guide
     * @see {@link https://angular.io/guide/observables} Angular Observables
     */
    public vm$(): Observable<TViewModel> {
        this._vm$ ??= <Observable<TViewModel>>toObservable(this.vm).pipe(
            filter(p => p != undefined),
            this.untilDestroyed(),
            share()
        );

        return this._vm$;
    }

    /**
     * Projects and observes a specific property or computed value from the view model.
     *
     * This method provides a convenient way to observe specific parts of the view model
     * with automatic change detection and distinct value filtering. It's particularly
     * useful for creating reactive streams focused on specific view model properties.
     *
     * ## Features
     *
     * - **Property Projection**: Extract specific values using a selector function
     * - **Change Detection**: Only emits when the selected value actually changes
     * - **Object Value Comparison**: Uses deep comparison for complex objects
     * - **Type Safety**: Maintains type safety through generic constraints
     *
     * ## Usage Examples
     *
     * ### Simple Property Selection
     * ```typescript
     * ngOnInit() {
     *   // Observe just the user name
     *   this.selectVm(vm => vm.user?.name).subscribe(name => {
     *     this.updateTitle(`Welcome, ${name}`);
     *   });
     * }
     * ```
     *
     * ### Complex Object Selection
     * ```typescript
     * ngOnInit() {
     *   // Observe user permissions object
     *   this.selectVm(vm => vm.user?.permissions).subscribe(permissions => {
     *     this.configureUIBasedOnPermissions(permissions);
     *   });
     * }
     * ```
     *
     * ### Computed Values
     * ```typescript
     * ngOnInit() {
     *   // Observe computed display name
     *   this.selectVm(vm => `${vm.user?.firstName} ${vm.user?.lastName}`).subscribe(fullName => {
     *     this.displayName = fullName;
     *   });
     * }
     * ```
     *
     * ### Multiple Property Combination
     * ```typescript
     * ngOnInit() {
     *   // Observe form validation state
     *   this.selectVm(vm => ({
     *     isValid: vm.form?.isValid,
     *     errors: vm.form?.errors,
     *     isDirty: vm.form?.isDirty
     *   })).subscribe(formState => {
     *     this.updateFormUI(formState);
     *   });
     * }
     * ```
     *
     * ### Boolean Conditions
     * ```typescript
     * ngOnInit() {
     *   // Observe loading state
     *   this.selectVm(vm => vm.status === 'Loading').subscribe(isLoading => {
     *     this.isLoading = isLoading;
     *   });
     * }
     * ```
     *
     * @template T - The type of the selected value
     * @param selector - Function that extracts the desired value from the view model
     * @returns Observable<T> - Stream of the selected values with change detection
     *
     * @see {@link distinctUntilObjectValuesChanged} Custom operator for object comparison
     */
    public selectVm<T>(selector: (vm: TViewModel) => T): Observable<T> {
        return this.vm$().pipe(map(selector), distinctUntilObjectValuesChanged());
    }

    /**
     * Gets the current view model with null safety checks.
     *
     * This method provides type-safe access to the current view model instance.
     * It throws a descriptive error if the view model has not been initialized,
     * helping to catch programming errors early in development.
     *
     * ## When to Use
     *
     * - **Synchronous Operations**: When you need the current VM value immediately
     * - **Event Handlers**: In click handlers, form submissions, etc.
     * - **Computed Properties**: When calculating derived values
     * - **Validation Logic**: When checking current state for business rules
     *
     * ## Usage Examples
     *
     * ### In Event Handlers
     * ```typescript
     * onSaveClick() {
     *   const vm = this.currentVm();
     *   if (vm.isDirty) {
     *     this.saveService.save(vm).subscribe();
     *   }
     * }
     * ```
     *
     * ### In Computed Properties
     * ```typescript
     * get canSubmit(): boolean {
     *   const vm = this.currentVm();
     *   return vm.isValid && !vm.isSubmitting;
     * }
     * ```
     *
     * ### In Business Logic
     * ```typescript
     * calculateTotal(): number {
     *   const vm = this.currentVm();
     *   return vm.items.reduce((sum, item) => sum + item.price, 0);
     * }
     * ```
     *
     * ### With Error Handling
     * ```typescript
     * onAction() {
     *   try {
     *     const vm = this.currentVm();
     *     this.performAction(vm);
     *   } catch (error) {
     *     console.error('View model not ready:', error);
     *     this.showErrorMessage('Please wait for data to load');
     *   }
     * }
     * ```
     *
     * @returns TViewModel - The current view model instance
     * @throws Error - When view model is not initialized
     *
     * @example
     * ```typescript
     * // Safe usage pattern
     * handleUserAction() {
     *   if (this.vm()) {
     *     const currentVm = this.currentVm();
     *     // Use currentVm safely here
     *   } else {
     *     // Handle uninitialized state
     *     this.showLoadingMessage();
     *   }
     * }
     * ```
     */
    public currentVm() {
        if (this._vm == undefined) throw new Error('Vm is not initiated');
        return this._vm;
    }

    /**
     * Computed signal indicating whether the component is loading to initialize the view model.
     *
     * This signal provides reactive access to the loading state specifically during
     * view model initialization. It combines the component's loading state with the
     * view model's existence to determine if we're in the initial loading phase.
     *
     * ## Computation Logic
     *
     * Returns `true` when:
     * - The component state is 'Loading' AND
     * - The view model is undefined (not yet initialized)
     *
     * ## Usage Examples
     *
     * ### Template Loading Indicators
     * ```html
     * <div *ngIf="isLoadingToInitVm(); else content">
     *   <mat-spinner></mat-spinner>
     *   <p>Loading user data...</p>
     * </div>
     *
     * <ng-template #content>
     *   <div *ngIf="vm() as viewModel">
     *     <!-- Actual content -->
     *   </div>
     * </ng-template>
     * ```
     *
     * ### Conditional Logic
     * ```typescript
     * ngOnInit() {
     *   effect(() => {
     *     if (this.isLoadingToInitVm()) {
     *       this.showProgressBar();
     *     } else {
     *       this.hideProgressBar();
     *     }
     *   });
     * }
     * ```
     *
     * ### Button States
     * ```html
     * <button
     *   [disabled]="isLoadingToInitVm()"
     *   (click)="save()">
     *   {{isLoadingToInitVm() ? 'Loading...' : 'Save'}}
     * </button>
     * ```
     *
     * @returns Signal<boolean> - Reactive loading state for VM initialization
     *
     * @see {@link ComponentStateStatus} For available component states
     */
    public override get isLoadingToInitVm(): Signal<boolean> {
        this._isLoadingToInitVm ??= computed(() => (this.isStateLoading() || this.isStateReloading()) && this.vm() == undefined);
        return this._isLoadingToInitVm;
    }

    /**
     * The original view model state captured during initialization.
     *
     * This property stores a deep clone of the view model at the time of initial
     * successful loading. It serves as a reference point for comparison, reset
     * operations, and dirty state tracking.
     *
     * ## Use Cases
     *
     * - **Reset Operations**: Restore view model to original state
     * - **Dirty Checking**: Compare current state with original
     * - **Change Tracking**: Determine what has been modified
     * - **Undo Functionality**: Revert changes back to initial state
     *
     * ## Usage Examples
     *
     * ### Reset to Original
     * ```typescript
     * resetToOriginal() {
     *   if (this.originalInitVm) {
     *     this.internalSetVm(cloneDeep(this.originalInitVm));
     *   }
     * }
     * ```
     *
     * ### Dirty State Detection
     * ```typescript
     * get isDirty(): boolean {
     *   if (!this.originalInitVm || !this.vm()) return false;
     *   return !isEqual(this.vm(), this.originalInitVm);
     * }
     * ```
     *
     * ### Change Summary
     * ```typescript
     * getChanges(): Partial<TViewModel> {
     *   const current = this.vm();
     *   const original = this.originalInitVm;
     *   if (!current || !original) return {};
     *
     *   const changes: Partial<TViewModel> = {};
     *   Object.keys(current).forEach(key => {
     *     if (current[key] !== original[key]) {
     *       changes[key] = current[key];
     *     }
     *   });
     *   return changes;
     * }
     * ```
     *
     * @public
     */
    public originalInitVm!: TViewModel;

    /**
     * Event emitter that fires when the view model changes.
     *
     * This output event allows parent components to react to view model changes,
     * enabling two-way data binding and parent-child communication patterns.
     * The event fires whenever the view model is updated, either through direct
     * assignment or partial updates.
     *
     * ## Event Timing
     *
     * - Fires after view model is successfully updated
     * - Only fires after component initialization (`ngOnInit` completed)
     * - Includes both internal updates and external input changes
     *
     * ## Usage Examples
     *
     * ### Parent Component Listening
     * ```typescript
     * // Parent template
     * <user-profile
     *   [vm]="selectedUser"
     *   (vmChange)="onUserChanged($event)">
     * </user-profile>
     *
     * // Parent component
     * onUserChanged(updatedUser: UserVm) {
     *   this.selectedUser = updatedUser;
     *   this.saveUserChanges(updatedUser);
     * }
     * ```
     *
     * ### Two-Way Binding Pattern
     * ```html
     * <!-- Shorthand for two-way binding -->
     * <user-editor [(vm)]="currentUser"></user-editor>
     *
     * <!-- Equivalent to: -->
     * <user-editor
     *   [vm]="currentUser"
     *   (vmChange)="currentUser = $event">
     * </user-editor>
     * ```
     *
     * ### Form Integration
     * ```typescript
     * // Child component updates
     * onFormSubmit() {
     *   this.updateVm({
     *     name: this.form.value.name,
     *     email: this.form.value.email
     *   });
     *   // vmChange event automatically fired
     * }
     *
     * // Parent component receives updates
     * onFormDataChanged(formVm: FormVm) {
     *   this.validateForm(formVm);
     *   this.updateSaveButtonState(formVm.isValid);
     * }
     * ```
     *
     * ### State Synchronization
     * ```typescript
     * onViewModelChanged(vm: TViewModel) {
     *   // Sync with parent state management
     *   this.store.dispatch(updateViewModel({ vm }));
     *
     *   // Log for debugging
     *   console.log('View model updated:', vm);
     *
     *   // Trigger side effects
     *   this.analyticsService.trackViewModelChange(vm);
     * }
     * ```
     *
     * @public
     */
    @Output('vmChange')
    public vmChangeEvent = new EventEmitter<TViewModel>();

    /**
     * Angular lifecycle hook that initializes the view model.
     *
     * This method is called after Angular has initialized all data-bound properties
     * of the component. It triggers the view model initialization process and
     * calls the parent class initialization.
     *
     * ## Initialization Sequence
     *
     * 1. Calls `initVm()` to start view model loading
     * 2. Emits to `ngOnInitCalled$` for coordination
     * 3. Handles both sync and async view model initialization
     *
     * ## Override Pattern
     *
     * When overriding this method in derived classes, always call `super.ngOnInit()`:
     *
     * ```typescript
     * public override ngOnInit(): void {
     *   super.ngOnInit(); // Important: call parent first
     *
     *   // Your additional initialization logic
     *   this.setupFormValidation();
     *   this.loadUserPreferences();
     * }
     * ```
     *
     * @public
     */
    public override ngOnInit(): void {
        // No need to call super.ngOnInit() here, because super.ngOnInit() is called in initVm method
        this.initVm();
        this.ngOnInitCalled$.next(true);
    }

    protected override get autoRunInitOrReloadVmInNgOnInit() {
        return false;
    }

    /**
     * Initializes the view model and manages its lifecycle.
     *
     * This method handles both initial loading and reloading of the view model,
     * managing the complete lifecycle including error handling, status updates,
     * and subscription management. It's the core method responsible for view model
     * initialization and can be called multiple times safely.
     *
     * ## Features
     *
     * - **Smart Initialization**: Only initializes if needed or forced
     * - **Reload Support**: Handles both initial load and reload scenarios
     * - **Subscription Management**: Automatically manages observables and cleanup
     * - **Error Handling**: Comprehensive error handling with status updates
     * - **Status Tracking**: Automatic status management during lifecycle
     * - **Deep Cloning**: Preserves original state for comparison
     *
     * ## Initialization Flow
     *
     * 1. **Pre-check**: Determines if initialization is needed
     * 2. **Observable vs Sync**: Handles both observable and synchronous data sources
     * 3. **Status Management**: Updates component status throughout the process
     * 4. **Error Handling**: Catches and properly handles initialization errors
     * 5. **Success Callback**: Executes callback after successful initialization
     *
     * ## Usage Examples
     *
     * ### Basic Initialization
     * ```typescript
     * ngOnInit() {
     *   // Called automatically, but can be called manually
     *   this.initVm();
     * }
     * ```
     *
     * ### Force Reinitialization
     * ```typescript
     * onRefreshClick() {
     *   this.initVm(true); // Force reload
     * }
     * ```
     *
     * ### With Success Callback
     * ```typescript
     * loadUserData() {
     *   this.initVm(false, () => {
     *     console.log('User data loaded successfully');
     *     this.scrollToTop();
     *     this.focusFirstInput();
     *   });
     * }
     * ```
     *
     * ### Conditional Reloading
     * ```typescript
     * onDataStale() {
     *   const shouldForceReload = this.vm()?.lastUpdated < this.getStaleThreshold();
     *   this.initVm(shouldForceReload);
     * }
     * ```
     *
     * ## Real-World Implementation Examples
     *
     * Based on actual usage in the codebase:
     *
     * ```typescript
     * // User profile component
     * protected initOrReloadVm = (isReload: boolean) => {
     *   return this.userService.getUserProfile(this.userId).pipe(
     *     map(userData => ({
     *       ...userData,
     *       status: 'Success' as const,
     *       isLoaded: true
     *     }))
     *   );
     * };
     *
     * // Goal management component
     * protected initOrReloadVm = (isReload: boolean) => {
     *   return this.goalService.getGoals({
     *     companyId: this.companyId,
     *     includeArchived: false
     *   });
     * };
     * ```
     *
     * ## Error Handling
     *
     * The method automatically handles:
     * - **Network Errors**: API call failures
     * - **Validation Errors**: Data validation issues
     * - **Timeout Errors**: Request timeout scenarios
     * - **Authorization Errors**: Permission-related failures
     *
     * ## Performance Considerations
     *
     * - **Subscription Cleanup**: Automatically cancels previous subscriptions
     * - **Memory Management**: Proper disposal of observables
     * - **Change Detection**: Optimized to trigger only when necessary
     * - **Deep Cloning**: Only performed when successful initialization occurs
     *
     * @param forceReinit - When true, forces reinitialization even if VM exists
     * @param onSuccess - Optional callback executed after successful initialization
     *
     * @public
     *
     * @see {@link initOrReloadVm} Abstract method that provides the data source
     * @see {@link reload} Convenience method that calls this with forceReinit=true
     * @see {@link updateVm} Method for updating existing view model state
     */
    public initVm(forceReinit: boolean = false, onSuccess?: () => unknown) {
        if (forceReinit) this.cancelStoredSubscription('initVm');

        const isReload = forceReinit && (this._vm?.status == 'Success' || this._vm?.status == 'Reloading');
        const initialVm$ = this.initOrReloadVm(isReload).pipe(
            tapOnce({
                next: p => {
                    this.isVmLoadedOnce.set(true);
                }
            })
        );

        if ((this.vm() == undefined || forceReinit) && initialVm$ != undefined) {
            if (initialVm$ instanceof Observable) {
                this.storeSubscription(
                    'initVm',
                    initialVm$.pipe(distinctUntilObjectValuesChanged(), this.observerLoadingErrorState(undefined, { isReloading: isReload })).subscribe({
                        next: initialVm => {
                            if (initialVm) {
                                autoInitVmStatus.bind(this)(initialVm);

                                this.internalSetVm(initialVm);
                                this.originalInitVm = cloneDeep(initialVm);
                                super.ngOnInit();

                                executeOnSuccessDelay.bind(this)();
                            } else {
                                super.ngOnInit();

                                executeOnSuccessDelay.bind(this)();
                            }
                        },
                        error: (error: PlatformApiServiceErrorResponse | Error) => {
                            this.status$.set(ComponentStateStatus.Error);
                            this.setErrorMsg(error);
                        }
                    })
                );
            } else {
                autoInitVmStatus.bind(this)(initialVm$);

                this.internalSetVm(initialVm$);
                this.originalInitVm = cloneDeep(initialVm$);
                super.ngOnInit();

                executeOnSuccessDelay.bind(this)();
            }
        } else {
            super.ngOnInit();

            executeOnSuccessDelay.bind(this)();
        }

        function autoInitVmStatus(this: PlatformVmComponent<TViewModel>, initialVm: TViewModel) {
            // Init status auto default Success if first time init and status is Pending
            if (initialVm.status == 'Pending') {
                if (this._vm == undefined) initialVm.status = 'Success';
                else this.updateVm(<Partial<TViewModel>>{ status: 'Success' });
            }
        }

        function executeOnSuccessDelay(this: PlatformVmComponent<TViewModel>) {
            // because we are using vm() signal, when internalSetVm => setTimeout to ensure the value
            // in vm signal is updated => then run onSuccess to make sure it works correctly if onSuccess logic is using vm signal value
            if (onSuccess != undefined)
                setTimeout(() => {
                    onSuccess();
                    this.detectChanges();
                });
        }
    } /**
     * Reloads the view model by forcing reinitialization.
     *
     * This convenience method provides a simple way to refresh the view model
     * by forcing a complete reinitialization. It clears any existing error state
     * and triggers a fresh load of the view model data.
     *
     * ## Features
     *
     * - **Force Reload**: Always reinitializes regardless of current state
     * - **Error Cleanup**: Automatically clears previous error messages
     * - **Status Reset**: Resets component status to loading state
     * - **Subscription Safety**: Cancels existing subscriptions before reload
     *
     * ## Common Use Cases
     *
     * ### User-Triggered Refresh
     * ```typescript
     * onRefreshButtonClick() {
     *   this.reload(); // Simple refresh
     * }
     * ```
     *
     * ### Error Recovery
     * ```typescript
     * onRetryAfterError() {
     *   this.reload(); // Retry after error
     * }
     * ```
     *
     * ### Data Staleness Handling
     * ```typescript
     * onDataBecameStale() {
     *   this.reload(); // Refresh stale data
     * }
     * ```
     *
     * ### After External Changes
     * ```typescript
     * onExternalDataUpdate(updatedId: string) {
     *   if (updatedId === this.currentId) {
     *     this.reload(); // Refresh after external update
     *   }
     * }
     * ```
     *
     * ## Template Integration Examples
     *
     * ```html
     * <!-- Refresh button -->
     * <button
     *   mat-icon-button
     *   (click)="reload()"
     *   [disabled]="isStateLoading()"
     *   title="Refresh Data">
     *   <mat-icon>refresh</mat-icon>
     * </button>
     *
     * <!-- Error state with retry -->
     * <div *ngIf="isStateError()">
     *   <p>Failed to load data</p>
     *   <button mat-button (click)="reload()">Try Again</button>
     * </div>
     *
     * <!-- Pull-to-refresh pattern -->
     * <div (swipedown)="reload()">
     *   <ion-refresher (ionRefresh)="reload()">
     *     <ion-refresher-content></ion-refresher-content>
     *   </ion-refresher>
     * </div>
     * ```
     *
     * ## Lifecycle Integration
     *
     * ```typescript
     * @Component({
     *   template: `
     *     <div *ngIf="vm() as data; else loading">
     *       <!-- Content -->
     *       <button (click)="reload()">Refresh</button>
     *     </div>
     *     <ng-template #loading>
     *       <div *ngIf="isStateError(); else loadingSpinner">
     *         <p>Error loading data</p>
     *         <button (click)="reload()">Retry</button>
     *       </div>
     *       <ng-template #loadingSpinner>
     *         <mat-spinner></mat-spinner>
     *       </ng-template>
     *     </ng-template>
     *   `
     * })
     * export class DataComponent extends PlatformVmComponent<DataVm> {
     *   // initOrReloadVm implementation...
     * }
     * ```
     *
     * @public
     *
     * @see {@link initVm} The underlying method that performs the actual reload
     * @see {@link clearErrorMsg} Error state cleanup method
     */
    public override reload() {
        this.initVm(true);
        this.clearErrorMsg();
    } /**
     * Abstract method that provides the data source for view model initialization.
     *
     * This is the core hook that derived components must implement to define how
     * their view model data is loaded. The method can return either an Observable
     * for asynchronous data loading or a direct value for synchronous initialization.
     *
     * ## Implementation Requirements
     *
     * Derived classes must implement this method to specify:
     * - **Data Source**: Where the view model data comes from (API, service, store)
     * - **Loading Logic**: How to handle initial load vs. reload scenarios
     * - **Error Handling**: How to handle data loading failures
     * - **Return Type**: Observable for async or direct value for sync
     *
     * ## Method Signature Patterns
     *
     * ### Asynchronous Observable Pattern
     * ```typescript
     * protected initOrReloadVm = (isReload: boolean): Observable<UserVm> => {
     *   return this.userService.getUser(this.userId).pipe(
     *     map(userData => ({
     *       ...userData,
     *       status: 'Success' as const,
     *       isLoaded: true,
     *       lastUpdated: new Date()
     *     }))
     *   );
     * };
     * ```
     *
     * ### Conditional Loading Based on Reload Flag
     * ```typescript
     * protected initOrReloadVm = (isReload: boolean): Observable<DataVm> => {
     *   if (isReload) {
     *     // Force fresh data from server
     *     return this.dataService.refreshData(this.dataId);
     *   } else {
     *     // Try cache first, fallback to server
     *     return this.dataService.getData(this.dataId, { useCache: true });
     *   }
     * };
     * ```
     *
     * ### Synchronous Direct Value Pattern
     * ```typescript
     * protected initOrReloadVm = (isReload: boolean): ConfigVm => {
     *   return {
     *     theme: 'light',
     *     language: 'en',
     *     status: 'Success' as const,
     *     isLoaded: true
     *   };
     * };
     * ```
     *
     * ### Complex Multi-Source Loading
     * ```typescript
     * protected initOrReloadVm = (isReload: boolean): Observable<DashboardVm> => {
     *   return combineLatest([
     *     this.userService.getCurrentUser(),
     *     this.statsService.getUserStats(this.userId),
     *     this.notificationService.getUnreadCount(this.userId)
     *   ]).pipe(
     *     map(([user, stats, notifications]) => ({
     *       user,
     *       stats,
     *       unreadNotifications: notifications,
     *       status: 'Success' as const,
     *       isLoaded: true,
     *       lastUpdated: new Date()
     *     }))
     *   );
     * };
     * ```
     *
     * ## Real-World Implementation Examples
     *
     * Based on actual usage patterns in the codebase:
     *
     * ### User Management Component
     * ```typescript
     * protected initOrReloadVm = (isReload: boolean) => {
     *   return this.userApiService.getUsers({
     *     companyId: this.companyId,
     *     includeInactive: false,
     *     pageSize: 50
     *   }).pipe(
     *     map(response => ({
     *       users: response.data,
     *       totalCount: response.totalCount,
     *       currentPage: 1,
     *       status: 'Success' as const
     *     }))
     *   );
     * };
     * ```
     *
     * ### Goal Management Component
     * ```typescript
     * protected initOrReloadVm = (isReload: boolean) => {
     *   const params = {
     *     companyId: this.companyId,
     *     year: this.selectedYear,
     *     includeArchived: this.includeArchived
     *   };
     *
     *   return this.goalApiService.getGoals(params).pipe(
     *     catchError(error => {
     *       console.error('Failed to load goals:', error);
     *       return of({
     *         goals: [],
     *         error: 'Failed to load goals',
     *         status: 'Error' as const
     *       });
     *     })
     *   );
     * };
     * ```
     *
     * ### Form Component with Validation
     * ```typescript
     * protected initOrReloadVm = (isReload: boolean) => {
     *   if (this.itemId) {
     *     // Edit mode - load existing data
     *     return this.itemService.getItem(this.itemId);
     *   } else {
     *     // Create mode - return empty form
     *     return of({
     *       id: '',
     *       name: '',
     *       description: '',
     *       isValid: false,
     *       isDirty: false,
     *       status: 'Success' as const
     *     });
     *   }
     * };
     * ```
     *
     * ## Parameter Usage
     *
     * ### isReload Parameter
     *
     * The `isReload` parameter indicates whether this is:
     * - `false`: Initial load (component first initialization)
     * - `true`: Reload operation (user refresh, retry after error)
     *
     * Use this to implement different loading strategies:
     *
     * ```typescript
     * protected initOrReloadVm = (isReload: boolean) => {
     *   const cacheOptions = {
     *     useCache: !isReload, // Skip cache on reload
     *     maxAge: isReload ? 0 : 5 * 60 * 1000 // 5 min cache unless reloading
     *   };
     *
     *   return this.dataService.loadData(this.id, cacheOptions);
     * };
     * ```
     *
     * ## Error Handling Best Practices
     *
     * ```typescript
     * protected initOrReloadVm = (isReload: boolean): Observable<DataVm> => {
     *   return this.dataService.getData(this.id).pipe(
     *     retry(2), // Retry failed requests
     *     timeout(30000), // 30 second timeout
     *     catchError(error => {
     *       // Log error for debugging
     *       console.error('Data loading failed:', error);
     *
     *       // Return error state in VM
     *       return of({
     *         data: null,
     *         error: this.getErrorMessage(error),
     *         status: 'Error' as const,
     *         isLoaded: false
     *       });
     *     })
     *   );
     * };
     * ```
     *
     * @param isReload - True when this is a reload operation, false for initial load
     * @returns Observable<TViewModel | undefined> for async loading, or TViewModel | undefined for sync
     *
     * @protected
     * @abstract
     *
     * @see {@link initVm} Method that calls this hook
     * @see {@link reload} Method that triggers reload (isReload=true)
     * @see {@link IPlatformVm} Base interface for view models
     */
    protected abstract override initOrReloadVm: (isReload: boolean) => Observable<TViewModel | undefined>;

    /**
     * Updates the view model with partial state changes or using an updater function.
     *
     * This method provides a powerful and flexible way to update the view model state
     * while maintaining immutability, type safety, and proper change detection. It supports
     * both partial object updates and functional updates for complex state transformations.
     *
     * ## Features
     *
     * - **Immutable Updates**: Creates new view model instances without mutating existing state
     * - **Type Safety**: Full TypeScript support with intelligent autocompletion
     * - **Flexible Updates**: Supports both partial objects and updater functions
     * - **Change Detection**: Automatically triggers Angular change detection
     * - **Event Emission**: Fires `vmChange` event for parent component communication
     * - **Callback Support**: Optional callback executed after successful update
     * - **Performance Optimized**: Only updates when actual changes are detected
     *
     * ## Update Patterns
     *
     * ### Partial Object Updates
     * ```typescript
     * // Simple property update
     * this.updateVm({ name: 'New Name' });
     *
     * // Multiple property update
     * this.updateVm({
     *   name: 'John Doe',
     *   email: 'john@example.com',
     *   isActive: true
     * });
     *
     * // Nested property update (with deep partial support)
     * this.updateVm({
     *   user: {
     *     profile: {
     *       avatar: 'new-avatar-url.jpg'
     *     }
     *   }
     * });
     * ```
     *
     * ### Functional Updates
     * ```typescript
     * // Simple functional update
     * this.updateVm(vm => ({
     *   count: vm.count + 1
     * }));
     *
     * // Complex state transformation
     * this.updateVm(vm => {
     *   const updatedItems = vm.items.map(item =>
     *     item.id === selectedId
     *       ? { ...item, isSelected: true }
     *       : { ...item, isSelected: false }
     *   );
     *
     *   return {
     *     items: updatedItems,
     *     selectedCount: updatedItems.filter(i => i.isSelected).length
     *   };
     * });
     *
     * // Conditional updates
     * this.updateVm(vm => {
     *   if (vm.user.role === 'admin') {
     *     return { permissions: [...vm.permissions, 'manage_users'] };
     *   }
     *   return {}; // No changes
     * });
     * ```
     *
     * ## Real-World Usage Examples
     *
     * ### Form Field Updates
     * ```typescript
     * onNameChange(newName: string) {
     *   this.updateVm({
     *     name: newName,
     *     isDirty: true,
     *     lastModified: new Date()
     *   }, (updatedVm) => {
     *     // Callback after update
     *     this.validateForm(updatedVm);
     *   });
     * }
     * ```
     *
     * ### List Item Management
     * ```typescript
     * addItem(newItem: Item) {
     *   this.updateVm(vm => ({
     *     items: [...vm.items, newItem],
     *     totalCount: vm.totalCount + 1
     *   }));
     * }
     *
     * removeItem(itemId: string) {
     *   this.updateVm(vm => ({
     *     items: vm.items.filter(item => item.id !== itemId),
     *     totalCount: vm.totalCount - 1
     *   }));
     * }
     *
     * updateItem(itemId: string, changes: Partial<Item>) {
     *   this.updateVm(vm => ({
     *     items: vm.items.map(item =>
     *       item.id === itemId
     *         ? { ...item, ...changes }
     *         : item
     *     )
     *   }));
     * }
     * ```
     *
     * ### Status and Loading State Updates
     * ```typescript
     * markAsLoading() {
     *   this.updateVm({
     *     status: 'Loading',
     *     error: undefined
     *   });
     * }
     *
     * markAsSuccess(data: any) {
     *   this.updateVm({
     *     status: 'Success',
     *     data,
     *     error: undefined,
     *     lastUpdated: new Date()
     *   });
     * }
     *
     * markAsError(error: string) {
     *   this.updateVm({
     *     status: 'Error',
     *     error,
     *     data: undefined
     *   });
     * }
     * ```
     *
     * ### User Interaction Handling
     * ```typescript
     * onItemToggle(itemId: string) {
     *   this.updateVm(vm => {
     *     const updatedItems = vm.items.map(item =>
     *       item.id === itemId
     *         ? { ...item, isSelected: !item.isSelected }
     *         : item
     *     );
     *
     *     return {
     *       items: updatedItems,
     *       selectedCount: updatedItems.filter(i => i.isSelected).length,
     *       hasSelection: updatedItems.some(i => i.isSelected)
     *     };
     *   }, (updatedVm) => {
     *     // Update UI based on selection state
     *     this.updateToolbarState(updatedVm.hasSelection);
     *   });
     * }
     * ```
     *
     * ### Callback Usage Patterns
     * ```typescript
     * // Save after update
     * updateUserProfile(profileData: Partial<UserProfile>) {
     *   this.updateVm({ profile: profileData }, (vm) => {
     *     this.saveProfile(vm.profile);
     *   });
     * }
     *
     * // Analytics tracking
     * updatePreference(key: string, value: any) {
     *   this.updateVm({
     *     preferences: {
     *       ...this.currentVm().preferences,
     *       [key]: value
     *     }
     *   }, (vm) => {
     *     this.analyticsService.trackPreferenceChange(key, value);
     *   });
     * }
     *
     * // Validation after update
     * updateFormField(field: string, value: any) {
     *   this.updateVm({ [field]: value }, (vm) => {
     *     const validationErrors = this.validateField(field, value, vm);
     *     if (validationErrors.length > 0) {
     *       this.updateVm({ errors: { ...vm.errors, [field]: validationErrors } });
     *     }
     *   });
     * }
     * ```
     *
     * ## Immutable Update Options
     *
     * The method supports advanced immutable update options for fine-grained control:
     *
     * ```typescript
     * // Custom merge strategies
     * this.updateVm({ tags: ['new', 'tags'] }, undefined, {
     *   arrayMergeStrategy: 'replace' // vs 'merge'
     * });
     *
     * // Deep vs shallow updates
     * this.updateVm({ config: newConfig }, undefined, {
     *   deep: false // Shallow merge only
     * });
     * ```
     *
     * ## Performance Considerations
     *
     * - **Change Detection**: Only triggers when actual changes are detected
     * - **Immutability**: Creates new objects only for changed parts
     * - **Memory Management**: Proper cleanup of previous references
     * - **Optimization**: Short-circuits when no changes are made
     *
     * ## Type Safety
     *
     * The method provides full TypeScript support:
     *
     * ```typescript
     * // TypeScript ensures only valid properties can be updated
     * this.updateVm({
     *   validProperty: 'value', // ✓ Valid
     *   invalidProperty: 'value' // ✗ TypeScript error
     * });
     *
     * // Intelligent autocompletion in updater functions
     * this.updateVm(vm => {
     *   // vm parameter has full type information
     *   return {
     *     someProperty: vm.someOtherProperty.toUpperCase()
     *   };
     * });
     * ```
     *
     * @template TViewModel - The view model type extending IPlatformVm
     * @param partialStateOrUpdaterFn - Either a partial state object or an updater function
     * @param onVmChanged - Optional callback executed after successful update
     * @param immutableUpdateOptions - Advanced options for controlling the update behavior
     * @returns TViewModel - The updated view model instance
     *
     * @protected
     *
     * @see {@link internalSetVm} Internal method that applies the actual update
     * @see {@link vmChangeEvent} Event emitted when view model changes
     * @see {@link ImmutableUpdateOptions} Configuration options for updates
     *
     * @example
     * ```typescript
     * // In a user profile component
     * export class UserProfileComponent extends PlatformVmComponent<UserProfileVm> {
     *
     *   onSaveProfile() {
     *     this.updateVm({
     *       isSaving: true
     *     });
     *
     *     this.userService.saveProfile(this.currentVm().profile).subscribe({
     *       next: (savedProfile) => {
     *         this.updateVm({
     *           profile: savedProfile,
     *           isSaving: false,
     *           lastSaved: new Date()
     *         }, (vm) => {
     *           this.showSuccessMessage('Profile saved successfully');
     *         });
     *       },
     *       error: (error) => {
     *         this.updateVm({
     *           isSaving: false,
     *           error: 'Failed to save profile'
     *         });
     *       }
     *     });
     *   }
     * }
     * ```
     */
    protected updateVm(
        partialStateOrUpdaterFn: PartialDeep<TViewModel> | Partial<TViewModel> | ((state: TViewModel) => void | PartialDeep<TViewModel>),
        onVmChanged?: (vm: TViewModel) => unknown,
        immutableUpdateOptions?: ImmutableUpdateOptions
    ): TViewModel {
        if (this._vm == undefined) return this._vm!;

        const newUpdatedVm: TViewModel = immutableUpdate(this._vm, partialStateOrUpdaterFn, immutableUpdateOptions);

        if (newUpdatedVm != this._vm) {
            this.internalSetVm(newUpdatedVm, true, onVmChanged);
        }

        return this._vm;
    } /**
     * Internal method responsible for applying view model changes and managing side effects.
     *
     * This is the core method that handles the actual view model assignment, change detection,
     * event emission, and callback execution. It's used internally by all view model update
     * operations and ensures consistent behavior across the component lifecycle.
     *
     * ## Responsibilities
     *
     * - **State Assignment**: Updates the internal `_vm` property
     * - **Signal Updates**: Updates the reactive signal for template consumption
     * - **Change Detection**: Performs optional shallow comparison to prevent unnecessary updates
     * - **Event Emission**: Emits `vmChange` events for parent components
     * - **Callback Execution**: Executes optional success callbacks
     * - **Lifecycle Management**: Respects component initialization state
     *
     * ## Change Detection Logic
     *
     * The method implements smart change detection:
     *
     * ```typescript
     * // Shallow comparison (when shallowCheckDiff = true)
     * if (this._vm !== newVm) {
     *   // Only update if reference has changed
     *   performUpdate();
     * }
     *
     * // Force update (when shallowCheckDiff = false)
     * performUpdate(); // Always updates regardless of reference equality
     * ```
     *
     * ## Event Emission Rules
     *
     * The `vmChange` event is emitted only when:
     * - Component has been initialized (`ngOnInit` called), OR
     * - This is the initial view model assignment (`prevVm == undefined`)
     *
     * This prevents premature events during component initialization.
     *
     * ## Usage Context
     *
     * This method is called by:
     * - **initVm()**: During view model initialization
     * - **updateVm()**: When updating existing view model state
     * - **vmInput setter**: When parent components set the view model
     * - **Direct assignment**: In special internal scenarios
     *
     * ## Performance Considerations
     *
     * ### Shallow Checking
     * ```typescript
     * // Efficient - only checks reference equality
     * internalSetVm(newVm, true); // Default behavior
     *
     * // Less efficient - always triggers update
     * internalSetVm(newVm, false); // Force update
     * ```
     *
     * ### Memory Management
     * - Properly replaces previous view model references
     * - Maintains garbage collection eligibility for old instances
     * - Updates both internal storage and reactive signals
     *
     * ## Internal Implementation Examples
     *
     * ### During Initialization
     * ```typescript
     * // In initVm() method
     * const newVm = await this.loadInitialData();
     * this.internalSetVm(newVm, false); // Force set initial VM
     * ```
     *
     * ### During Updates
     * ```typescript
     * // In updateVm() method
     * const updatedVm = immutableUpdate(this._vm, changes);
     * this.internalSetVm(updatedVm, true); // Check if different before updating
     * ```
     *
     * ### From External Input
     * ```typescript
     * // In vmInput setter
     * if (isDifferent(this._vm, inputVm)) {
     *   this.internalSetVm(inputVm, false); // Set from parent
     * }
     * ```
     *
     * ## Return Value Usage
     *
     * The boolean return value indicates whether an actual update occurred:
     *
     * ```typescript
     * const wasUpdated = this.internalSetVm(newVm, true);
     * if (wasUpdated) {
     *   console.log('View model was actually updated');
     *   this.performPostUpdateActions();
     * } else {
     *   console.log('No update needed - VM unchanged');
     * }
     * ```
     *
     * ## Side Effects Coordination
     *
     * The method coordinates multiple side effects in the correct order:
     *
     * 1. **State Update**: `this._vm = v`
     * 2. **Signal Update**: `this.vm.set(v)`
     * 3. **Event Emission**: `this.vmChangeEvent.emit(v)` (if conditions met)
     * 4. **Callback Execution**: `onVmChanged(this._vm)` (if provided)
     *
     * ## Thread Safety
     *
     * The method executes synchronously and maintains consistency:
     * - All updates happen in a single execution context
     * - No async operations that could cause race conditions
     * - Atomic updates to both internal state and signals
     *
     * @param v - The new view model instance to set, or undefined to clear
     * @param shallowCheckDiff - When true, only updates if the reference differs from current
     * @param onVmChanged - Optional callback executed after successful assignment
     * @returns boolean - True if the view model was actually updated, false if no change occurred
     *
     * @protected
     * @internal
     *
     * @see {@link updateVm} Public method that calls this for updates
     * @see {@link initVm} Initialization method that calls this for initial setup
     * @see {@link vmChangeEvent} Event emitted when changes occur
     * @see {@link vm} Reactive signal updated by this method
     *
     * @example
     * ```typescript
     * // Internal usage pattern
     * protected performUpdate() {
     *   const newVm = this.calculateNewState();
     *   const wasUpdated = this.internalSetVm(newVm, true, (updatedVm) => {
     *     console.log('Update completed:', updatedVm);
     *     this.triggerSideEffects(updatedVm);
     *   });
     *
     *   if (!wasUpdated) {
     *     console.log('No actual changes detected');
     *   }
     * }
     * ```
     */
    protected internalSetVm = (v: TViewModel | undefined, shallowCheckDiff: boolean = true, onVmChanged?: (vm: TViewModel | undefined) => unknown): boolean => {
        if (shallowCheckDiff == false || this._vm != v) {
            const prevVm = this._vm;

            this._vm = v;
            this.vm.set(v);

            if (this.initiated$.value || prevVm == undefined) this.vmChangeEvent.emit(v);

            if (onVmChanged != undefined) onVmChanged(this._vm);

            return true;
        }

        return false;
    };
}

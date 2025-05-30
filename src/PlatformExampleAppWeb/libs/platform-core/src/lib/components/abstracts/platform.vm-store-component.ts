import { computed, Directive, OnInit, runInInjectionContext, Signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { combineLatest, map, Observable } from 'rxjs';
import { PartialDeep } from 'type-fest';

import { tapOnce } from '../../rxjs';
import { keys, list_all, list_distinct } from '../../utils';
import { PlatformVm, PlatformVmStore, requestStateDefaultKey } from '../../view-models';
import { PlatformComponent, PlatformObserverLoadingErrorStateOptions } from './platform.component';

/**
 * Abstract base class for Angular components that integrate with NgRx ComponentStore for state management.
 *
 * ## Architecture Overview
 *
 * `PlatformVmStoreComponent` extends `PlatformComponent` to provide seamless integration with NgRx ComponentStore
 * for reactive state management. It implements a sophisticated pattern where components can work with both a main
 * store and multiple additional stores, providing a unified interface for state access across complex component hierarchies.
 *
 * ## Key Features
 *
 * - **ComponentStore Integration**: Direct integration with NgRx ComponentStore for predictable state management
 * - **Multi-Store Support**: Supports both main store and additional stores for complex state scenarios
 * - **Reactive Signals**: Converts observables to Angular signals for optimal change detection
 * - **Unified State Access**: Provides consistent API for accessing state across all stores
 * - **Loading State Management**: Comprehensive loading, error, and success state tracking across all stores
 * - **Automatic Store Discovery**: Automatically discovers and manages additional stores defined as component properties
 * - **Signal-based Reactivity**: Uses Angular signals for efficient change detection and reactive programming
 *
 * ## Store Lifecycle
 *
 * 1. **Store Initialization**: Main store is injected and initialized during component construction
 * 2. **Additional Store Discovery**: Automatically discovers stores defined as component properties
 * 3. **Signal Setup**: Converts store observables to signals for reactive access
 * 4. **Reload Logic**: Coordinates reload operations across all stores
 * 5. **State Synchronization**: Keeps all stores in sync and provides unified state access
 *
 * ## Usage Patterns
 *
 * ### Basic Implementation with Single Store
 * ```typescript
 * @Component({
 *   selector: 'user-profile',
 *   providers: [UserProfileStore],
 *   template: `
 *     <div *ngIf="vm() as profile">
 *       <h1>{{profile.name}}</h1>
 *       <p>{{profile.email}}</p>
 *     </div>
 *     <div *ngIf="isStateLoading()">Loading...</div>
 *   `
 * })
 * export class UserProfileComponent extends PlatformVmStoreComponent<UserProfileVm, UserProfileStore> {
 *   constructor(store: UserProfileStore) {
 *     super(store);
 *   }
 *
 *   onUpdateProfile(name: string) {
 *     this.updateVm({ name });
 *   }
 * }
 * ```
 *
 * ### Multi-Store Implementation
 * ```typescript
 * @Component({
 *   selector: 'dashboard',
 *   providers: [DashboardStore, UserStore, NotificationStore],
 *   template: `
 *     <div *ngIf="vm() as dashboard">
 *       <!-- Dashboard content -->
 *       <div *ngIf="isStateLoading()">Loading dashboard...</div>
 *       <div *ngIf="isStateError()">{{getErrorMsg$()()}}</div>
 *     </div>
 *   `
 * })
 * export class DashboardComponent extends PlatformVmStoreComponent<DashboardVm, DashboardStore> {
 *   // Additional stores are automatically discovered
 *   public userStore = inject(UserStore);
 *   public notificationStore = inject(NotificationStore);
 *
 *   constructor(store: DashboardStore) {
 *     super(store);
 *   }
 *
 *   refreshAll() {
 *     this.reload(); // Reloads all stores
 *   }
 * }
 * ```
 *
 * ### Advanced State Management
 * ```typescript
 * export class ComplexFormComponent extends PlatformVmStoreComponent<FormVm, FormStore> {
 *   public validationStore = inject(ValidationStore);
 *   public preferencesStore = inject(PreferencesStore);
 *
 *   onSubmit() {
 *     // Check if all stores are in valid state
 *     if (this.isStateError()) {
 *       const errorMsg = this.getAllErrorMsgs$()();
 *       this.showError(errorMsg);
 *       return;
 *     }
 *
 *     // Update main store with form data
 *     this.updateVm({
 *       formData: this.getFormData(),
 *       isSubmitting: true
 *     });
 *   }
 * }
 * ```
 *
 * ## Real-World Usage Examples
 *
 * This class is extensively used throughout the application for:
 * - **User Management**: Managing user profiles, preferences, and settings
 * - **Dashboard Components**: Coordinating multiple data sources and state
 * - **Form Management**: Complex forms with validation and multiple data sources
 * - **List Management**: Managing lists with filtering, pagination, and bulk operations
 * - **Data Entry**: Forms that depend on multiple stores for lookup data
 *
 * ## Store Integration Benefits
 *
 * - **Predictable State**: NgRx ComponentStore provides predictable state updates
 * - **DevTools Support**: Full integration with NgRx DevTools for debugging
 * - **Performance**: Optimized change detection through signals
 * - **Testing**: Easy to test with isolated store instances
 * - **Type Safety**: Full TypeScript support for store and view model types
 *
 * ## Signal-based Reactivity
 *
 * The component automatically converts store observables to Angular signals:
 *
 * ```typescript
 * // Reactive template binding
 * template: `
 *   <div *ngIf="vm() as data">{{data.title}}</div>
 *   <div *ngIf="isStateLoading()">Loading...</div>
 *   <div *ngIf="isStateError()">{{getErrorMsg$()()}}</div>
 * `
 *
 * // Reactive component logic
 * ngOnInit() {
 *   effect(() => {
 *     const vm = this.vm();
 *     if (vm?.shouldTriggerAction) {
 *       this.performAction();
 *     }
 *   });
 * }
 * ```
 *
 * ## Related Classes
 *
 * - {@link PlatformComponent} - Base component class
 * - {@link PlatformVmComponent} - View model component without store integration
 * - {@link PlatformFormComponent} - Form-specific component management
 * - {@link PlatformVmStore} - Base store class for state management
 *
 * @template TViewModel - The view model type that extends PlatformVm
 * @template TViewModelStore - The store type that extends PlatformVmStore<TViewModel>
 *
 * @example
 * ```typescript
 * // Define your view model and store
 * interface ProductListVm extends PlatformVm {
 *   products: Product[];
 *   filter: string;
 *   totalCount: number;
 * }
 *
 * @Injectable()
 * export class ProductListStore extends PlatformVmStore<ProductListVm> {
 *   constructor(private productService: ProductService) {
 *     super({ products: [], filter: '', totalCount: 0 });
 *   }
 *
 *   readonly loadProducts = this.effect((filter$: Observable<string>) =>
 *     filter$.pipe(
 *       switchMap(filter =>
 *         this.productService.getProducts(filter).pipe(
 *           this.observerLoadingErrorState(),
 *           this.tapResponse(
 *             products => this.updateState({ products, totalCount: products.length }),
 *             error => this.setErrorMsg(error.message)
 *           )
 *         )
 *       )
 *     )
 *   );
 * }
 *
 * // Implement component
 * @Component({
 *   selector: 'product-list',
 *   providers: [ProductListStore],
 *   template: `
 *     <input [(ngModel)]="searchTerm" (input)="onSearch()">
 *     <div *ngIf="isStateLoading()">Loading products...</div>
 *     <div *ngIf="vm() as productList">
 *       <div *ngFor="let product of productList.products">
 *         {{product.name}} - {{product.price | currency}}
 *       </div>
 *       <p>Total: {{productList.totalCount}} products</p>
 *     </div>
 *     <div *ngIf="isStateError()" class="error">
 *       {{getErrorMsg$()()}}
 *     </div>
 *   `
 * })
 * export class ProductListComponent extends PlatformVmStoreComponent<ProductListVm, ProductListStore> {
 *   searchTerm = '';
 *
 *   constructor(store: ProductListStore) {
 *     super(store);
 *   }
 *
 *   onSearch() {
 *     this.store.loadProducts(this.searchTerm);
 *   }
 *
 *   refreshProducts() {
 *     this.reload();
 *   }
 * }
 * ```
 *
 * @see {@link https://ngrx.io/guide/component-store} NgRx ComponentStore Documentation
 * @see {@link https://angular.io/guide/signals} Angular Signals Guide
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */
@Directive()
export abstract class PlatformVmStoreComponent<TViewModel extends PlatformVm, TViewModelStore extends PlatformVmStore<TViewModel>>
    extends PlatformComponent
    implements OnInit
{
    /**
     * Creates an instance of PlatformVmStoreComponent with the provided store.
     *
     * The constructor initializes the component with a main store that will be used for state management.
     * Additional stores can be automatically discovered if they are defined as component properties.
     *
     * @param {TViewModelStore} store - The main store instance for this component
     *
     * @example
     * ```typescript
     * export class UserProfileComponent extends PlatformVmStoreComponent<UserProfileVm, UserProfileStore> {
     *   constructor(store: UserProfileStore) {
     *     super(store);
     *   }
     * }
     * ```
     */
    public constructor(public store: TViewModelStore) {
        super();
    }

    /**
     * Internal storage for additional stores discovered on this component.
     * @private
     */
    private _additionalStores?: PlatformVmStore<PlatformVm>[];

    /**
     * Gets all additional stores that have been automatically discovered on this component.
     *
     * This property automatically discovers any PlatformVmStore instances that are defined as
     * properties on the component (excluding the main store). This enables multi-store scenarios
     * where a component needs to coordinate state across multiple stores.
     *
     * The discovery mechanism:
     * 1. Scans all component properties using reflection
     * 2. Identifies properties that are instances of PlatformVmStore
     * 3. Excludes the main store and other system properties
     * 4. Caches the result for performance
     *
     * @public
     * @returns {PlatformVmStore<PlatformVm>[]} Array of additional store instances found on this component
     *
     * @example
     * ```typescript
     * export class DashboardComponent extends PlatformVmStoreComponent<DashboardVm, DashboardStore> {
     *   // These stores will be automatically discovered
     *   public userStore = inject(UserStore);
     *   public notificationStore = inject(NotificationStore);
     *   public settingsStore = inject(SettingsStore);
     *
     *   ngOnInit() {
     *     // additionalStores will contain [userStore, notificationStore, settingsStore]
     *     console.log('Additional stores:', this.additionalStores.length);
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Checking state across all stores
     * ngOnInit() {
     *   const allStoresReady = this.additionalStores.every(store =>
     *     store.currentState().isStateSuccess
     *   );
     *
     *   if (allStoresReady) {
     *     this.performInitialDataLoad();
     *   }
     * }
     * ```
     */
    public get additionalStores(): PlatformVmStore<PlatformVm>[] {
        if (this._additionalStores == null) {
            const mainStoreKey: keyof PlatformVmStoreComponent<PlatformVm, PlatformVmStore<PlatformVm>> = 'store';

            // ignore ['additionalStores', 'isStateError$', 'isStateLoading$', 'errorMsg$'] to prevent maximum call stack error
            // use keys => access to properies => trigger it self a gain. isStateError, isStateLoading are using additionalStores
            // is also affected
            this._additionalStores = keys(this, true, [
                'additionalStores',
                'isStateError',
                'isStateLoading',
                'isStateReloading',
                'isStateSuccess',
                'isStatePending',
                'errorMsg$',
                'state$',
                'vm',
                'vm$'
            ])
                .filter(key => this[key] instanceof PlatformVmStore && key != mainStoreKey)
                .map(key => <PlatformVmStore<PlatformVm>>this[key]);
        }

        return this._additionalStores;
    }

    /**
     * Initializes the component and sets up store infrastructure.
     *
     * This lifecycle method:
     * 1. Calls the parent component's ngOnInit
     * 2. Initializes the main store's inner state
     * 3. Checks if stores are already initialized and triggers reload if needed
     * 4. Signals that initialization is complete
     *
     * The reload logic ensures that if stores have already been initialized
     * (e.g., from a previous component instance), the data is refreshed.
     *
     * @public
     * @override
     */
    public override ngOnInit(): void {
        super.ngOnInit();
        this.store.initInnerStore();

        if (
            this.store.vmStateInitiated.value &&
            (this.store.currentState().isStateSuccess || this.store.currentState().isStateError) &&
            list_all(this.additionalStores, p => p.currentState().isStateSuccess || p.currentState().isStateError)
        )
            this.reload();

        this.ngOnInitCalled$.next(true);
    }

    /**
     * Internal observable cache for the root state stream.
     * @private
     */
    private _state$?: Observable<TViewModel>;

    /**
     * Gets an observable stream of the root state from the main store.
     *
     * This observable provides access to the complete state regardless of loading status.
     * Unlike `vm$`, this stream emits all state changes including loading, error, and success states.
     * Use this when you need to observe the complete state lifecycle.
     *
     * ## Key Characteristics
     *
     * - **Complete State**: Emits all state changes, not just loaded data
     * - **Always Available**: Available even when data is not yet loaded
     * - **Lifecycle Aware**: Automatically cleaned up when component is destroyed
     * - **Cached**: Observable is created once and reused for performance
     *
     * @public
     * @returns {Observable<TViewModel>} Observable stream of the complete state
     *
     * @example
     * ```typescript
     * ngOnInit() {
     *   // Monitor complete state lifecycle
     *   this.state$.subscribe(state => {
     *     console.log('State status:', state.status);
     *
     *     if (state.isStateLoading) {
     *       this.showLoadingIndicator();
     *     } else if (state.isStateError) {
     *       this.showErrorMessage(state.error);
     *     } else if (state.isStateSuccess) {
     *       this.processSuccessfulData(state.data);
     *     }
     *   });
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Use in template for complete state monitoring
     * // Template:
     * // <div *ngIf="state$ | async as state">
     * //   <div *ngIf="state.isStateLoading">Loading...</div>
     * //   <div *ngIf="state.isStateError">Error: {{state.error}}</div>
     * //   <div *ngIf="state.isStateSuccess">{{state.data}}</div>
     * // </div>
     * ```
     */
    public get state$(): Observable<TViewModel> {
        if (this._state$ == undefined) this._state$ = this.store.state$.pipe(this.untilDestroyed());

        return this._state$;
    }

    /**
     * Internal observable cache for the view model stream.
     * @private
     */
    private _vm$?: Observable<TViewModel>;

    /**
     * Gets an observable stream of the view model with valid loaded data for UI display.
     *
     * This observable only emits when the store contains valid, successfully loaded data
     * that is ready for UI consumption. It filters out loading and error states, making
     * it ideal for template binding and UI logic.
     *
     * ## Key Characteristics
     *
     * - **UI-Ready Data**: Only emits when data is successfully loaded and valid
     * - **Filtered Stream**: Excludes loading and error states
     * - **Triggers Loading**: Subscription may trigger data loading if not already loaded
     * - **Single Subscription**: Should only be subscribed once, typically in templates
     * - **Lifecycle Aware**: Automatically cleaned up when component is destroyed
     *
     * @public
     * @returns {Observable<TViewModel>} Observable stream of valid view model data
     *
     * @example
     * ```typescript
     * // Template usage (recommended)
     * // <div *ngIf="vm$ | async as viewModel">
     * //   <h1>{{viewModel.title}}</h1>
     * //   <p>{{viewModel.description}}</p>
     * // </div>
     * ```
     *
     * @example
     * ```typescript
     * // Component logic usage
     * ngOnInit() {
     *   this.vm$.subscribe(viewModel => {
     *     // This only fires when valid data is available
     *     this.processValidData(viewModel);
     *     this.updateRelatedComponents(viewModel);
     *   });
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Combining with operators
     * ngOnInit() {
     *   this.vm$.pipe(
     *     map(vm => vm.items),
     *     filter(items => items.length > 0)
     *   ).subscribe(items => {
     *     this.displayItems(items);
     *   });
     * }
     * ```
     */
    public get vm$(): Observable<TViewModel> {
        if (this._vm$ == undefined)
            this._vm$ = this.store.vm$.pipe(this.untilDestroyed()).pipe(
                tapOnce({
                    next: p => {
                        this.isVmLoadedOnce.set(true);
                    }
                })
            );

        return this._vm$;
    }

    /**
     * Internal signal cache for the view model.
     * @private
     */
    private _vm?: Signal<TViewModel | undefined>;

    /**
     * Gets an Angular signal containing the current view model data.
     *
     * This signal provides reactive access to the view model data using Angular's signal system.
     * It's converted from the `vm$` observable and provides optimal change detection performance.
     * The signal will be undefined until valid data is loaded.
     *
     * ## Key Characteristics
     *
     * - **Reactive**: Automatically updates when store data changes
     * - **Performance Optimized**: Uses Angular signals for efficient change detection
     * - **Lazy Initialized**: Created only when first accessed
     * - **Type Safe**: Returns TViewModel | undefined with proper typing
     * - **Store Coordination**: Initializes additional store signals when accessed
     *
     * @public
     * @returns {Signal<TViewModel | undefined>} Signal containing the current view model or undefined
     *
     * @example
     * ```typescript
     * // Template usage (recommended)
     * // <div *ngIf="vm() as viewModel">
     * //   <h1>{{viewModel.title}}</h1>
     * //   <p>{{viewModel.description}}</p>
     * // </div>
     * ```
     *
     * @example
     * ```typescript
     * // Component logic with computed signals
     * ngOnInit() {
     *   this.displayTitle = computed(() => {
     *     const vm = this.vm();
     *     return vm ? vm.title.toUpperCase() : 'Loading...';
     *   });
     *
     *   this.hasData = computed(() => this.vm() !== undefined);
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Using with effects
     * ngOnInit() {
     *   effect(() => {
     *     const vm = this.vm();
     *     if (vm?.shouldTriggerNotification) {
     *       this.showNotification(vm.message);
     *     }
     *   });
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Conditional logic based on data availability
     * onAction() {
     *   const vm = this.vm();
     *   if (vm) {
     *     this.processAction(vm);
     *   } else {
     *     this.showLoadingMessage();
     *   }
     * }
     * ```
     */
    public get vm(): Signal<TViewModel | undefined> {
        if (this._vm == undefined) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._vm = toSignal(this.vm$);

                    // Init all additionalStores signal by accessing it
                    this.additionalStores.forEach(p => p.vm());
                });
            });
        }

        return this._vm!;
    }

    /**
     * Gets a signal indicating whether the main store state is pending.
     *
     * This signal directly delegates to the main store's isStatePending signal.
     * It indicates when the store is in a pending state, typically during initialization
     * or when waiting for async operations to begin.
     *
     * @public
     * @returns {Signal<boolean>} Signal that emits true when the main store state is pending
     *
     * @example
     * ```typescript
     * // Template usage
     * // <div *ngIf="isStatePending()">Initializing...</div>
     * ```
     */
    public override get isStatePending(): Signal<boolean> {
        return this.store.isStatePending;
    }

    /**
     * Gets a signal indicating whether any store (main or additional) is currently loading.
     *
     * This signal combines the loading state from the main store and all additional stores.
     * It returns true if any store is currently performing a loading operation.
     * The signal is created lazily and cached for performance.
     *
     * @public
     * @returns {Signal<boolean>} Signal that emits true when any store is loading
     *
     * @example
     * ```typescript
     * // Template usage
     * // <div *ngIf="isStateLoading()">Loading data...</div>
     * // <button [disabled]="isStateLoading()">Refresh</button>
     * ```
     *
     * @example
     * ```typescript
     * // Component logic
     * ngOnInit() {
     *   effect(() => {
     *     if (this.isStateLoading()) {
     *       this.showGlobalLoadingIndicator();
     *     } else {
     *       this.hideGlobalLoadingIndicator();
     *     }
     *   });
     * }
     * ```
     */
    public override get isStateLoading(): Signal<boolean> {
        if (this._isStateLoading == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._isStateLoading = toSignal(
                        combineLatest(
                            this.additionalStores.concat([<PlatformVmStore<PlatformVm>>(<unknown>this.store)]).map(store => store.isStateLoading$)
                        ).pipe(
                            this.untilDestroyed(),
                            map(isLoadings => isLoadings.find(isLoading => isLoading) != undefined)
                        ),
                        { initialValue: false }
                    );
                });
            });
        }

        return this._isStateLoading!;
    }

    /**
     * Gets a signal indicating whether any store (main or additional) is currently reloading.
     *
     * This signal combines the reloading state from the main store and all additional stores.
     * It returns true if any store is currently performing a reload operation.
     * The signal is created lazily and cached for performance.
     *
     * @public
     * @returns {Signal<boolean>} Signal that emits true when any store is reloading
     *
     * @example
     * ```typescript
     * // Template usage
     * // <div *ngIf="isStateReloading()">Refreshing data...</div>
     * // <button [disabled]="isStateReloading()">Reload</button>
     * ```
     *
     * @example
     * ```typescript
     * // Distinguish between initial load and reload
     * ngOnInit() {
     *   effect(() => {
     *     if (this.isStateReloading()) {
     *       this.showRefreshIndicator();
     *     } else if (this.isStateLoading()) {
     *       this.showInitialLoadIndicator();
     *     }
     *   });
     * }
     * ```
     */
    public override get isStateReloading(): Signal<boolean> {
        if (this._isStateReloading == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._isStateReloading = toSignal(
                        combineLatest(
                            this.additionalStores.concat([<PlatformVmStore<PlatformVm>>(<unknown>this.store)]).map(store => store.isStateReloading$)
                        ).pipe(
                            this.untilDestroyed(),
                            map(isReloadings => isReloadings.find(isReloading => isReloading) != undefined)
                        ),
                        { initialValue: false }
                    );
                });
            });
        }

        return this._isStateReloading!;
    }

    /**
     * Gets a signal indicating whether the component is loading for initial view model setup.
     *
     * This signal returns true when the component is in a loading or reloading state
     * AND the view model is not yet available (undefined). This is useful for showing
     * initial loading states before any data has been loaded.
     *
     * @public
     * @returns {Signal<boolean>} Signal that emits true when loading and no view model is available
     *
     * @example
     * ```typescript
     * // Template usage for initial loading state
     * // <div *ngIf="isLoadingToInitVm()">Loading initial data...</div>
     * // <div *ngIf="vm() && !isLoadingToInitVm()"><!-- Main content --></div>
     * ```
     */
    public override get isLoadingToInitVm(): Signal<boolean> {
        this._isLoadingToInitVm ??= computed(() => (this.isStateLoading() || this.isStateReloading()) && this.vm() == undefined);
        return this._isLoadingToInitVm;
    }

    /**
     * Gets a signal indicating whether the main store state is successful.
     *
     * This signal directly delegates to the main store's isStateSuccess signal.
     * It indicates when the store has successfully completed its operations
     * and contains valid data.
     *
     * @public
     * @returns {Signal<boolean>} Signal that emits true when the main store state is successful
     *
     * @example
     * ```typescript
     * // Template usage
     * // <div *ngIf="isStateSuccess()">Data loaded successfully!</div>
     * ```
     */
    public override get isStateSuccess(): Signal<boolean> {
        return this.store.isStateSuccess;
    }

    /**
     * Gets a signal indicating whether any store (main or additional) is in an error state.
     *
     * This signal combines the error state from the main store and all additional stores.
     * It returns true if any store has encountered an error during its operations.
     * The signal is created lazily and cached for performance.
     *
     * @public
     * @returns {Signal<boolean>} Signal that emits true when any store is in an error state
     *
     * @example
     * ```typescript
     * // Template usage
     * // <div *ngIf="isStateError()" class="error">
     * //   Something went wrong: {{getErrorMsg$()()}}
     * // </div>
     * ```
     *
     * @example
     * ```typescript
     * // Component logic for error handling
     * ngOnInit() {
     *   effect(() => {
     *     if (this.isStateError()) {
     *       const errorMsg = this.getErrorMsg$()();
     *       this.logError(errorMsg);
     *       this.showErrorNotification(errorMsg);
     *     }
     *   });
     * }
     * ```
     */
    public override get isStateError(): Signal<boolean> {
        if (this._isStateError == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._isStateError = toSignal(
                        combineLatest(
                            this.additionalStores.concat([<PlatformVmStore<PlatformVm>>(<unknown>this.store)]).map(store => store.isStateError$)
                        ).pipe(
                            this.untilDestroyed(),
                            map(isErrors => isErrors.find(isError => isError) == true)
                        ),
                        { initialValue: false }
                    );
                });
            });
        }
        return this._isStateError!;
    }

    protected override initOrReloadVm: (isReload: boolean) => Observable<TViewModel | undefined> | undefined = (isReload: boolean) => {
        return undefined;
    };

    protected override get autoRunInitOrReloadVmInNgOnInit(): boolean {
        return false;
    }

    /**
     * Gets the current view model state synchronously from the main store.
     *
     * This method provides immediate access to the current state without subscribing
     * to observables or signals. It directly returns the current state value from
     * the main store, which may include loading, error, or success states.
     *
     * @public
     * @returns {TViewModel} The current view model state
     *
     * @example
     * ```typescript
     * // Get current state for immediate processing
     * onSubmit() {
     *   const currentState = this.currentVm();
     *   if (currentState.isStateSuccess && currentState.data) {
     *     this.processFormData(currentState.data);
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Check current state before performing operations
     * canPerformAction(): boolean {
     *   const state = this.currentVm();
     *   return state.isStateSuccess && !state.isReadOnly;
     * }
     * ```
     */
    public currentVm(): TViewModel {
        return this.store.currentState();
    }

    /**
     * Returns a Signal for retrieving error messages for a specific request key.
     *
     * @remarks
     * This method retrieves an observable that emits error messages associated with a particular request key from the main store and additional stores. It is part of the error handling mechanism in the `PlatformVmStoreComponent`.
     *
     * @example
     * // Example usage in a derived class:
     * const errorSignal$ = this.getErrorMsg$('fetchData');
     * errorSignal$.subscribe(errorMessage => {
     *    if (errorMessage) {
     *        console.error(`Error fetching data: ${errorMessage}`);
     *    }
     * });
     *
     * @param {string} requestKey - The request key for which error messages are retrieved. Defaults to the default request state key.
     * @returns {Signal<string | undefined>} - A Signal observable emitting the error message associated with the specified request key.
     *
     * @method
     * @public
     * @override
     * @throws {Error} Throws an error if the observable for the specified request key is not found.
     *
     * @typeparam {string} requestKey - The key associated with a specific request for error messages.
     */
    public override getErrorMsg$(requestKey: string = requestStateDefaultKey): Signal<string | undefined> {
        if (this.cachedErrorMsg$[requestKey] == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this.cachedErrorMsg$[requestKey] = toSignal(
                        combineLatest(
                            this.additionalStores
                                .concat([<PlatformVmStore<PlatformVm>>(<unknown>this.store)])
                                .map(store => store.getErrorMsgObservable$(requestKey))
                        ).pipe(
                            this.untilDestroyed(),
                            map(errors => errors.find(p => p != null))
                        )
                    );
                });
            });
        }

        return this.cachedErrorMsg$[requestKey]!;
    }

    /**
     * Gets a signal containing all error messages from main and additional stores with optional filtering.
     *
     * This method combines error messages from all stores (main and additional) and provides
     * filtering capabilities to include only specific request keys or exclude certain keys.
     * The resulting signal emits a single string containing all relevant error messages
     * joined with semicolons.
     *
     * @public
     * @param {string[]} [requestKeys] - Optional array of request keys to include. If provided, only errors from these keys are included
     * @param {string[]} [excludeKeys] - Optional array of request keys to exclude from the result
     * @returns {Signal<string | undefined>} Signal emitting combined error messages or undefined if no errors
     *
     * @example
     * ```typescript
     * // Get all error messages
     * ngOnInit() {
     *   effect(() => {
     *     const allErrors = this.getAllErrorMsgs$()();
     *     if (allErrors) {
     *       this.showErrorToast(allErrors);
     *     }
     *   });
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Get errors for specific operations only
     * ngOnInit() {
     *   const criticalErrors = this.getAllErrorMsgs$(['saveUser', 'deleteUser'])();
     *   if (criticalErrors) {
     *     this.showCriticalErrorDialog(criticalErrors);
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Get all errors except certain background operations
     * ngOnInit() {
     *   const userFacingErrors = this.getAllErrorMsgs$(undefined, ['backgroundSync', 'analytics'])();
     *   if (userFacingErrors) {
     *     this.displayErrorBanner(userFacingErrors);
     *   }
     * }
     * ```
     */
    public override getAllErrorMsgs$(requestKeys?: string[], excludeKeys?: string[]): Signal<string | undefined> {
        const combinedCacheRequestKey = `${requestKeys != null ? JSON.stringify(requestKeys) : 'All'}_excludeKeys:${
            excludeKeys != null ? JSON.stringify(excludeKeys) : 'null'
        }`;

        if (this.cachedAllErrorMsgs$[combinedCacheRequestKey] == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this.cachedAllErrorMsgs$[combinedCacheRequestKey] = toSignal(
                        combineLatest(
                            this.additionalStores
                                .concat([<PlatformVmStore<PlatformVm>>(<unknown>this.store)])
                                .map(store => store.getAllErrorMsgObservable$(requestKeys, excludeKeys))
                        ).pipe(
                            this.untilDestroyed(),
                            map(errors => list_distinct(errors.filter(msg => msg != null && msg.trim() != '')).join('; '))
                        )
                    );
                });
            });
        }

        return <Signal<string | undefined>>this.cachedAllErrorMsgs$[combinedCacheRequestKey];
    }

    /**
     * Updates the state of the main store with partial state changes or using an updater function.
     *
     * This method provides a convenient way to update the main store's state from component logic.
     * It supports both partial state updates and functional updates for complex state transformations.
     * The update is delegated to the store's updateState method with optional configuration.
     *
     * ## Update Patterns
     *
     * ### Partial State Updates
     * ```typescript
     * // Simple property update
     * this.updateVm({ isLoading: true });
     *
     * // Multiple property update
     * this.updateVm({
     *   user: updatedUser,
     *   lastModified: new Date(),
     *   isDirty: true
     * });
     * ```
     *
     * ### Functional Updates
     * ```typescript
     * // Update with access to current state
     * this.updateVm(currentState => ({
     *   items: [...currentState.items, newItem],
     *   totalCount: currentState.totalCount + 1
     * }));
     * ```
     *
     * @public
     * @param {PartialDeep<TViewModel> | Partial<TViewModel> | ((state: TViewModel) => void | PartialDeep<TViewModel> | Partial<TViewModel>)} partialStateOrUpdaterFn -
     *        The partial state or updater function to apply to the current state
     * @param {Object} [options] - Optional configuration for the update operation
     * @param {boolean} [options.updaterNotDeepMutate] - Whether to prevent deep mutation in updater functions
     * @param {number} [options.assignDeepLevel] - The depth level for deep assignment operations
     *
     * @example
     * ```typescript
     * // Update user profile
     * onUpdateProfile(profile: UserProfile) {
     *   this.updateVm({
     *     profile,
     *     lastUpdated: new Date()
     *   });
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Add item to list with functional update
     * onAddItem(newItem: Item) {
     *   this.updateVm(state => ({
     *     items: [...state.items, newItem],
     *     selectedItem: newItem,
     *     totalCount: state.totalCount + 1
     *   }));
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Toggle selection with options
     * onToggleSelection(itemId: string) {
     *   this.updateVm(
     *     state => ({
     *       selectedIds: state.selectedIds.includes(itemId)
     *         ? state.selectedIds.filter(id => id !== itemId)
     *         : [...state.selectedIds, itemId]
     *     }),
     *     { updaterNotDeepMutate: true }
     *   );
     * }
     * ```
     */
    public updateVm(
        partialStateOrUpdaterFn: PartialDeep<TViewModel> | Partial<TViewModel> | ((state: TViewModel) => void | PartialDeep<TViewModel> | Partial<TViewModel>),
        options?: { updaterNotDeepMutate?: boolean; assignDeepLevel?: number }
    ): void {
        this.store.updateState(partialStateOrUpdaterFn, options);
    }

    /**
     * Gets a signal indicating whether any store is loading for a specific request key.
     *
     * This method returns a computed signal that combines the loading state from the main store
     * and all additional stores for a specific request key. It returns true if any store
     * is currently loading for the specified request key.
     *
     * @public
     * @param {string} [requestKey=requestStateDefaultKey] - The request key to check loading state for
     * @returns {Signal<boolean | null>} Signal that emits true when any store is loading for the request key
     *
     * @example
     * ```typescript
     * // Check loading state for specific operation
     * ngOnInit() {
     *   effect(() => {
     *     if (this.isLoading$('saveUser')()) {
     *       this.showSaveIndicator();
     *     }
     *   });
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Template usage for specific loading states
     * // <button [disabled]="isLoading$('deleteItem')()">
     * //   {{ isLoading$('deleteItem')() ? 'Deleting...' : 'Delete' }}
     * // </button>
     * ```
     */
    public override isLoading$(requestKey: string = requestStateDefaultKey): Signal<boolean | null> {
        if (this.cachedLoading$[requestKey] == null) {
            this.cachedLoading$[requestKey] = <Signal<boolean | null>>computed(() => {
                return this.store.isLoading$(requestKey)() || this.additionalStores.find(s => s.isLoading$(requestKey)()) != undefined;
            });
        }
        return this.cachedLoading$[requestKey]!;
    }

    /**
     * Gets a signal indicating whether any store is reloading for a specific request key.
     *
     * This method returns a computed signal that combines the reloading state from the main store
     * and all additional stores for a specific request key. It returns true if any store
     * is currently reloading for the specified request key.
     *
     * @public
     * @param {string} [requestKey=requestStateDefaultKey] - The request key to check reloading state for
     * @returns {Signal<boolean | null>} Signal that emits true when any store is reloading for the request key
     *
     * @example
     * ```typescript
     * // Check reloading state for data refresh
     * ngOnInit() {
     *   effect(() => {
     *     if (this.isReloading$('refreshData')()) {
     *       this.showRefreshAnimation();
     *     }
     *   });
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Distinguish between initial load and reload in template
     * // <div *ngIf="isReloading$('loadItems')()">Refreshing items...</div>
     * // <div *ngIf="isLoading$('loadItems')() && !isReloading$('loadItems')()">Loading items...</div>
     * ```
     */
    public override isReloading$(requestKey: string = requestStateDefaultKey): Signal<boolean | null> {
        if (this.cachedReloading$[requestKey] == null) {
            this.cachedReloading$[requestKey] = <Signal<boolean | null>>computed(() => {
                return this.store.isReloading$(requestKey)() || this.additionalStores.find(s => s.isReloading$(requestKey)()) != undefined;
            });
        }
        return this.cachedReloading$[requestKey]!;
    }

    /**
     * Initiates a reload operation for the main store and all additional stores.
     *
     * This method coordinates reload operations across all stores associated with the component.
     * It calls the reload method on the main store and then iterates through all additional
     * stores to trigger their reload operations as well. This ensures that all component
     * data is refreshed consistently.
     *
     * ## Reload Behavior
     *
     * - **Main Store**: Always reloaded first
     * - **Additional Stores**: Reloaded in discovery order
     * - **Coordination**: All stores are triggered, but they handle their own reload logic
     * - **State Management**: Loading/reloading states are updated automatically
     *
     * @public
     * @override
     *
     * @example
     * ```typescript
     * // Manual refresh trigger
     * onRefreshClick() {
     *   this.reload(); // Refreshes all data sources
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Reload on specific events
     * ngOnInit() {
     *   this.router.events.pipe(
     *     filter(event => event instanceof NavigationEnd),
     *     takeUntil(this.destroy$)
     *   ).subscribe(() => {
     *     this.reload(); // Refresh data when route changes
     *   });
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Conditional reload based on data staleness
     * checkAndReload() {
     *   const currentState = this.currentVm();
     *   const lastUpdate = currentState.lastUpdated;
     *   const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
     *
     *   if (lastUpdate < fiveMinutesAgo) {
     *     this.reload();
     *   }
     * }
     * ```
     */
    public override reload(): void {
        this.store.reload();
        this.additionalStores.forEach(p => p.reload());
    }

    /**
     * Creates an RxJS operator that observes loading and error states for async operations.
     *
     * This method delegates to the main store's observerLoadingErrorState method to create
     * an RxJS operator that automatically manages loading and error states during async operations.
     * It's typically used in RxJS pipelines to handle state management transparently.
     *
     * @public
     * @override
     * @template T - The type of the observable value
     * @param {string} [requestKey] - Optional request key to associate with the loading/error state
     * @param {PlatformObserverLoadingErrorStateOptions} [options] - Optional configuration for the observer
     * @returns {(source: Observable<T>) => Observable<T>} RxJS operator function for state management
     *
     * @example
     * ```typescript
     * // Use in store effects for automatic state management
     * readonly loadData = this.effect((trigger$: Observable<void>) =>
     *   trigger$.pipe(
     *     switchMap(() =>
     *       this.dataService.getData().pipe(
     *         this.observerLoadingErrorState('loadData'),
     *         this.tapResponse(
     *           data => this.updateState({ data }),
     *           error => console.error('Load failed:', error)
     *         )
     *       )
     *     )
     *   )
     * );
     * ```
     *
     * @example
     * ```typescript
     * // Use in component for manual observable management
     * onSaveData() {
     *   this.dataService.saveData(this.currentVm().data).pipe(
     *     this.observerLoadingErrorState('saveData'),
     *     take(1)
     *   ).subscribe({
     *     next: result => this.handleSaveSuccess(result),
     *     error: error => this.handleSaveError(error)
     *   });
     * }
     * ```
     */
    public override observerLoadingErrorState<T>(
        requestKey?: string,
        options?: PlatformObserverLoadingErrorStateOptions | undefined
    ): (source: Observable<T>) => Observable<T> {
        return this.store.observerLoadingErrorState(requestKey, options);
    }
}

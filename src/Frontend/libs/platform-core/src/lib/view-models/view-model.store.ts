/**
 * @fileoverview Advanced view model store implementation for reactive state management.
 *
 * This module provides a comprehensive state management solution built on top of NgRx ComponentStore,
 * offering intelligent caching, loading state management, error handling, and reactive patterns
 * for Angular applications. The store pattern enables separation of concerns, testability,
 * and consistent state management across complex applications.
 *
 * @module PlatformViewModelStore
 * @since 1.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { EnvironmentInjector, inject, Injectable, OnDestroy, runInInjectionContext, Signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import {
    asyncScheduler,
    BehaviorSubject,
    catchError,
    combineLatest,
    defer,
    delay,
    filter,
    interval,
    isObservable,
    map,
    MonoTypeOperatorFunction,
    Observable,
    Observer,
    of,
    OperatorFunction,
    shareReplay,
    Subscription,
    switchMap,
    take,
    takeUntil,
    tap,
    throttleTime
} from 'rxjs';
import { PartialDeep } from 'type-fest';

import { ComponentStore, SelectConfig } from '@ngrx/component-store';

import { PlatformApiServiceErrorResponse } from '../api-services';
import { PlatformCachingService } from '../caching';
import { Dictionary } from '../common-types';
import { PLATFORM_CORE_GLOBAL_ENV } from '../platform-core-global-environment';
import { applyIf, distinctUntilObjectValuesChanged, onCancel, skipDuplicates, skipTime, subscribeUntil, tapLimit, tapOnce } from '../rxjs';
import { cloneDeep, immutableUpdate, ImmutableUpdateOptions, keys, list_remove, toPlainObj } from '../utils';
import { PlatformVm } from './generic.view-model';

export const requestStateDefaultKey = 'Default';
const defaultThrottleDurationMs = 300;

/**
 * Extended configuration interface for platform store selections.
 *
 * @interface PlatformStoreSelectConfig
 * @extends {SelectConfig}
 */
declare interface PlatformStoreSelectConfig extends SelectConfig {
    throttleTimeDuration?: number;
}

/**
 * Abstract base class for reactive view model state management using NgRx ComponentStore.
 *
 * PlatformVmStore provides a comprehensive foundation for managing component state with
 * advanced features including intelligent caching, loading state coordination, error handling,
 * and reactive patterns. It extends NgRx ComponentStore to offer platform-specific
 * capabilities while maintaining type safety and performance optimization.
 *
 * Key Features:
 * - **Intelligent Caching**: Automatic state persistence and restoration
 * - **Loading State Management**: Granular tracking of multiple concurrent operations
 * - **Error Handling**: Centralized error management with request-specific tracking
 * - **Reactive Patterns**: Observable-based state updates with change detection optimization
 * - **Development Tools**: State mutation detection and debugging utilities
 * - **Performance**: Throttling, deduplication, and efficient state updates
 *
 * @abstract
 * @class PlatformVmStore
 * @template TViewModel - The view model type extending PlatformVm
 * @implements {OnDestroy}
 *
 * @example
 * ```typescript
 * // Basic store implementation
 * @Injectable()
 * export class UserListStore extends PlatformVmStore<UserListViewModel> {
 *   constructor(private userApi: UserApiService) {
 *     super(new UserListViewModel());
 *   }
 *
 *   protected beforeInitVm = () => {
 *     this.loadUsers();
 *   };
 *
 *   public vmConstructor = (data?: Partial<UserListViewModel>) =>
 *     new UserListViewModel(data);
 *
 *   protected cachedStateKeyName = () => 'UserListStore';
 *
 *   public initOrReloadVm = (isReload: boolean) => {
 *     return this.loadUsers();
 *   };
 *
 *   // Effect for loading users
 *   public loadUsers = this.effectSimple(() => {
 *     return this.userApi.getUsers().pipe(
 *       this.tapResponse(users => {
 *         this.updateState({ users });
 *       })
 *     );
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Advanced store with multiple operations
 * @Injectable()
 * export class FormTemplateStore extends PlatformVmStore<FormTemplateViewModel> {
 *   protected beforeInitVm = () => {
 *     // Set up reactive subscriptions
 *     this.subscribeToFormChanges();
 *     this.loadInitialData();
 *   };
 *
 *   // Multi-request operation with individual tracking
 *   public saveTemplate = this.effect((template$: Observable<FormTemplate>) => {
 *     return template$.pipe(
 *       switchMap(template =>
 *         this.formTemplateApi.save(template).pipe(
 *           this.observerLoadingErrorState('saveTemplate', { isReloading: false }),
 *           this.tapResponse(savedTemplate => {
 *             this.updateState({ formTemplate: savedTemplate });
 *             this.toast.success('Template saved successfully');
 *           })
 *         )
 *       )
 *     );
 *   });
 *
 *   // State selectors with memoization
 *   public readonly isTemplateValid$ = this.select(state =>
 *     state.formTemplate?.isValid ?? false
 *   );
 *
 *   public readonly savingState$ = this.isLoading$('saveTemplate');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Real-world usage in attendance request management
 * @Injectable()
 * export class AttendanceRequestVmStore extends PlatformVmStore<AttendanceRequestState> {
 *   public readonly query$ = this.select(state => state.query);
 *   public readonly searchBar$ = this.searchBarStore.filterBy(ROUTES.ATTENDANCE_REQUEST);
 *
 *   protected beforeInitVm = () => {
 *     // Reactive data loading based on query changes
 *     this.loadAttendanceRequest(
 *       combineLatest([
 *         this.query$,
 *         this.holidayStore.allHolidaysGroupByCompanyId$,
 *         this.holidayStore.isStateSuccessOrReloading$
 *       ]).pipe(
 *         filter(([, , holidayStoreSuccess]) => holidayStoreSuccess),
 *         map(([query]) => query)
 *       )
 *     );
 *
 *     // Search text synchronization
 *     this.changeSearchText(this.searchBar$);
 *   };
 *
 *   public loadAttendanceRequest = this.effect((query$: Observable<AttendanceQuery>) => {
 *     return query$.pipe(
 *       switchMap(query =>
 *         this.attendanceApi.getRequests(query).pipe(
 *           this.observerLoadingErrorState('loadRequests'),
 *           this.tapResponse(result => {
 *             this.updateState({
 *               requests: result.items,
 *               totalCount: result.totalCount
 *             });
 *           })
 *         )
 *       )
 *     );
 *   });
 * }
 * ```
 *
 * @since 1.0.0
 * @see {@link PlatformVm} For the view model base class
 * @see {@link ComponentStore} For the underlying NgRx store implementation
 * @see {@link PlatformCachingService} For caching capabilities
 */
@Injectable()
export abstract class PlatformVmStore<TViewModel extends PlatformVm> implements OnDestroy {
    /**
     * Map storing named subscriptions for lifecycle management.
     * @private
     */
    private storedSubscriptionsMap: Map<string, Subscription> = new Map();

    /**
     * Array storing anonymous subscriptions for lifecycle management.
     * @private
     */
    private storedAnonymousSubscriptions: Subscription[] = [];

    /**
     * Cache for error message signals to avoid recreation.
     * @private
     */
    private cachedErrorMsg$: Dictionary<Signal<string | undefined>> = {};

    /**
     * Cache for error message observables to avoid recreation.
     * @private
     */
    private cachedErrorMsgObservable$: Dictionary<Observable<string | undefined>> = {};

    /**
     * Cache for loading state signals to avoid recreation.
     * @private
     */
    private cachedLoading$: Dictionary<Signal<boolean | undefined>> = {};

    /**
     * Cache for reloading state signals to avoid recreation.
     * @private
     */
    private cachedReloading$: Dictionary<Signal<boolean | undefined>> = {};

    /**
     * The default state used for initialization and reset operations.
     * @private
     */
    private defaultState?: TViewModel;

    /**
     * Angular's environment injector for running code in injection context.
     * @protected
     */
    protected environmentInjector = inject(EnvironmentInjector);

    /**
     * Creates a new PlatformVmStore instance.
     *
     * @param {TViewModel} defaultState - Initial state for the store
     *
     * @example
     * ```typescript
     * constructor() {
     *   super(new MyViewModel({
     *     status: 'Pending',
     *     data: [],
     *     selectedItem: null
     *   }));
     * }
     * ```
     */
    constructor(defaultState: TViewModel) {
        this.defaultState = defaultState;

        this.setClonedDeepStateToCheckDataMutation(defaultState);
    }
    /**
     * Indicates whether the view model state is currently being initiated.
     * @type {boolean}
     */
    public vmStateInitiating: boolean = false;

    /**
     * BehaviorSubject tracking whether the view model state has been initiated.
     * @type {BehaviorSubject<boolean>}
     */
    public vmStateInitiated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    /**
     * BehaviorSubject tracking whether the view model data has been loaded.
     * @type {BehaviorSubject<boolean>}
     */
    public vmStateDataLoaded: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    /**
     * Platform caching service for state persistence.
     * @type {PlatformCachingService}
     */
    public cacheService = inject(PlatformCachingService);

    /**
     * Determines whether caching is enabled for this store.
     * Override this property to disable caching for specific stores.
     *
     * @type {boolean}
     * @default true
     *
     * @example
     * ```typescript
     * // Disable caching for sensitive data
     * public get enableCache(): boolean {
     *   return false;
     * }
     * ```
     */
    public get enableCache(): boolean {
        return true;
    } /**
     * The underlying NgRx ComponentStore instance.
     * Lazily initialized to ensure proper setup.
     * @private
     */
    private _innerStore?: ComponentStore<TViewModel>;

    /**
     * Gets the inner ComponentStore instance, initializing it if needed.
     *
     * @returns {ComponentStore<TViewModel>} The ComponentStore instance
     */
    public get innerStore(): ComponentStore<TViewModel> {
        this.initInnerStore();

        return <ComponentStore<TViewModel>>this._innerStore;
    }

    /**
     * The main view model observable.
     * Combines initialization state and actual data stream.
     * @private
     */
    private _vm$?: Observable<TViewModel>;

    /**
     * Gets the main view model observable stream.
     *
     * This observable represents the complete view model state and handles:
     * - Initialization state management
     * - Data loading coordination
     * - State sharing with replay capabilities
     * - Automatic state persistence
     *
     * @returns {Observable<TViewModel>} The view model observable stream
     *
     * @example
     * ```typescript
     * // Subscribe to view model changes
     * this.store.vm$.subscribe(vm => {
     *   if (vm.isStateSuccess) {
     *     this.displayData(vm.data);
     *   }
     * });
     *
     * // Use in template with async pipe
     * // <div *ngIf="store.vm$ | async as vm">{{ vm.data }}</div>
     * ```
     */
    public get vm$(): Observable<TViewModel> {
        if (this._vm$ == undefined) {
            // refCount: false => vm$ will not be unsubscribed when no one is subscribed to it
            // => so that vm$ will not be re-initialized when no one is subscribed to it
            // => prevent re-initialize vm$ when subscribe to vm$ after unsubscribe
            this._vm$ = <Observable<TViewModel>>combineLatest([this.initVmState(), this.internalSelect(s => s)]).pipe(
                map(([_, vm]) => (this.vmStateInitiated.value || this.vmStateDataLoaded.value ? vm : undefined)),
                filter(vm => vm != undefined),
                shareReplay({ bufferSize: 1, refCount: false })
            );

            this.subscribeCacheStateOnChanged();
        }

        return this._vm$;
    }

    /**
     * The view model as an Angular signal.
     * Provides reactive access to the current view model state.
     * @private
     */
    private _vm?: Signal<TViewModel | undefined>;

    /**
     * Gets the view model as an Angular Signal.
     *
     * Provides reactive access to the view model state using Angular's signal system.
     * Automatically updates when the underlying observable emits new values.
     *
     * @returns {Signal<TViewModel | undefined>} Signal containing the view model
     *
     * @example
     * ```typescript
     * // Use in component
     * export class MyComponent {
     *   constructor(private store: MyStore) {}
     *
     *   get data() {
     *     const vm = this.store.vm();
     *     return vm?.data ?? [];
     *   }
     *
     *   get isLoading() {
     *     return this.store.vm()?.isStateLoading ?? false;
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
                });
            });
        }

        return this._vm!;
    }

    /**
     * BehaviorSubject indicating when the store is destroyed.
     * Used for subscription cleanup and lifecycle management.
     *
     * @type {BehaviorSubject<boolean>}
     */
    public destroyed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    /**
     * Abstract method called before view model initialization.
     *
     * Implement this method to set up reactive subscriptions, data loading effects,
     * and any other initialization logic that should run before the view model
     * is first accessed. This is the ideal place to establish data flows and
     * reactive patterns.
     *
     * @abstract
     * @protected
     *
     * @example
     * ```typescript
     * protected beforeInitVm = () => {
     *   // Set up reactive data loading
     *   this.loadData(this.query$);
     *
     *   // Subscribe to external state changes
     *   this.subscribeToExternalUpdates();
     *
     *   // Initialize search functionality
     *   this.setupSearchEffects();
     * };
     * ```
     */
    protected abstract beforeInitVm: () => void;

    /**
     * Abstract factory method for creating view model instances.
     *
     * This method is responsible for creating new instances of the view model
     * with optional initial data. It's used for state restoration from cache,
     * initialization, and state updates.
     *
     * @abstract
     * @param {Partial<TViewModel>} [data] - Optional initial data for the view model
     * @returns {TViewModel} New view model instance
     *
     * @example
     * ```typescript
     * public vmConstructor = (data?: Partial<UserListViewModel>) =>
     *   new UserListViewModel(data);
     *
     * // With complex initialization
     * public vmConstructor = (data?: Partial<FormTemplateViewModel>) => {
     *   const vm = new FormTemplateViewModel(data);
     *   if (data?.formTemplate) {
     *     vm.processFormTemplateData();
     *   }
     *   return vm;
     * };
     * ```
     */
    public abstract vmConstructor(data?: Partial<TViewModel>): TViewModel;

    /**
     * Abstract method providing the cache key name for state persistence.
     *
     * Returns a unique identifier used for caching the view model state.
     * Should be unique across the application to prevent cache collisions.
     *
     * @abstract
     * @protected
     * @returns {string} Unique cache key name
     *
     * @example
     * ```typescript
     * protected cachedStateKeyName = () => 'UserListStore';
     *
     * // With dynamic context
     * protected cachedStateKeyName = () => `FormTemplateStore_${this.templateId}`;
     *
     * // With user-specific caching
     * protected cachedStateKeyName = () => `AttendanceRequest_${this.currentUserId}`;
     * ```
     */
    protected abstract cachedStateKeyName(): string;

    private _additionalStores?: PlatformVmStore<PlatformVm>[];
    public get additionalStores(): PlatformVmStore<PlatformVm>[] {
        if (this._additionalStores == null) {
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
                'state$',
                'vm',
                'vm$',
                'enableCache',
                'destroyed$',
                'innerStore'
            ])
                .filter(key => this[key] instanceof PlatformVmStore)
                .map(key => <PlatformVmStore<PlatformVm>>this[key]);
        }

        return this._additionalStores;
    }

    private beforeInitVmCalledOnce: boolean = false;

    /**
     * Triggers the onInitVm function and initializes the store's view model state.
     */
    public initVmState(): Observable<boolean> {
        if (!this.vmStateInitiating && !this.vmStateInitiated.value) {
            this.vmStateInitiating = true;

            if (!this.beforeInitVmCalledOnce) {
                this.beforeInitVm();
                this.beforeInitVmCalledOnce = true;
            }

            const initOrReloadVm$ = this.initOrReloadVm(this.vmStateDataLoaded.value).pipe(take(2)) ?? of(null); //take(2) support api cache and implicit reload

            return initOrReloadVm$.pipe(
                delay(1, asyncScheduler), // Mimic real async incase observable is not async
                tap(_ => {
                    this.vmStateInitiating = false;

                    if (!this.vmStateInitiated.value) {
                        this.vmStateInitiated.next(true);
                        this.vmStateDataLoaded.next(true);

                        this.setupIntervalCheckDataMutation();

                        if (this.currentState().status == 'Pending') {
                            this.updateState(<Partial<TViewModel>>{ status: 'Success' });
                        }
                    }
                }),
                catchError(err => {
                    this.vmStateInitiating = false;
                    return this.vmStateInitiated;
                }),
                switchMap(_ => this.vmStateInitiated),
                distinctUntilObjectValuesChanged()
            );
        }

        return this.vmStateInitiated;
    }

    public setupIntervalCheckDataMutation() {
        if (!PLATFORM_CORE_GLOBAL_ENV.isLocalDev) return;

        interval(5000).pipe(
            this.subscribeUntilDestroyed(v => {
                this.ensureStateNotMutated();
            })
        );
    }

    public initInnerStore(forceReinit: boolean = false) {
        if (this._innerStore == undefined || forceReinit) {
            const cachedData = this.getCachedState();

            // Reset state to Pending if lastime caching it's loading state
            if (cachedData?.isStateReloading || cachedData?.isStateLoading) {
                cachedData.status = 'Pending';
                cachedData.reloadingMap = {};
                cachedData.loadingMap = {};
            }

            if (cachedData?.isStateSuccess || cachedData?.isStatePending) {
                this._innerStore = new ComponentStore(cachedData);
                this.setClonedDeepStateToCheckDataMutation(cachedData);

                if (cachedData.isStateSuccess) this.vmStateDataLoaded.next(true);
            } else {
                this._innerStore = new ComponentStore(this.defaultState);
                this.setClonedDeepStateToCheckDataMutation(this.defaultState);
            }
        }
    }

    public ngOnDestroy(): void {
        this.innerStore.ngOnDestroy();
        this.destroyed$.next(true);
        this.cancelAllStoredSubscriptions();
    }

    public resetToDefaultState() {
        if (this.defaultState) this.updateState(cloneDeep(this.defaultState), { assignDeepLevel: 1 });
    }

    /**
     * Returns the state observable of the store.
     */
    public get state$() {
        return this.vm$;
    } /**
     * Abstract method for initializing or reloading view model data.
     *
     * This is the primary method for loading data into the view model.
     * It should return an observable that represents the data loading operation.
     * The observable completion signals that the initial data load is finished.
     *
     * @abstract
     * @param {boolean} isReload - Whether this is a reload operation (true) or initial load (false)
     * @returns {Observable<unknown>} Observable representing the data loading operation
     *
     * @example
     * ```typescript
     * public initOrReloadVm = (isReload: boolean) => {
     *   // Simple data loading
     *   return this.userApi.getUsers().pipe(
     *     this.tapResponse(users => {
     *       this.updateState({ users, status: 'Success' });
     *     })
     *   );
     * };
     *
     * // Combined operations
     * public initOrReloadVm = (isReload: boolean) => {
     *   return combineLatest([
     *     this.loadUsers(),
     *     this.loadRoles(),
     *     this.loadPermissions()
     *   ]);
     * };
     *
     * // With conditional loading
     * public initOrReloadVm = (isReload: boolean) => {
     *   if (isReload) {
     *     return this.refreshData();
     *   } else {
     *     return this.loadInitialData();
     *   }
     * };
     * ```
     */
    public abstract initOrReloadVm: (isReload: boolean) => Observable<unknown>;

    /**
     * Reloads the view model data and clears any existing errors.
     *
     * Triggers a complete refresh of the view model state by calling initOrReloadVm
     * with the reload flag set to true. Automatically clears all error messages
     * before starting the reload operation.
     *
     * @returns {Observable<unknown>} Observable that completes when reload is finished
     *
     * @example
     * ```typescript
     * // Manual reload trigger
     * public onRefreshButtonClick(): void {
     *   this.store.reload().subscribe({
     *     next: () => console.log('Reload completed'),
     *     error: (error) => console.error('Reload failed', error)
     *   });
     * }
     *
     * // Automatic reload on certain conditions
     * this.someCondition$.pipe(
     *   filter(condition => condition),
     *   switchMap(() => this.store.reload())
     * ).subscribe();
     * ```
     */
    public reload() {
        this.additionalStores.forEach(p => p.reload());

        this.clearAllErrorMsgs();

        // take(2) support api cache and implicit reload
        return this.vmStateInitiated.value
            ? this.initOrReloadVm(this.currentState().isStateSuccessOrReloading).pipe(take(2), this.subscribeUntilDestroyed())
            : this.initVmState().pipe(
                  switchMap(vmInitiated => (vmInitiated ? this.initOrReloadVm(this.currentState().isStateSuccessOrReloading) : of(null))),
                  take(2),
                  this.subscribeUntilDestroyed()
              );
    }

    /**
     * Clears all error messages from the view model.
     *
     * @example
     * ```typescript
     * // Clear errors before new operation
     * this.store.clearAllErrorMsgs();
     * this.performNewOperation();
     * ```
     */
    public clearAllErrorMsgs() {
        this.updateState(vm => vm.clearAllErrorMsgs(), { updaterNotDeepMutate: true });
    }

    public readonly defaultSelectConfig: PlatformStoreSelectConfig = {
        debounce: false,
        throttleTimeDuration: defaultThrottleDurationMs
    };

    private _isStatePending?: Signal<boolean>;
    public get isStatePending(): Signal<boolean> {
        if (this._isStatePending == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._isStatePending = toSignal(
                        this.internalSelect(_ => _.isStatePending),
                        { initialValue: true }
                    );
                });
            });
        }
        return this._isStatePending!;
    }

    private _isStateLoading?: Signal<boolean>;
    public get isStateLoading(): Signal<boolean> {
        if (this._isStateLoading == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._isStateLoading = toSignal(
                        this.internalSelect(_ => _.isStateLoading || this.currentState().isLoading()),
                        { initialValue: false }
                    );
                });
            });
        }
        return this._isStateLoading!;
    }

    private _isStateReloading?: Signal<boolean>;
    public get isStateReloading(): Signal<boolean> {
        if (this._isStateReloading == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._isStateReloading = toSignal(
                        this.internalSelect(_ => _.isStateReloading || this.currentState().isReloading()),
                        { initialValue: false }
                    );
                });
            });
        }
        return this._isStateReloading!;
    }

    private _isStateSuccess?: Signal<boolean>;
    public get isStateSuccess(): Signal<boolean> {
        if (this._isStateSuccess == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._isStateSuccess = toSignal(
                        this.internalSelect(_ => _.isStateSuccess),
                        { initialValue: false }
                    );
                });
            });
        }
        return this._isStateSuccess!;
    }

    private _isStateSuccessOrReloading?: Signal<boolean>;
    public get isStateSuccessOrReloading(): Signal<boolean> {
        if (this._isStateSuccessOrReloading == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._isStateSuccessOrReloading = toSignal(
                        this.internalSelect(_ => _.isStateSuccessOrReloading),
                        { initialValue: false }
                    );
                });
            });
        }
        return this._isStateSuccessOrReloading!;
    }

    private _isStateError?: Signal<boolean>;
    public get isStateError(): Signal<boolean> {
        if (this._isStateError == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this._isStateError = toSignal(
                        this.internalSelect(_ => _.isStateError),
                        { initialValue: false }
                    );
                });
            });
        }
        return this._isStateError!;
    }

    private _isStatePending$?: Observable<boolean>;
    public get isStatePending$(): Observable<boolean> {
        this._isStatePending$ ??= this.internalSelect(_ => _.isStatePending);

        return this._isStatePending$;
    }

    private _isStateLoading$?: Observable<boolean>;
    public get isStateLoading$(): Observable<boolean> {
        this._isStateLoading$ ??= this.internalSelect(_ => _.isStateLoading || this.currentState().isAnyLoadingRequest() == true);

        return this._isStateLoading$;
    }

    private _isStateReloading$?: Observable<boolean>;
    public get isStateReloading$(): Observable<boolean> {
        this._isStateReloading$ ??= this.internalSelect(_ => _.isStateReloading || this.currentState().isAnyReloadingRequest() == true);

        return this._isStateReloading$;
    }

    private _isStateSuccess$?: Observable<boolean>;
    public get isStateSuccess$(): Observable<boolean> {
        this._isStateSuccess$ ??= this.internalSelect(_ => _.isStateSuccess);

        return this._isStateSuccess$;
    }

    private _isStateSuccessOrReloading$?: Observable<boolean>;
    public get isStateSuccessOrReloading$(): Observable<boolean> {
        this._isStateSuccessOrReloading$ ??= this.internalSelect(_ => _.isStateSuccess || _.isStateReloading);

        return this._isStateSuccessOrReloading$;
    }

    private _isStateError$?: Observable<boolean>;
    public get isStateError$(): Observable<boolean> {
        this._isStateError$ ??= this.internalSelect(_ => _.isStateError);

        return this._isStateError$;
    }

    private clonedDeepStateToCheckDataMutationJson?: string;

    /**
     * Updates the state of the innerStore of the component with the provided partial state or updater function.
     *
     * @param partialStateOrUpdaterFn - Partial state or updater function to update the component's state.
     * @param assignDeepLevel - Level of deep assignment for the state update (default is 1).
     */
    public updateState(
        partialStateOrUpdaterFn: PartialDeep<TViewModel> | Partial<TViewModel> | ((state: TViewModel) => void | PartialDeep<TViewModel> | Partial<TViewModel>),
        options?: {
            updaterNotDeepMutate?: boolean;
            assignDeepLevel?: number;
            onDone?: (newState: TViewModel) => unknown;
        }
    ): void {
        this.setupSetClonedDeepStateToCheckDataMutation();
        this.ensureStateNotMutated();

        const processedOptions: ImmutableUpdateOptions = {
            checkDiff: 'deepCheck',
            maxDeepLevel: options?.assignDeepLevel ?? 1,
            updaterNotDeepMutate: options?.updaterNotDeepMutate
        };

        this.innerStore.setState(state => {
            try {
                const newState = immutableUpdate(state, partialStateOrUpdaterFn, processedOptions);

                if (this.currentState() != newState && options?.onDone) {
                    // Delay to ensure the state is updated before the onDone callback is executed
                    setTimeout(() => {
                        options.onDone!(newState);
                    });
                }

                return newState;
            } catch (error) {
                console.error(error);
                return immutableUpdate(state, this.buildSetErrorPartialState(<Error>error), processedOptions);
            }
        });
    }

    public ensureStateNotMutated() {
        if (!PLATFORM_CORE_GLOBAL_ENV.isLocalDev) return;

        // toPlainObj before check different to avoid case object has get property auto update value
        const currentStatePlainObj = toPlainObj(this.currentState());

        if (this.clonedDeepStateToCheckDataMutationJson != undefined && JSON.stringify(currentStatePlainObj) !== this.clonedDeepStateToCheckDataMutationJson) {
            const msg =
                '[DEV_ERROR] Data State mutated by dev in some placed, please check. Do not allow to mutate state directly. See CONSOLE LOG for more detail.';

            alert(msg);
            console.error(
                `[ClonedDeepStateToCheckDataMutationJson Original Value]:\n${
                    this.clonedDeepStateToCheckDataMutationJson
                }\n###\n[CurrentState Mutated Value]:\n${JSON.stringify(currentStatePlainObj)}`
            );
            console.error(new Error(msg));
        }
    }

    /**
     * Sets the error state of the component with the provided error response or error.
     *
     * @param errorResponse - Error response or error to set the component's error state.
     */
    public readonly setErrorState = (errorResponse: PlatformApiServiceErrorResponse | Error) => {
        this.updateState(this.buildSetErrorPartialState(errorResponse));
    };

    /**
     * Builds a partial state object with the error details.
     *
     * @param errorResponse - Error response or error to build the partial state with error details.
     * @returns Partial state object with error details.
     */
    public buildSetErrorPartialState(
        errorResponse: PlatformApiServiceErrorResponse | Error
    ): PartialDeep<TViewModel> | Partial<TViewModel> | ((state: TViewModel) => void | PartialDeep<TViewModel> | Partial<TViewModel>) {
        return <PartialDeep<TViewModel>>{
            status: 'Error',
            error: PlatformApiServiceErrorResponse.getDefaultFormattedMessage(errorResponse)
        };
    }

    public currentState(): TViewModel {
        // force use protected function to return current state
        return (<any>this.innerStore).get();
    }

    private loadingRequestsCountMap: Dictionary<number> = {};

    public loadingRequestsCount() {
        let result = 0;
        Object.keys(this.loadingRequestsCountMap).forEach(key => {
            result += this.loadingRequestsCountMap[key]!;
        });
        return result;
    }

    private reloadingRequestsCountMap: Dictionary<number> = {};

    public reloadingRequestsCount() {
        let result = 0;
        Object.keys(this.reloadingRequestsCountMap).forEach(key => {
            result += this.reloadingRequestsCountMap[key]!;
        });
        return result;
    }

    /**
     * Creates an RxJS operator function that observes and manages the loading state and error state of an observable
     * request. It is designed to be used to simplify the handling of loading and error states,
     * providing a convenient way to manage asynchronous operations and their associated UI states.
     *
     * @template T The type emitted by the source observable.
     *
     * @param requestKey A key to identify the request. Defaults to `requestStateDefaultKey` if not specified.
     * @param options Additional options for handling success and error states.
     *
     * @returns An RxJS operator function that can be used with the `pipe` operator on an observable.
     *
     * @usage
     * // Example: Subscribe to an API request, managing loading and error states
     * apiService.loadData()
     *   .pipe(observerLoadingErrorState())
     *   .subscribe(
     *     data => {
     *       // Handle successful response
     *     },
     *     error => {
     *       // Handle error
     *     }
     *   );
     */
    public observerLoadingErrorState<T>(requestKey?: string | null, options?: PlatformVmObserverLoadingOptions): (source: Observable<T>) => Observable<T> {
        if (requestKey == undefined) requestKey = PlatformVm.requestStateDefaultKey;

        const setLoadingState = () => {
            if (options?.isReloading) this.setReloading(true, requestKey);
            else this.setLoading(true, requestKey);

            this.setErrorMsg(undefined, requestKey);

            checkSetStatus.bind(this)();
        };

        return (source: Observable<T>) => {
            return defer(() => {
                setLoadingState();

                return source.pipe(
                    onCancel(() => {
                        if (!options?.isReloading) this.setLoading(false, requestKey);
                        this.setReloading(false, requestKey);

                        checkSetStatus.bind(this)();
                    }),

                    tapOnce({
                        next: result => {
                            // Set to reloading if is loading after first successful item
                            // So that if observable is not completed yet, support get case get api
                            // service has implicit caching reload, the observable return 2 items.
                            // First item from cache, second item is from server
                            // Set reloading for waiting second item to be completed then set to success
                            if (!options?.isReloading) {
                                this.setLoading(false, requestKey);
                                this.setReloading(true, requestKey);

                                checkSetStatus.bind(this)();
                            }
                        },
                        error: (err: PlatformApiServiceErrorResponse | Error) => {
                            if (!options?.isReloading) this.setLoading(false, requestKey);
                            this.setReloading(false, requestKey);

                            checkSetStatus.bind(this)();
                        }
                    }),
                    tap({
                        error: (err: PlatformApiServiceErrorResponse | Error) => {
                            this.setErrorMsg(err, requestKey);
                            this.setErrorState(err);
                        }
                    }),
                    tapLimit(
                        {
                            complete: () => {
                                this.setReloading(false, requestKey);
                                checkSetStatus.bind(this)();
                            }
                        },
                        2 // limit first 2 item for complete reloading. The second item is the item implicit load if api cached
                    )
                );
            });
        };

        function checkSetStatus(this: PlatformVmStore<TViewModel>) {
            if (this.loadingRequestsCount() > 0) {
                if (this.currentState().status != 'Loading') this.updateState(<Partial<TViewModel>>{ status: 'Loading' });
            } else if (this.reloadingRequestsCount() > 0) {
                if (this.currentState().status != 'Reloading') this.updateState(<Partial<TViewModel>>{ status: 'Reloading' });
            } else if (this.currentState().error != null && this.currentState().error?.trim() != '') {
                if (this.currentState().status != 'Error') this.updateState(<Partial<TViewModel>>{ status: 'Error' });
            } else if (this.currentState().status != 'Success') this.updateState(<Partial<TViewModel>>{ status: 'Success' });
        }
    }

    /**
     * Sets the error message for a specific request key in the component's state.
     *
     * @param error - Error message or null.
     * @param requestKey - Key to identify the request.
     */
    public setErrorMsg = (error: string | undefined | PlatformApiServiceErrorResponse | Error, requestKey: string = PlatformVm.requestStateDefaultKey) => {
        const errorMsg = typeof error == 'string' || error == null ? error : PlatformApiServiceErrorResponse.getDefaultFormattedMessage(error);

        this.updateState(<Partial<TViewModel>>{
            errorMsgMap: immutableUpdate(this.currentState().errorMsgMap, { [requestKey]: errorMsg }),
            error: errorMsg ?? null
        });

        if (error instanceof Error) {
            console.error(error);
            this.cacheService.clear();
        }
    };

    /**
     * Returns the error message Signal for a specific request key.
     *
     * @param requestKey - Key to identify the request.
     * @returns Error message Signal.
     */
    public getErrorMsg$ = (requestKey?: string) => {
        requestKey ??= requestStateDefaultKey;

        if (this.cachedErrorMsg$[requestKey] == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this.cachedErrorMsg$[requestKey] = toSignal(this.getErrorMsgObservable$(requestKey));
                });
            });
        }
        return this.cachedErrorMsg$[requestKey];
    };

    /**
     * Returns the error message observable for a specific request key.
     *
     * @param requestKey - Key to identify the request.
     * @returns Error message observable.
     */
    public getErrorMsgObservable$ = (requestKey?: string) => {
        requestKey ??= requestStateDefaultKey;

        if (this.cachedErrorMsgObservable$[requestKey] == null) {
            this.cachedErrorMsgObservable$[requestKey] = this.internalSelect(_ => _.getErrorMsg(requestKey));
        }
        return this.cachedErrorMsgObservable$[requestKey]!;
    };

    public getAllErrorMsgObservable$ = (requestKeys?: string[], excludeKeys?: string[]) => {
        const combinedCacheRequestKey = `${requestKeys != null ? JSON.stringify(requestKeys) : 'All'}_excludeKeys:${
            excludeKeys != null ? JSON.stringify(excludeKeys) : 'null'
        }`;

        if (this.cachedErrorMsgObservable$[combinedCacheRequestKey] == null) {
            this.cachedErrorMsgObservable$[combinedCacheRequestKey] = this.internalSelect(_ => _.getAllErrorMsgs(requestKeys, excludeKeys));
        }
        return this.cachedErrorMsgObservable$[combinedCacheRequestKey]!;
    };

    /**
     * Sets the loading state for a specific request key in the component's state.
     *
     * @param value - Loading state value (true, false, or null).
     * @param requestKey - Key to identify the request.
     */
    public setLoading = (value: boolean | null, requestKey: string = PlatformVm.requestStateDefaultKey) => {
        if (this.loadingRequestsCountMap[requestKey] == undefined) this.loadingRequestsCountMap[requestKey] = 0;

        if (value == true) this.loadingRequestsCountMap[requestKey] += 1;
        if (value == false && this.loadingRequestsCountMap[requestKey]! > 0) this.loadingRequestsCountMap[requestKey] -= 1;

        this.updateState(<Partial<TViewModel>>{
            loadingMap: immutableUpdate(this.currentState().loadingMap, {
                [requestKey]: this.loadingRequestsCountMap[requestKey]! > 0
            })
        });
    };

    /**
     * Sets the reloading state for a specific request key in the component's state.
     *
     * @param value - Reloading state value (true, false, or null).
     * @param requestKey - Key to identify the request.
     */
    public setReloading = (value: boolean | null, requestKey: string = PlatformVm.requestStateDefaultKey) => {
        if (this.reloadingRequestsCountMap[requestKey] == undefined) this.reloadingRequestsCountMap[requestKey] = 0;

        if (value == true) this.reloadingRequestsCountMap[requestKey] += 1;
        if (value == false && this.reloadingRequestsCountMap[requestKey]! > 0) this.reloadingRequestsCountMap[requestKey] -= 1;

        this.updateState(<Partial<TViewModel>>{
            reloadingMap: immutableUpdate(this.currentState().reloadingMap, {
                [requestKey]: this.reloadingRequestsCountMap[requestKey]! > 0
            })
        });
    };

    /**
     * Returns the loading state Signal for a specific request key.
     *
     * @param requestKey - Key to identify the request.
     * @returns Loading state Signal.
     */
    public isLoading$ = (requestKey: string = requestStateDefaultKey) => {
        if (this.cachedLoading$[requestKey] == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this.cachedLoading$[requestKey] = toSignal(this.internalSelect(_ => _.isLoading(requestKey)));
                });
            });
        }
        return this.cachedLoading$[requestKey]!;
    };

    /**
     * Returns the reloading state Signal for a specific request key.
     *
     * @param requestKey - Key to identify the request.
     * @returns Reloading state Signal.
     */
    public isReloading$ = (requestKey: string = requestStateDefaultKey) => {
        if (this.cachedReloading$[requestKey] == null) {
            //untracked to fix NG0602: A disallowed function is called inside a reactive context
            untracked(() => {
                // toSignal must be used in an injection context
                runInInjectionContext(this.environmentInjector, () => {
                    this.cachedReloading$[requestKey] = toSignal(this.internalSelect(_ => _.isReloading(requestKey)));
                });
            });
        }
        return this.cachedReloading$[requestKey]!;
    };

    /**
     * Selects a slice of the component's state and returns an observable of the selected slice.
     *
     * @template Result - Type of the selected slice.
     * @param projector - Function to select the desired slice of the state.
     * @param config - Select configuration options (optional).
     * @returns Observable of the selected slice of the state.
     */
    public select<Result>(projector: (s: TViewModel) => Result, config?: PlatformStoreSelectConfig): Observable<Result> {
        return defer(() => {
            return this.internalSelectObservable(this.vm$, config).pipe(map(projector), distinctUntilObjectValuesChanged());
        });
    }

    private setupSetClonedDeepStateToCheckDataMutationHasDone: boolean = false;

    private setupSetClonedDeepStateToCheckDataMutation() {
        if (PLATFORM_CORE_GLOBAL_ENV.isLocalDev && !this.setupSetClonedDeepStateToCheckDataMutationHasDone) {
            this.setupSetClonedDeepStateToCheckDataMutationHasDone = true;
            this.innerStore
                .select(v => v)
                .pipe(
                    this.subscribeUntilDestroyed(v => {
                        this.setClonedDeepStateToCheckDataMutation(this.currentState());
                    })
                );
        }
    }

    protected internalSelect<Result>(projector: (s: TViewModel) => Result, config?: PlatformStoreSelectConfig): Observable<Result> {
        return defer(() => {
            const selectConfig = config ?? this.defaultSelectConfig;

            return this.internalSelectObservable(<Observable<Result>>this.innerStore.select(projector, selectConfig), selectConfig);
        });
    }

    protected internalSelectObservable<Result>(observable: Observable<Result>, config?: PlatformStoreSelectConfig): Observable<Result> {
        this.setupSetClonedDeepStateToCheckDataMutation();

        const selectConfig = config ?? this.defaultSelectConfig;

        let selectResult$ = observable;

        // ThrottleTime explain: Delay to enhance performance
        // { leading: true, trailing: true } <=> emit the first item to ensure not delay, but also ignore the sub-sequence,
        // and still emit the latest item to ensure data is latest
        if (selectConfig.throttleTimeDuration != undefined && selectConfig.throttleTimeDuration > 0)
            selectResult$ = selectResult$.pipe(
                throttleTime(selectConfig.throttleTimeDuration ?? 0, asyncScheduler, {
                    leading: true,
                    trailing: true
                })
            );

        // autoInitVmState for case using store select only but not use vm$ in template
        return selectResult$.pipe(
            map(result => {
                setTimeout(() => {
                    this.ensureStateNotMutated();
                }, 500);
                return result;
            }),
            tapOnce({
                next: () => {
                    // setTimeout to autoInitVmState in queue, prevent access init vm$ immediately, may lock account or has some issues if
                    // access signal => cause select => cause access $vm immdeiately in constructor my lock the loading process
                    setTimeout(() => {
                        this.autoInitVmState();
                    });
                }
            })
        );
    }

    protected autoInitVmState() {
        if (this._vm$ == undefined) {
            this.vm$.pipe(take(1)).subscribe();
        }
    }

    /**
     * This method is a higher-order function that creates and manages side effects in an application.
     * Side effects are actions that interact with the outside world, such as making API calls or updating the UI.
     *
     * @template ProvidedType - The type of value provided to the effect.
     * @template OriginType - The type of the origin observable.
     * @template ObservableType - The inferred type of the origin observable.
     * @template ReturnObservableType - The type of the observable returned by the generator function.
     * @template ReturnType - The type of the return value of the `effect` method.
     *
     * @param {function(origin$: OriginType, isReloading?: boolean): Observable<ReturnObservableType>} generator - The generator function that defines the effect.
     * @param { throttleTimeMs?: number} [options] - An optional object that can contain a throttle time in milliseconds for the effect and a function to handle the effect subscription.
     *
     * @returns {ReturnType} - The function that can be used to trigger the effect. The function params including: observableOrValue, isReloading, otherOptions. In otherOptions including: effectSubscriptionHandleFn - a function to handle the effect subscription.
     *
     * @example this.effect((query$: Observable<(any type here, can be void too)>) => { return $query.pipe(switchMap(query => callApi(query)), this.tapResponse(...), this.observerLoadingState('key', {isReloading:isReloading})) }, {throttleTimeMs: 300}).
     * The returned function could be used like: effectFunc(query, isLoading, {effectSubscriptionHandleFn: sub => this.storeSubscription('key', sub)})
     */
    public effect<
        ProvidedType,
        OriginType extends Observable<ProvidedType> = Observable<ProvidedType>,
        ObservableType = OriginType extends Observable<infer A> ? A : never,
        ReturnObservableType = unknown,
        ReturnType = [ObservableType] extends [void]
            ? (
                  observableOrValue?: null | undefined | void | Observable<null | undefined | void>,
                  isReloading?: boolean,
                  options?: { effectSubscriptionHandleFn?: (sub: Subscription) => unknown }
              ) => Observable<ReturnObservableType>
            : (
                  observableOrValue: ObservableType | Observable<ObservableType>,
                  isReloading?: boolean,
                  options?: { effectSubscriptionHandleFn?: (sub: Subscription) => unknown }
              ) => Observable<ReturnObservableType>
    >(
        generator: (origin$: OriginType, isReloading?: boolean) => Observable<ReturnObservableType>,
        requestKey?: string | null,
        options?: {
            effectSubscriptionHandleFn?: (sub: Subscription) => unknown;
            notAutoObserveErrorLoadingState?: boolean;
        }
    ): ReturnType {
        if (requestKey == undefined) requestKey = PlatformVm.requestStateDefaultKey;

        const returnFunc = (
            observableOrValue?: ObservableType | Observable<ObservableType> | null,
            isReloading?: boolean,
            otherOptions?: { effectSubscriptionHandleFn?: (sub: Subscription) => unknown }
        ) => {
            // observableOrValue.pipe(skipTime(100)) => skipTime(100) to skip first item of observable
            // within first 100ms to prevent if obserable is from an behavior subject
            // only start subscribe for item emit after subscribe listen for some thing changed new
            // in the future
            const request$ = isObservable(observableOrValue) ? observableOrValue.pipe(skipTime(100)) : of(observableOrValue);

            // (III)
            // Delay to make the next api call asynchronous. When call an effect => loading. Call again => previousEffectSub.unsubscribe => cancel => back to success => call next api (async) => set loading again correctly.
            // If not delay => call next api is sync => set loading is sync but previous cancel is not activated successfully yet, which status is not updated back to Success => which this new effect call skip set status to loading => but then the previous api cancel executing => update status to Success but actually it's loading => create incorrectly status
            // (IV)
            // Share so that later subscriber can receive the result, this will help component call
            // effect could subscribe to do some action like show loading, hide loading, etc.
            return request$.pipe(
                skipDuplicates(500),
                switchMap(request =>
                    generator(<OriginType>of(request), isReloading).pipe(
                        delay(1, asyncScheduler), // (III)
                        applyIf(!options?.notAutoObserveErrorLoadingState, this.observerLoadingErrorState(requestKey, { isReloading: isReloading }))
                    )
                ),
                this.untilDestroyed(),
                shareReplay({ bufferSize: 1, refCount: true }), // (IV)
                this.subscribeUntilDestroyed(undefined, sub => {
                    if (options?.effectSubscriptionHandleFn != null) options?.effectSubscriptionHandleFn(sub);
                    if (otherOptions?.effectSubscriptionHandleFn != null) otherOptions?.effectSubscriptionHandleFn(sub);
                })
            );
        };

        return returnFunc as unknown as ReturnType;
    }

    /**
     * Creates a simplified effect function for managing side effects with automatic state management.
     *
     * This is a streamlined version of the `effect` method that automatically handles observable wrapping
     * and provides a more convenient API for simple effects that don't require complex observable chaining.
     * The method automatically manages loading states, error handling, and subscription lifecycle.
     *
     * Key Features:
     * - **Automatic Observable Wrapping**: Non-observable values are automatically wrapped in observables
     * - **Simplified Generator Function**: Generator receives unwrapped values instead of observables
     * - **Automatic State Management**: Loading, error, and success states are managed automatically
     * - **Subscription Management**: Handles subscription lifecycle and cleanup
     * - **Duplicate Prevention**: Prevents duplicate calls within a short time window
     * - **Request Tracking**: Associates effects with specific request keys for granular state tracking
     *
     * @template ProvidedType - The type of value provided to the effect (defaults to void for parameterless effects)
     * @template ReturnObservableType - The type returned by the generator function's observable
     * @template ReturnType - The inferred return type of the effect function
     *
     * @param {function(origin: ProvidedType, isReloading?: boolean): Observable<ReturnObservableType> | void} generator
     *   The generator function that defines the effect logic. Receives:
     *   - `origin`: The unwrapped value passed to the effect
     *   - `isReloading`: Optional boolean indicating if this is a reload operation
     *   Returns either an Observable or void (for fire-and-forget operations)
     *
     * @param {string | null} [requestKey] - Optional key to identify this effect for state tracking.
     *   Defaults to 'Default' if not provided. Used for granular loading/error state management.
     *
     * @param {Object} [options] - Optional configuration object
     * @param {function(sub: Subscription): unknown} [options.effectSubscriptionHandleFn] -
     *   Callback to handle the effect's subscription (e.g., for custom cleanup)
     * @param {boolean} [options.notAutoObserveErrorLoadingState] -
     *   If true, disables automatic loading/error state management
     *
     * @returns {ReturnType} A function that can be called to trigger the effect.
     *   For void effects: `(value?, isReloading?, options?) => Observable<ReturnObservableType>`
     *   For typed effects: `(value, isReloading?, options?) => Observable<ReturnObservableType>`
     *
     * @example
     * ```typescript
     * // Simple parameterless effect
     * public loadUsers = this.effectSimple(() => {
     *   return this.userApi.getUsers().pipe(
     *     this.tapResponse(users => {
     *       this.updateState({ users, status: 'Success' });
     *     })
     *   );
     * });
     *
     * // Usage: this.loadUsers();
     * ```
     *
     * @example
     * ```typescript
     * // Effect with parameters
     * public searchUsers = this.effectSimple((searchTerm: string) => {
     *   return this.userApi.searchUsers(searchTerm).pipe(
     *     this.tapResponse(users => {
     *       this.updateState({ searchResults: users });
     *     })
     *   );
     * });
     *
     * // Usage: this.searchUsers('john');
     * ```
     *
     * @example
     * ```typescript
     * // Effect with custom request key for granular state tracking
     * public deleteUser = this.effectSimple((userId: string) => {
     *   return this.userApi.deleteUser(userId).pipe(
     *     this.tapResponse(() => {
     *       this.updateState(state => {
     *         state.users = state.users.filter(u => u.id !== userId);
     *       });
     *     })
     *   );
     * }, 'deleteUser');
     *
     * // Check specific loading state: this.isLoading$('deleteUser')
     * ```
     *
     * @example
     * ```typescript
     * // Effect with observable input
     * public loadUserDetails = this.effectSimple((userId: string) => {
     *   return this.userApi.getUserDetails(userId).pipe(
     *     this.tapResponse(userDetails => {
     *       this.updateState({ selectedUser: userDetails });
     *     })
     *   );
     * });
     *
     * // Usage with observable:
     * this.selectedUserId$.subscribe(userId => {
     *   if (userId) {
     *     this.loadUserDetails(userId);
     *   }
     * });
     *
     * // Or pass observable directly:
     * this.loadUserDetails(this.selectedUserId$);
     * ```
     *
     * @example
     * ```typescript
     * // Effect with reload support
     * public refreshData = this.effectSimple((forceRefresh: boolean = false) => {
     *   return this.dataApi.getData(forceRefresh).pipe(
     *     this.tapResponse(data => {
     *       this.updateState({ data });
     *     })
     *   );
     * });
     *
     * // Initial load: this.refreshData();
     * // Reload: this.refreshData(true, true); // (value, isReloading)
     * ```
     *
     * @example
     * ```typescript
     * // Fire-and-forget effect (returns void)
     * public trackUserAction = this.effectSimple((action: UserAction) => {
     *   // No return statement - fire and forget
     *   this.analyticsService.track(action.type, action.data);
     * }, 'analytics', { notAutoObserveErrorLoadingState: true });
     *
     * // Usage: this.trackUserAction({ type: 'button_click', data: {...} });
     * ```
     *
     * @example
     * ```typescript
     * // Effect with custom subscription handling
     * public autoSaveForm = this.effectSimple((formData: FormData) => {
     *   return this.formApi.autoSave(formData).pipe(
     *     this.tapResponse(result => {
     *       this.updateState({ lastSaved: new Date(), autoSaveResult: result });
     *     })
     *   );
     * }, 'autoSave', {
     *   effectSubscriptionHandleFn: (sub) => {
     *     // Custom subscription handling
     *     this.storeSubscription('autoSave', sub);
     *   }
     * });
     * ```
     *
     * @example
     * ```typescript
     * // Real-world attendance request approval effect
     * public approveRequest = this.effectSimple((requestId: string, isReloading?: boolean) => {
     *   return this.attendanceApi.approveRequest(requestId).pipe(
     *     this.tapResponse(approvedRequest => {
     *       this.updateState(state => {
     *         const index = state.requests.findIndex(r => r.id === requestId);
     *         if (index >= 0) {
     *           state.requests[index] = approvedRequest;
     *         }
     *       });
     *       this.notificationService.success('Request approved successfully');
     *     })
     *   );
     * }, 'approveRequest');
     *
     * // Component usage:
     * onApproveClick(requestId: string) {
     *   this.store.approveRequest(requestId).subscribe({
     *     complete: () => {
     *       // Handle completion if needed
     *       this.closeApprovalDialog();
     *     }
     *   });
     * }
     * ```
     *
     * @since 1.0.0
     * @see {@link effect} For the full-featured effect method
     * @see {@link observerLoadingErrorState} For manual state management
     * @see {@link tapResponse} For response handling patterns
     */
    public effectSimple<
        ProvidedType = void,
        ReturnObservableType = unknown,
        ReturnType = [ProvidedType] extends [void]
            ? (
                  observableOrValue?: null | undefined | void | Observable<null | undefined | void>,
                  isReloading?: boolean,
                  options?: { effectSubscriptionHandleFn?: (sub: Subscription) => unknown }
              ) => Observable<ReturnObservableType>
            : (
                  observableOrValue: ProvidedType | Observable<ProvidedType>,
                  isReloading?: boolean,
                  options?: { effectSubscriptionHandleFn?: (sub: Subscription) => unknown }
              ) => Observable<ReturnObservableType>
    >(
        generator: (origin: ProvidedType, isReloading?: boolean) => Observable<ReturnObservableType> | void,
        requestKey?: string | null,
        options?: {
            effectSubscriptionHandleFn?: (sub: Subscription) => unknown;
            notAutoObserveErrorLoadingState?: boolean;
        }
    ): ReturnType {
        return this.effect(
            (origin$: Observable<ProvidedType>, isReloading?: boolean) => {
                return origin$.pipe(
                    switchMap(origin => {
                        const returnObservableOrVoid = generator(origin, isReloading);
                        return returnObservableOrVoid instanceof Observable ? returnObservableOrVoid : of(undefined);
                    })
                );
            },
            requestKey,
            options
        );
    }

    /**
     * Maps the emitted value of the source observable to the current view model state.
     *
     * @template T - Type emitted by the source observable.
     * @returns Operator function to map the emitted value to the current view model state.
     */
    public switchMapVm<T>(): OperatorFunction<T, TViewModel> {
        return switchMap(p => this.internalSelect(vm => vm));
    }

    /**
     * Creates an RxJS operator function that taps into the source observable to handle next, error, and complete events.
     * @param nextFn A function to handle the next value emitted by the source observable.
     * @param errorFn  (optional): A function to handle errors emitted by the source observable.
     * @param completeFn (optional): A function to handle the complete event emitted by the source observable.
     */
    protected tapResponse<T, E = string | PlatformApiServiceErrorResponse | Error>(
        nextFn?: (next: T) => void,
        errorFn?: (error: E) => void,
        completeFn?: () => void
    ): (source: Observable<T>) => Observable<T> {
        return tap({
            next: data => {
                try {
                    if (nextFn) nextFn(data);
                } catch (error) {
                    console.error(error);
                    throw error;
                }
            },
            error: errorFn,
            complete: completeFn
        });
    }

    /**
     * Stores a subscription using the specified key. The subscription will be unsubscribed when the store is destroyed.
     */
    protected storeSubscription(key: string, subscription: Subscription): void {
        this.storedSubscriptionsMap.set(key, subscription);
    }

    /**
     * Stores a subscription. The subscription will be unsubscribed when the store is destroyed.
     */
    protected storeAnonymousSubscription(subscription: Subscription): void {
        list_remove(this.storedAnonymousSubscriptions, p => p.closed);
        this.storedAnonymousSubscriptions.push(subscription);
    }

    /**
     * Subscribes to the provided observable and stores the subscription in the storedAnonymousSubscriptions array.
     */
    protected subscribe<T>(observable: Observable<T>): Subscription {
        const subs = observable.subscribe();

        this.storeAnonymousSubscription(subs);

        return subs;
    }

    /**
     * Cancels and removes a stored subscription identified by the provided key from the
     */
    protected cancelStoredSubscription(key: string): void {
        this.storedSubscriptionsMap.get(key)?.unsubscribe();
        this.storedSubscriptionsMap.delete(key);
    }

    /**
     * Cancels and removes all stored subscriptions from both the storedSubscriptionsMap and storedAnonymousSubscriptions.
     */
    protected cancelAllStoredSubscriptions(): void {
        this.storedSubscriptionsMap.forEach((sub, key) => this.cancelStoredSubscription(key));
        this.storedAnonymousSubscriptions.forEach(sub => sub.unsubscribe());
    }

    /**
     * Returns the current state of the store.
     */
    protected get(): TViewModel {
        return this.currentState();
    }

    /**
     * Subscribes to changes in the view model state and updates the cached state.
     * This method ensures that the cached state is updated after the view model state changes,
     * but it throttles the updates to avoid excessive storage writes.
     *
     * @protected
     * @method
     * @returns {void}
     */
    protected subscribeCacheStateOnChanged() {
        if (this.vm$ == undefined) return;

        this.storeAnonymousSubscription(
            this.vm$.pipe(throttleTime(1000, asyncScheduler, { leading: true, trailing: true })).subscribe(vm => {
                if (!vm.isStateLoading && !vm.isStateReloading && this.enableCache) this.cacheService.set(this.getCachedStateKey(), vm);
            })
        );
    }

    private getCachedStateKey(): string {
        return 'PlatformViewModelState_' + this.cachedStateKeyName();
    }

    /**
     * Retrieves the cached view model state from the caching service.
     *
     * @protected
     * @method
     * @returns {TViewModel | undefined} The cached view model state or undefined if not found.
     */
    protected getCachedState(): TViewModel | undefined {
        const cachedData = this.cacheService.get(this.getCachedStateKey(), (data?: Partial<TViewModel>) => this.vmConstructor(data));

        return cachedData;
    }

    protected setClonedDeepStateToCheckDataMutation(newState: TViewModel | undefined) {
        // toPlainObj before check different to avoid case object has get property auto update value
        this.clonedDeepStateToCheckDataMutationJson = PLATFORM_CORE_GLOBAL_ENV.isLocalDev ? JSON.stringify(toPlainObj(newState)) : undefined;
    }

    /**
     * Creates an RxJS operator function that unsubscribes from the observable when the component is destroyed.
     */
    public untilDestroyed<T>(): MonoTypeOperatorFunction<T> {
        return takeUntil(this.destroyed$.pipe(filter(destroyed => destroyed == true)));
    }

    /**
     * Creates an RxJS operator function that subscribes to the observable until the component is destroyed.
     */
    public subscribeUntilDestroyed<T>(
        observerOrNext?: Partial<Observer<T>> | ((value: T) => void),
        outSubscriptionFn?: (subscription: Subscription) => void
    ): MonoTypeOperatorFunction<T> {
        return subscribeUntil(this.destroyed$.pipe(filter(destroyed => destroyed == true)), observerOrNext, outSubscriptionFn);
    }
}

export type PlatformVmObserverLoadingOptions = {
    isReloading?: boolean;
};

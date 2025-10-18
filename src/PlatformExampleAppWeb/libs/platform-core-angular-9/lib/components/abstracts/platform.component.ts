/* eslint-disable @typescript-eslint/no-explicit-any */
import { AfterViewInit, ChangeDetectorRef, ElementRef, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';

import { ToastrService } from 'ngx-toastr';
import { asyncScheduler, BehaviorSubject, defer, isObservable, MonoTypeOperatorFunction, Observable, of, PartialObserver, Subject, Subscription } from 'rxjs';
import { delay, filter, finalize, share, switchMap, take, takeUntil, tap, throttleTime } from 'rxjs/operators';

import { PlatformApiServiceErrorResponse } from '../../api-services';
import { PlatformCachingService } from '../../caching';
import { Dictionary } from '../../common-types';
import { LifeCycleHelper } from '../../helpers';
import { PLATFORM_CORE_GLOBAL_ENV } from '../../platform-core-global-environment';
import {
    applyIf,
    onCancel,
    rxjs_combineLatestBehaviorSubject,
    rxjs_mapBehaviorSubject,
    skipDuplicates,
    skipTime,
    subscribeUntil,
    tapLimit,
    tapOnce
} from '../../rxjs';
import { PlatformTranslateService } from '../../translations';
import { clone, guid_generate, immutableUpdate, keys, list_distinct, list_remove, task_delay } from '../../utils';
import { requestStateDefaultKey } from '../../view-models';

/**
 * Enumeration defining the possible states of a component's operations.
 *
 * @remarks
 * These states are used throughout the platform to indicate the current
 * status of asynchronous operations like data loading, API calls, and
 * other long-running processes.
 */
export const enum ComponentStateStatus {
    /** An error occurred during the operation */
    Error = 'Error',
    /** Initial loading state */
    Loading = 'Loading',
    /** Refreshing or reloading existing data */
    Reloading = 'Reloading',
    /** Operation completed successfully */
    Success = 'Success',
    Pending = 'Pending'
}

const defaultThrottleDurationMs = 300;

/**
 * Abstract base class providing comprehensive functionality for all platform components.
 *
 * @remarks
 * PlatformComponent serves as the foundation for all Angular components in the platform,
 * providing essential services, reactive state management, lifecycle hooks, and utility
 * methods. It integrates seamlessly with Angular's modern features including signals,
 * dependency injection, and reactive programming patterns.
 *
 * **Core Features:**
 * - **Reactive State Management**: Built-in loading, error, and success states with BehaviorSubjects
 * - **Subscription Management**: Automatic subscription cleanup and lifecycle management
 * - **Error Handling**: Centralized error processing with user-friendly notifications
 * - **Development Tools**: Debug helpers for loading and error state validation
 * - **Performance Optimization**: Built-in throttling and change detection controls
 * - **Service Integration**: Pre-injected platform services (translations, caching, notifications)
 * - **Request State Tracking**: Multi-request state management with unique keys
 * - **Lifecycle Helpers**: Enhanced lifecycle hooks with reactive patterns
 *
 * **State Management Architecture:**
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                 PlatformComponent State                    │
 * ├─────────────────────┬───────────────────────────────────────┤
 * │  Lifecycle States   │  initiated$, viewInitiated$, destroyed$ │
 * │                     │  Reactive lifecycle tracking         │
 * ├─────────────────────┼───────────────────────────────────────┤
 * │  Operation States   │  status$, loadingMap$, errorMsgMap$  │
 * │                     │  Multi-request state management      │
 * ├─────────────────────┼───────────────────────────────────────┤
 * │  Services           │  Translations, caching, notifications │
 * │                     │  Change detection, element reference  │
 * └─────────────────────┴───────────────────────────────────────┘
 * ```
 *
 * **Reactive Programming Integration:**
 * The component leverages RxJS reactive programming patterns:
 * - **BehaviorSubjects**: For reactive state that triggers UI updates automatically
 * - **Observable Operators**: For side effects and computed reactions to state changes
 * - **RxJS Utilities**: Custom operators like rxjs_mapBehaviorSubject for derived state
 * - **Automatic Cleanup**: Subscriptions tied to component lifecycle
 *
 * @example
 * **Basic component implementation:**
 * ```typescript
 * @Component({
 *   selector: 'app-user-list',
 *   template: `
 *     <div *ngIf="isStateLoading | async">Loading users...</div>
 *     <div *ngIf="isStateError | async">{{ errorMsg$ | async }}</div>
 *     <div *ngIf="isStateSuccess | async">
 *       <user-card *ngFor="let user of users" [user]="user"></user-card>
 *     </div>
 *   `
 * })
 * export class UserListComponent extends PlatformComponent implements OnInit {
 *   users: User[] = [];
 *
 *   ngOnInit() {
 *     this.loadUsers();
 *   }
 *
 *   private loadUsers() {
 *     this.subscribeRequest(
 *       this.userService.getUsers(),
 *       users => this.users = users
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * **Multi-request state management:**
 * ```typescript
 * export class DashboardComponent extends PlatformComponent implements OnInit {
 *   users: User[] = [];
 *   reports: Report[] = [];
 *
 *   ngOnInit() {
 *     // Track multiple requests independently
 *     this.subscribeRequest(
 *       this.userService.getUsers(),
 *       users => this.users = users,
 *       'users' // unique key for this request
 *     );
 *
 *     this.subscribeRequest(
 *       this.reportService.getReports(),
 *       reports => this.reports = reports,
 *       'reports' // unique key for this request
 *     );
 *   }
 *
 *   // Check specific request states
 *   get isLoadingUsers() { return this.isLoading('users'); }
 *   get isLoadingReports() { return this.isLoading('reports'); }
 * }
 * ```
 *
 * @example
 * **Error handling with notifications:**
 * ```typescript
 * export class ProductComponent extends PlatformComponent {
 *   product?: Product;
 *
 *   saveProduct(product: Product) {
 *     this.subscribeRequest(
 *       this.productService.save(product),
 *       saved => {
 *         this.product = saved;
 *         this.showSuccessToast('Product saved successfully!');
 *       },
 *       'save-product',
 *       {
 *         errorHandler: (error) => {
 *           // Custom error handling
 *           if (error.error.code === 'VALIDATION_ERROR') {
 *             this.showErrorToast('Please check your input data');
 *           } else {
 *             this.handleDefaultError(error);
 *           }
 *         }
 *       }
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced subscription management:**
 * ```typescript
 * export class RealtimeComponent extends PlatformComponent implements OnInit {
 *   ngOnInit() {
 *     // Named subscription for later management
 *     this.storeSubscription(
 *       'realtime-updates',
 *       this.websocketService.messages$.subscribe(message => {
 *         this.handleRealtimeMessage(message);
 *       })
 *     );
 *
 *     // Anonymous subscription (auto-cleanup on destroy)
 *     this.subscribeUntilDestroyed(
 *       this.userService.currentUser$,
 *       user => this.currentUser = user
 *     );
 *   }
 *
 *   toggleRealtimeUpdates() {
 *     if (this.hasStoredSubscription('realtime-updates')) {
 *       this.unsubscribe('realtime-updates');
 *     } else {
 *       this.startRealtimeUpdates();
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Development debugging features:**
 * ```typescript
 * export class DebugComponent extends PlatformComponent {
 *   // Configure dev-mode validation
 *   protected get devModeCheckLoadingStateElement(): string[] {
 *     return ['.loading-spinner', '.skeleton-loader'];
 *   }
 *
 *   protected get devModeCheckErrorStateElement(): string {
 *     return '.error-message';
 *   }
 *
 *   // Component will alert in dev mode if loading but no spinner found
 *   // or if error state but no error message element found
 * }
 * ```
 *
 * **Lifecycle Integration:**
 * The component provides enhanced lifecycle hooks that work seamlessly with
 * reactive programming patterns and automatic resource cleanup.
 *
 * **Performance Considerations:**
 * - Change detection is optimized with configurable throttling
 * - Subscriptions are automatically managed and cleaned up
 * - State updates are batched and optimized for minimal re-renders
 * - Memory leaks are prevented through comprehensive cleanup
 *
 * @see {@link ComponentWatch} - Decorator for property watching with lifecycle awareness
 * @see {@link PlatformFormComponent} - Enhanced component for form handling
 * @see {@link PlatformVMComponent} - Component with view model integration
 * @see {@link ComponentStateStatus} - Enumeration of possible component states
 */
export abstract class PlatformComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
    public static readonly defaultDetectChangesDelay: number = 0;
    public static readonly defaultDetectChangesThrottleTime: number = defaultThrottleDurationMs;
    public static readonly checkLoadingDelayTimeMs = 200;

    private devModeCheckLoadingStateElementTimeoutId?: number;

    constructor(
        public changeDetector: ChangeDetectorRef,
        public elementRef: ElementRef<HTMLElement>,
        public cacheService: PlatformCachingService,
        public toast: ToastrService,
        public translateSrv: PlatformTranslateService
    ) {
        // setTimeout to delay action to queue => run after inherit component init logic has been executed
        setTimeout(() => {
            // Setup dev mode check has loading using RxJS subscription
            if (this.devModeCheckLoadingStateElement != undefined && PLATFORM_CORE_GLOBAL_ENV.isLocalDev) {
                this.storeAnonymousSubscription(
                    this.isStateLoading
                        .pipe(
                            this.untilDestroyed(),
                            tap(isLoading => {
                                if (this.devModeCheckLoadingStateElementTimeoutId != undefined) clearTimeout(this.devModeCheckLoadingStateElementTimeoutId);
                                if (isLoading) {
                                    this.devModeCheckLoadingStateElementTimeoutId = <number>(<unknown>setTimeout(() => {
                                        if (this.devModeCheckLoadingStateElement == undefined || !this.isStateLoading.getValue()) return;

                                        const devModeCheckLoadingStateElements =
                                            typeof this.devModeCheckLoadingStateElement == 'string'
                                                ? [this.devModeCheckLoadingStateElement]
                                                : this.devModeCheckLoadingStateElement;
                                        const findInRootElement = this.devModeCheckLoadingOrErrorAllowInGlobalDocumentBody
                                            ? document
                                            : this.elementRef.nativeElement;

                                        if (
                                            this.isStateLoading.getValue() &&
                                            this.devModeCheckLoadingStateElementOnlyWhen &&
                                            devModeCheckLoadingStateElements.find(
                                                elementSelector => !this.isStateLoading.getValue() || findInRootElement.querySelector(elementSelector) != null
                                            ) == null
                                        ) {
                                            if (!this.isStateLoading.getValue() || this.destroyed$.getValue()) return;

                                            const msg = `[DEV-ERROR] ${this.elementRef.nativeElement.tagName} Component in loading state but no loading element found`;
                                            alert(msg);
                                            console.error(new Error(msg));
                                        }
                                    }, PlatformComponent.checkLoadingDelayTimeMs));
                                }
                            })
                        )
                        .subscribe()
                );
            }

            //Setup dev mode check error has alert using RxJS subscription
            if (this.devModeCheckErrorStateElement != undefined && PLATFORM_CORE_GLOBAL_ENV.isLocalDev) {
                this.storeAnonymousSubscription(
                    this.errorMsg$
                        .pipe(
                            this.untilDestroyed(),
                            tap(errorMsg => {
                                if (errorMsg != null) {
                                    setTimeout(() => {
                                        if (this.devModeCheckErrorStateElement == undefined) return;

                                        const devModeCheckErrorStateElements =
                                            typeof this.devModeCheckErrorStateElement == 'string'
                                                ? [this.devModeCheckErrorStateElement]
                                                : this.devModeCheckErrorStateElement;
                                        const findInRootElement = this.devModeCheckLoadingOrErrorAllowInGlobalDocumentBody
                                            ? document
                                            : this.elementRef.nativeElement;

                                        if (
                                            this.errorMsg$.getValue() != null &&
                                            devModeCheckErrorStateElements.find(
                                                elementSelector => this.errorMsg$.getValue() == null || findInRootElement.querySelector(elementSelector) != null
                                            ) == null
                                        ) {
                                            if (this.errorMsg$.getValue() == null || this.destroyed$.getValue()) return;

                                            const msg = `[DEV-ERROR] ${this.elementRef.nativeElement.tagName} Component in error state but no error element found`;
                                            alert(msg);
                                            console.error(new Error(msg));
                                        }
                                    });
                                }
                            })
                        )
                        .subscribe()
                );
            }
        });
    }

    public initiated$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public initiated = () => this.initiated$.getValue();
    public ngOnInitCalled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public viewInitiated$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public viewInitiated = () => this.viewInitiated$.getValue();
    public destroyed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public status$: BehaviorSubject<ComponentStateStatus> = new BehaviorSubject<ComponentStateStatus>(ComponentStateStatus.Pending);
    public errorMsgMap$: BehaviorSubject<Dictionary<string | undefined>> = new BehaviorSubject<Dictionary<string | undefined>>({});
    public loadingMap$: BehaviorSubject<Dictionary<boolean | null>> = new BehaviorSubject<Dictionary<boolean | null>>({});
    public reloadingMap$: BehaviorSubject<Dictionary<boolean | null>> = new BehaviorSubject<Dictionary<boolean | null>>({});
    public componentId = guid_generate();

    protected storedSubscriptionsMap: Map<string, Subscription> = new Map();
    protected storedAnonymousSubscriptions: Subscription[] = [];
    protected cachedErrorMsg$: Dictionary<BehaviorSubject<string | undefined>> = {};
    protected cachedLoading$: Dictionary<BehaviorSubject<boolean | null>> = {};
    protected cachedReloading$: Dictionary<BehaviorSubject<boolean | null>> = {};
    protected cachedAllErrorMsgs$: Dictionary<BehaviorSubject<string | null | undefined>> = {};
    protected isVmLoadedOnce: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    protected get autoRunInitOrReloadVmInNgOnInit(): boolean {
        return true;
    }

    /**
     * Element selectors. If return not null and any, will check element exist when is loading
     */
    protected get devModeCheckLoadingStateElement(): string | string[] | undefined {
        return undefined;
    }
    /**
     * Default is True. Custom condition for dev-mode when to check loading element
     */
    protected get devModeCheckLoadingStateElementOnlyWhen(): boolean {
        return true;
    }
    /**
     * Element selectors. If return not null and any, will check element exist when has error
     */
    protected get devModeCheckErrorStateElement(): string | string[] | undefined {
        return undefined;
    }
    /**
     * Default return false. If true, search check loading or error element in whole document body
     */
    protected get devModeCheckLoadingOrErrorAllowInGlobalDocumentBody(): boolean {
        return false;
    }

    protected detectChangesThrottleSource = new Subject<DetectChangesParams>();
    protected detectChangesThrottle$ = this.detectChangesThrottleSource.pipe(
        this.untilDestroyed(),
        throttleTime(PlatformComponent.defaultDetectChangesThrottleTime, asyncScheduler, {
            leading: true,
            trailing: true
        }),
        tap(params => {
            this.doDetectChanges(params);
        })
    );

    protected doDetectChanges(params?: DetectChangesParams) {
        if (this.canDetectChanges) {
            this.changeDetector.detectChanges();
            if (params?.checkParentForHostBinding != undefined) this.changeDetector.markForCheck();
            if (params?.onDone != undefined) params.onDone();
        }
    }

    protected _isStatePending?: BehaviorSubject<boolean>;
    public get isStatePending(): BehaviorSubject<boolean> {
        if (this._isStatePending == null) this._isStatePending = rxjs_mapBehaviorSubject(this.status$, v => v == 'Pending');
        return this._isStatePending;
    }

    protected _isStateLoading?: BehaviorSubject<boolean>;
    public get isStateLoading(): BehaviorSubject<boolean> {
        if (this._isStateLoading == null) {
            this._isStateLoading = rxjs_combineLatestBehaviorSubject(
                this.status$,
                this.loadingMap$,
                (status, loadingMap) => status == 'Loading' || keys(loadingMap).find(requestKey => loadingMap[requestKey]) != undefined
            );
        }
        return this._isStateLoading;
    }

    protected _isStateReloading?: BehaviorSubject<boolean>;
    public get isStateReloading(): BehaviorSubject<boolean> {
        if (this._isStateReloading == null) {
            this._isStateReloading = rxjs_combineLatestBehaviorSubject(
                this.status$,
                this.reloadingMap$,
                (status, reloadingMap) => status == 'Reloading' || keys(reloadingMap).find(requestKey => reloadingMap[requestKey]) != undefined
            );
        }
        return this._isStateReloading;
    }

    public isAnyLoadingRequest = rxjs_mapBehaviorSubject(
        this.loadingMap$,
        loadingMap => keys(loadingMap).find(requestKey => loadingMap[requestKey]) != undefined
    );

    public isAnyReloadingRequest = rxjs_mapBehaviorSubject(
        this.reloadingMap$,
        reloadingMap => keys(reloadingMap).find(requestKey => reloadingMap[requestKey]) != undefined
    );

    protected _isLoadingToInitVm?: BehaviorSubject<boolean>;
    public get isLoadingToInitVm(): BehaviorSubject<boolean> {
        if (this._isLoadingToInitVm == null) {
            this._isLoadingToInitVm = rxjs_combineLatestBehaviorSubject(
                this.isStateLoading,
                this.isVmLoadedOnce,
                (isLoading, isVmLoaded) => isLoading && !isVmLoaded
            );
        }
        return this._isLoadingToInitVm;
    }

    protected _isStateSuccess?: BehaviorSubject<boolean>;
    public get isStateSuccess(): BehaviorSubject<boolean> {
        if (this._isStateSuccess == null) this._isStateSuccess = rxjs_mapBehaviorSubject(this.status$, status => status == 'Success');
        return this._isStateSuccess;
    }

    protected _isStateError?: BehaviorSubject<boolean>;
    public get isStateError(): BehaviorSubject<boolean> {
        if (this._isStateError == null) this._isStateError = rxjs_mapBehaviorSubject(this.status$, status => status == 'Error');
        return this._isStateError;
    }

    /**
     * Returns an Signal that emits the error message associated with the default request key or the first existing error message.
     */
    public get errorMsg$(): BehaviorSubject<string | undefined> {
        return this.getErrorMsg$();
    }

    public detectChanges(delayTime?: number, onDone?: () => unknown, checkParentForHostBinding: boolean = false): void {
        this.cancelStoredSubscription('detectChangesDelaySubs');

        if (this.canDetectChanges) {
            const finalDelayTime = delayTime ?? PlatformComponent.defaultDetectChangesDelay;

            if (finalDelayTime <= 0) {
                dispatchChangeDetectionSignal.bind(this)();
            } else {
                const detectChangesDelaySubs = task_delay(() => dispatchChangeDetectionSignal.bind(this)(), finalDelayTime);

                this.storeSubscription('detectChangesDelaySubs', detectChangesDelaySubs);
            }
        }

        function dispatchChangeDetectionSignal(this: PlatformComponent) {
            this.detectChangesThrottleSource.next({
                onDone: onDone,
                checkParentForHostBinding: checkParentForHostBinding
            });
        }
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
        observerOrNext?: PartialObserver<T> | ((value: T) => void),
        outSubscriptionFn?: (subscription: Subscription) => void
    ): MonoTypeOperatorFunction<T> {
        const next = typeof observerOrNext === 'function' ? observerOrNext : observerOrNext?.next;
        const error = typeof observerOrNext === 'function' ? undefined : observerOrNext?.error;
        const complete = typeof observerOrNext === 'function' ? undefined : observerOrNext?.complete;

        return subscribeUntil(
            this.destroyed$.pipe(filter(destroyed => destroyed == true)),
            {
                next: v => {
                    if (next) {
                        next(v);
                        this.detectChanges();
                    }
                },
                error: e => {
                    if (error) {
                        error(e);
                        this.detectChanges();
                    }
                },
                complete: () => {
                    if (complete) {
                        complete();
                        this.detectChanges();
                    }
                }
            },
            outSubscriptionFn
        );
    }

    /**
     * Creates an RxJS operator function that triggers change detection after the observable completes.
     */
    public finalDetectChanges<T>(): MonoTypeOperatorFunction<T> {
        return finalize(() => this.detectChanges());
    }

    public ngOnInit(): void {
        this.detectChangesThrottle$.pipe(this.subscribeUntilDestroyed());

        // SetTimeout to delay action to queue => run after inherit component init logic has been executed
        // so that all property has been initiated => run detectChanges may not show error if some prop has not been initiated
        setTimeout(() => {
            if (this.destroyed$.value) return;

            if (this.autoRunInitOrReloadVmInNgOnInit) {
                const initOrReloadVm$ = this.initOrReloadVm(false);

                if (initOrReloadVm$ != undefined) {
                    initOrReloadVm$.pipe(take(1), this.untilDestroyed()).subscribe({
                        complete: () => {
                            this.isVmLoadedOnce.next(true);
                        }
                    });
                } else {
                    this.isVmLoadedOnce.next(true);
                }
            }

            this.initiated$.next(true);
            this.detectChanges();
        });
        this.ngOnInitCalled$.next(true);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (this.isInputChanged(changes) && this.initiated$.value) {
            this.ngOnInputChanged(changes);
        }
    }

    public ngOnInputChanged(changes: SimpleChanges): void {
        // Default empty here. Override to implement logic
    }

    public ngAfterViewInit(): void {
        this.viewInitiated$.next(true);
        // Handle for case parent input ngTemplate for child onPush component. Child activate change detection on init, then parent init ngTemplate view later
        // but template rendered inside child component => need to trigger change detection again for the template from parent to render
        this.detectChanges();

        if (PLATFORM_CORE_GLOBAL_ENV.isLocalDev && this.ngOnInitCalled$.getValue() == false) {
            const msg = `[DEV-ERROR] Component ${this.elementRef.nativeElement.tagName}: Base Platform Component ngOnInit is not called. Please call super.ngOnInit() in the child component ngOnInit() method or manually ngOnInitCalled$.next(true) in the child component ngOnInit() method`;

            if (PLATFORM_CORE_GLOBAL_ENV.isLocalDev) {
                alert(msg);
                console.error(new Error(msg));
            }
        }
    }

    public ngOnDestroy(): void {
        this.destroyed$.next(true);

        this.destroyAllSubjects();
        this.cancelAllStoredSubscriptions();
    }

    private loadingRequestsCountMap: Dictionary<number> = {};

    /**
     * Returns the total number of active loading requests across all request keys. This method provides a convenient
     * way to track and display the overall loading state of a component by aggregating loading requests from various
     * asynchronous operations.
     *
     * @returns The total number of active loading requests.
     *
     * @usage
     * // Example: Check and display a loading indicator based on the total loading requests count
     * const isLoading = this.loadingRequestsCount() > 0;
     * if (isLoading) {
     *   // Display loading indicator
     * } else {
     *   // Hide loading indicator
     * }
     */
    public loadingRequestsCount() {
        let result = 0;
        Object.keys(this.loadingRequestsCountMap).forEach(key => {
            result += this.loadingRequestsCountMap[key]!;
        });
        return result;
    }

    private reloadingRequestsCountMap: Dictionary<number> = {};

    /**
     * Returns the total number of active reloading requests.
     */
    public reloadingRequestsCount() {
        let result = 0;
        Object.keys(this.reloadingRequestsCountMap).forEach(key => {
            result += this.reloadingRequestsCountMap[key]!;
        });
        return result;
    }

    /**
     * Creates an RxJS operator function that observes and manages the loading state and error state of an observable
     * request. It is designed to be used with Angular components to simplify the handling of loading and error states,
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
    public observerLoadingErrorState<T>(
        requestKey?: string | null,
        options?: PlatformObserverLoadingErrorStateOptions
    ): (source: Observable<T>) => Observable<T> {
        if (requestKey == undefined) requestKey = requestStateDefaultKey;

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
                    this.untilDestroyed(),
                    onCancel(() => {
                        if (!options?.isReloading) this.setLoading(false, requestKey);
                        this.setReloading(false, requestKey);

                        checkSetStatus.bind(this)();
                    }),

                    tapOnce({
                        next: value => {
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
                            this.status$.next(ComponentStateStatus.Error);
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

        function checkSetStatus(this: PlatformComponent) {
            if (this.loadingRequestsCount() > 0) {
                if (this.status$.getValue() != ComponentStateStatus.Loading) this.status$.next(ComponentStateStatus.Loading);
            } else if (this.reloadingRequestsCount() > 0) {
                if (this.status$.getValue() != ComponentStateStatus.Reloading) this.status$.next(ComponentStateStatus.Reloading);
            } else if (this.getErrorMsg() != null && this.getErrorMsg()?.trim() != '') {
                if (this.status$.getValue() != ComponentStateStatus.Error) this.status$.next(ComponentStateStatus.Error);
            } else if (this.status$.getValue() != ComponentStateStatus.Success) this.status$.next(ComponentStateStatus.Success);
        }
    }

    /**
     * Returns an Signal that emits the error message associated with the specified request key or the first existing error message if requestKey is default key if error message with default key is null.
     * * @param [requestKey=requestStateDefaultKey] (optional): A key to identify the request. Default is
     * requestStateDefaultKey.
     */
    public getErrorMsg$(requestKey?: string, excludeKeys?: string[]): BehaviorSubject<string | undefined> {
        if (requestKey == null) requestKey = requestStateDefaultKey;

        const combinedCacheRequestKey = `${requestKey}_excludeKeys:${JSON.stringify(excludeKeys ?? '')}`;

        if (this.cachedErrorMsg$[combinedCacheRequestKey] == null) {
            this.cachedErrorMsg$[combinedCacheRequestKey] = rxjs_mapBehaviorSubject(this.errorMsgMap$, errorMsgMap =>
                this.getErrorMsg(requestKey, excludeKeys)
            );
        }
        return this.cachedErrorMsg$[combinedCacheRequestKey]!;
    }

    /**
     * Returns the error message associated with the specified request key or the first existing error message if requestKey is default key if error message with default key is null.
     * * @param [requestKey=requestStateDefaultKey] (optional): A key to identify the request. Default is
     * requestStateDefaultKey.
     */
    public getErrorMsg(requestKey?: string, excludeKeys?: string[]): string | undefined {
        if (requestKey == null) requestKey = requestStateDefaultKey;
        const excludeKeysSet = excludeKeys != undefined ? new Set(excludeKeys) : undefined;

        if (this.errorMsgMap$.getValue()[requestKey] == null && requestKey == requestStateDefaultKey)
            return Object.keys(this.errorMsgMap$.getValue())
                .filter(key => excludeKeysSet?.has(key) != true)
                .map(key => this.errorMsgMap$.getValue()[key])
                .find(errorMsg => errorMsg != null);

        return this.errorMsgMap$.getValue()[requestKey];
    }

    /**
     * Returns an Signal that emits all error messages combined into a single string.
     */
    public getAllErrorMsgs$(requestKeys?: string[], excludeKeys?: string[]): BehaviorSubject<string | undefined> {
        const combinedCacheRequestKey = `${requestKeys != null ? JSON.stringify(requestKeys) : 'All'}_excludeKeys:${
            excludeKeys != null ? JSON.stringify(excludeKeys) : 'null'
        }`;

        if (this.cachedAllErrorMsgs$[combinedCacheRequestKey] == null) {
            this.cachedAllErrorMsgs$[combinedCacheRequestKey] = rxjs_mapBehaviorSubject(this.errorMsgMap$, errorMsgMap => {
                return list_distinct(
                    keys(errorMsgMap)
                        .map(key => {
                            if ((requestKeys != undefined && !requestKeys.includes(key)) || excludeKeys?.includes(key) == true) return '';
                            return errorMsgMap[key] ?? '';
                        })
                        .filter(msg => msg != null && msg.trim() != '')
                ).join('; ');
            });
        }

        return <BehaviorSubject<string | undefined>>this.cachedAllErrorMsgs$[combinedCacheRequestKey];
    }

    /**
     * Returns an Signal that emits the loading state (true or false) associated with the specified request key.
     * @param [requestKey=requestStateDefaultKey] (optional): A key to identify the request. Default is requestStateDefaultKey.
     */
    public isLoading$(requestKey: string = requestStateDefaultKey): BehaviorSubject<boolean | null> {
        if (this.cachedLoading$[requestKey] == null) {
            this.cachedLoading$[requestKey] = rxjs_mapBehaviorSubject(this.loadingMap$, loadingMap => loadingMap[requestKey]!);
        }
        return this.cachedLoading$[requestKey]!;
    }

    /**
     * Returns the loading state (true or false) associated with the specified request key.
     * @param requestKey (optional): A key to identify the request. Default is requestStateDefaultKey.
     */
    public isLoading(requestKey: string = requestStateDefaultKey): boolean | null {
        return this.loadingMap$.getValue()[requestKey]!;
    }

    /**
     * Returns an Signal that emits the reloading state (true or false) associated with the specified request key.
     * @param [requestKey=requestStateDefaultKey] (optional): A key to identify the request. Default is
     *     requestStateDefaultKey.
     */
    public isReloading$(requestKey: string = requestStateDefaultKey): BehaviorSubject<boolean | null> {
        if (this.cachedReloading$[requestKey] == null) {
            this.cachedReloading$[requestKey] = rxjs_mapBehaviorSubject(this.reloadingMap$, reloadingMap => reloadingMap[requestKey]!);
        }
        return this.cachedReloading$[requestKey]!;
    }

    /**
     * Returns the reloading state (true or false) associated with the specified request key.
     * @param requestKey (optional): A key to identify the request. Default is requestStateDefaultKey.
     */
    public isReloading(requestKey: string = requestStateDefaultKey): boolean | null {
        return this.reloadingMap$.getValue()[requestKey]!;
    }

    /**
     * Creates an RxJS operator function that taps into the source observable to handle next, error, and complete
     * events.
     * @param nextFn A function to handle the next value emitted by the source observable.
     * @param errorFn (optional): A function to handle errors emitted by the source observable.
     * @param completeFn (optional): A function to handle the complete event emitted by the source observable.
     */
    protected tapResponse<T>(
        nextFn?: (next: T) => void,
        errorFn?: (error: PlatformApiServiceErrorResponse | Error) => any,
        completeFn?: () => void
    ): (source: Observable<T>) => Observable<T> {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return tap({
            next: data => {
                try {
                    if (nextFn) {
                        nextFn(data);
                        this.detectChanges();
                    }
                } catch (error) {
                    console.error(error);
                    throw error;
                }
            },
            error: err => {
                if (errorFn) {
                    errorFn(err);
                    this.detectChanges();
                }
            },
            complete: () => {
                if (completeFn) {
                    completeFn();
                    this.detectChanges();
                }
            }
        });
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
     * @param generator - The generator function that defines the effect.
     * @param [options] - An optional object that can contain a throttle time in milliseconds for the effect and a function to handle the effect subscription.
     *
     * @returns - The function that can be used to trigger the effect. The function params including: observableOrValue, isReloading, otherOptions. In otherOptions including: effectSubscriptionHandleFn - a function to handle the effect subscription.
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
                    generator(<OriginType>(<unknown>of(request)), isReloading).pipe(
                        delay(1, asyncScheduler), // (III)
                        applyIf(!options?.notAutoObserveErrorLoadingState, this.observerLoadingErrorState(requestKey, { isReloading: isReloading }))
                    )
                ),
                this.untilDestroyed(),
                share(), // (IV)
                this.subscribeUntilDestroyed(undefined, sub => {
                    if (options?.effectSubscriptionHandleFn != null) options?.effectSubscriptionHandleFn(sub);
                    if (otherOptions?.effectSubscriptionHandleFn != null) otherOptions?.effectSubscriptionHandleFn(sub);
                })
            );
        };

        return (returnFunc as unknown) as ReturnType;
    }

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

    protected get canDetectChanges(): boolean {
        return this.initiated$.value && !this.destroyed$.value;
    }

    /**
     * Stores a subscription using the specified key. The subscription will be unsubscribed when the component is
     * destroyed.
     */
    protected storeSubscription(key: string, subscription: Subscription): void {
        this.storedSubscriptionsMap.set(key, subscription);
    }

    /**
     * Stores a subscription. The subscription will be unsubscribed when the component is destroyed.
     */
    protected storeAnonymousSubscription(subscription: Subscription): void {
        list_remove(this.storedAnonymousSubscriptions, p => p.closed);
        this.storedAnonymousSubscriptions.push(subscription);
    }

    protected cancelStoredSubscription(key: string): void {
        this.storedSubscriptionsMap.get(key)?.unsubscribe();
        this.storedSubscriptionsMap.delete(key);
    }

    /**
     * Sets the error message for a specific request key in the component. This method is commonly used in conjunction
     * with API requests to update the error state associated with a particular request. If the error is a string or
     * `undefined`, it directly updates the error message for the specified request key. If the error is an instance of
     * `PlatformApiServiceErrorResponse` or `Error`, it formats the error message using
     * `PlatformApiServiceErrorResponse.getDefaultFormattedMessage` before updating the error state.
     *
     * @param error The error message, `undefined`, or an instance of `PlatformApiServiceErrorResponse` or `Error`.
     * @param requestKey The key identifying the request. Defaults to `requestStateDefaultKey` if not specified.
     *
     * @example
     * // Set an error message for the default request key
     * setErrorMsg("An error occurred!");
     *
     * // Set an error message for a specific request key
     * setErrorMsg("Custom error message", "customRequestKey");
     *
     * // Set an error message using an instance of PlatformApiServiceErrorResponse
     * const apiError = new PlatformApiServiceErrorResponse(500, "Internal Server Error");
     * setErrorMsg(apiError, "apiRequest");
     *
     * // Set an error message using an instance of Error
     * const genericError = new Error("An unexpected error");
     * setErrorMsg(genericError, "genericRequest");
     */
    protected setErrorMsg = (error: string | undefined | PlatformApiServiceErrorResponse | Error, requestKey: string = requestStateDefaultKey) => {
        if (typeof error == 'string' || error == undefined)
            this.errorMsgMap$.next(
                clone(this.errorMsgMap$.getValue(), _ => {
                    _[requestKey] = <string | undefined>error;
                })
            );
        else
            this.errorMsgMap$.next(
                clone(this.errorMsgMap$.getValue(), _ => {
                    _[requestKey] = PlatformApiServiceErrorResponse.getDefaultFormattedMessage(error);
                })
            );

        if (error instanceof Error) {
            console.error(error);
            this.cacheService.clear();
        }
    };

    /**
     * Clears the error message associated with a specific request key in the component. This method is useful when you
     * want to reset or clear the error state for a particular request, making it useful in scenarios where you want to
     * retry an action or clear errors upon successful completion of a related operation.
     *
     * @param requestKey The key identifying the request. Defaults to `requestStateDefaultKey` if not specified.
     *
     * @example
     * // Clear the error message for the default request key
     * clearErrorMsg();
     *
     * // Clear the error message for a specific request key
     * clearErrorMsg("customRequestKey");
     */
    public clearErrorMsg = (requestKey: string = requestStateDefaultKey) => {
        const currentErrorMsgMap = this.errorMsgMap$.getValue();

        this.errorMsgMap$.next(
            immutableUpdate(
                currentErrorMsgMap,
                p => {
                    delete p[requestKey];
                },
                { updaterNotDeepMutate: true }
            )
        );
    };

    public clearAllErrorMsgs = () => {
        this.errorMsgMap$.next({});
    };

    /**
     * Sets the loading state for the specified request key.
     */
    protected setLoading = (value: boolean | null, requestKey: string = requestStateDefaultKey) => {
        if (this.loadingRequestsCountMap[requestKey] == undefined) this.loadingRequestsCountMap[requestKey] = 0;

        if (value == true) this.loadingRequestsCountMap[requestKey] += 1;
        if (value == false && this.loadingRequestsCountMap[requestKey]! > 0) this.loadingRequestsCountMap[requestKey] -= 1;

        this.loadingMap$.next(
            clone(this.loadingMap$.getValue(), _ => {
                _[requestKey] = this.loadingRequestsCountMap[requestKey]! > 0;
            })
        );
    };

    /**
     * Sets the loading state for the specified request key.
     */
    protected setReloading = (value: boolean | null, requestKey: string = requestStateDefaultKey) => {
        if (this.reloadingRequestsCountMap[requestKey] == undefined) this.reloadingRequestsCountMap[requestKey] = 0;

        if (value == true) this.reloadingRequestsCountMap[requestKey] += 1;
        if (value == false && this.reloadingRequestsCountMap[requestKey]! > 0) this.reloadingRequestsCountMap[requestKey] -= 1;

        this.reloadingMap$.next(
            clone(this.reloadingMap$.getValue(), _ => {
                _[requestKey] = this.reloadingRequestsCountMap[requestKey]! > 0;
            })
        );
    };

    /**
     * Cancels all stored subscriptions, unsubscribing from each one. This method should be called in the component's
     * ngOnDestroy lifecycle hook to ensure that all subscriptions are properly cleaned up when the component is destroyed.
     * This includes both named subscriptions stored using the `storeSubscription` method and anonymous subscriptions
     * stored using the `storeAnonymousSubscription` method.
     */
    public cancelAllStoredSubscriptions(): void {
        // Unsubscribe from all named subscriptions
        this.storedSubscriptionsMap.forEach((value, key) => this.cancelStoredSubscription(key));

        // Unsubscribe from all anonymous subscriptions
        this.cancelAllStoredAnonymousSubscriptions();
    }

    /**
     * Reloads data
     */
    public reload() {
        this.initOrReloadVm(true);
    }

    /**
     * Hook to be implemented by derived classes to provide the initial view model.
     */
    protected abstract initOrReloadVm: (isReload: boolean) => Observable<unknown | undefined> | undefined;

    /**
     * Track-by function for ngFor that uses an immutable list as the tracking target. Use this to improve performance
     * if we know that the list is immutable
     */
    protected ngForTrackByImmutableList<TItem>(trackTargetList: TItem[]): (index: number, item: TItem) => TItem[] {
        return () => trackTargetList;
    }

    /**
     * Track-by function for ngFor that uses a specific property of the item as the tracking key.
     * @param itemPropKey The property key of the item to use as the tracking key.
     */
    protected ngForTrackByItemProp<TItem extends object>(itemPropKey: keyof TItem): (index: number, item: TItem) => unknown {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (index, item) => (<any>item)[itemPropKey];
    }

    protected isInputChanged(changes: SimpleChanges): boolean {
        return LifeCycleHelper.isInputChanged(changes);
    }

    private cancelAllStoredAnonymousSubscriptions() {
        this.storedAnonymousSubscriptions.forEach(sub => sub.unsubscribe());
        this.storedAnonymousSubscriptions = [];
    }

    protected destroyAllSubjects(): void {
        this.initiated$.complete();
        this.viewInitiated$.complete();
        this.destroyed$.complete();
        this.detectChangesThrottleSource.complete();
        this.ngOnInitCalled$.complete();
        this.status$.complete();
        this.errorMsgMap$.complete();
        this.loadingMap$.complete();
        this.reloadingMap$.complete();
        this.isVmLoadedOnce.complete();
    }
}

export interface PlatformObserverLoadingErrorStateOptions {
    isReloading?: boolean;
}

interface DetectChangesParams {
    onDone?: () => any;
    checkParentForHostBinding: boolean;
}

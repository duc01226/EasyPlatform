import { BehaviorSubject, defer, Observable, Subject, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, switchMap, take, takeUntil } from 'rxjs/operators';

import { PlatformApiServiceErrorResponse } from '../../api-services';
import { Dictionary } from '../../common-types';
import { PlatformCommandDto, PlatformQueryDto } from '../../dtos';
import { IPlatformEventManager } from '../../events';
import { PlatformCoreModuleConfig } from '../../platform-core.config';
import { cloneDeep, dictionary_upsert, isDifferent, task_delay } from '../../utils';
import { PlatformRepositoryErrorEvent } from '../events/repository-error.event';
import { PlatformRepositoryContext } from '../platform.repository-context';

/* eslint-disable object-shorthand */

/**
 * Enumeration defining different strategies for loading and caching data in platform repositories.
 *
 * @description
 * This type determines how the repository should handle data loading and caching behavior,
 * providing control over when API calls are made and how cached data is managed.
 *
 * **Strategy Behaviors:**
 * - **loadOnce**: Load data once and cache it indefinitely until explicitly cleared
 * - **implicitReload**: Load from cache if available, but automatically refresh in background
 * - **explicitReload**: Always reload data from source, bypassing any cached versions
 *
 * @example
 * ```typescript
 * // Load user data once and cache it
 * this.getUserData('user-123', 'loadOnce');
 *
 * // Use cached data but refresh in background
 * this.getUserData('user-123', 'implicitReload');
 *
 * // Always fetch fresh data
 * this.getUserData('user-123', 'explicitReload');
 * ```
 */
export type RepoLoadStrategy = 'loadOnce' | 'implicitReload' | 'explicitReload';

/**
 * Abstract base class that provides comprehensive repository functionality for managing
 * data operations, caching, and API integration within the platform's domain layer.
 *
 * @description
 * The `PlatformRepository` implements a sophisticated repository pattern that combines
 * request-scoped caching, reactive data streams, error handling, and subscription management.
 * It serves as the foundation for all domain repositories in the platform architecture.
 *
 * **Core Responsibilities:**
 * - **Data Caching**: Implements intelligent caching with configurable load strategies
 * - **Reactive Streams**: Provides Observable-based data access with real-time updates
 * - **Error Handling**: Standardized error processing and event publication
 * - **Resource Management**: Automatic cleanup of subscriptions and cached data
 * - **API Integration**: Seamless integration with platform API services
 * - **Change Detection**: Optimized update detection to prevent unnecessary re-renders
 *
 * **Architecture Benefits:**
 * - Reduces API calls through intelligent caching
 * - Provides consistent data access patterns across the application
 * - Enables real-time data synchronization between components
 * - Centralizes error handling for repository operations
 * - Supports complex data relationships and dependencies
 *
 * @template TContext - The repository context type that extends PlatformRepositoryContext
 *
 * @example
 * **Basic repository implementation:**
 * ```typescript
 * export class UserRepository extends PlatformRepository<UserRepositoryContext> {
 *   constructor(
 *     moduleConfig: PlatformCoreModuleConfig,
 *     context: UserRepositoryContext,
 *     eventManager: IPlatformEventManager,
 *     private userApiService: UserApiService
 *   ) {
 *     super(moduleConfig, context, eventManager);
 *   }
 *
 *   getUsersData(query: GetUsersQuery): Observable<PlatformPagedResultDto<User>> {
 *     return this.processUpsertData({
 *       repoDataSubject: this.usersSubject,
 *       apiRequestFn: (implicitLoad) => this.userApiService.getUsers(query),
 *       requestName: 'getUsers',
 *       requestPayload: query,
 *       strategy: 'implicitReload',
 *       finalResultBuilder: (repoData, apiResult) => apiResult,
 *       modelDataExtractor: (apiResult) => apiResult.items,
 *       modelIdFn: (user) => user.id,
 *       initModelItemFn: (data) => new User(data)
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced repository with relationships:**
 * ```typescript
 * export class OrderRepository extends PlatformRepository<OrderRepositoryContext> {
 *   private ordersSubject = new BehaviorSubject<Dictionary<Order>>({});
 *   private customersSubject = new BehaviorSubject<Dictionary<Customer>>({});
 *
 *   getOrdersWithCustomers(filter: OrderFilter): Observable<OrderWithCustomerDto[]> {
 *     return this.processUpsertData({
 *       repoDataSubject: this.ordersSubject,
 *       apiRequestFn: (implicitLoad) => this.orderApiService.getOrdersWithCustomers(filter),
 *       requestName: 'getOrdersWithCustomers',
 *       requestPayload: filter,
 *       strategy: 'implicitReload',
 *       finalResultBuilder: (repoData, apiResult) => {
 *         // Transform data and join with customers
 *         return apiResult.items.map(order => ({
 *           ...order,
 *           customer: this.customersSubject.value[order.customerId]
 *         }));
 *       },
 *       modelDataExtractor: (apiResult) => apiResult.items,
 *       modelIdFn: (order) => order.id,
 *       initModelItemFn: (data) => new Order(data),
 *       refreshRelatedRequests: [
 *         { requestName: 'getCustomers', requestPartialPayload: {} }
 *       ]
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * **Repository usage in components:**
 * ```typescript
 * @Component({
 *   selector: 'user-list',
 *   template: `
 *     <div *ngFor="let user of users$ | async">
 *       {{ user.name }} - {{ user.email }}
 *     </div>
 *   `
 * })
 * export class UserListComponent implements OnInit, OnDestroy {
 *   users$: Observable<User[]>;
 *   private destroy$ = new Subject<void>();
 *
 *   constructor(private userRepository: UserRepository) {}
 *
 *   ngOnInit() {
 *     // Subscribe to user data with automatic cleanup
 *     this.users$ = this.userRepository.getUsersData({ activeOnly: true })
 *       .pipe(
 *         map(result => result.items),
 *         takeUntil(this.destroy$)
 *       );
 *   }
 *
 *   ngOnDestroy() {
 *     this.destroy$.next();
 *     this.destroy$.complete();
 *   }
 * }
 * ```
 *
 * @see {@link PlatformRepositoryContext} - Context for request-scoped caching
 * @see {@link PlatformApiService} - API services used by repositories
 * @see {@link PlatformRepositoryErrorEvent} - Error events published by repositories
 * @see {@link RepoLoadStrategy} - Loading strategy enumeration
 *
 * @since 1.0.0
 * @version 1.0.0
 */
export abstract class PlatformRepository<TContext extends PlatformRepositoryContext> {
    /**
     * Creates a new instance of PlatformRepository with the required dependencies.
     *
     * @description
     * This constructor initializes the repository with essential platform services
     * and configuration needed for data operations, caching, and error handling.
     *
     * **Dependency Injection:**
     * All parameters are typically injected by the Angular dependency injection system
     * when the repository is registered as a service in a module.
     *
     * @param moduleConfig - Configuration settings for the platform core module,
     *                      including cache limits and behavior settings
     * @param context - Repository context instance for managing request-scoped data
     *                 and subscription tracking
     * @param eventManager - Event manager for publishing repository errors and other
     *                      domain events to registered handlers
     *
     * @example
     * ```typescript
     * export class ProductRepository extends PlatformRepository<ProductRepositoryContext> {
     *   constructor(
     *     moduleConfig: PlatformCoreModuleConfig,
     *     context: ProductRepositoryContext,
     *     eventManager: IPlatformEventManager,
     *     private productApiService: ProductApiService
     *   ) {
     *     super(moduleConfig, context, eventManager);
     *   }
     * }
     * ```
     *
     * @see {@link PlatformCoreModuleConfig} - Module configuration interface
     * @see {@link PlatformRepositoryContext} - Repository context base class
     * @see {@link IPlatformEventManager} - Event manager interface
     */
    public constructor(
        protected moduleConfig: PlatformCoreModuleConfig,
        protected context: TContext,
        protected eventManager: IPlatformEventManager
    ) {}

    /**
     * Gets the maximum number of cached request data entries allowed per API request name.
     *
     * @description
     * This method retrieves the cache limit configuration that controls how many
     * different cached requests can be maintained for each API endpoint. This helps
     * prevent memory leaks and controls resource usage.
     *
     * **Cache Management:**
     * - When the limit is exceeded, oldest unused cache entries are automatically cleaned up
     * - Each unique combination of request name and parameters counts as a separate entry
     * - Active subscriptions prevent cache entries from being cleaned up
     *
     * @returns The maximum number of cache entries per API request name
     *
     * @example
     * ```typescript
     * // Example: if maxCacheRequestDataPerApiRequestName() returns 10
     * // then for 'getUsers' request name, we can cache up to 10 different
     * // parameter combinations like:
     * // - getUsers_{"activeOnly":true}
     * // - getUsers_{"department":"IT"}
     * // - getUsers_{"role":"admin"}
     * // etc.
     * ```
     *
     * @see {@link clearLoadedRequestDataCacheItem} - Method that uses this limit for cleanup
     */
    protected maxCacheRequestDataPerApiRequestName(): number {
        return this.moduleConfig.maxCacheRequestDataPerApiRequestName;
    }

    /**
     * Core method that orchestrates data loading, caching, and reactive stream management
     * for repository operations with comprehensive upsert functionality.
     *
     * @description
     * This method implements the heart of the repository pattern, providing intelligent
     * data loading strategies, caching mechanisms, and reactive data streams. It handles
     * complex scenarios including data transformation, relationship updates, and subscription
     * management.
     *
     * **Process Flow:**
     * 1. **Strategy Evaluation**: Determines if data should be loaded from cache or API
     * 2. **Cache Management**: Handles cache hits, misses, and refresh strategies
     * 3. **Data Loading**: Executes API calls with error handling and retries
     * 4. **Data Processing**: Transforms and upserts data into repository subjects
     * 5. **Subscription Tracking**: Manages subscriber counts for proper cleanup
     * 6. **Related Updates**: Refreshes dependent data when relationships change
     *
     * **Caching Strategies:**
     * - **loadOnce**: Return cached data immediately, load only if not cached
     * - **implicitReload**: Return cached data, trigger background refresh
     * - **explicitReload**: Always load fresh data from API
     *
     * @template TModel - The domain model type being managed
     * @template TApiResult - The API response type containing the data
     *
     * @param config - Comprehensive configuration object for the operation
     * @param config.repoDataSubject - BehaviorSubject holding the repository's data state
     * @param config.apiRequestFn - Function that executes the API call
     * @param config.requestName - Unique identifier for this type of request
     * @param config.requestPayload - Parameters for the API request
     * @param config.strategy - Loading strategy to use
     * @param config.finalResultBuilder - Function to transform final result
     * @param config.modelDataExtractor - Function to extract model data from API response
     * @param config.modelIdFn - Function to get unique identifier from model
     * @param config.initModelItemFn - Function to initialize model instances
     * @param config.replaceItem - Whether to replace existing items or merge (default: true)
     * @param config.asRequest - Whether to return single value instead of observable stream
     * @param config.refreshRelatedRequests - Related requests to refresh after this operation
     * @param config.optionalProps - Model properties that should be merged instead of replaced
     *
     * @returns Observable stream of the transformed result data
     *
     * @example
     * **Basic data loading:**
     * ```typescript
     * getUserList(filters: UserFilter): Observable<UserListResult> {
     *   return this.processUpsertData({
     *     repoDataSubject: this.usersSubject,
     *     apiRequestFn: (implicitLoad) => this.userApi.getUsers(filters),
     *     requestName: 'getUserList',
     *     requestPayload: filters,
     *     strategy: 'implicitReload',
     *     finalResultBuilder: (repoData, apiResult) => ({
     *       users: apiResult.items,
     *       totalCount: apiResult.totalCount,
     *       filters: filters
     *     }),
     *     modelDataExtractor: (apiResult) => apiResult.items,
     *     modelIdFn: (user) => user.id,
     *     initModelItemFn: (data) => new User(data)
     *   });
     * }
     * ```
     *
     * @example
     * **Complex operation with relationships:**
     * ```typescript
     * getOrdersWithDetails(orderId: string): Observable<OrderDetails> {
     *   return this.processUpsertData({
     *     repoDataSubject: this.ordersSubject,
     *     apiRequestFn: (implicitLoad) => this.orderApi.getOrderDetails(orderId),
     *     requestName: 'getOrderDetails',
     *     requestPayload: { orderId },
     *     strategy: 'loadOnce',
     *     finalResultBuilder: (repoData, apiResult) => {
     *       const order = apiResult.order;
     *       const customer = this.customersSubject.value[order.customerId];
     *       const items = apiResult.items;
     *
     *       return {
     *         order,
     *         customer,
     *         items,
     *         summary: this.calculateOrderSummary(items)
     *       };
     *     },
     *     modelDataExtractor: (apiResult) => [apiResult.order, ...apiResult.items],
     *     modelIdFn: (item) => item.id,
     *     initModelItemFn: (data) => this.createModelInstance(data),
     *     refreshRelatedRequests: [
     *       { requestName: 'getCustomers', requestPartialPayload: {} },
     *       { requestName: 'getInventory', requestPartialPayload: { items: true } }
     *     ]
     *   });
     * }
     * ```
     *
     * @example
     * **Single request (non-streaming):**
     * ```typescript
     * createUser(userData: CreateUserRequest): Observable<User> {
     *   return this.processUpsertData({
     *     repoDataSubject: this.usersSubject,
     *     apiRequestFn: () => this.userApi.createUser(userData),
     *     requestName: 'createUser',
     *     requestPayload: userData,
     *     strategy: 'explicitReload',
     *     asRequest: true, // Returns single value, not stream
     *     finalResultBuilder: (repoData, apiResult) => apiResult.user,
     *     modelDataExtractor: (apiResult) => [apiResult.user],
     *     modelIdFn: (user) => user.id,
     *     initModelItemFn: (data) => new User(data),
     *     refreshRelatedRequests: [
     *       { requestName: 'getUserList', requestPartialPayload: {} }
     *     ]
     *   });
     * }
     * ```
     *
     * @see {@link RepoLoadStrategy} - Available loading strategies
     * @see {@link upsertData} - Method for updating repository data
     * @see {@link handleApiError} - Error handling for API failures
     */
    protected processUpsertData<TModel, TApiResult>(config: {
        repoDataSubject: BehaviorSubject<Dictionary<TModel>>;
        apiRequestFn: (implicitLoad: boolean) => Observable<TApiResult>;
        requestName: string;
        requestPayload: PlatformQueryDto | PlatformCommandDto;
        strategy: RepoLoadStrategy;
        finalResultBuilder: (repoData: Dictionary<TModel>, apiResult: TApiResult) => TApiResult;
        modelDataExtractor: (apiResult: TApiResult) => TModel[];
        modelIdFn: (item: TModel | Partial<TModel>) => string | number | undefined | null;
        initModelItemFn: (data: TModel | Partial<TModel>) => TModel;
        replaceItem?: boolean;
        asRequest?: boolean;
        refreshRelatedRequests?: {
            requestName: string;
            requestPartialPayload: PlatformQueryDto | PlatformCommandDto;
        }[];
        optionalProps?: (keyof TModel)[];
    }): Observable<TApiResult> {
        const {
            repoDataSubject,
            apiRequestFn,
            requestName,
            requestPayload,
            strategy,
            finalResultBuilder,
            modelDataExtractor,
            modelIdFn,
            initModelItemFn,
            asRequest,
            refreshRelatedRequests
        } = config;
        const replaceItem = config.replaceItem ?? true;
        const optionalProps = config.optionalProps ?? [];

        const requestId = this.buildRequestId(requestName, requestPayload);
        const stopRefreshNotifier$ = new Subject();
        const refreshDataFn = () => {
            apiRequestFn(true)
                .pipe(takeUntil(stopRefreshNotifier$))
                .subscribe({
                    next: apiResult => {
                        this.updateNewRequestData<TModel, TApiResult>({
                            requestId,
                            apiResult,
                            repoDataSubject,
                            modelDataExtractor,
                            modelIdFn,
                            initModelItemFn,
                            replaceItem: replaceItem,
                            optionalProps: optionalProps
                        });
                        if (refreshRelatedRequests != null) {
                            refreshRelatedRequests.forEach(p =>
                                this.processRefreshData({
                                    requestName: p.requestName,
                                    requestPayload: p.requestPartialPayload
                                })
                            );
                        }
                    },
                    error: error => {
                        this.handleApiError(error, requestName, requestPayload);
                    }
                });
        };
        const returnDataObsFn = () =>
            defer(() => {
                if (this.context.loadedRequestSubscriberCountDic[requestId] != null) {
                    this.context.loadedRequestSubscriberCountDic[requestId] += 1;
                } else {
                    this.context.loadedRequestSubscriberCountDic[requestId] = 1;
                }

                let resultObs = repoDataSubject.asObservable().pipe(
                    map(repoData => {
                        const cachedRequestData = <TApiResult>this.context.loadedRequestDataDic[requestId];
                        return finalResultBuilder(repoData, cloneDeep(cachedRequestData));
                    }),
                    distinctUntilChanged((x, y) => !isDifferent(x, y)),
                    map(x => cloneDeep(x))
                );
                if (asRequest) {
                    resultObs = resultObs.pipe(take(1));
                }
                return resultObs.pipe(
                    finalize(() => {
                        stopRefreshNotifier$.next(null);
                        this.context.loadedRequestSubscriberCountDic[requestId]! -= 1;
                        this.clearLoadedRequestDataCacheItem(requestName);
                    })
                );
            });

        this.context.loadedRequestRefreshFnDic[requestId] = refreshDataFn;

        const cachedRequestApiResult = this.context.loadedRequestDataDic[requestId];
        if (cachedRequestApiResult == null || strategy === 'explicitReload' || (asRequest && strategy !== 'loadOnce')) {
            return apiRequestFn(false).pipe(
                catchError(error => this.catchApiError(error, requestName, requestPayload)),
                switchMap(apiResult => {
                    this.updateNewRequestData<TModel, TApiResult>({
                        requestId,
                        apiResult,
                        repoDataSubject,
                        modelDataExtractor,
                        modelIdFn,
                        initModelItemFn,
                        replaceItem: replaceItem,
                        optionalProps: optionalProps
                    });
                    if (refreshRelatedRequests != null) {
                        refreshRelatedRequests.forEach(p =>
                            this.processRefreshData({
                                requestName: p.requestName,
                                requestPayload: p.requestPartialPayload
                            })
                        );
                    }
                    return returnDataObsFn();
                })
            );
        }
        if (strategy === 'implicitReload') {
            refreshDataFn();
            return returnDataObsFn();
        }

        return returnDataObsFn();
    }

    /**
     * Handles API errors by publishing repository error events for centralized error processing.
     *
     * @description
     * This method provides standardized error handling for repository operations by converting
     * API service errors into domain events that can be handled by registered error handlers.
     * This enables consistent error processing, logging, and user notification across the application.
     *
     * **Error Flow:**
     * 1. Validates that the error is a PlatformApiServiceErrorResponse
     * 2. Creates a PlatformRepositoryErrorEvent with context information
     * 3. Publishes the event through the event manager
     * 4. Error handlers can then process the event for logging, notifications, etc.
     *
     * @param error - The API service error response to handle
     * @param requestName - Name of the request that caused the error
     * @param requestPayload - Parameters that were sent with the failed request
     *
     * @example
     * ```typescript
     * // Example usage in a repository method
     * private async loadUserData(userId: string): Promise<User> {
     *   try {
     *     return await this.userApiService.getUser(userId);
     *   } catch (error) {
     *     this.handleApiError(error, 'getUser', { userId });
     *     throw error;
     *   }
     * }
     * ```
     *
     * @example
     * **Error handler registration:**
     * ```typescript
     * // Register error handler in module
     * @NgModule({
     *   imports: [
     *     PlatformDomainModule.forRoot({
     *       appRepositoryErrorEventHandlers: [UserRepositoryErrorHandler]
     *     })
     *   ]
     * })
     * export class UserModule { }
     *
     * // Error handler implementation
     * @Injectable()
     * export class UserRepositoryErrorHandler extends PlatformRepositoryErrorEventHandler {
     *   handle(event: PlatformRepositoryErrorEvent): void {
     *     if (event.requestName === 'getUser') {
     *       this.notificationService.showError('Failed to load user data');
     *       this.analyticsService.trackError('user_load_failure', event.error);
     *     }
     *   }
     * }
     * ```
     *
     * @see {@link PlatformRepositoryErrorEvent} - Error event class
     * @see {@link PlatformApiServiceErrorResponse} - API error response type
     * @see {@link catchApiError} - Method that calls this for observable error handling
     */
    protected handleApiError(error: PlatformApiServiceErrorResponse, requestName: string, requestPayload: PlatformQueryDto | PlatformCommandDto) {
        if (error instanceof PlatformApiServiceErrorResponse) {
            this.eventManager.publish(new PlatformRepositoryErrorEvent(requestName, requestPayload, error));
        }
    }

    /**
     * Handles API errors in reactive streams by calling handleApiError and rethrowing the error.
     *
     * @description
     * This method provides error handling specifically for RxJS observable streams,
     * ensuring that errors are properly processed through the platform's error handling
     * system while still allowing the error to propagate through the observable chain.
     *
     * **Usage Pattern:**
     * This method is typically used in the catchError operator of RxJS observable pipelines
     * to ensure consistent error handling while maintaining the reactive error flow.
     *
     * @param error - The API service error response to handle
     * @param requestName - Name of the request that caused the error
     * @param requestPayload - Parameters that were sent with the failed request
     *
     * @returns An observable that immediately errors with the original error
     *
     * @example
     * ```typescript
     * getUserData(userId: string): Observable<User> {
     *   return this.userApiService.getUser(userId).pipe(
     *     catchError(error => this.catchApiError(error, 'getUser', { userId })),
     *     map(user => new User(user))
     *   );
     * }
     * ```
     *
     * @see {@link handleApiError} - Base error handling method
     * @see {@link processUpsertData} - Method that uses this for error handling
     */
    protected catchApiError(error: PlatformApiServiceErrorResponse, requestName: string, requestPayload: PlatformQueryDto | PlatformCommandDto) {
        this.handleApiError(error, requestName, requestPayload);
        return throwError(() => error);
    }

    /**
     * Refreshes cached request data with configurable delay and filtering capabilities.
     *
     * @description
     * This method provides a mechanism to trigger refresh of cached data based on request
     * name patterns. It's commonly used when related data changes and dependent cached
     * requests need to be updated to maintain data consistency.
     *
     * **Refresh Logic:**
     * 1. Builds request ID pattern from request name and payload
     * 2. Finds all cached requests that match the pattern
     * 3. Executes refresh functions for matching requests after specified delay
     * 4. Supports partial payload matching for flexible refresh targeting
     *
     * **Use Cases:**
     * - Refresh user data after profile updates
     * - Update order lists after new order creation
     * - Sync related data after dependency changes
     * - Invalidate cached searches after data modifications
     *
     * @param options - Configuration for the refresh operation
     * @param options.requestName - Name of the request type to refresh
     * @param options.requestPayload - Optional payload to match specific cached requests
     * @param options.delayTime - Delay in milliseconds before executing refresh (default: 500)
     *
     * @example
     * **Refresh user data after profile update:**
     * ```typescript
     * async updateUserProfile(userId: string, profile: UserProfile): Promise<void> {
     *   await this.userApiService.updateProfile(userId, profile);
     *
     *   // Refresh all cached user requests
     *   this.processRefreshData({
     *     requestName: 'getUserData',
     *     delayTime: 200
     *   });
     *
     *   // Refresh specific user's cached data
     *   this.processRefreshData({
     *     requestName: 'getUserData',
     *     requestPayload: { userId },
     *     delayTime: 200
     *   });
     * }
     * ```
     *
     * @example
     * **Refresh after order creation:**
     * ```typescript
     * createOrder(orderData: CreateOrderRequest): Observable<Order> {
     *   return this.orderApiService.createOrder(orderData).pipe(
     *     tap(newOrder => {
     *       // Refresh order lists and customer data
     *       this.processRefreshData({
     *         requestName: 'getOrderList',
     *         delayTime: 300
     *       });
     *
     *       this.processRefreshData({
     *         requestName: 'getCustomerOrders',
     *         requestPayload: { customerId: newOrder.customerId },
     *         delayTime: 300
     *       });
     *     })
     *   );
     * }
     * ```
     *
     * @see {@link buildRequestId} - Method for creating request ID patterns
     * @see {@link task_delay} - Utility function for delayed execution
     */
    protected processRefreshData(options: { requestName: string; requestPayload?: PlatformQueryDto | PlatformCommandDto; delayTime?: number }): void {
        const delayTime = options.delayTime ?? 500;

        task_delay(() => {
            const requestId = this.buildRequestId(options.requestName, options.requestPayload);
            const requestIdPrefix = requestId.endsWith(']') ? requestId.slice(0, requestId.length - 1) : requestId;
            Object.keys(this.context.loadedRequestRefreshFnDic).forEach(key => {
                if (key.startsWith(requestIdPrefix)) {
                    this.context.loadedRequestRefreshFnDic[key]!();
                }
            });
        }, delayTime);
    }

    /**
     * Clears refresh data request functions from the repository context cache.
     *
     * @description
     * This method removes cached refresh functions for requests matching the specified
     * name and payload pattern. It's used for cleanup operations when certain cached
     * data is no longer needed or when preparing for application shutdown.
     *
     * **Cleanup Process:**
     * 1. Builds request ID pattern from name and payload
     * 2. Finds all matching refresh function entries
     * 3. Removes the refresh functions from the context cache
     * 4. Prevents memory leaks from abandoned refresh handlers
     *
     * @param requestName - Name of the request type to clear
     * @param requestPartialPayload - Optional partial payload to match specific requests
     *
     * @example
     * ```typescript
     * // Clear all user-related refresh functions
     * this.processClearRefreshDataRequest('getUserData');
     *
     * // Clear specific user's refresh functions
     * this.processClearRefreshDataRequest('getUserData', { userId: 'user-123' });
     * ```
     *
     * @see {@link processRefreshData} - Method that creates the refresh functions
     * @see {@link buildRequestId} - Method for creating request ID patterns
     */
    protected processClearRefreshDataRequest(requestName: string, requestPartialPayload?: PlatformQueryDto | PlatformCommandDto): void {
        const requestId = this.buildRequestId(requestName, requestPartialPayload);
        const requestIdPrefix = requestId.endsWith(']') ? requestId.slice(0, requestId.length - 1) : requestId;
        Object.keys(this.context.loadedRequestRefreshFnDic).forEach(key => {
            if (key.startsWith(requestIdPrefix)) {
                delete this.context.loadedRequestRefreshFnDic[key];
            }
        });
    }

    /**
     * Updates repository data using an upsert pattern with optimized change detection and notification.
     *
     * @description
     * This method provides a high-performance way to update repository data by intelligently
     * merging new data with existing cached data. It uses dictionary-based operations for
     * efficient lookups and supports both replace and merge strategies for data updates.
     *
     * **Upsert Logic:**
     * - **Insert**: Adds new items that don't exist in the current data set
     * - **Update**: Modifies existing items based on their unique identifiers
     * - **Merge**: Combines properties from new data with existing data
     * - **Replace**: Completely replaces existing items with new data
     *
     * **Performance Optimizations:**
     * - Uses dictionary structures for O(1) lookups
     * - Implements efficient change detection
     * - Minimizes unnecessary subject notifications
     * - Supports partial property updates via optional props
     *
     * @template TModel - The domain model type being managed
     *
     * @param dataSubject - BehaviorSubject containing the current data state
     * @param data - Array of new or updated model data
     * @param modelIdFn - Function to extract unique identifier from model instances
     * @param initModelItemFn - Function to initialize/construct model instances
     * @param replaceItem - Whether to replace existing items completely (default: false)
     * @param onDataChanged - Optional callback executed when data changes are detected
     * @param optionalProps - Array of property names that should be merged instead of replaced
     *
     * @returns The updated dictionary of model data
     *
     * @example
     * **Basic user data upsert:**
     * ```typescript
     * private usersSubject = new BehaviorSubject<Dictionary<User>>({});
     *
     * updateUsers(newUsers: User[]): void {
     *   this.upsertData(
     *     this.usersSubject,
     *     newUsers,
     *     user => user.id,
     *     data => new User(data),
     *     false, // Merge with existing data
     *     updatedData => {
     *       console.log(`Updated ${Object.keys(updatedData).length} users`);
     *     }
     *   );
     * }
     * ```
     *
     * @example
     * **Product inventory with optional properties:**
     * ```typescript
     * updateProductInventory(products: Product[]): void {
     *   this.upsertData(
     *     this.productsSubject,
     *     products,
     *     product => product.sku,
     *     data => new Product(data),
     *     false,
     *     undefined,
     *     ['description', 'images', 'reviews'] // These props will be merged, not replaced
     *   );
     * }
     * ```
     *
     * @example
     * **Complete replacement scenario:**
     * ```typescript
     * refreshCompleteDataSet(freshData: Order[]): void {
     *   this.upsertData(
     *     this.ordersSubject,
     *     freshData,
     *     order => order.id,
     *     data => new Order(data),
     *     true, // Replace existing items completely
     *     () => {
     *       this.analyticsService.track('orders_refreshed', freshData.length);
     *     }
     *   );
     * }
     * ```
     *
     * @see {@link dictionary_upsert} - Utility function that performs the actual upsert operation
     * @see {@link processUpsertData} - Method that calls this for API data integration
     */
    protected upsertData<TModel>(
        dataSubject: BehaviorSubject<Dictionary<TModel>>,
        data: (TModel | Partial<TModel>)[],
        modelIdFn: (item: TModel | Partial<TModel>) => string | number | undefined | null,
        initModelItemFn: (data: TModel | Partial<TModel>) => TModel,
        replaceItem: boolean = false,
        onDataChanged?: (newState: Dictionary<TModel>) => void,
        optionalProps: (keyof TModel)[] = []
    ): Dictionary<TModel> {
        return dictionary_upsert(
            dataSubject.getValue(),
            data,
            item => modelIdFn(item) ?? '',
            x => initModelItemFn(x),
            undefined,
            undefined,
            replaceItem,
            onDataChanged ?? (x => dataSubject.next(x)),
            optionalProps
        );
    }

    /**
     * Updates cached request data and detects if changes have occurred.
     *
     * @description
     * This private method handles the updating of cached API response data and performs
     * efficient change detection to determine if the cached data has actually changed.
     * This is crucial for optimization as it prevents unnecessary reactive updates.
     *
     * **Change Detection:**
     * - Performs deep comparison between existing and new data
     * - Updates cache only if actual differences are detected
     * - Returns boolean indicating whether changes occurred
     * - Uses cloning to prevent reference-based mutations
     *
     * @template TApiResult - The API response type being cached
     *
     * @param requestId - Unique identifier for the cached request
     * @param apiResult - New API response data to cache
     *
     * @returns True if the data changed and cache was updated, false otherwise
     *
     * @private
     * @internal
     */
    private updateCachedRequestData<TApiResult>(requestId: string, apiResult: TApiResult): boolean {
        if (isDifferent(this.context.loadedRequestDataDic[requestId], apiResult)) {
            this.context.loadedRequestDataDic[requestId] = cloneDeep(apiResult);
            return true;
        }
        return false;
    }

    /**
     * Builds a unique request identifier from request name and payload parameters.
     *
     * @description
     * This private method creates deterministic identifiers for caching requests
     * based on the request name and its parameters. The identifier is used as a
     * key for caching both the request data and its refresh functions.
     *
     * **ID Format:**
     * - Without payload: `requestName`
     * - With payload: `requestName_{"param1":"value1","param2":"value2"}`
     * - JSON serialization ensures consistent ordering and format
     *
     * @param requestName - Name of the request/operation
     * @param requestPayload - Optional parameters for the request
     *
     * @returns Unique string identifier for the request
     *
     * @private
     * @internal
     *
     * @example
     * ```typescript
     * // Examples of generated request IDs:
     * buildRequestId('getUsers')
     * // Returns: "getUsers"
     *
     * buildRequestId('getUsers', { activeOnly: true, department: 'IT' })
     * // Returns: "getUsers_{"activeOnly":true,"department":"IT"}"
     * ```
     */
    private buildRequestId(requestName: string, requestPayload?: PlatformQueryDto | PlatformCommandDto): string {
        return `${requestName}${requestPayload != null ? `_${JSON.stringify(requestPayload)}` : ''}`;
    }

    /**
     * Updates both cached request data and repository subject data in a coordinated manner.
     *
     * @description
     * This private method orchestrates the updating of both the raw API response cache
     * and the processed model data in repository subjects. It ensures that both caches
     * remain synchronized and triggers reactive updates only when actual changes occur.
     *
     * **Update Process:**
     * 1. Updates cached API response data and checks for changes
     * 2. Extracts and processes model data from the API response
     * 3. Upserts the processed data into the repository subject
     * 4. Triggers subject notification only if changes were detected
     * 5. Maintains consistency between raw and processed data caches
     *
     * @template TModel - The domain model type
     * @template TApiResult - The API response type
     *
     * @param config - Configuration object containing all necessary parameters
     *
     * @private
     * @internal
     */
    private updateNewRequestData<TModel, TApiResult>(config: {
        requestId: string;
        apiResult: TApiResult;
        repoDataSubject: BehaviorSubject<Dictionary<TModel>>;
        modelDataExtractor: (apiResult: TApiResult) => TModel[];
        modelIdFn: (item: TModel | Partial<TModel>) => string | number | undefined | null;
        initModelItemFn: (data: TModel | Partial<TModel>) => TModel;
        replaceItem: boolean;
        optionalProps: (keyof TModel)[];
    }): void {
        const { requestId, apiResult, repoDataSubject, modelDataExtractor, modelIdFn, initModelItemFn, replaceItem, optionalProps } = config;

        let hasChanged = this.updateCachedRequestData<TApiResult>(requestId, apiResult);
        const newData = this.upsertData(
            repoDataSubject,
            modelDataExtractor(apiResult),
            modelIdFn,
            initModelItemFn,
            replaceItem,
            () => {
                hasChanged = true;
            },
            optionalProps
        );
        if (hasChanged) {
            repoDataSubject.next(newData);
        }
    }

    /**
     * Cleans up cached request data entries when subscriber count reaches zero.
     *
     * @description
     * This private method implements automatic cache cleanup to prevent memory leaks
     * and control memory usage. It removes the oldest unused cached entries when
     * the number of cached requests for a given request name exceeds the configured limit.
     *
     * **Cleanup Logic:**
     * 1. Identifies requests with zero subscribers for the given request name
     * 2. Removes oldest entries when count exceeds the configured maximum
     * 3. Preserves active subscriptions from cleanup
     * 4. Maintains cache efficiency and prevents memory bloat
     *
     * **Memory Management:**
     * - Only affects requests with zero active subscribers
     * - Uses FIFO (First In, First Out) cleanup strategy
     * - Respects the maxCacheRequestDataPerApiRequestName configuration
     * - Clears both data and refresh function caches
     *
     * @param startWithRequestName - Prefix to identify related cached requests
     *
     * @private
     * @internal
     *
     * @see {@link maxCacheRequestDataPerApiRequestName} - Configuration for cache limits
     * @see {@link PlatformRepositoryContext.clearLoadedRequestInfo} - Method used for cleanup
     */
    private clearLoadedRequestDataCacheItem(startWithRequestName: string): void {
        const noSubscriberRequests = Object.keys(this.context.loadedRequestDataDic).filter(
            key => key.startsWith(startWithRequestName) && this.context.loadedRequestSubscriberCountDic[key]! <= 0
        );

        while (noSubscriberRequests.length > this.maxCacheRequestDataPerApiRequestName()) {
            const oldestRequestKey = <string>noSubscriberRequests.shift();
            this.context.clearLoadedRequestInfo(oldestRequestKey);
        }
    }
}

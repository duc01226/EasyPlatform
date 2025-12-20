import { Dictionary } from '../common-types/index';

/**
 * Abstract base class that provides a centralized context for managing request-scoped data caching
 * and resource cleanup in the platform's domain layer repository pattern.
 *
 * @description
 * The `PlatformRepositoryContext` serves as a foundational infrastructure component that enables
 * efficient request-level caching and subscription management for repository operations. This class
 * implements a pattern where multiple repositories can share cached data and coordinate resource
 * cleanup within the scope of a single request or operation.
 *
 * **Core Responsibilities:**
 * - **Request-scoped caching**: Stores loaded data to prevent redundant API calls or database queries
 * - **Subscription management**: Tracks active subscribers to cached data for proper cleanup
 * - **Resource coordination**: Provides refresh mechanisms for invalidating and reloading cached data
 * - **Memory management**: Enables cleanup of cached resources when they're no longer needed
 *
 * **Architecture Pattern:**
 * This context follows the Repository pattern combined with a request-scoped cache to:
 * - Reduce API calls and database queries within a single operation
 * - Share data between multiple repositories working on the same request
 * - Provide a clean abstraction for resource lifecycle management
 * - Enable efficient subscription-based data invalidation
 *
 * @example
 * **Basic repository context implementation:**
 * ```typescript
 * export class UserManagementRepositoryContext extends PlatformRepositoryContext {
 *   constructor(
 *     private apiService: UserApiService,
 *     private profileService: ProfileApiService
 *   ) {
 *     super();
 *   }
 *
 *   // Load user data with caching
 *   async getUserData(userId: string): Promise<User> {
 *     const cacheKey = `user-${userId}`;
 *
 *     if (!this.loadedRequestDataDic[cacheKey]) {
 *       this.loadedRequestDataDic[cacheKey] = await this.apiService.getUser(userId);
 *       this.loadedRequestRefreshFnDic[cacheKey] = () =>
 *         this.apiService.getUser(userId).then(data =>
 *           this.loadedRequestDataDic[cacheKey] = data
 *         );
 *     }
 *
 *     this.loadedRequestSubscriberCountDic[cacheKey] =
 *       (this.loadedRequestSubscriberCountDic[cacheKey] || 0) + 1;
 *
 *     return this.loadedRequestDataDic[cacheKey] as User;
 *   }
 * }
 * ```
 *
 * @example
 * **Repository context usage in Angular modules:**
 * ```typescript
 * // Module configuration with repository context
 * @NgModule({
 *   imports: [
 *     PlatformDomainModule.forChild({
 *       appModuleRepositoryContext: UserManagementRepositoryContext,
 *       appModuleRepositories: [
 *         UserRepository,
 *         ProfileRepository,
 *         PermissionsRepository
 *       ],
 *       appModuleApis: [
 *         UserApiService,
 *         ProfileApiService
 *       ]
 *     })
 *   ]
 * })
 * export class UserManagementModule { }
 * ```
 *
 * @example
 * **Advanced caching with subscription management:**
 * ```typescript
 * export class ReportingRepositoryContext extends PlatformRepositoryContext {
 *   // Subscribe to cached report data
 *   subscribeToReport(reportId: string, callback: (data: Report) => void): () => void {
 *     const cacheKey = `report-${reportId}`;
 *
 *     // Load data if not cached
 *     if (!this.loadedRequestDataDic[cacheKey]) {
 *       this.loadReportData(reportId);
 *     }
 *
 *     // Increment subscriber count
 *     this.loadedRequestSubscriberCountDic[cacheKey] =
 *       (this.loadedRequestSubscriberCountDic[cacheKey] || 0) + 1;
 *
 *     // Set up subscription
 *     const subscription = this.watchData(cacheKey, callback);
 *
 *     // Return unsubscribe function
 *     return () => {
 *       subscription.unsubscribe();
 *       this.loadedRequestSubscriberCountDic[cacheKey]--;
 *
 *       // Clean up if no more subscribers
 *       if (this.loadedRequestSubscriberCountDic[cacheKey] === 0) {
 *         this.clearLoadedRequestInfo(cacheKey);
 *       }
 *     };
 *   }
 * }
 * ```
 *
 * @see {@link PlatformRepository} - Repository implementations that use this context
 * @see {@link PlatformDomainModule} - Module configuration for repository contexts
 * @see {@link PlatformApiService} - API services that work with repository contexts
 *
 * @since 1.0.0
 * @version 1.0.0
 */
export abstract class PlatformRepositoryContext {
    /**
     * Dictionary that stores cached data for loaded requests, indexed by cache keys.
     *
     * @description
     * This dictionary serves as the primary cache storage for request-scoped data. Each entry
     * represents data that has been loaded from an external source (API, database, etc.) and
     * is being held in memory to avoid redundant fetches within the same request context.
     *
     * **Key Structure:**
     * - Keys should be unique identifiers that represent the specific data being cached
     * - Common patterns: `"entity-${id}"`, `"list-${filterHash}"`, `"user-${userId}-profile"`
     * - Keys should be deterministic to ensure cache hits for identical requests
     *
     * **Value Types:**
     * - Can store any type of data: entities, arrays, primitives, or complex objects
     * - Typically stores the direct result of API calls or computed data
     * - Values should be immutable or handled carefully to prevent unintended mutations
     *
     * @example
     * ```typescript
     * // Store user data
     * this.loadedRequestDataDic['user-123'] = {
     *   id: '123',
     *   name: 'John Doe',
     *   email: 'john@example.com'
     * };
     *
     * // Store filtered list
     * this.loadedRequestDataDic['users-active'] = [
     *   { id: '1', name: 'Alice' },
     *   { id: '2', name: 'Bob' }
     * ];
     * ```
     *
     * @see {@link loadedRequestRefreshFnDic} - Associated refresh functions for cached data
     * @see {@link loadedRequestSubscriberCountDic} - Subscriber counts for cached data
     */
    public loadedRequestDataDic: Dictionary<unknown> = {};

    /**
     * Dictionary that stores refresh functions for cached data, enabling cache invalidation and reloading.
     *
     * @description
     * This dictionary maintains refresh functions that can be called to reload data when cache
     * invalidation is needed. Each function corresponds to a cached data entry and knows how to
     * fetch fresh data from the original source.
     *
     * **Function Characteristics:**
     * - Functions should be parameterless and return void or Promise<void>
     * - They should update the corresponding entry in `loadedRequestDataDic`
     * - Functions should handle errors gracefully and maintain cache consistency
     * - They should preserve the same cache key when updating data
     *
     * **Use Cases:**
     * - Manual cache refresh when data becomes stale
     * - Automatic refresh on data mutations
     * - Periodic refresh for time-sensitive data
     * - Error recovery by retrying failed data loads
     *
     * @example
     * ```typescript
     * // Set up refresh function for user data
     * this.loadedRequestRefreshFnDic['user-123'] = async () => {
     *   try {
     *     const freshData = await this.userApi.getUser('123');
     *     this.loadedRequestDataDic['user-123'] = freshData;
     *     this.notifySubscribers('user-123', freshData);
     *   } catch (error) {
     *     console.error('Failed to refresh user data:', error);
     *     // Optionally remove stale data or keep it
     *   }
     * };
     *
     * // Trigger refresh
     * await this.loadedRequestRefreshFnDic['user-123']?.();
     * ```
     *
     * @see {@link loadedRequestDataDic} - The cached data that these functions refresh
     * @see {@link clearLoadedRequestInfo} - Method that cleans up refresh functions
     */
    public loadedRequestRefreshFnDic: Dictionary<() => void> = {};

    /**
     * Dictionary that tracks the number of active subscribers for each cached data entry.
     *
     * @description
     * This dictionary maintains reference counts for cached data, enabling proper resource
     * management and cleanup. When multiple components or services access the same cached
     * data, this counter ensures the cache is only cleaned up when all subscribers have
     * finished using the data.
     *
     * **Reference Counting Pattern:**
     * - Increment count when a new subscriber accesses cached data
     * - Decrement count when a subscriber no longer needs the data
     * - Clean up cache entries when count reaches zero
     * - Prevents premature cleanup of actively used data
     *
     * **Lifecycle Management:**
     * - Used to determine when cached data is safe to remove
     * - Helps prevent memory leaks by tracking active usage
     * - Enables automatic cleanup of unused cache entries
     * - Supports subscription-based data access patterns
     *
     * @example
     * ```typescript
     * // Subscribe to cached data
     * subscribeToUserData(userId: string): () => void {
     *   const cacheKey = `user-${userId}`;
     *
     *   // Increment subscriber count
     *   this.loadedRequestSubscriberCountDic[cacheKey] =
     *     (this.loadedRequestSubscriberCountDic[cacheKey] || 0) + 1;
     *
     *   // Return unsubscribe function
     *   return () => {
     *     this.loadedRequestSubscriberCountDic[cacheKey]--;
     *
     *     // Clean up if no more subscribers
     *     if (this.loadedRequestSubscriberCountDic[cacheKey] === 0) {
     *       this.clearLoadedRequestInfo(cacheKey);
     *     }
     *   };
     * }
     * ```
     *
     * @see {@link clearLoadedRequestInfo} - Method that resets subscriber counts during cleanup
     */
    public loadedRequestSubscriberCountDic: Dictionary<number> = {};

    /**
     * Removes all cached information associated with a specific cache key, including data,
     * refresh functions, and subscriber counts.
     *
     * @description
     * This method provides a clean way to remove cached data and all associated metadata
     * when it's no longer needed. It ensures that all related dictionaries are properly
     * cleaned up to prevent memory leaks and stale data issues.
     *
     * **Cleanup Operations:**
     * - Removes cached data from `loadedRequestDataDic`
     * - Removes refresh function from `loadedRequestRefreshFnDic`
     * - Resets subscriber count in `loadedRequestSubscriberCountDic`
     * - Ensures complete cleanup of all related resources
     *
     * **When to Use:**
     * - When all subscribers have unsubscribed from cached data
     * - During component destruction or module cleanup
     * - When data becomes permanently stale or invalid
     * - As part of error recovery procedures
     * - During memory optimization or cache size management
     *
     * @param key - The cache key identifying the data to be cleared. This should match
     *              the key used when originally storing the data in the cache dictionaries.
     *
     * @example
     * ```typescript
     * // Clear specific user data
     * this.clearLoadedRequestInfo('user-123');
     *
     * // Clear filtered results
     * this.clearLoadedRequestInfo('users-department-IT');
     *
     * // Clear all cached data (in cleanup method)
     * Object.keys(this.loadedRequestDataDic).forEach(key => {
     *   this.clearLoadedRequestInfo(key);
     * });
     * ```
     *
     * @example
     * ```typescript
     * // Usage in subscription cleanup
     * class UserRepository extends PlatformRepository<UserRepositoryContext> {
     *   unsubscribeFromUser(userId: string): void {
     *     const cacheKey = `user-${userId}`;
     *
     *     // Decrement subscriber count
     *     if (this.context.loadedRequestSubscriberCountDic[cacheKey]) {
     *       this.context.loadedRequestSubscriberCountDic[cacheKey]--;
     *
     *       // Clean up if no more subscribers
     *       if (this.context.loadedRequestSubscriberCountDic[cacheKey] === 0) {
     *         this.context.clearLoadedRequestInfo(cacheKey);
     *       }
     *     }
     *   }
     * }
     * ```
     *
     * @see {@link loadedRequestDataDic} - The cached data dictionary that gets cleaned up
     * @see {@link loadedRequestRefreshFnDic} - The refresh functions dictionary that gets cleaned up
     * @see {@link loadedRequestSubscriberCountDic} - The subscriber counts dictionary that gets cleaned up
     *
     * @since 1.0.0
     */
    public clearLoadedRequestInfo(key: string) {
        delete this.loadedRequestDataDic[key];
        delete this.loadedRequestRefreshFnDic[key];
        delete this.loadedRequestSubscriberCountDic[key];
    }
}

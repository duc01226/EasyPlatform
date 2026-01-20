import { asyncScheduler, BehaviorSubject, concat, delay, Observable, of, tap } from 'rxjs';
import { TapObserver } from 'rxjs/internal/operators/tap';
import { distinctUntilObjectValuesChanged } from '../rxjs';

/**
 * Abstract base class for platform caching services providing intelligent data caching capabilities.
 *
 * This service implements a sophisticated caching strategy with automatic cache invalidation,
 * TTL (Time To Live) management, and intelligent request optimization. It's designed to be
 * extended by concrete implementations that provide specific storage mechanisms.
 *
 * @remarks
 * **Key Features:**
 * - **Automatic TTL Management**: Cached items automatically expire based on configurable TTL
 * - **Implicit Reload Strategy**: Returns cached data immediately while fetching fresh data in background
 * - **Intelligent Deduplication**: Prevents duplicate requests and redundant cache updates
 * - **Configurable Storage**: Abstract interface allows for multiple storage implementations
 * - **Error Handling**: Automatic cache cleanup on request failures
 * - **Performance Optimized**: Debounced cache operations for better performance
 *
 * **Cache Strategy:**
 * The service implements an "implicit reload" pattern:
 * 1. Returns cached data immediately if available (fast user experience)
 * 2. Simultaneously fetches fresh data from the source
 * 3. Updates cache and emits fresh data when available
 * 4. Uses RxJS operators to prevent duplicate emissions
 *
 * **Implementation Requirements:**
 * Concrete implementations must provide:
 * - Storage mechanism (localStorage, IndexedDB, memory, etc.)
 * - Serialization/deserialization logic
 * - Cache persistence and loading strategies
 *
 * @example
 * **Creating a custom caching service:**
 * ```typescript
 * @Injectable()
 * class CustomCachingService extends PlatformCachingService {
 *   private cache = new Map<string, PlatformCachingItem>();
 *
 *   constructor() {
 *     super({
 *       ttl: 3600, // 1 hour default TTL
 *       maxSize: 100,
 *       defaultDebounceSaveCacheMs: 300,
 *       debounceSaveCache: true
 *     });
 *   }
 *
 *   public get<T>(key: string, objectConstructor?: (data?: Partial<T>) => T): T | undefined {
 *     const item = this.cache.get(key);
 *     if (!item || this.isExpired(item)) {
 *       this.cache.delete(key);
 *       return undefined;
 *     }
 *     return objectConstructor ? objectConstructor(item.data as Partial<T>) : item.data as T;
 *   }
 *
 *   public set<T>(key: string, value: T | undefined, options?: PlatformCachingServiceSetCacheOptions): void {
 *     if (value === undefined) {
 *       this.cache.delete(key);
 *       return;
 *     }
 *
 *     this.cache.set(key, {
 *       data: value,
 *       timestamp: Date.now(),
 *       ttl: options?.ttl || this.options.ttl
 *     });
 *   }
 *
 *   public delete(key: string): void {
 *     this.cache.delete(key);
 *   }
 *
 *   public clear(): void {
 *     this.cache.clear();
 *   }
 *
 *   public async loadCache(): Promise<void> {
 *     // Load cache from persistent storage if needed
 *   }
 *
 *   private isExpired(item: PlatformCachingItem): boolean {
 *     const ttl = (item.ttl || this.options.ttl) * 1000;
 *     return Date.now() - item.timestamp > ttl;
 *   }
 * }
 * ```
 *
 * @example
 * **Using the caching service in API services:**
 * ```typescript
 * @Injectable()
 * export class UserApiService {
 *   constructor(private cache: PlatformCachingService, private http: HttpClient) {}
 *
 *   getUsers(): Observable<User[]> {
 *     return this.cache.cacheImplicitReloadRequest(
 *       'users-list',
 *       () => this.http.get<User[]>('/api/users'),
 *       { ttl: 300 } // 5 minutes TTL
 *     );
 *   }
 *
 *   getUserById(id: string): Observable<User> {
 *     return this.cache.cacheImplicitReloadRequest(
 *       `user-${id}`,
 *       () => this.http.get<User>(`/api/users/${id}`),
 *       { ttl: 600 } // 10 minutes TTL
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced usage with custom cache handling:**
 * ```typescript
 * @Injectable()
 * export class ProductService {
 *   constructor(private cache: PlatformCachingService, private http: HttpClient) {}
 *
 *   getProducts(category: string): Observable<Product[]> {
 *     return this.cache.cacheImplicitReloadRequest(
 *       `products-${category}`,
 *       () => this.http.get<Product[]>(`/api/products?category=${category}`),
 *       { ttl: 1800 }, // 30 minutes TTL
 *       (cacheKey, data) => {
 *         // Custom cache handling - also update related caches
 *         this.cache.set(cacheKey, data, { ttl: 1800 });
 *         if (data) {
 *           data.forEach(product => {
 *             this.cache.set(`product-${product.id}`, product, { ttl: 3600 });
 *           });
 *         }
 *       }
 *     );
 *   }
 * }
 * ```
 */
export abstract class PlatformCachingService {
    /**
     * The caching service options configuration.
     *
     * @protected
     * @readonly
     * @remarks
     * Contains all configuration settings for the caching service including TTL,
     * maximum cache size, and debounce settings for cache operations.
     */
    protected readonly options: PlatformCachingServiceOptions;

    /**
     * Creates a new instance of PlatformCachingService.
     *
     * @param options - Configuration options for the caching service
     *
     * @remarks
     * Initializes the caching service with the provided configuration options.
     * These options control cache behavior including expiration times, size limits,
     * and performance optimization settings.
     */
    constructor(options: PlatformCachingServiceOptions) {
        this.options = options;
    }

    /**
     * Retrieves cached data for the specified key.
     *
     * @template T - The type of the cached data
     * @param key - The cache key to retrieve data for
     * @param objectConstuctor - Optional constructor function for deserializing cached objects
     * @returns The cached data or undefined if not found or expired
     *
     * @remarks
     * Implementations should:
     * - Check for key existence
     * - Validate TTL and expire old entries
     * - Apply object constructor if provided for complex objects
     * - Return undefined for missing or expired entries
     *
     * @example
     * ```typescript
     * const userData = cache.get<User>('user-123', (data) => new User(data));
     * ```
     */
    public abstract get<T>(key: string, objectConstuctor?: (data?: Partial<T>) => T): T | undefined;

    /**
     * Stores data in the cache with optional TTL settings.
     *
     * @template T - The type of data to cache
     * @param key - The cache key to store data under
     * @param value - The data to cache (undefined will delete the entry)
     * @param options - Optional caching options including TTL
     *
     * @remarks
     * Implementations should:
     * - Handle undefined values as deletion requests
     * - Apply TTL from options or use default
     * - Implement debounced saving if configured
     * - Respect maximum cache size limits
     *
     * @example
     * ```typescript
     * cache.set('user-123', userData, { ttl: 3600 }); // Cache for 1 hour
     * cache.set('temp-data', undefined); // Delete the entry
     * ```
     */
    public abstract set<T>(key: string, value: T | undefined, options?: PlatformCachingServiceSetCacheOptions): void;

    /**
     * Removes a specific cache entry.
     *
     * @param key - The cache key to delete
     *
     * @remarks
     * Implementations should:
     * - Remove the entry immediately
     * - Handle non-existent keys gracefully
     * - Update persistent storage if applicable
     *
     * @example
     * ```typescript
     * cache.delete('user-123');
     * ```
     */
    public abstract delete(key: string): void;

    /**
     * Clears all cached data.
     *
     * @remarks
     * Implementations should:
     * - Remove all cache entries
     * - Clear persistent storage if applicable
     * - Reset cache size counters
     *
     * @example
     * ```typescript
     * cache.clear(); // Removes all cached data
     * ```
     */
    public abstract clear(): void;

    /**
     * Loads cache data from persistent storage.
     *
     * @returns Promise that resolves when cache loading is complete
     *
     * @remarks
     * Implementations should:
     * - Load data from persistent storage (localStorage, IndexedDB, etc.)
     * - Validate and expire old entries during loading
     * - Handle corrupted or invalid cache data gracefully
     * - Update the cacheLoaded$ observable when complete
     *
     * @example
     * ```typescript
     * await cache.loadCache();
     * console.log('Cache loaded successfully');
     * ```
     */
    public abstract loadCache(): Promise<void>;

    /**
     * Observable indicating whether the cache has been loaded from persistent storage.
     *
     * @remarks
     * This observable helps coordinate application startup by allowing components
     * to wait for cache initialization before making requests. It emits true
     * when the cache has been successfully loaded from persistent storage.
     *
     * @example
     * ```typescript
     * cache.cacheLoaded$.subscribe(loaded => {
     *   if (loaded) {
     *     console.log('Cache is ready, can start making requests');
     *   }
     * });
     * ```
     */
    public cacheLoaded$: BehaviorSubject<boolean> = new BehaviorSubject(false); /**
     * Implements intelligent cache-then-refresh pattern for data requests.
     *
     * @template T - The type of data being cached and requested
     * @param requestCacheKey - Unique identifier for the cached data
     * @param request - Function that returns an Observable for fetching fresh data
     * @param options - Optional caching configuration including TTL
     * @param customSetCachedRequestDataFn - Optional custom function for handling cache updates
     * @returns Observable that emits cached data immediately (if available) followed by fresh data
     *
     * @remarks
     * This method implements a sophisticated caching strategy that optimizes user experience:
     *
     * **Cache Hit Strategy:**
     * 1. Returns cached data immediately for instant user feedback
     * 2. Simultaneously fetches fresh data in the background
     * 3. Emits fresh data when available, updating the cache
     * 4. Uses distinctUntilObjectValuesChanged to prevent duplicate emissions
     *
     * **Cache Miss Strategy:**
     * 1. Executes the request function immediately
     * 2. Caches the response for future requests
     * 3. Returns the fresh data
     *
     * **Error Handling:**
     * - On request failure, cached data is removed to prevent stale data issues
     * - Custom cache handlers can implement specific error recovery logic
     *
     * **Performance Optimizations:**
     * - 1ms delay on cached data to ensure proper async behavior
     * - Debounced cache writes to reduce storage operations
     * - Intelligent deduplication prevents unnecessary emissions
     *
     * @example
     * **Basic usage in API service:**
     * ```typescript
     * getUserData(userId: string): Observable<User> {
     *   return this.cache.cacheImplicitReloadRequest(
     *     `user-${userId}`,
     *     () => this.http.get<User>(`/api/users/${userId}`),
     *     { ttl: 3600 } // 1 hour cache
     *   );
     * }
     * ```
     *
     * @example
     * **With custom cache handling:**
     * ```typescript
     * getProjectsWithTeams(projectId: string): Observable<ProjectWithTeams> {
     *   return this.cache.cacheImplicitReloadRequest(
     *     `project-teams-${projectId}`,
     *     () => this.http.get<ProjectWithTeams>(`/api/projects/${projectId}/teams`),
     *     { ttl: 1800 },
     *     (cacheKey, data) => {
     *       // Custom cache logic - update multiple related caches
     *       if (data) {
     *         this.cache.set(cacheKey, data, { ttl: 1800 });
     *         this.cache.set(`project-${data.project.id}`, data.project, { ttl: 3600 });
     *         data.teams.forEach(team => {
     *           this.cache.set(`team-${team.id}`, team, { ttl: 3600 });
     *         });
     *       }
     *     }
     *   );
     * }
     * ```
     *
     * @example
     * **Usage in components with loading states:**
     * ```typescript
     * @Component({...})
     * export class UserProfileComponent {
     *   user$ = this.userService.getUser(this.userId).pipe(
     *     tap(user => {
     *       // First emission might be cached data (fast)
     *       // Second emission will be fresh data (authoritative)
     *       this.updateUserDisplay(user);
     *     })
     *   );
     * }
     * ```
     */
    public cacheImplicitReloadRequest<T>(
        requestCacheKey: string,
        request: () => Observable<T>,
        options?: PlatformCachingServiceSetCacheOptions,
        customSetCachedRequestDataFn?: (requestCacheKey: string, data: T | undefined) => unknown
    ): Observable<T> {
        const cachedData = this.get<T>(requestCacheKey);

        if (cachedData == null) {
            // Cache miss: fetch fresh data and cache it
            return request().pipe(tap(this.tapCacheDataObserver<T>(customSetCachedRequestDataFn, requestCacheKey, options)));
        } else {
            // Cache hit: return cached data immediately, then fetch fresh data
            // delay(1ms) ensures proper async behavior and correct emission order
            return concat(
                of(cachedData).pipe(delay(1, asyncScheduler)),
                request().pipe(tap(this.tapCacheDataObserver<T>(customSetCachedRequestDataFn, requestCacheKey, options)))
            ).pipe(distinctUntilObjectValuesChanged());
        }
    }

    /**
     * Creates a tap observer for handling cache operations during request processing.
     *
     * @template T - The type of data being processed
     * @param customSetCachedRequestDataFn - Optional custom cache handling function
     * @param requestCacheKey - The cache key for storing the data
     * @param options - Caching options including TTL settings
     * @returns Partial TapObserver with next and error handlers
     *
     * @private
     * @remarks
     * This method creates the observer used by the cacheImplicitReloadRequest method
     * to handle successful responses and errors during data fetching. It implements
     * the caching logic and error cleanup automatically.
     *
     * **Success Handling:**
     * - Uses custom cache function if provided, otherwise uses default set method
     * - Applies configured TTL and other caching options
     *
     * **Error Handling:**
     * - Removes cached data on errors to prevent serving stale data
     * - Calls custom cache function with undefined to signal error state
     */
    private tapCacheDataObserver<T>(
        customSetCachedRequestDataFn: ((requestCacheKey: string, data: T | undefined) => unknown) | undefined,
        requestCacheKey: string,
        options: PlatformCachingServiceSetCacheOptions | undefined
    ): Partial<TapObserver<T>> {
        return {
            next: result => {
                if (customSetCachedRequestDataFn != null) customSetCachedRequestDataFn(requestCacheKey, result);
                else this.set(requestCacheKey, result, options);
            },
            error: err => {
                if (customSetCachedRequestDataFn != null) customSetCachedRequestDataFn(requestCacheKey, undefined);
                else this.delete(requestCacheKey);
            }
        };
    }
}

/**
 * Configuration options for individual cache set operations.
 *
 * @remarks
 * These options control how individual cache entries are stored and managed.
 * They can override the default service configuration on a per-request basis.
 */
export interface PlatformCachingServiceSetCacheOptions {
    /**
     * Time to live for the cached item in seconds.
     * After this time, the item will be considered expired and removed.
     */
    ttl: number;

    /**
     * Whether to debounce the cache save operation for performance.
     * When true, multiple rapid cache updates are batched together.
     * @default true
     */
    debounceSaveCache?: boolean;
}

/**
 * Global configuration options for the caching service.
 *
 * @remarks
 * These options define the overall behavior and limits of the caching service.
 * They extend the individual cache options to include service-wide settings.
 */
export interface PlatformCachingServiceOptions extends PlatformCachingServiceSetCacheOptions {
    /**
     * Maximum number of items that can be stored in the cache.
     * When this limit is reached, oldest items are evicted to make room.
     */
    maxSize: number;

    /**
     * Default debounce delay in milliseconds for cache save operations.
     * This helps batch multiple rapid cache updates for better performance.
     */
    defaultDebounceSaveCacheMs: number;
}

/**
 * Creates default configuration options for the platform caching service.
 *
 * @returns Default caching service configuration
 *
 * @remarks
 * Provides sensible defaults for most use cases:
 * - 48 hour TTL (172,800 seconds)
 * - 500 item cache limit
 * - 500ms debounce delay
 * - Debounced saves enabled
 *
 * @example
 * ```typescript
 * const options = DefaultPlatformCachingServiceOptions();
 * const cacheService = new MyCachingService(options);
 * ```
 */
export function DefaultPlatformCachingServiceOptions(): PlatformCachingServiceOptions {
    return { ttl: 3600 * 48, maxSize: 500, defaultDebounceSaveCacheMs: 500, debounceSaveCache: true };
}

/**
 * Represents a single item stored in the platform cache.
 *
 * @remarks
 * This interface defines the structure of cached data items, including
 * the actual data, timing information, and optional per-item TTL settings.
 * The timestamp is used for TTL calculations and cache eviction policies.
 */
export interface PlatformCachingItem {
    /** The actual cached data of any type */
    data: unknown;

    /**
     * Timestamp when the item was cached, in milliseconds since Unix epoch.
     * Generated using Date.now() and used for TTL calculations.
     */
    timestamp: number;

    /**
     * Optional individual time to live for this specific cache item in seconds.
     * If not specified, the service default TTL is used.
     */
    ttl?: number;
}

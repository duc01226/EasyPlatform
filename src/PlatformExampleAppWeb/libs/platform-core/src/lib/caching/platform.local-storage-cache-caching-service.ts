import { task_debounce, toPlainObj } from '../utils';
import {
    PlatformCachingItem,
    PlatformCachingService,
    PlatformCachingServiceOptions,
    PlatformCachingServiceSetCacheOptions,
    DefaultPlatformCachingServiceOptions as defaultPlatformCachingServiceOptions
} from './platform.caching-service';

/**
 * Browser localStorage implementation of the platform caching service.
 *
 * This service provides persistent caching capabilities using the browser's localStorage API.
 * Cached data survives browser sessions and page refreshes, making it ideal for application
 * data that benefits from persistence across user sessions.
 *
 * @remarks
 * **Key Features:**
 * - **Persistent Storage**: Data survives browser restarts and page refreshes
 * - **Automatic Expiration**: TTL-based cache invalidation with background cleanup
 * - **Performance Optimized**: Debounced writes to minimize localStorage operations
 * - **Error Resilient**: Graceful handling of localStorage quota exceeded scenarios
 * - **Namespace Isolation**: Uses prefixed keys to avoid conflicts with other data
 * - **JSON Serialization**: Automatic serialization/deserialization of complex objects
 *
 * **Storage Characteristics:**
 * - **Capacity**: Typically 5-10MB per origin (browser dependent)
 * - **Persistence**: Data persists until explicitly cleared or browser storage is cleared
 * - **Scope**: Shared across all tabs/windows of the same origin
 * - **Synchronous API**: localStorage operations are synchronous but optimized with debouncing
 *
 * **Use Cases:**
 * - User preferences and settings
 * - Application configuration data
 * - Frequently accessed reference data
 * - Offline-capable application state
 * - Cross-session data persistence
 *
 * **Limitations:**
 * - Limited storage capacity (5-10MB typical)
 * - Synchronous operations (mitigated by debouncing)
 * - String-only storage (handled by JSON serialization)
 * - Privacy mode restrictions in some browsers
 *
 * @example
 * **Basic usage with default configuration:**
 * ```typescript
 * const cacheService = new PlatformLocalStorageCachingService();
 *
 * // Cache user preferences
 * cacheService.set('user-preferences', userPrefs, { ttl: 86400 }); // 24 hours
 *
 * // Retrieve cached data
 * const preferences = cacheService.get<UserPreferences>('user-preferences');
 * ```
 *
 * @example
 * **Custom configuration for specific use cases:**
 * ```typescript
 * const cacheService = new PlatformLocalStorageCachingService({
 *   ttl: 7200, // 2 hours default TTL
 *   maxSize: 200, // Limit to 200 items
 *   defaultDebounceSaveCacheMs: 1000, // 1 second debounce
 *   debounceSaveCache: true
 * });
 * ```
 *
 * @example
 * **Using in API services for persistent caching:**
 * ```typescript
 * @Injectable()
 * export class UserApiService {
 *   constructor(private cache: PlatformLocalStorageCachingService) {}
 *
 *   getUserProfile(userId: string): Observable<UserProfile> {
 *     return this.cache.cacheImplicitReloadRequest(
 *       `user-profile-${userId}`,
 *       () => this.http.get<UserProfile>(`/api/users/${userId}/profile`),
 *       { ttl: 3600 } // Cache for 1 hour
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * **Object deserialization with constructors:**
 * ```typescript
 * class User {
 *   constructor(data: Partial<User>) {
 *     Object.assign(this, data);
 *   }
 *
 *   getDisplayName(): string {
 *     return `${this.firstName} ${this.lastName}`;
 *   }
 * }
 *
 * // Cache and retrieve with proper object reconstruction
 * const user = cacheService.get<User>('current-user', (data) => new User(data));
 * console.log(user?.getDisplayName()); // Methods are available
 * ```
 */
export class PlatformLocalStorageCachingService extends PlatformCachingService {
    /**
     * Prefix used for all localStorage keys to avoid conflicts with other application data.
     *
     * @protected
     * @remarks
     * This prefix ensures that cache entries are isolated from other localStorage usage
     * and can be easily identified and managed as a group.
     */
    protected cacheKeyPrefix: string = '__PlatformLocalStorageCaching__';

    /**
     * In-memory cache map for fast access to cached items.
     *
     * @protected
     * @remarks
     * This map serves as a performance optimization layer over localStorage,
     * reducing the need for frequent localStorage.getItem() calls and enabling
     * efficient cache operations like expiration checks.
     */
    protected cache: Map<string, PlatformCachingItem> = new Map();

    /**
     * Creates a new instance of PlatformLocalStorageCachingService.
     *
     * @param options - Optional configuration options for the caching service
     *
     * @remarks
     * Initializes the service with the provided options or defaults, then automatically
     * loads existing cache data from localStorage into memory for fast access.
     */
    constructor(options?: PlatformCachingServiceOptions) {
        super(options ?? defaultPlatformCachingServiceOptions());
        this.loadCache();
    }

    /**
     * Loads cached data from localStorage into the in-memory cache.
     *
     * @override
     * @returns Promise that resolves when cache loading is complete
     *
     * @remarks
     * This method scans localStorage for all keys with the cache prefix,
     * loads their data into the in-memory cache map, and removes any
     * expired items. It's called automatically during construction and
     * updates the cacheLoaded$ observable when complete.
     *
     * **Loading Process:**
     * 1. Scans localStorage for prefixed cache keys
     * 2. Parses JSON data into cache items
     * 3. Builds in-memory cache map for fast access
     * 4. Removes expired items during loading
     * 5. Sets cacheLoaded$ to true
     *
     * @example
     * ```typescript
     * const cacheService = new PlatformLocalStorageCachingService();
     * await cacheService.loadCache(); // Explicit loading if needed
     * ```
     */
    public override async loadCache() {
        // Load keys
        const keys = this.getAllCacheKeys();

        // build cache data
        const cacheMap = new Map();
        keys.forEach(key => {
            const cacheDataItem = localStorage.getItem(key);
            if (cacheDataItem != null) cacheMap.set(key, JSON.parse(cacheDataItem));
        });

        this.cache = cacheMap;
        this.removeExpiredItems();

        this.cacheLoaded$.next(true);
    }

    private getAllCacheKeys() {
        let currentLoadKeyIndex = 0;
        const keys = <string[]>[];
        while (localStorage.key(currentLoadKeyIndex) != null && localStorage.key(currentLoadKeyIndex) != '') {
            if (localStorage.key(currentLoadKeyIndex)?.startsWith(this.cacheKeyPrefix) == true) keys.push(localStorage.key(currentLoadKeyIndex)!);
            currentLoadKeyIndex += 1;
        }

        return keys;
    }

    /**
     * Removes expired items from the cache.
     */
    public removeExpiredItems() {
        for (const [key, value] of this.cache.entries()) {
            if (this.isItemExpired(value)) {
                this.cache.delete(key);
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * Saves the cache to local storage.
     *
     * @param debounceSaveCache - Determines whether to debounce saving the cache.
     */
    public saveCache(debounceSaveCache?: boolean) {
        if (debounceSaveCache == false) this.doSaveCache();
        // Schedule in background to save cache to not block current thread and improve performance
        else this.doSaveCacheDebounce();
    }

    private doSaveCache = () => {
        try {
            this.getAllCacheKeys().forEach(key => localStorage.removeItem(key));
            Array.from(this.cache.entries()).forEach(([key, cacheItem]) => {
                localStorage.setItem(key, JSON.stringify(toPlainObj(cacheItem)));
            });
        } catch (error) {
            console.warn('Local Storage is full, Please empty data', error);
            this.clear();
        }
    };

    private doSaveCacheDebounce = task_debounce(() => this.doSaveCache(), this.options.defaultDebounceSaveCacheMs);

    /**
     * Checks if a cached item is expired.
     *
     * @param item - The cached item to check.
     * @returns True if the item is expired, otherwise false.
     */
    public isItemExpired(item: PlatformCachingItem) {
        const ttl = item.ttl ?? this.options.ttl;
        return Date.now() - item.timestamp >= ttl * 1000;
    }

    /**
     * Gets cached data for a given key.
     *
     * @param key - The key for which to retrieve the cached data.
     * @param objectConstuctor - Optional constructor function to create an object from the cached data.
     * @returns The cached data or undefined if not found.
     */
    public override get<T>(key: string, objectConstuctor?: (data?: Partial<T>) => T): T | undefined {
        try {
            const cachedItem = this.cache.get(this.buildFinalCacheKey(key));

            if (cachedItem != null) {
                if (this.isItemExpired(cachedItem)) {
                    this.delete(key);
                    return undefined;
                }
                const data = cachedItem.data != null ? JSON.parse(<string>cachedItem.data) : null;

                return objectConstuctor != null ? objectConstuctor(data) : data;
            }
            return undefined;
        } catch (error) {
            console.error(error);
            this.clear();
            return undefined;
        }
    }

    /**
     * Sets cached data for a given key.
     *
     * @param key - The key for which to set the cached data.
     * @param data - The data to be cached.
     * @param options - Additional options for caching, such as time to live (TTL).
     */
    public override set<T>(key: string, data: T | undefined, options?: PlatformCachingServiceSetCacheOptions): void {
        if (data == undefined) this.delete(key);
        else this.doSetData<T>(data, options, key);
    }

    private doSetData<T>(data: NonNullable<T>, options: PlatformCachingServiceSetCacheOptions | undefined, key: string) {
        const serializedData = JSON.stringify(toPlainObj(data));
        const debounceSaveCache = options?.debounceSaveCache != undefined ? options?.debounceSaveCache : this.options.debounceSaveCache ?? true;

        const newItem: PlatformCachingItem = {
            data: serializedData,
            timestamp: Date.now(),
            ttl: options?.ttl
        };

        // If cache is full, delete the oldest item
        if (this.cache.size >= this.options.maxSize) {
            const oldestKey = this.findOldestKey();
            if (oldestKey != null) this.cache.delete(oldestKey);
        }

        this.cache.set(this.buildFinalCacheKey(key), newItem);
        this.saveCache(debounceSaveCache);
    }

    private buildFinalCacheKey(key: string): string {
        return `${this.cacheKeyPrefix}` + key;
    }

    public override delete(key: string): void {
        this.cache.delete(this.buildFinalCacheKey(key));
        this.saveCache();
    }

    public override clear(): void {
        try {
            this.cache.clear();
            localStorage.clear();
        } catch (error) {
            console.error(error);
        }
    }

    protected findOldestKey() {
        let oldestKey = null;
        let oldestTimestamp = Infinity;

        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp < oldestTimestamp) {
                oldestKey = key;
                oldestTimestamp = value.timestamp;
            }
        }

        return oldestKey;
    }
}

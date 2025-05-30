import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpStatusCode } from '@angular/common/http';
import { Injectable, Optional, inject } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { PlatformCachingService } from '../../caching';
import { Dictionary } from '../../common-types';
import { PlatformEventManager } from '../../events';
import { HttpClientOptions, PlatformHttpService } from '../../http-services';
import { PlatformCoreModuleConfig } from '../../platform-core.config';
import { removeNullProps, toPlainObj } from '../../utils';
import { PlatformApiErrorEvent } from '../events/api-error.event';
import { IPlatformApiServiceErrorResponse, PlatformApiServiceErrorInfoCode, PlatformApiServiceErrorResponse } from './platform.api-error';
import { PlatformHttpOptionsConfigService } from './platform.http-options-config-service';

/** HTTP status codes that indicate connection refused or server unavailability */
const ERR_CONNECTION_REFUSED_STATUSES: (HttpStatusCode | number)[] = [0, 504, 503, 502];

/** HTTP status codes that indicate unauthorized or forbidden access */
const UNAUTHORIZATION_STATUSES: HttpStatusCode[] = [HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden];

/**
 * Abstract base class for platform API services providing standardized HTTP operations,
 * intelligent caching, error handling, and event management.
 *
 * @remarks
 * This service extends {@link PlatformHttpService} to provide a comprehensive API layer with:
 * - **Smart Caching**: Automatic cache-then-refresh patterns with TTL management
 * - **Error Handling**: Standardized error responses with event publishing
 * - **Request Processing**: Automatic data preprocessing and parameter flattening
 * - **Event Integration**: Publishes API errors through the platform event system
 * - **Performance Optimization**: Cache management with automatic cleanup
 *
 * **Key Features:**
 * - Intelligent cache management with configurable TTL
 * - Automatic null property removal from request payloads
 * - Standardized error responses with custom error codes
 * - Support for multipart file uploads
 * - Query parameter flattening for complex objects
 * - Event-driven error handling for global error management
 *
 * @example
 * **Basic API service implementation:**
 * ```typescript
 * @Injectable()
 * export class UserApiService extends PlatformApiService {
 *   protected get apiUrl(): string {
 *     return '/api/users';
 *   }
 *
 *   getUser(id: number): Observable<User> {
 *     return this.get<User>(`/${id}`, null);
 *   }
 *
 *   updateUser(user: User): Observable<User> {
 *     return this.put<User>(`/${user.id}`, user);
 *   }
 *
 *   searchUsers(criteria: UserSearchCriteria): Observable<User[]> {
 *     return this.get<User[]>('/search', criteria);
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced usage with caching and custom options:**
 * ```typescript
 * @Injectable()
 * export class ProductApiService extends PlatformApiService {
 *   protected get apiUrl(): string {
 *     return this.moduleConfig.apiBaseUrl + '/products';
 *   }
 *
 *   // Cached GET request with custom headers
 *   getProducts(filters: ProductFilters): Observable<Product[]> {
 *     return this.get<Product[]>('/list', filters, (options) => {
 *       options.headers = options.headers?.set('X-Custom-Header', 'value');
 *       return options;
 *     });
 *   }
 *
 *   // Non-cached GET request
 *   getProductsRealTime(): Observable<Product[]> {
 *     return this.get<Product[]>('/list', null, undefined, true);
 *   }
 *
 *   // Cached POST request
 *   searchProducts(criteria: SearchCriteria): Observable<Product[]> {
 *     return this.post<Product[]>('/search', criteria, undefined, true);
 *   }
 *
 *   // File upload
 *   uploadProductImage(productId: number, file: File): Observable<string> {
 *     const formData = new FormData();
 *     formData.append('file', file);
 *     formData.append('productId', productId.toString());
 *
 *     return this.postFileMultiPartForm<string>('/upload-image', formData);
 *   }
 * }
 * ```
 *
 * @example
 * **Error handling with event management:**
 * ```typescript
 * // Service automatically publishes PlatformApiErrorEvent for global handling
 * this.userService.getUser(123)
 *   .pipe(
 *     catchError(error => {
 *       if (error instanceof PlatformApiServiceErrorResponse) {
 *         console.log('API Error Code:', error.error.code);
 *         console.log('Request ID:', error.requestId);
 *       }
 *       return throwError(() => error);
 *     })
 *   )
 *   .subscribe(user => console.log(user));
 * ```
 *
 * @example
 * **Complex query parameters with automatic flattening:**
 * ```typescript
 * const searchParams = {
 *   filters: {
 *     category: 'electronics',
 *     priceRange: { min: 100, max: 500 },
 *     tags: ['featured', 'new']
 *   },
 *   pagination: { page: 1, size: 20 },
 *   sort: ['-price', 'name']
 * };
 *
 * // Automatically flattened to:
 * // ?filters.category=electronics&filters.priceRange.min=100&filters.priceRange.max=500
 * // &filters.tags=featured&filters.tags=new&pagination.page=1&pagination.size=20
 * // &sort=-price&sort=name
 * this.productService.searchProducts(searchParams).subscribe();
 * ```
 *
 * @see {@link PlatformHttpService} - Base HTTP service with core HTTP operations
 * @see {@link PlatformCachingService} - Caching service for request optimization
 * @see {@link PlatformEventManager} - Event management for API error broadcasting
 * @see {@link PlatformApiServiceErrorResponse} - Standardized API error response structure
 */
@Injectable()
export abstract class PlatformApiService extends PlatformHttpService {
    /**
     * Default HTTP headers applied to all API requests.
     * Sets content type to JSON with UTF-8 encoding.
     */
    public static readonly DefaultHeaders: HttpHeaders = new HttpHeaders({
        'Content-Type': 'application/json; charset=utf-8'
    });

    /** Injected caching service for request optimization and performance */
    private readonly cacheService = inject(PlatformCachingService);

    /**
     * Constructs a new PlatformApiService instance.
     *
     * @param http - Angular HttpClient for making HTTP requests
     * @param moduleConfig - Optional platform core module configuration
     * @param httpOptionsConfigService - Optional service for configuring HTTP options
     * @param eventManager - Event manager for publishing API errors and events
     */
    public constructor(
        http: HttpClient,
        @Optional() moduleConfig: PlatformCoreModuleConfig,
        @Optional() private httpOptionsConfigService: PlatformHttpOptionsConfigService,
        protected eventManager: PlatformEventManager
    ) {
        super(moduleConfig, http);
    }

    /**
     * Abstract property that must be implemented by concrete services.
     * Defines the base API URL for all requests made by this service.
     *
     * @example
     * ```typescript
     * protected get apiUrl(): string {
     *   return this.moduleConfig.apiBaseUrl + '/users';
     * }
     * ```
     */
    protected abstract get apiUrl(): string; /**
     * Gets default HTTP options with optional configuration by HTTP options service.
     *
     * @returns Configured HTTP client options with headers, timeout, and other settings
     */
    protected override get defaultOptions(): HttpClientOptions {
        const defaultOptions = super.defaultOptions;
        return this.httpOptionsConfigService?.configOptions(defaultOptions) ?? defaultOptions;
    }

    /**
     * Appends additional HTTP options using the HTTP options configuration service.
     *
     * @param options - Base HTTP options to be configured
     * @returns Configured HTTP options or undefined if no configuration service available
     */
    protected appendAdditionalHttpOptions(options: HttpClientOptions): HttpClientOptions {
        return this.httpOptionsConfigService?.configOptions(options);
    }

    /**
     * Determines the maximum number of cached items per request path.
     * Override this method to customize cache size limits for specific services.
     *
     * @returns Maximum number of cache entries per unique request path (default: 5)
     *
     * @example
     * ```typescript
     * protected maxNumberOfCacheItemPerRequestPath(): number {
     *   return 10; // Allow more cache entries for frequently accessed data
     * }
     * ```
     */
    protected maxNumberOfCacheItemPerRequestPath(): number {
        return 5;
    }

    /** Set to track cached request data keys for cleanup management */
    private cachedRequestDataKeys: Set<string> = new Set();

    /**
     * Stores cached request data and manages cache key tracking.
     *
     * @param requestCacheKey - Unique key identifying the cached request
     * @param data - Response data to cache
     */
    private setCachedRequestData<T>(requestCacheKey: string, data: T | undefined) {
        this.cacheService.set(requestCacheKey, data);

        this.cachedRequestDataKeys.add(requestCacheKey);

        this.clearOldestCachedData(requestCacheKey);
    }

    /**
     * Removes oldest cached data entries when cache limit is exceeded.
     * Maintains cache size within the configured maximum per request path.
     *
     * @param requestCacheKey - Current request cache key to determine the request path
     */
    private clearOldestCachedData(requestCacheKey: string) {
        const allRequestPathKeys = [...this.cachedRequestDataKeys].filter(key => key.startsWith(this.getRequestPathFromCacheKey(requestCacheKey)));

        while (allRequestPathKeys.length > this.maxNumberOfCacheItemPerRequestPath()) {
            const oldestRequestKey = allRequestPathKeys.shift();
            if (oldestRequestKey != null) {
                this.cacheService.delete(requestCacheKey);
                this.cachedRequestDataKeys.delete(oldestRequestKey);
            }
        }
    }

    /**
     * Performs HTTP GET request with intelligent caching support.
     *
     * @remarks
     * This method implements a cache-then-refresh pattern for optimal performance:
     * - Returns cached data immediately if available and valid
     * - Refreshes cache in background for future requests
     * - Falls back to server request if cache is empty or expired
     *
     * **Caching Behavior:**
     * - Cache key is built from URL path and request parameters
     * - TTL is configured via `apiGetCacheTimeToLiveSeconds` in module config
     * - Cache is automatically cleared on server errors
     * - Maximum cache entries per path controlled by `maxNumberOfCacheItemPerRequestPath()`
     *
     * @param path - API endpoint path relative to `apiUrl`
     * @param params - Query parameters to append to the request
     * @param configureOptions - Optional function to customize HTTP options
     * @param disableCached - When true, bypasses cache and fetches fresh data
     * @returns Observable stream of the response data
     *
     * @example
     * **Basic GET request with caching:**
     * ```typescript
     * // Cached for configured TTL period
     * getUser(id: number): Observable<User> {
     *   return this.get<User>(`/users/${id}`, null);
     * }
     * ```
     *
     * @example
     * **GET with query parameters:**
     * ```typescript
     * searchUsers(criteria: UserSearchCriteria): Observable<User[]> {
     *   return this.get<User[]>('/users/search', criteria);
     * }
     * ```
     *
     * @example
     * **GET with custom headers:**
     * ```typescript
     * getProtectedData(): Observable<Data> {
     *   return this.get<Data>('/protected', null, (options) => {
     *     options.headers = options.headers?.set('X-Custom-Auth', 'token');
     *     return options;
     *   });
     * }
     * ```
     *
     * @example
     * **Force fresh data (bypass cache):**
     * ```typescript
     * getRealTimeData(): Observable<Data> {
     *   return this.get<Data>('/real-time', null, undefined, true);
     * }
     * ```
     */
    protected get<T>(
        path: string,
        params: unknown,
        configureOptions?: (option: HttpClientOptions) => HttpClientOptions | void | undefined,
        disableCached?: boolean
    ): Observable<T> {
        if (disableCached) return this.getFromServer<T>(path, params, configureOptions);

        const requestCacheKey = this.buildRequestCacheKey(path, params);
        return this.cacheService.cacheImplicitReloadRequest(
            requestCacheKey,
            () => this.getFromServer<T>(path, params, configureOptions),
            { ttl: this.moduleConfig.apiGetCacheTimeToLiveSeconds },
            (requestCacheKey, data) => {
                this.setCachedRequestData(requestCacheKey, data);
            }
        );
    }

    /**
     * Executes the actual HTTP GET request to the server.
     *
     * @param path - API endpoint path
     * @param params - Query parameters
     * @param configureOptions - Optional HTTP options configuration function
     * @returns Observable stream of the server response
     */
    private getFromServer<T>(
        path: string,
        params: unknown,
        configureOptions: ((option: HttpClientOptions) => HttpClientOptions | void | undefined) | undefined
    ) {
        const options = this.getHttpOptions(this.preprocessData(params));
        const configuredOptions = configureOptions != null ? <HttpClientOptions | undefined>configureOptions(options) : options;

        return super.httpGet<T>(this.apiUrl + path, configuredOptions ?? options).pipe(
            tap({
                error: err => {
                    if (err instanceof Error) this.cacheService.clear();
                }
            }),
            catchError(err => this.catchHttpError<T>(err, path, params))
        );
    }

    /**
     * Performs HTTP POST request with optional intelligent caching support.
     *
     * @remarks
     * This method provides flexible POST operations with:
     * - **Optional Caching**: Cache POST responses for search/query operations that don't modify data
     * - **Data Processing**: Automatic null property removal and object serialization
     * - **Error Handling**: Standardized error responses with event publishing
     * - **Header Management**: Automatic Content-Type and custom header handling
     *
     * **Caching Behavior:**
     * When `apiOptions.enableCache` is true:
     * - Cache key built from URL path and request body
     * - TTL configured via `apiGetCacheTimeToLiveSeconds` in module config
     * - Ideal for search operations, report generation, or data queries via POST
     * - Cache automatically cleared on server errors
     *
     * **When to Use Caching:**
     * - POST-based search operations (complex search criteria in body)
     * - Report generation with parameters
     * - Data queries that use POST for large parameter sets
     * - Operations that are idempotent but use POST for payload size
     *
     * **When NOT to Use Caching:**
     * - Data creation operations
     * - State-changing operations
     * - User-specific dynamic content
     * - Real-time data requirements
     *
     * @param path - API endpoint path relative to `apiUrl`
     * @param body - Request payload to send in the POST body
     * @param apiOptions - Configuration options for the request
     * @param apiOptions.enableCache - Whether to cache the response for future identical requests
     * @param configureOptions - Optional function to customize HTTP options (headers, timeout, etc.)
     * @returns Observable stream of the response data
     *
     * @example
     * **Basic POST request (no caching):**
     * ```typescript
     * createUser(userData: CreateUserRequest): Observable<User> {
     *   return this.post<User>('/users', userData, { enableCache: false });
     * }
     * ```
     *
     * @example
     * **POST request with custom headers:**
     * ```typescript
     * submitForm(formData: FormData): Observable<SubmissionResult> {
     *   return this.post<SubmissionResult>(
     *     '/forms/submit',
     *     formData,
     *     { enableCache: false },
     *     (options) => {
     *       options.headers = options.headers?.set('X-Form-Version', '2.0');
     *       return options;
     *     }
     *   );
     * }
     * ```
     *
     * @example
     * **Cached POST for complex search (recommended pattern):**
     * ```typescript
     * searchUsers(searchCriteria: ComplexSearchCriteria): Observable<User[]> {
     *   // Use POST for large search criteria, but cache results since it's a query operation
     *   return this.post<User[]>('/users/search', searchCriteria, { enableCache: true });
     * }
     * ```
     *
     * @example
     * **POST for report generation with caching:**
     * ```typescript
     * generateReport(reportParams: ReportParameters): Observable<ReportData> {
     *   // Cache expensive report calculations
     *   return this.post<ReportData>(
     *     '/reports/generate',
     *     reportParams,
     *     { enableCache: true }
     *   );
     * }
     * ```
     *
     * @example
     * **POST with retry logic for critical operations:**
     * ```typescript
     * processPayment(paymentData: PaymentRequest): Observable<PaymentResult> {
     *   return this.post<PaymentResult>(
     *     '/payments/process',
     *     paymentData,
     *     { enableCache: false },
     *     (options) => {
     *       options.headers = options.headers?.set('Idempotency-Key', paymentData.idempotencyKey);
     *       return options;
     *     }
     *   ).pipe(
     *     retry({ count: 3, delay: 1000 }),
     *     catchError(error => {
     *       this.logPaymentFailure(paymentData, error);
     *       return throwError(() => error);
     *     })
     *   );
     * }
     * ```
     *
     * @example
     * **Bulk operations with progress tracking:**
     * ```typescript
     * bulkUpdateUsers(updates: UserUpdate[]): Observable<BulkUpdateResult> {
     *   return this.post<BulkUpdateResult>(
     *     '/users/bulk-update',
     *     { updates },
     *     { enableCache: false },
     *     (options) => {
     *       options.reportProgress = true;
     *       return options;
     *     }
     *   );
     * }
     * ```
     */
    protected post<T>(
        path: string,
        body: unknown,
        apiOptions: { enableCache: boolean },
        configureOptions?: (option: HttpClientOptions) => HttpClientOptions | void | undefined
    ): Observable<T> {
        if (apiOptions.enableCache) {
            const requestCacheKey = this.buildRequestCacheKey(path, body);
            return this.cacheService.cacheImplicitReloadRequest(
                requestCacheKey,
                () => this.postFromServer<T>(path, body, configureOptions),
                { ttl: this.moduleConfig.apiGetCacheTimeToLiveSeconds },
                (requestCacheKey, data) => {
                    this.setCachedRequestData(requestCacheKey, data);
                }
            );
        }
        return this.postFromServer(path, body, configureOptions);
    }

    /**
     * Executes the actual HTTP POST request to the server.
     *
     * @param path - API endpoint path
     * @param body - Request payload
     * @param configureOptions - Optional HTTP options configuration function
     * @returns Observable stream of the server response
     */
    private postFromServer<T>(
        path: string,
        body: unknown,
        configureOptions?: (option: HttpClientOptions) => HttpClientOptions | void | undefined
    ): Observable<T> {
        const options = this.getHttpOptions();
        const configuredOptions = configureOptions != null ? <HttpClientOptions | undefined>configureOptions(options) : options;

        return super
            .httpPost<T>(this.apiUrl + path, this.preprocessData(body), configuredOptions ?? options)
            .pipe(catchError(err => this.catchHttpError<T>(err, path, body)));
    }

    /**
     * Performs HTTP POST request for multipart file uploads.
     *
     * @remarks
     * This method is specifically designed for file upload scenarios where
     * `Content-Type: multipart/form-data` is required. The method automatically
     * handles FormData payloads and sets appropriate headers.
     *
     * **Use Cases:**
     * - Single or multiple file uploads
     * - File uploads with additional metadata
     * - Document and media management
     * - Bulk file processing
     *
     * @param path - API endpoint path relative to `apiUrl`
     * @param body - FormData containing files and additional fields
     * @param configureOptions - Optional function to customize HTTP options
     * @returns Observable stream of the upload response
     *
     * @example
     * **Single file upload:**
     * ```typescript
     * uploadDocument(file: File, metadata: DocumentMetadata): Observable<Document> {
     *   const formData = new FormData();
     *   formData.append('file', file);
     *   formData.append('title', metadata.title);
     *   formData.append('category', metadata.category);
     *
     *   return this.postFileMultiPartForm<Document>('/documents/upload', formData);
     * }
     * ```
     *
     * @example
     * **Multiple file upload with progress tracking:**
     * ```typescript
     * uploadMultipleFiles(files: File[], folderId: string): Observable<UploadResult> {
     *   const formData = new FormData();
     *   files.forEach((file, index) => {
     *     formData.append(`files[${index}]`, file);
     *   });
     *   formData.append('folderId', folderId);
     *
     *   return this.postFileMultiPartForm<UploadResult>('/files/bulk-upload', formData, (options) => {
     *     options.reportProgress = true;
     *     return options;
     *   });
     * }
     * ```
     *
     * @example
     * **Image upload with validation:**
     * ```typescript
     * uploadProfileImage(userId: number, imageFile: File): Observable<ProfileImage> {
     *   const formData = new FormData();
     *   formData.append('image', imageFile);
     *   formData.append('userId', userId.toString());
     *   formData.append('imageType', 'profile');
     *
     *   return this.postFileMultiPartForm<ProfileImage>('/users/profile/image', formData);
     * }
     * ```
     */
    protected postFileMultiPartForm<T>(
        path: string,
        body: unknown,
        configureOptions?: (option: HttpClientOptions) => HttpClientOptions | void | undefined
    ): Observable<T> {
        const options = this.getHttpOptions();
        const configuredOptions = configureOptions != null ? <HttpClientOptions | undefined>configureOptions(options) : options;

        return super
            .httpPostFileMultiPartForm<T>(this.apiUrl + path, <object>body, configuredOptions ?? options)
            .pipe(catchError(err => this.catchHttpError<T>(err, path, body)));
    }

    /**
     * Performs HTTP PUT request for updating existing resources.
     *
     * @remarks
     * PUT requests are used for updating entire resources or creating resources
     * with a specific identifier. The method automatically preprocesses the request
     * body to remove null properties and convert to plain objects.
     *
     * **REST Semantics:**
     * - PUT is idempotent - multiple identical requests have the same effect
     * - Used for complete resource replacement
     * - Requires the full resource representation in the request body
     *
     * @param path - API endpoint path relative to `apiUrl`
     * @param body - Complete resource data to update
     * @param configureOptions - Optional function to customize HTTP options
     * @returns Observable stream of the updated resource
     *
     * @example
     * **Update existing user:**
     * ```typescript
     * updateUser(user: User): Observable<User> {
     *   return this.put<User>(`/users/${user.id}`, user);
     * }
     * ```
     *
     * @example
     * **Update with optimistic locking:**
     * ```typescript
     * updateUserWithVersion(user: User): Observable<User> {
     *   return this.put<User>(`/users/${user.id}`, user, (options) => {
     *     options.headers = options.headers?.set('If-Match', user.version);
     *     return options;
     *   });
     * }
     * ```
     *
     * @example
     * **Update user settings:**
     * ```typescript
     * updateUserSettings(userId: number, settings: UserSettings): Observable<UserSettings> {
     *   return this.put<UserSettings>(`/users/${userId}/settings`, settings);
     * }
     * ```
     */
    protected put<T>(path: string, body: T, configureOptions?: (option: HttpClientOptions) => HttpClientOptions | void | undefined): Observable<T> {
        const options = this.getHttpOptions();
        const configuredOptions = configureOptions != null ? <HttpClientOptions | undefined>configureOptions(options) : options;

        return super
            .httpPut<T>(this.apiUrl + path, <T>this.preprocessData(body), configuredOptions ?? options)
            .pipe(catchError(err => this.catchHttpError<T>(err, path, body)));
    }

    /**
     * Performs HTTP DELETE request for removing resources.
     *
     * @remarks
     * DELETE requests are used to remove resources from the server.
     * The method provides standardized error handling and event publishing
     * for delete operations.
     *
     * **REST Semantics:**
     * - DELETE is idempotent - deleting the same resource multiple times is safe
     * - Usually returns no content (204) or confirmation data
     * - May return error if resource doesn't exist or cannot be deleted
     *
     * @param path - API endpoint path relative to `apiUrl`
     * @param configureOptions - Optional function to customize HTTP options
     * @returns Observable stream of the delete operation result
     *
     * @example
     * **Delete user by ID:**
     * ```typescript
     * deleteUser(userId: number): Observable<void> {
     *   return this.delete<void>(`/users/${userId}`);
     * }
     * ```
     *
     * @example
     * **Delete with confirmation response:**
     * ```typescript
     * deleteDocument(docId: string): Observable<DeleteResult> {
     *   return this.delete<DeleteResult>(`/documents/${docId}`);
     * }
     * ```
     *
     * @example
     * **Soft delete with custom headers:**
     * ```typescript
     * softDeleteUser(userId: number): Observable<User> {
     *   return this.delete<User>(`/users/${userId}/soft-delete`, (options) => {
     *     options.headers = options.headers?.set('X-Delete-Type', 'soft');
     *     return options;
     *   });
     * }
     * ```
     *
     * @example
     * **Bulk delete operation:**
     * ```typescript
     * deleteMultipleItems(itemIds: number[]): Observable<BulkDeleteResult> {
     *   const queryParams = { ids: itemIds };
     *   return this.delete<BulkDeleteResult>('/items/bulk-delete', (options) => {
     *     options.params = this.parseHttpGetParam(queryParams);
     *     return options;
     *   });
     * }
     * ```
     */
    protected delete<T>(path: string, configureOptions?: (option: HttpClientOptions) => HttpClientOptions | void | undefined): Observable<T> {
        const options = this.getHttpOptions();
        const configuredOptions = configureOptions != null ? <HttpClientOptions | undefined>configureOptions(options) : options;

        return super.httpDelete<T>(this.apiUrl + path, configuredOptions ?? options).pipe(catchError(err => this.catchHttpError<T>(err, path, null)));
    }

    /**
     * Centralized HTTP error handling for all API requests.
     *
     * @remarks
     * This method provides comprehensive error handling with:
     * - **Connection Error Detection**: Identifies network and server availability issues
     * - **Authorization Handling**: Maps 401/403 responses to platform permission errors
     * - **Custom Error Mapping**: Converts server errors to standardized platform errors
     * - **Event Publishing**: Broadcasts errors through the platform event system
     * - **Developer Support**: Logs detailed error information for debugging
     *
     * **Error Type Mapping:**
     * - Network errors (0, 502, 503, 504) → ConnectionRefused
     * - Auth errors (401, 403) → PlatformPermissionException
     * - Server errors with custom codes → Preserved custom error codes
     * - Unknown errors → Generic Unknown error code
     *
     * @param errorResponse - HTTP error response or generic Error object
     * @param apiRequestPath - API path that caused the error (for context)
     * @param apiRequestPayload - Request payload that caused the error (for debugging)
     * @returns Observable that throws standardized PlatformApiServiceErrorResponse
     *
     * @example
     * **Error handling in service methods:**
     * ```typescript
     * // Error handling is automatic - just catch PlatformApiServiceErrorResponse
     * this.userService.getUser(123)
     *   .pipe(
     *     catchError(error => {
     *       if (error instanceof PlatformApiServiceErrorResponse) {
     *         switch (error.error.code) {
     *           case PlatformApiServiceErrorInfoCode.ConnectionRefused:
     *             this.showOfflineMessage();
     *             break;
     *           case PlatformApiServiceErrorInfoCode.PlatformPermissionException:
     *             this.redirectToLogin();
     *             break;
     *           default:
     *             this.showGenericError(error.error.message);
     *         }
     *       }
     *       return throwError(() => error);
     *     })
     *   )
     *   .subscribe();
     * ```
     *
     * @example
     * **Global error handling with events:**
     * ```typescript
     * // Listen for API errors globally
     * this.eventManager.on(PlatformApiErrorEvent)
     *   .subscribe(event => {
     *     console.log('API Error:', event.path, event.error.error.code);
     *     this.notificationService.showError(event.error.error.message);
     *   });
     * ```
     */
    protected catchHttpError<T>(errorResponse: HttpErrorResponse | Error, apiRequestPath: string, apiRequestPayload: unknown): Observable<T> {
        if (errorResponse instanceof Error) {
            console.error(errorResponse);
            return this.throwError<T>(
                {
                    error: { code: errorResponse.name, message: errorResponse.message },
                    requestId: ''
                },
                apiRequestPath,
                apiRequestPayload
            );
        }

        if (ERR_CONNECTION_REFUSED_STATUSES.includes(errorResponse.status)) {
            return this.throwError(
                {
                    error: {
                        code: PlatformApiServiceErrorInfoCode.ConnectionRefused,
                        message: 'Your internet connection is not available or the server is temporarily down.'
                    },
                    statusCode: errorResponse.status,
                    requestId: ''
                },
                apiRequestPath,
                apiRequestPayload
            );
        }

        const apiErrorResponse = <IPlatformApiServiceErrorResponse | null>errorResponse.error;
        if (apiErrorResponse?.error?.code != null) {
            return this.throwError(
                {
                    error: apiErrorResponse.error,
                    statusCode: errorResponse.status,
                    requestId: apiErrorResponse.requestId
                },
                apiRequestPath,
                apiRequestPayload
            );
        }

        if (UNAUTHORIZATION_STATUSES.includes(errorResponse.status)) {
            return this.throwError(
                {
                    error: {
                        code: PlatformApiServiceErrorInfoCode.PlatformPermissionException,
                        message: errorResponse.message ?? 'You are unauthorized or forbidden'
                    },
                    statusCode: errorResponse.status,
                    requestId: apiErrorResponse?.requestId ?? ''
                },
                apiRequestPath,
                apiRequestPayload
            );
        }

        return this.throwError<T>(
            {
                error: {
                    code: PlatformApiServiceErrorInfoCode.Unknown,
                    message: errorResponse.message
                },
                statusCode: errorResponse.status,
                requestId: apiErrorResponse?.requestId ?? ''
            },
            apiRequestPath,
            apiRequestPayload
        );
    }

    /**
     * Creates and throws a standardized platform API error response.
     *
     * @remarks
     * This method:
     * - Logs developer exception messages for debugging
     * - Creates PlatformApiServiceErrorResponse instances
     * - Publishes PlatformApiErrorEvent for global error handling
     * - Returns an Observable that throws the error
     *
     * @param errorResponse - Structured error response data
     * @param apiRequestPath - API path that caused the error
     * @param apiRequestPayload - Request payload that caused the error
     * @returns Observable that immediately throws the error
     */
    protected throwError<T>(errorResponse: IPlatformApiServiceErrorResponse, apiRequestPath: string, apiRequestPayload: unknown): Observable<T> {
        if (errorResponse.error.developerExceptionMessage != null) console.error(errorResponse.error.developerExceptionMessage);

        return throwError(() => {
            const errorResponseInstance = new PlatformApiServiceErrorResponse(errorResponse);

            this.eventManager.publish(new PlatformApiErrorEvent(apiRequestPath, apiRequestPayload, errorResponseInstance));

            return errorResponseInstance;
        });
    }

    /**
     * Sets default HTTP options for API requests.
     *
     * @param options - Optional base HTTP options to merge with defaults
     * @returns Complete HTTP options with default headers applied
     */
    protected setDefaultOptions(options?: HttpClientOptions): HttpClientOptions {
        options = options ?? {};
        if (options.headers == null) {
            const httpHeaders = PlatformApiService.DefaultHeaders;
            options.headers = httpHeaders;
        }

        return options;
    }

    /**
     * Preprocesses request data before sending to the server.
     *
     * @remarks
     * This method performs several data transformations:
     * - **Null Property Removal**: Removes null properties to prevent server issues
     * - **Plain Object Conversion**: Converts complex objects to plain objects
     * - **FormData Preservation**: Leaves FormData objects unchanged for file uploads
     *
     * **Why Remove Null Properties:**
     * In .NET Core APIs, nullable properties default to null. Sending explicit null
     * values can cause validation exceptions for non-nullable fields. Removing null
     * properties allows the server to use default values appropriately.
     *
     * @param data - Raw request data to preprocess
     * @returns Processed data ready for HTTP transmission
     */
    private preprocessData<T>(data: T): IApiGetParams | Record<string, string> | FormData {
        if (data instanceof FormData) {
            return data;
        }
        return toPlainObj(removeNullProps(data));
    }

    /**
     * Builds HTTP options with query parameters for GET requests.
     *
     * @param params - Query parameters to append to the request
     * @returns Complete HTTP options with parameters and headers
     */
    private getHttpOptions(params?: IApiGetParams | Record<string, string> | FormData): HttpClientOptions {
        if (params == null) return this.defaultOptions;
        const finalOptions = this.defaultOptions;
        finalOptions.params = this.parseHttpGetParam(params);
        return finalOptions;
    }

    /**
     * Recursively flattens nested objects into dot-notation query parameters.
     *
     * @remarks
     * This method converts complex nested objects into flat key-value pairs suitable
     * for URL query strings. It handles:
     * - **Nested Objects**: `user.address.street` format
     * - **Arrays**: Multiple values for the same parameter name
     * - **Dates**: Automatic ISO string conversion
     * - **Files**: Preserved for FormData uploads
     * - **Primitives**: Direct string conversion
     *
     * **Flattening Examples:**
     * ```typescript
     * // Input:
     * {
     *   user: { name: 'John', age: 30 },
     *   tags: ['admin', 'user'],
     *   active: true
     * }
     *
     * // Output:
     * {
     *   'user.name': 'John',
     *   'user.age': '30',
     *   'tags': ['admin', 'user'],
     *   'active': 'true'
     * }
     * ```
     *
     * @param inputParams - Nested parameter object or FormData
     * @param returnParam - Accumulator for flattened parameters
     * @param prefix - Current nesting prefix for dot notation
     * @returns Flattened parameter dictionary
     */
    private flattenHttpGetParam(
        inputParams: IApiGetParams | FormData,
        returnParam: Dictionary<ApiGetParamItemSingleValue | ApiGetParamItemSingleValue[]> = {},
        prefix?: string
    ): Dictionary<ApiGetParamItemSingleValue | ApiGetParamItemSingleValue[]> {
        // eslint-disable-next-line guard-for-in
        for (const paramKey in inputParams ?? {}) {
            const inputParamValue = inputParams instanceof FormData ? inputParams.get(paramKey) : inputParams[paramKey];
            const inputParamFinalKey = prefix != null ? `${prefix}.${paramKey}` : paramKey;

            if (inputParamValue instanceof Array) {
                // eslint-disable-next-line no-param-reassign
                returnParam[inputParamFinalKey] = inputParamValue;
            } else if (inputParamValue instanceof Date) {
                returnParam[inputParamFinalKey] = inputParamValue.toISOString();
            } else if (typeof inputParamValue === 'object' && !(inputParamValue instanceof File) && inputParamValue != null) {
                this.flattenHttpGetParam(inputParamValue, returnParam, paramKey);
            } else if (inputParamValue != null && !(inputParamValue instanceof File)) {
                // eslint-disable-next-line no-param-reassign
                returnParam[inputParamFinalKey] = inputParamValue.toString();
            }
        }

        return returnParam;
    }

    /**
     * Converts flattened parameters into Angular HttpParams for URL encoding.
     *
     * @remarks
     * This method takes the flattened parameter dictionary and creates Angular's
     * HttpParams object which handles proper URL encoding and array parameter
     * serialization.
     *
     * **Array Handling:**
     * Array values are expanded into multiple parameters with the same name:
     * `tags: ['a', 'b']` becomes `?tags=a&tags=b`
     *
     * @param inputParams - Flattened or simple parameter object
     * @returns Angular HttpParams ready for HTTP request
     */
    private parseHttpGetParam(inputParams: IApiGetParams | Record<string, string> | FormData): HttpParams {
        let returnParam = new HttpParams();
        const flattenedInputParams = this.flattenHttpGetParam(inputParams);
        for (const paramKey in flattenedInputParams) {
            if (Object.hasOwn(flattenedInputParams, paramKey)) {
                const inputParamValue = flattenedInputParams[paramKey]!;
                if (inputParamValue instanceof Array) {
                    inputParamValue.forEach((p: ApiGetParamItemSingleValue) => {
                        returnParam = returnParam.append(paramKey, p);
                    });
                } else {
                    returnParam = returnParam.append(paramKey, inputParamValue.toString());
                }
            }
        }
        return returnParam;
    }

    /** Separator used in cache keys to distinguish between path and payload */
    private requestCacheKeySeperator: string = '___';

    /**
     * Builds a unique cache key for request caching.
     *
     * @remarks
     * Cache keys are constructed from:
     * - Base API URL
     * - Request path
     * - Serialized request payload (if any)
     *
     * This ensures that requests with different parameters are cached separately
     * while allowing cache hits for identical requests.
     *
     * @param requestPath - API endpoint path
     * @param requestPayload - Request parameters or body
     * @returns Unique cache key string
     */
    private buildRequestCacheKey(requestPath: string, requestPayload: unknown): string {
        const requestPayloadCacheKeyPart = requestPayload != null ? this.requestCacheKeySeperator + JSON.stringify(requestPayload) : '';

        return `${this.apiUrl}${requestPath}${requestPayloadCacheKeyPart}`;
    }

    /**
     * Extracts the request path portion from a cache key.
     *
     * @param requestCacheKey - Full cache key including path and payload
     * @returns The request path portion of the cache key
     */
    private getRequestPathFromCacheKey(requestCacheKey: string): string {
        return requestCacheKey.split(this.requestCacheKeySeperator)[0]!;
    }
}

/**
 * Interface defining the structure for API GET request parameters.
 *
 * @remarks
 * This interface provides type safety for query parameters passed to GET requests.
 * It supports nested objects, arrays, and primitive values that are automatically
 * flattened and serialized into proper query string format.
 *
 * **Supported Parameter Types:**
 * - **Primitive values**: string, number, boolean
 * - **Nested objects**: Flattened using dot notation (e.g., `user.name`)
 * - **Arrays**: Multiple values for the same parameter name
 * - **Date objects**: Automatically converted to ISO string format
 *
 * @example
 * **Simple query parameters:**
 * ```typescript
 * const params: IApiGetParams = {
 *   page: 1,
 *   size: 20,
 *   search: 'john'
 * };
 * // Result: ?page=1&size=20&search=john
 * ```
 *
 * @example
 * **Complex nested parameters:**
 * ```typescript
 * const params: IApiGetParams = {
 *   filters: {
 *     status: 'active',
 *     dateRange: {
 *       start: new Date('2024-01-01'),
 *       end: new Date('2024-12-31')
 *     }
 *   },
 *   sort: ['name', '-created'],
 *   includeTags: true
 * };
 * // Result: ?filters.status=active&filters.dateRange.start=2024-01-01T00:00:00.000Z
 * //         &filters.dateRange.end=2024-12-31T00:00:00.000Z&sort=name&sort=-created&includeTags=true
 * ```
 *
 * @example
 * **Array parameters for filtering:**
 * ```typescript
 * const params: IApiGetParams = {
 *   categories: ['electronics', 'books', 'clothing'],
 *   tags: ['featured', 'new'],
 *   status: 'published'
 * };
 * // Result: ?categories=electronics&categories=books&categories=clothing
 * //         &tags=featured&tags=new&status=published
 * ```
 */
export interface IApiGetParams {
    [param: string]: ApiGetParamItem;
}

/**
 * Type definition for individual API parameter values.
 *
 * @remarks
 * This type allows for flexible parameter values including:
 * - Primitive values (string, number, boolean)
 * - Nested parameter objects for complex filtering
 * - Arrays of primitive values for multi-value parameters
 */
declare type ApiGetParamItemSingleValue = string | boolean | number;

/**
 * Type definition for API parameter items supporting various data structures.
 *
 * @remarks
 * This recursive type definition enables complex parameter structures while
 * maintaining type safety. The platform automatically handles serialization
 * of these structures into proper query string format.
 */
declare type ApiGetParamItem = ApiGetParamItemSingleValue | IApiGetParams | ApiGetParamItemSingleValue[];

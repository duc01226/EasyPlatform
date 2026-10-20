/**
 * @fileoverview Platform API Services Module
 *
 * This module provides a comprehensive set of services and utilities for making HTTP API calls
 * with intelligent caching, standardized error handling, and event-driven architecture.
 *
 * **Core Features:**
 * - **Base API Service**: Abstract foundation for all API service implementations
 * - **Smart Caching**: Cache-then-refresh patterns with TTL management
 * - **Error Handling**: Standardized error responses with custom error codes
 * - **Event System**: API error broadcasting for global error management
 * - **Request Processing**: Automatic data preprocessing and parameter flattening
 *
 * **Architecture Overview:**
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Platform API Services                   │
 * ├─────────────────────┬───────────────────────────────────────┤
 * │  PlatformApiService │  Abstract base with HTTP operations   │
 * │                     │  + Caching + Error handling          │
 * ├─────────────────────┼───────────────────────────────────────┤
 * │  Error Management   │  Standardized error responses        │
 * │                     │  + Event publishing                   │
 * ├─────────────────────┼───────────────────────────────────────┤
 * │  Configuration      │  HTTP options customization          │
 * │                     │  + Request/response interceptors      │
 * └─────────────────────┴───────────────────────────────────────┘
 * ```
 *
 * **Usage Pattern:**
 * ```typescript
 * // 1. Create concrete API service
 * @Injectable()
 * export class UserApiService extends PlatformApiService {
 *   protected get apiUrl(): string {
 *     return '/api/users';
 *   }
 *
 *   getUsers(): Observable<User[]> {
 *     return this.get<User[]>('/list', null);
 *   }
 * }
 *
 * // 2. Handle errors globally
 * this.eventManager.on(PlatformApiErrorEvent)
 *   .subscribe(event => this.handleApiError(event));
 *
 * // 3. Use with automatic caching
 * this.userService.getUsers().subscribe(users => {
 *   // Data cached automatically with TTL
 * });
 * ```
 *
 * @example
 * **Basic service implementation:**
 * ```typescript
 * @Injectable()
 * export class ProductApiService extends PlatformApiService {
 *   protected get apiUrl(): string {
 *     return this.moduleConfig.apiBaseUrl + '/products';
 *   }
 *
 *   searchProducts(criteria: SearchCriteria): Observable<Product[]> {
 *     return this.get<Product[]>('/search', criteria);
 *   }
 *
 *   createProduct(product: CreateProductRequest): Observable<Product> {
 *     return this.post<Product>('/', product);
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced error handling:**
 * ```typescript
 * // Global error handler
 * @Injectable()
 * export class ApiErrorHandler {
 *   constructor(private eventManager: PlatformEventManager) {
 *     this.eventManager.on(PlatformApiErrorEvent)
 *       .subscribe(event => this.handleError(event));
 *   }
 *
 *   private handleError(event: PlatformApiErrorEvent) {
 *     switch (event.error.error.code) {
 *       case PlatformApiServiceErrorInfoCode.ConnectionRefused:
 *         this.showOfflineNotification();
 *         break;
 *       case PlatformApiServiceErrorInfoCode.PlatformPermissionException:
 *         this.redirectToLogin();
 *         break;
 *     }
 *   }
 * }
 * ```
 *
 * @see {@link PlatformApiService} - Abstract base class for API services
 * @see {@link PlatformApiServiceErrorResponse} - Standardized error response structure
 * @see {@link PlatformApiErrorEvent} - Event published when API errors occur
 * @see {@link PlatformHttpOptionsConfigService} - Service for customizing HTTP options
 */

// Core API service abstractions
export * from './abstracts/platform.api-error';
export * from './abstracts/platform.api-service';
export * from './abstracts/platform.http-options-config-service';

// API error events and handling
export * from './events/api-error.event';
export * from './events/api-error.event-handler';

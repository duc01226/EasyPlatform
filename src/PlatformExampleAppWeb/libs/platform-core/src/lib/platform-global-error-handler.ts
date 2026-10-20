import { ErrorHandler, Injectable, Optional } from '@angular/core';

import { PlatformApiServiceErrorResponse } from './api-services';
import { PlatformCachingService } from './caching';
import { PlatformServiceWorkerService } from './platform-service-worker';

/**
 * Global error handler for the platform application that extends Angular's ErrorHandler.
 *
 * @description
 * This service provides centralized error handling for unhandled errors that occur
 * throughout the application. It implements intelligent error processing that
 * differentiates between API-related errors and other application errors, applying
 * appropriate handling strategies for each type.
 *
 * **Key Features:**
 * - **Selective Error Processing**: Only processes non-API errors to avoid duplicate handling
 * - **Cache Management**: Automatically clears application caches when critical errors occur
 * - **Service Worker Integration**: Coordinates with service worker for cache cleanup
 * - **Async Cache Clearing**: Uses setTimeout to prevent blocking the error handling flow
 *
 * **Error Handling Strategy:**
 * - API errors (PlatformApiServiceErrorResponse) are ignored as they're handled by repository error handlers
 * - Application errors trigger cache clearing to prevent corrupt state persistence
 * - All non-API errors are passed to Angular's default error handler for logging
 *
 * @example
 * **Module Registration:**
 * ```typescript
 * @NgModule({
 *   providers: [
 *     {
 *       provide: ErrorHandler,
 *       useClass: PlatformGlobalErrorHandler
 *     }
 *   ]
 * })
 * export class AppModule { }
 * ```
 *
 * @example
 * **Error Scenarios Handled:**
 * ```typescript
 * // These errors trigger cache clearing
 * throw new Error('Unexpected application error');
 * throw new TypeError('Cannot read property of undefined');
 * throw new ReferenceError('Variable not defined');
 *
 * // These errors are ignored (handled elsewhere)
 * throw new PlatformApiServiceErrorResponse(404, 'Not Found');
 * throw new PlatformApiServiceErrorResponse(500, 'Server Error');
 * ```
 *
 * @example
 * **Manual Cache Clearing:**
 * ```typescript
 * @Component({...})
 * export class MaintenanceComponent {
 *   constructor(private errorHandler: PlatformGlobalErrorHandler) {}
 *
 *   clearApplicationCache(): void {
 *     this.errorHandler.clearCache();
 *     this.notificationService.success('Cache cleared successfully');
 *   }
 * }
 * ```
 *
 * **Error Recovery Flow:**
 * 1. Error occurs in application
 * 2. PlatformGlobalErrorHandler.handleError() is called
 * 3. Check if error is PlatformApiServiceErrorResponse
 * 4. If not API error: log error + schedule cache clearing
 * 5. Cache clearing removes potentially corrupt cached data
 * 6. Application continues with clean state
 *
 * **Integration with Platform Error System:**
 * - Repository errors: Handled by PlatformRepositoryErrorEvent system
 * - Component errors: Handled by PlatformVm error tracking
 * - Global errors: Handled by this global error handler
 * - Form errors: Handled by form validation system
 *
 * @see {@link PlatformRepositoryErrorEvent} - For API/repository error handling
 * @see {@link PlatformCachingService} - For cache management
 * @see {@link PlatformServiceWorkerService} - For service worker cache coordination
 * @see {@link PlatformApiServiceErrorResponse} - For API error classification
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */
@Injectable()
export class PlatformGlobalErrorHandler extends ErrorHandler {
    /**
     * Creates a new PlatformGlobalErrorHandler instance.
     *
     * @param cacheService - Platform caching service for clearing application cache
     * @param servcieWorkerSvc - Service worker service for clearing service worker cache
     *
     * @example
     * ```typescript
     * // Angular DI automatically provides dependencies
     * constructor(
     *   private readonly cacheService: PlatformCachingService,
     *   private readonly serviceWorkerSvc: PlatformServiceWorkerService
     * ) {
     *   super();
     * }
     * ```
     */
    constructor(
        private readonly cacheService: PlatformCachingService,
        @Optional() private readonly servcieWorkerSvc: PlatformServiceWorkerService
    ) {
        super();
    }

    /**
     * Handles unhandled errors that occur throughout the application.
     *
     * @description
     * This method implements selective error processing to avoid interfering with
     * the platform's specialized error handling systems. API errors are ignored
     * since they're handled by the repository error event system, while other
     * errors trigger cache clearing to prevent corrupt state persistence.
     *
     * **Error Processing Logic:**
     * 1. Check if error is a PlatformApiServiceErrorResponse
     * 2. If API error: ignore (handled by repository error handlers)
     * 3. If non-API error: delegate to Angular's default handler + clear cache
     * 4. Schedule asynchronous cache clearing to avoid blocking
     *
     * @param error - The unhandled error that occurred
     *
     * @example
     * ```typescript
     * // These errors will trigger cache clearing
     * try {
     *   // Some operation that might fail
     *   const result = riskyOperation();
     * } catch (error) {
     *   // Error automatically handled by this method
     *   throw error; // Re-throw to trigger global handler
     * }
     * ```
     *
     * @example
     * ```typescript
     * // API errors are ignored by this handler
     * this.userRepository.getUsers().subscribe({
     *   error: (apiError) => {
     *     // This PlatformApiServiceErrorResponse won't trigger cache clearing
     *     // It's handled by repository error event system instead
     *   }
     * });
     * ```
     *
     * **Cache Clearing Rationale:**
     * When non-API errors occur, they often indicate:
     * - JavaScript runtime errors
     * - State corruption
     * - Memory issues
     * - Component lifecycle problems
     *
     * Clearing caches helps recover from these issues by:
     * - Removing potentially corrupt cached data
     * - Forcing fresh data loads
     * - Resetting application state
     * - Preventing cascade failures
     */
    public override handleError(error: unknown) {
        if (!(error instanceof PlatformApiServiceErrorResponse)) {
            super.handleError(error);
            setTimeout(() => {
                this.clearCache();
            });
        }
    }

    /**
     * Clears all application caches to recover from error states.
     *
     * @description
     * This method coordinates cache clearing across multiple cache layers
     * to ensure complete state cleanup. It's called automatically when
     * critical errors occur, but can also be invoked manually for
     * maintenance or troubleshooting purposes.
     *
     * **Cache Layers Cleared:**
     * - Application-level cache (PlatformCachingService)
     * - Service worker cache (browser-level caching)
     * - Component store states
     * - Repository caches
     *
     * **When Cache Clearing Occurs:**
     * - Unhandled JavaScript errors
     * - Component lifecycle errors
     * - State management errors
     * - Manual maintenance operations
     *
     * @example
     * ```typescript
     * // Manual cache clearing for maintenance
     * export class AdminMaintenanceComponent {
     *   constructor(private errorHandler: PlatformGlobalErrorHandler) {}
     *
     *   performMaintenanceCacheClear(): void {
     *     this.errorHandler.clearCache();
     *     this.logger.info('Application cache cleared for maintenance');
     *     this.notificationService.success('Cache cleared successfully');
     *   }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Programmatic cache clearing after data migration
     * export class DataMigrationService {
     *   constructor(private errorHandler: PlatformGlobalErrorHandler) {}
     *
     *   async completeMigration(): Promise<void> {
     *     await this.performMigration();
     *
     *     // Clear caches to ensure fresh data loads
     *     this.errorHandler.clearCache();
     *
     *     this.notificationService.success('Migration completed');
     *   }
     * }
     * ```
     *
     * **Performance Considerations:**
     * - Cache clearing is fast and non-blocking
     * - Subsequent data loads will be slower until cache rebuilds
     * - Service worker cache clearing may require network requests
     * - Component stores will reinitialize on next access
     *
     * **Recovery Benefits:**
     * - Resolves state corruption issues
     * - Prevents cascade failures from corrupt data
     * - Ensures fresh data loads after errors
     * - Improves application stability
     */
    public clearCache() {
        this.cacheService.clear();
        if (this.servcieWorkerSvc != null) {
            this.servcieWorkerSvc.clearCache();
        }
    }
}

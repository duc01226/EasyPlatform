import { PlatformEvent } from '../../events';
import { PlatformApiServiceErrorResponse } from '../abstracts/platform.api-error';

/**
 * Event class representing an API error that occurred during HTTP requests.
 *
 * @description
 * This event is automatically published by PlatformApiService whenever an HTTP
 * request fails or returns an error response. It provides comprehensive context
 * about the failed request, including the endpoint, payload, and detailed error
 * information for centralized error handling and monitoring.
 *
 * **Key Features:**
 * - **Request Context**: Complete information about the failed request
 * - **Error Details**: Structured error response with codes and messages
 * - **Global Broadcasting**: Automatically published through platform event system
 * - **Debugging Support**: Includes payload and path for troubleshooting
 *
 * **Use Cases:**
 * - **Global Error Handling**: Centralized error processing across the application
 * - **Error Monitoring**: Logging and analytics for API failure tracking
 * - **User Notifications**: Display appropriate error messages to users
 * - **Retry Logic**: Implement automatic retry mechanisms for transient errors
 * - **Circuit Breaker**: Track failure rates for service health monitoring
 *
 * @example
 * **Listening for API errors globally:**
 * ```typescript
 * @Injectable()
 * export class GlobalApiErrorHandler {
 *   constructor(private eventManager: PlatformEventManager) {
 *     this.setupErrorHandling();
 *   }
 *
 *   private setupErrorHandling(): void {
 *     this.eventManager.on(PlatformApiErrorEvent)
 *       .subscribe(event => this.handleApiError(event));
 *   }
 *
 *   private handleApiError(event: PlatformApiErrorEvent): void {
 *     console.error('API Error:', {
 *       path: event.apiRequestPath,
 *       payload: event.apiRequestPayload,
 *       error: event.apiError.error.code,
 *       message: event.apiError.error.message,
 *       requestId: event.apiError.requestId
 *     });
 *
 *     // Handle specific error types
 *     switch (event.apiError.error.code) {
 *       case PlatformApiServiceErrorInfoCode.ConnectionRefused:
 *         this.handleConnectionError(event);
 *         break;
 *       case PlatformApiServiceErrorInfoCode.PlatformPermissionException:
 *         this.handleAuthError(event);
 *         break;
 *       default:
 *         this.handleGenericError(event);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Implementing retry logic based on error events:**
 * ```typescript
 * @Injectable()
 * export class ApiRetryService {
 *   private retryAttempts = new Map<string, number>();
 *   private readonly maxRetries = 3;
 *
 *   constructor(private eventManager: PlatformEventManager) {
 *     this.eventManager.on(PlatformApiErrorEvent)
 *       .subscribe(event => this.handleRetry(event));
 *   }
 *
 *   private handleRetry(event: PlatformApiErrorEvent): void {
 *     // Only retry for transient errors
 *     if (this.isRetriableError(event.apiError.error.code)) {
 *       const requestKey = `${event.apiRequestPath}_${JSON.stringify(event.apiRequestPayload)}`;
 *       const attempts = this.retryAttempts.get(requestKey) || 0;
 *
 *       if (attempts < this.maxRetries) {
 *         this.retryAttempts.set(requestKey, attempts + 1);
 *         setTimeout(() => this.retryRequest(event), 1000 * Math.pow(2, attempts));
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Error analytics and monitoring:**
 * ```typescript
 * @Injectable()
 * export class ApiErrorAnalytics {
 *   constructor(
 *     private eventManager: PlatformEventManager,
 *     private analyticsService: AnalyticsService
 *   ) {
 *     this.eventManager.on(PlatformApiErrorEvent)
 *       .subscribe(event => this.trackError(event));
 *   }
 *
 *   private trackError(event: PlatformApiErrorEvent): void {
 *     this.analyticsService.trackEvent('api_error', {
 *       endpoint: event.apiRequestPath,
 *       errorCode: event.apiError.error.code,
 *       statusCode: event.apiError.statusCode,
 *       requestId: event.apiError.requestId,
 *       timestamp: new Date().toISOString()
 *     });
 *
 *     // Track error frequency for circuit breaker
 *     this.updateErrorFrequency(event.apiRequestPath);
 *   }
 * }
 * ```
 *
 * **Event Flow:**
 * 1. API request fails in PlatformApiService
 * 2. Error is processed and wrapped in PlatformApiServiceErrorResponse
 * 3. PlatformApiErrorEvent is created with request context
 * 4. Event is published through PlatformEventManager
 * 5. Registered handlers receive and process the error event
 * 6. Application can implement custom error handling logic
 *
 * @see {@link PlatformApiService} - Service that publishes these events
 * @see {@link PlatformApiServiceErrorResponse} - Detailed error information
 * @see {@link PlatformEventManager} - Event publishing and subscription system
 * @see {@link PlatformApiErrorEventHandler} - Abstract handler for these events
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */
export class PlatformApiErrorEvent extends PlatformEvent {
    /**
     * Creates a new PlatformApiErrorEvent instance.
     *
     * @param apiRequestPath - The API endpoint path that failed
     * @param apiRequestPayload - The request payload that was sent (query params or body)
     * @param apiError - Detailed error response information
     *
     * @example
     * ```typescript
     * // This is typically created automatically by PlatformApiService
     * const errorEvent = new PlatformApiErrorEvent(
     *   '/api/users/123',
     *   { includeDetails: true },
     *   new PlatformApiServiceErrorResponse({
     *     error: {
     *       code: PlatformApiServiceErrorInfoCode.PlatformNotFoundException,
     *       message: 'User not found'
     *     },
     *     statusCode: HttpStatusCode.NotFound,
     *     requestId: 'req-12345'
     *   })
     * );
     * ```
     */
    public constructor(
        /** The API endpoint path that failed (e.g., '/api/users/123') */
        public apiRequestPath: string,
        /** The request payload sent with the failed request (query params, body, etc.) */
        public apiRequestPayload: unknown,
        /** Structured error response containing detailed error information */
        public apiError: PlatformApiServiceErrorResponse
    ) {
        super(apiRequestPath);
    }
}

import { PlatformEventHandler } from '../../events';
import { PlatformApiErrorEvent } from './api-error.event';

/**
 * Abstract base class for handling API error events in the platform.
 *
 * @description
 * This class provides a structured way to create custom handlers for API error events.
 * Extend this class to implement specific error handling logic for different types of
 * API failures, such as authentication errors, network issues, or business logic violations.
 *
 * **Benefits of Using Event Handlers:**
 * - **Separation of Concerns**: Keep error handling logic separate from business logic
 * - **Centralized Processing**: Handle errors consistently across the application
 * - **Extensibility**: Easy to add new error handling behaviors
 * - **Testability**: Error handling logic can be unit tested in isolation
 * - **Monitoring**: Centralized place to implement error tracking and analytics
 *
 * **Common Handler Implementations:**
 * - **Authentication Handler**: Redirects to login on auth failures
 * - **Network Handler**: Shows offline indicators and retry options
 * - **Validation Handler**: Displays form validation errors to users
 * - **Monitoring Handler**: Logs errors to external monitoring services
 * - **Notification Handler**: Shows user-friendly error notifications
 *
 * @example
 * **Authentication error handler:**
 * ```typescript
 * @Injectable()
 * export class AuthApiErrorHandler extends PlatformApiErrorEventHandler {
 *   constructor(
 *     private router: Router,
 *     private authService: AuthService,
 *     private notificationService: NotificationService
 *   ) {
 *     super();
 *   }
 *
 *   public handle(event: PlatformApiErrorEvent): void {
 *     if (event.apiError.error.code === PlatformApiServiceErrorInfoCode.PlatformPermissionException) {
 *       // Clear invalid session
 *       this.authService.clearSession();
 *
 *       // Show notification
 *       this.notificationService.showWarning('Your session has expired. Please log in again.');
 *
 *       // Redirect to login
 *       this.router.navigate(['/login'], {
 *         queryParams: { returnUrl: this.router.url }
 *       });
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Network connectivity error handler:**
 * ```typescript
 * @Injectable()
 * export class NetworkApiErrorHandler extends PlatformApiErrorEventHandler {
 *   private isOffline = false;
 *
 *   constructor(
 *     private connectivityService: ConnectivityService,
 *     private notificationService: NotificationService
 *   ) {
 *     super();
 *   }
 *
 *   public handle(event: PlatformApiErrorEvent): void {
 *     if (event.apiError.error.code === PlatformApiServiceErrorInfoCode.ConnectionRefused) {
 *       if (!this.isOffline) {
 *         this.isOffline = true;
 *         this.connectivityService.setOfflineMode(true);
 *         this.notificationService.showError(
 *           'Connection lost. Working in offline mode.',
 *           { persist: true }
 *         );
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Validation error handler for forms:**
 * ```typescript
 * @Injectable()
 * export class ValidationApiErrorHandler extends PlatformApiErrorEventHandler {
 *   constructor(private formErrorService: FormErrorService) {
 *     super();
 *   }
 *
 *   public handle(event: PlatformApiErrorEvent): void {
 *     if (event.apiError.error.code === PlatformApiServiceErrorInfoCode.PlatformValidationException) {
 *       // Extract validation details from error
 *       const validationErrors = this.extractValidationErrors(event.apiError.error.details);
 *
 *       // Apply errors to relevant forms
 *       this.formErrorService.applyValidationErrors(
 *         event.apiRequestPath,
 *         validationErrors
 *       );
 *     }
 *   }
 *
 *   private extractValidationErrors(details?: IPlatformApiServiceErrorInfo[]): ValidationError[] {
 *     return details?.map(detail => ({
 *       field: detail.target || '',
 *       message: detail.message || '',
 *       code: detail.code
 *     })) || [];
 *   }
 * }
 * ```
 *
 * @example
 * **Error monitoring and analytics handler:**
 * ```typescript
 * @Injectable()
 * export class MonitoringApiErrorHandler extends PlatformApiErrorEventHandler {
 *   constructor(
 *     private logger: Logger,
 *     private metricsService: MetricsService,
 *     private errorReportingService: ErrorReportingService
 *   ) {
 *     super();
 *   }
 *
 *   public handle(event: PlatformApiErrorEvent): void {
 *     // Log error details
 *     this.logger.error('API Error', {
 *       path: event.apiRequestPath,
 *       errorCode: event.apiError.error.code,
 *       requestId: event.apiError.requestId,
 *       statusCode: event.apiError.statusCode
 *     });
 *
 *     // Track metrics
 *     this.metricsService.incrementCounter('api_errors_total', {
 *       endpoint: event.apiRequestPath,
 *       error_code: event.apiError.error.code
 *     });
 *
 *     // Report critical errors
 *     if (this.isCriticalError(event.apiError.error.code)) {
 *       this.errorReportingService.reportError(event);
 *     }
 *   }
 * }
 * ```
 *
 * **Handler Registration:**
 * ```typescript
 * @NgModule({
 *   providers: [
 *     AuthApiErrorHandler,
 *     NetworkApiErrorHandler,
 *     ValidationApiErrorHandler,
 *     MonitoringApiErrorHandler
 *   ]
 * })
 * export class ErrorHandlingModule {
 *   constructor(
 *     private eventManager: PlatformEventManager,
 *     private authHandler: AuthApiErrorHandler,
 *     private networkHandler: NetworkApiErrorHandler,
 *     private validationHandler: ValidationApiErrorHandler,
 *     private monitoringHandler: MonitoringApiErrorHandler
 *   ) {
 *     // Register all handlers
 *     this.eventManager.registerHandler(PlatformApiErrorEvent, this.authHandler);
 *     this.eventManager.registerHandler(PlatformApiErrorEvent, this.networkHandler);
 *     this.eventManager.registerHandler(PlatformApiErrorEvent, this.validationHandler);
 *     this.eventManager.registerHandler(PlatformApiErrorEvent, this.monitoringHandler);
 *   }
 * }
 * ```
 *
 * @see {@link PlatformApiErrorEvent} - Event handled by this handler
 * @see {@link PlatformEventHandler} - Base event handler class
 * @see {@link PlatformEventManager} - Event management system
 * @see {@link PlatformApiServiceErrorResponse} - Error response structure
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */
export abstract class PlatformApiErrorEventHandler extends PlatformEventHandler<PlatformApiErrorEvent> {
    /**
     * Handles a platform API error event.
     *
     * @description
     * Implement this method to define custom error handling logic. The method receives
     * a PlatformApiErrorEvent containing complete context about the failed API request,
     * including the endpoint, payload, and detailed error information.
     *
     * **Implementation Guidelines:**
     * - Check error codes to determine appropriate handling strategy
     * - Avoid throwing exceptions (may break other handlers)
     * - Consider async operations for non-blocking processing
     * - Log important error details for debugging
     * - Provide user feedback when appropriate
     *
     * @param event - The API error event containing request context and error details
     *
     * @example
     * ```typescript
     * public handle(event: PlatformApiErrorEvent): void {
     *   // Check error type and apply appropriate handling
     *   switch (event.apiError.error.code) {
     *     case PlatformApiServiceErrorInfoCode.PlatformPermissionException:
     *       this.handleAuthError(event);
     *       break;
     *     case PlatformApiServiceErrorInfoCode.PlatformValidationException:
     *       this.handleValidationError(event);
     *       break;
     *     case PlatformApiServiceErrorInfoCode.ConnectionRefused:
     *       this.handleNetworkError(event);
     *       break;
     *     default:
     *       this.handleGenericError(event);
     *   }
     * }
     * ```
     */
    public abstract override handle(event: PlatformApiErrorEvent): void;
}

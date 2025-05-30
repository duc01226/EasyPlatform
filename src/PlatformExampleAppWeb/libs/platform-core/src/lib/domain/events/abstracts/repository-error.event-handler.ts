import { PlatformEventHandler } from '../../../events';
import { PlatformRepositoryErrorEvent } from '../repository-error.event';

/**
 * Abstract base class for handling repository error events in the platform domain layer.
 *
 * @description
 * This abstract class provides the foundation for implementing custom error handlers
 * that respond to repository operation failures. It extends the platform's event
 * handling system to enable reactive, decoupled error processing throughout the
 * application architecture.
 *
 * **Key Features:**
 * - **Type-Safe Error Handling**: Strongly typed for repository error events
 * - **Event-Driven Architecture**: Enables loose coupling between error occurrence and handling
 * - **Multiple Handler Support**: Multiple handlers can process the same error event
 * - **Centralized Registration**: Handlers are registered through the module system
 * - **Context Preservation**: Full access to error context including request details
 *
 * **Handler Execution Model:**
 * When a repository error occurs:
 * 1. `PlatformRepository.handleApiError()` publishes a `PlatformRepositoryErrorEvent`
 * 2. `PlatformEventManager` discovers all registered error handlers
 * 3. Each handler's `handle()` method is invoked with the error event
 * 4. Handlers can process errors independently (logging, notifications, recovery)
 * 5. Multiple handlers can respond to the same error for different concerns
 *
 * **Error Handling Patterns:**
 * - **Global Handlers**: Process all repository errors for cross-cutting concerns
 * - **Domain-Specific Handlers**: Handle errors for specific business domains
 * - **Operation-Specific Handlers**: Target specific repository operations
 * - **Error-Type Handlers**: Focus on particular error types (auth, validation, network)
 *
 * @example
 * **Basic Error Handler Implementation:**
 * ```typescript
 * @Injectable()
 * export class UserRepositoryErrorHandler extends PlatformRepositoryErrorEventHandler {
 *   constructor(
 *     private notificationService: NotificationService,
 *     private logger: Logger
 *   ) {
 *     super();
 *   }
 *
 *   handle(event: PlatformRepositoryErrorEvent): void {
 *     // Log all user repository errors
 *     this.logger.error(`User repository error: ${event.repositoryRequestName}`, {
 *       payload: event.repositoryRequestPayload,
 *       status: event.apiError.statusCode,
 *       message: event.apiError.error.message
 *     });
 *
 *     // Show user-friendly notifications
 *     switch (event.repositoryRequestName) {
 *       case 'getUserProfile':
 *         this.notificationService.showError('Unable to load user profile');
 *         break;
 *       case 'updateUserProfile':
 *         this.notificationService.showError('Failed to save profile changes');
 *         break;
 *       case 'getUserPermissions':
 *         this.notificationService.showWarning('Permission check failed');
 *         break;
 *       default:
 *         this.notificationService.showError('User operation failed');
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Global Error Handler for Common Scenarios:**
 * ```typescript
 * @Injectable()
 * export class GlobalRepositoryErrorHandler extends PlatformRepositoryErrorEventHandler {
 *   constructor(
 *     private authService: AuthService,
 *     private router: Router,
 *     private notificationService: NotificationService,
 *     private connectivityService: ConnectivityService
 *   ) {
 *     super();
 *   }
 *
 *   handle(event: PlatformRepositoryErrorEvent): void {
 *     const { apiError } = event;
 *
 *     // Handle authentication/authorization errors
 *     if (apiError.statusCode === HttpStatusCode.Unauthorized) {
 *       this.authService.logout();
 *       this.router.navigate(['/login']);
 *       this.notificationService.showError('Session expired. Please log in again.');
 *       return;
 *     }
 *
 *     if (apiError.statusCode === HttpStatusCode.Forbidden) {
 *       this.router.navigate(['/no-permission']);
 *       return;
 *     }
 *
 *     // Handle network connectivity issues
 *     if (apiError.error.code === PlatformApiServiceErrorInfoCode.ConnectionRefused) {
 *       this.connectivityService.setOfflineMode(true);
 *       this.notificationService.showWarning('Connection lost. Working in offline mode.');
 *       return;
 *     }
 *
 *     // Handle server errors
 *     if (apiError.statusCode >= 500) {
 *       this.notificationService.showError('Server error. Please try again later.');
 *       // Could trigger retry logic or circuit breaker here
 *       return;
 *     }
 *
 *     // Handle validation errors
 *     if (apiError.statusCode === HttpStatusCode.BadRequest) {
 *       // Let specific handlers deal with validation details
 *       return;
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Domain-Specific Error Handler:**
 * ```typescript
 * @Injectable()
 * export class OrderManagementErrorHandler extends PlatformRepositoryErrorEventHandler {
 *   constructor(
 *     private orderService: OrderService,
 *     private analyticsService: AnalyticsService,
 *     private notificationService: NotificationService
 *   ) {
 *     super();
 *   }
 *
 *   handle(event: PlatformRepositoryErrorEvent): void {
 *     // Only handle order-related errors
 *     if (!this.isOrderRelatedError(event.repositoryRequestName)) {
 *       return;
 *     }
 *
 *     // Track error analytics
 *     this.analyticsService.trackError('order_repository_error', {
 *       operation: event.repositoryRequestName,
 *       statusCode: event.apiError.statusCode,
 *       errorCode: event.apiError.error.code
 *     });
 *
 *     // Handle specific order operations
 *     switch (event.repositoryRequestName) {
 *       case 'createOrder':
 *         this.handleOrderCreationError(event);
 *         break;
 *       case 'updateOrderStatus':
 *         this.handleOrderStatusError(event);
 *         break;
 *       case 'cancelOrder':
 *         this.handleOrderCancellationError(event);
 *         break;
 *       case 'getOrderHistory':
 *         this.notificationService.showWarning('Unable to load order history');
 *         break;
 *     }
 *   }
 *
 *   private isOrderRelatedError(requestName: string): boolean {
 *     return requestName.toLowerCase().includes('order');
 *   }
 *
 *   private handleOrderCreationError(event: PlatformRepositoryErrorEvent): void {
 *     if (event.apiError.statusCode === HttpStatusCode.BadRequest) {
 *       this.notificationService.showError('Invalid order data. Please check your input.');
 *     } else {
 *       this.notificationService.showError('Failed to create order. Please try again.');
 *       // Could save order as draft for later retry
 *       this.orderService.saveDraftOrder(event.repositoryRequestPayload);
 *     }
 *   }
 *
 *   private handleOrderStatusError(event: PlatformRepositoryErrorEvent): void {
 *     this.notificationService.showError('Failed to update order status');
 *     // Could trigger a refresh to get current status
 *     this.orderService.refreshOrderStatus(event.repositoryRequestPayload.orderId);
 *   }
 *
 *   private handleOrderCancellationError(event: PlatformRepositoryErrorEvent): void {
 *     if (event.apiError.statusCode === HttpStatusCode.Conflict) {
 *       this.notificationService.showError('Order cannot be cancelled at this time');
 *     } else {
 *       this.notificationService.showError('Failed to cancel order');
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Handler Registration in Module:**
 * ```typescript
 * @NgModule({
 *   imports: [
 *     PlatformDomainModule.forRoot({
 *       // Register multiple error handlers
 *       repositoryErrorEventHandlers: [
 *         // Global handler for common scenarios
 *         GlobalRepositoryErrorHandler,
 *
 *         // Domain-specific handlers
 *         UserRepositoryErrorHandler,
 *         OrderManagementErrorHandler,
 *         PaymentRepositoryErrorHandler,
 *
 *         // Application-specific handlers
 *         NoPermissionRepositoryErrorHandler,
 *         OfflineModeErrorHandler
 *       ]
 *     })
 *   ]
 * })
 * export class AppModule { }
 * ```
 *
 * @example
 * **Error Recovery Handler:**
 * ```typescript
 * @Injectable()
 * export class RetryRepositoryErrorHandler extends PlatformRepositoryErrorEventHandler {
 *   private retryAttempts = new Map<string, number>();
 *   private readonly maxRetries = 3;
 *   private readonly retryDelay = 1000;
 *
 *   constructor(
 *     private injector: Injector,
 *     private logger: Logger
 *   ) {
 *     super();
 *   }
 *
 *   handle(event: PlatformRepositoryErrorEvent): void {
 *     // Only retry on transient errors
 *     if (!this.isRetryableError(event.apiError)) {
 *       return;
 *     }
 *
 *     const retryKey = `${event.repositoryRequestName}-${JSON.stringify(event.repositoryRequestPayload)}`;
 *     const attempts = this.retryAttempts.get(retryKey) || 0;
 *
 *     if (attempts < this.maxRetries) {
 *       this.retryAttempts.set(retryKey, attempts + 1);
 *
 *       setTimeout(() => {
 *         this.retryOperation(event);
 *       }, this.retryDelay * Math.pow(2, attempts)); // Exponential backoff
 *     } else {
 *       this.retryAttempts.delete(retryKey);
 *       this.logger.error(`Max retry attempts reached for ${event.repositoryRequestName}`);
 *     }
 *   }
 *
 *   private isRetryableError(apiError: PlatformApiServiceErrorResponse): boolean {
 *     // Retry on network errors or server errors, but not client errors
 *     return apiError.statusCode >= 500 ||
 *            apiError.error.code === PlatformApiServiceErrorInfoCode.ConnectionRefused;
 *   }
 *
 *   private retryOperation(event: PlatformRepositoryErrorEvent): void {
 *     // Would need repository injection or service location to retry
 *     this.logger.info(`Retrying operation: ${event.repositoryRequestName}`);
 *   }
 * }
 * ```
 *
 * **Best Practices:**
 *
 * 1. **Handler Specificity**: Create specific handlers for different concerns
 *    - Global handlers for system-wide errors (auth, network)
 *    - Domain handlers for business-specific errors
 *    - Operation handlers for specific operations
 *
 * 2. **Error Categorization**: Handle different error types appropriately
 *    - 4xx errors: User/client issues (validation, permissions)
 *    - 5xx errors: Server issues (retryable)
 *    - Network errors: Connectivity issues (offline mode)
 *
 * 3. **User Experience**: Provide meaningful feedback
 *    - Show user-friendly error messages
 *    - Suggest corrective actions when possible
 *    - Maintain application state consistency
 *
 * 4. **Observability**: Include comprehensive logging and monitoring
 *    - Log error details for debugging
 *    - Track error patterns for system improvement
 *    - Monitor error rates and trends
 *
 * 5. **Recovery Strategies**: Implement appropriate recovery mechanisms
 *    - Retry transient errors with backoff
 *    - Fall back to cached data when available
 *    - Gracefully degrade functionality
 *
 * **Event Handler Lifecycle:**
 * - Handlers are registered during module initialization
 * - `PlatformEventManager` maintains handler registry
 * - Events are distributed synchronously to all handlers
 * - Handler execution order is not guaranteed
 * - Handlers should be idempotent and side-effect aware
 *
 * @see {@link PlatformRepositoryErrorEvent} - Event class that handlers process
 * @see {@link PlatformEventHandler} - Base event handler interface
 * @see {@link PlatformRepository.handleApiError} - Method that publishes error events
 * @see {@link PlatformDomainModule.forRoot} - Handler registration mechanism
 * @see {@link PlatformEventManager} - Event distribution system
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */
export abstract class PlatformRepositoryErrorEventHandler extends PlatformEventHandler<PlatformRepositoryErrorEvent> {
    /**
     * Handles a repository error event with custom error processing logic.
     *
     * @description
     * This method must be implemented by concrete error handler classes to define
     * specific error handling behavior. The method is called automatically by the
     * platform's event system when a repository error occurs.
     *
     * **Implementation Guidelines:**
     * - Handle errors based on error type, operation, or domain context
     * - Provide user-friendly feedback through notifications or UI updates
     * - Log errors appropriately for debugging and monitoring
     * - Implement recovery strategies when applicable
     * - Consider error propagation and whether to suppress or re-throw
     *
     * **Event Context Available:**
     * - `event.repositoryRequestName`: Method name that failed
     * - `event.repositoryRequestPayload`: Original request data
     * - `event.apiError`: Complete error response with status and details
     *
     * @param event - The repository error event containing all error context
     *
     * @example
     * ```typescript
     * handle(event: PlatformRepositoryErrorEvent): void {
     *   const { repositoryRequestName, repositoryRequestPayload, apiError } = event;
     *
     *   // Log the error for debugging
     *   this.logger.error('Repository error occurred', {
     *     operation: repositoryRequestName,
     *     payload: repositoryRequestPayload,
     *     status: apiError.statusCode,
     *     message: apiError.error.message
     *   });
     *
     *   // Handle based on error type
     *   if (apiError.statusCode === HttpStatusCode.Unauthorized) {
     *     this.handleAuthError();
     *   } else if (apiError.statusCode === HttpStatusCode.BadRequest) {
     *     this.handleValidationError(apiError.error.validationErrors);
     *   } else {
     *     this.handleGenericError(apiError.error.message);
     *   }
     * }
     * ```
     */
    public abstract override handle(event: PlatformRepositoryErrorEvent): void;
}

import { PlatformApiServiceErrorResponse } from '../../api-services';
import { PlatformEvent } from '../../events';

/**
 * Repository Error Event for centralized error handling in the platform domain layer.
 *
 * @description
 * This event is published whenever a repository operation encounters an API error,
 * providing a centralized mechanism for error handling, logging, and user notification
 * across the entire platform. It extends the platform's event system to enable
 * reactive error processing and recovery strategies.
 *
 * **Key Features:**
 * - **Centralized Error Handling**: Single point for processing all repository errors
 * - **Contextual Information**: Includes request name and payload for detailed error context
 * - **Event-Driven Architecture**: Enables loose coupling between error occurrence and handling
 * - **Extensible Processing**: Supports multiple error handlers for different scenarios
 * - **Audit Trail**: Automatic tracking of error events for monitoring and debugging
 *
 * **Error Event Flow:**
 * 1. Repository method encounters API error
 * 2. Repository calls `handleApiError()` method
 * 3. `PlatformRepositoryErrorEvent` is created and published
 * 4. Registered error handlers receive and process the event
 * 5. Handlers can show notifications, log errors, or trigger recovery actions
 *
 * **Error Context Preservation:**
 * The event preserves complete context about the failed operation:
 * - `repositoryRequestName`: Identifies which repository method failed
 * - `repositoryRequestPayload`: Contains the original request data
 * - `apiError`: Full API error response with status codes and messages
 *
 * @example
 * **Event Publishing (Internal - handled by PlatformRepository):**
 * ```typescript
 * // This happens automatically in PlatformRepository.handleApiError()
 * try {
 *   return await this.apiService.getUsers(query);
 * } catch (error) {
 *   if (error instanceof PlatformApiServiceErrorResponse) {
 *     // Event is automatically published here
 *     this.eventManager.publish(new PlatformRepositoryErrorEvent(
 *       'getUsers',
 *       query,
 *       error
 *     ));
 *   }
 *   throw error;
 * }
 * ```
 *
 * @example
 * **Error Handler Implementation:**
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
 *     // Log error for debugging
 *     this.logger.error('Repository error', {
 *       request: event.repositoryRequestName,
 *       payload: event.repositoryRequestPayload,
 *       status: event.apiError.statusCode,
 *       message: event.apiError.error.message
 *     });
 *
 *     // Handle specific error scenarios
 *     switch (event.repositoryRequestName) {
 *       case 'getUsers':
 *         this.notificationService.showError('Failed to load users. Please try again.');
 *         break;
 *       case 'createUser':
 *         this.notificationService.showError('Failed to create user. Please check your input.');
 *         break;
 *       default:
 *         this.notificationService.showError('An unexpected error occurred.');
 *     }
 *
 *     // Handle specific error types
 *     if (event.apiError.statusCode === HttpStatusCode.Unauthorized) {
 *       this.authService.redirectToLogin();
 *     } else if (event.apiError.statusCode === HttpStatusCode.Forbidden) {
 *       this.router.navigate(['/no-permission']);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Handler Registration:**
 * ```typescript
 * @NgModule({
 *   imports: [
 *     PlatformDomainModule.forRoot({
 *       repositoryErrorEventHandlers: [
 *         UserRepositoryErrorHandler,
 *         OrderRepositoryErrorHandler,
 *         GlobalRepositoryErrorHandler
 *       ]
 *     })
 *   ]
 * })
 * export class AppModule { }
 * ```
 *
 * @example
 * **Real-world Usage Patterns:**
 * ```typescript
 * // Global error handler for common scenarios
 * @Injectable()
 * export class GlobalRepositoryErrorHandler extends PlatformRepositoryErrorEventHandler {
 *   handle(event: PlatformRepositoryErrorEvent): void {
 *     // Handle network errors
 *     if (event.apiError.error.code === PlatformApiServiceErrorInfoCode.ConnectionRefused) {
 *       this.showOfflineMessage();
 *       return;
 *     }
 *
 *     // Handle authorization errors
 *     if (event.apiError.statusCode === HttpStatusCode.Unauthorized) {
 *       this.authService.logout();
 *       return;
 *     }
 *
 *     // Handle validation errors
 *     if (event.apiError.statusCode === HttpStatusCode.BadRequest) {
 *       this.handleValidationErrors(event.apiError.error.validationErrors);
 *       return;
 *     }
 *
 *     // Default error handling
 *     this.showGenericError(event.apiError.error.message);
 *   }
 * }
 *
 * // Specific handler for user management errors
 * @Injectable()
 * export class UserManagementErrorHandler extends PlatformRepositoryErrorEventHandler {
 *   handle(event: PlatformRepositoryErrorEvent): void {
 *     // Only handle user-related repository errors
 *     if (!event.repositoryRequestName.toLowerCase().includes('user')) {
 *       return;
 *     }
 *
 *     // Show user-friendly messages
 *     switch (event.repositoryRequestName) {
 *       case 'updateUserProfile':
 *         this.notificationService.showError('Failed to update profile. Please try again.');
 *         this.analyticsService.track('profile_update_error', {
 *           error: event.apiError.error.message,
 *           userId: event.repositoryRequestPayload.userId
 *         });
 *         break;
 *       case 'getUserPermissions':
 *         this.notificationService.showWarning('Unable to load permissions. Some features may be unavailable.');
 *         break;
 *     }
 *   }
 * }
 * ```
 *
 * **Integration Points:**
 * - **PlatformRepository**: Automatically publishes this event on API errors
 * - **PlatformEventManager**: Distributes event to registered handlers
 * - **PlatformDomainModule**: Provides registration mechanism for error handlers
 * - **Application Modules**: Register domain-specific error handlers
 *
 * **Error Recovery Patterns:**
 * - **Retry Logic**: Handlers can implement automatic retry for transient errors
 * - **Fallback Data**: Load cached or default data when live data fails
 * - **User Guidance**: Show specific instructions based on error type
 * - **Analytics**: Track error patterns for system improvement
 * - **Circuit Breaker**: Temporarily disable failing operations
 *
 * @see {@link PlatformRepositoryErrorEventHandler} - Abstract base class for error handlers
 * @see {@link PlatformRepository.handleApiError} - Method that publishes this event
 * @see {@link PlatformApiServiceErrorResponse} - API error response structure
 * @see {@link PlatformEventManager} - Event distribution system
 * @see {@link PlatformDomainModule.forRoot} - Handler registration method
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */
export class PlatformRepositoryErrorEvent extends PlatformEvent {
    /**
     * Creates a new repository error event.
     *
     * @param repositoryRequestName - Name of the repository method that failed (e.g., 'getUsers', 'createOrder')
     * @param repositoryRequestPayload - Original request payload (query parameters, command data, etc.)
     * @param apiError - Complete API error response with status code, message, and additional details
     *
     * @example
     * ```typescript
     * // Example event creation (handled internally by repository)
     * const event = new PlatformRepositoryErrorEvent(
     *   'getUserById',
     *   { userId: '123' },
     *   new PlatformApiServiceErrorResponse(404, 'User not found')
     * );
     * ```
     */
    public constructor(
        public repositoryRequestName: string,
        public repositoryRequestPayload: unknown,
        public apiError: PlatformApiServiceErrorResponse
    ) {
        super(repositoryRequestName);
    }
}

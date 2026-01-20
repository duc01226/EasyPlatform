import { HttpStatusCode } from '@angular/common/http';
import { pipe, pipeAction } from '../../utils';

/**
 * Interface defining the structure for platform API service error responses.
 *
 * @description
 * This interface standardizes the format of error responses returned from
 * platform API services, ensuring consistent error handling across the application.
 *
 * @example
 * ```typescript
 * const errorResponse: IPlatformApiServiceErrorResponse = {
 *   error: {
 *     code: PlatformApiServiceErrorInfoCode.PlatformValidationException,
 *     message: 'Invalid user data provided'
 *   },
 *   statusCode: HttpStatusCode.BadRequest,
 *   requestId: 'req-12345-abc'
 * };
 * ```
 */
export interface IPlatformApiServiceErrorResponse {
    /** Detailed error information */
    error: IPlatformApiServiceErrorInfo;
    /** HTTP status code associated with the error */
    statusCode?: HttpStatusCode;
    /** Unique identifier for tracking the request that caused the error */
    requestId: string;
}

/**
 * Concrete implementation of platform API service error response.
 *
 * @description
 * This class encapsulates API error responses with standardized error information,
 * HTTP status codes, and request tracking capabilities. It provides methods for
 * formatting error messages and handling both API-specific and general application errors.
 *
 * **Key Features:**
 * - **Standardized Error Structure**: Consistent error format across all API services
 * - **Request Tracking**: Unique request IDs for error correlation and debugging
 * - **Message Formatting**: Built-in methods for user-friendly error messages
 * - **Error Classification**: Distinguishes between application and system errors
 *
 * **Error Response Flow:**
 * 1. API call fails with HTTP error
 * 2. Error interceptor creates PlatformApiServiceErrorResponse
 * 3. Error response includes structured error info + request context
 * 4. Error handlers process based on error type and severity
 *
 * @example
 * **Creating error responses:**
 * ```typescript
 * // From API response
 * const apiErrorResponse = new PlatformApiServiceErrorResponse({
 *   error: {
 *     code: PlatformApiServiceErrorInfoCode.PlatformValidationException,
 *     message: 'Email address is required'
 *   },
 *   statusCode: HttpStatusCode.BadRequest,
 *   requestId: 'req-67890-def'
 * });
 *
 * // Get formatted message
 * const message = apiErrorResponse.getDefaultFormattedMessage();
 * // Output: "Email address is required | RequestId: req-67890-def"
 * ```
 *
 * @example
 * **Error handling in services:**
 * ```typescript
 * @Injectable()
 * export class UserService extends PlatformApiService {
 *   createUser(user: CreateUserRequest): Observable<User> {
 *     return this.post<User>('/users', user).pipe(
 *       catchError((error: PlatformApiServiceErrorResponse) => {
 *         if (error.error.code === PlatformApiServiceErrorInfoCode.PlatformValidationException) {
 *           this.handleValidationError(error);
 *         }
 *         return throwError(() => error);
 *       })
 *     );
 *   }
 * }
 * ```
 */
export class PlatformApiServiceErrorResponse {
    /**
     * Creates a new PlatformApiServiceErrorResponse instance.
     *
     * @param data - Optional error response data to initialize the instance
     *
     * @example
     * ```typescript
     * // Empty error response
     * const emptyError = new PlatformApiServiceErrorResponse();
     *
     * // Initialized error response
     * const validationError = new PlatformApiServiceErrorResponse({
     *   error: {
     *     code: PlatformApiServiceErrorInfoCode.PlatformValidationException,
     *     message: 'Invalid input data'
     *   },
     *   statusCode: HttpStatusCode.BadRequest,
     *   requestId: 'req-123'
     * });
     * ```
     */
    public constructor(data?: IPlatformApiServiceErrorResponse) {
        if (data != null) {
            if (data.error != null) this.error = new PlatformApiServiceErrorInfo(data.error);
            if (data.statusCode != null) this.statusCode = data.statusCode;
        }
        this.requestId = data?.requestId ?? '';
    }

    /** Structured error information */
    public error: PlatformApiServiceErrorInfo = new PlatformApiServiceErrorInfo();
    /** HTTP status code associated with the error */
    public statusCode?: HttpStatusCode;
    /** Unique request identifier for error tracking */
    public requestId: string;

    /**
     * Generates a formatted error message for both API errors and general exceptions.
     *
     * @description
     * This static method provides a unified way to format error messages from different
     * error types. For general JavaScript errors, it displays stack traces in an alert.
     * For API errors, it delegates to the instance method for proper formatting.
     *
     * @param errorResponse - Either a PlatformApiServiceErrorResponse or general Error
     * @returns Formatted error message string
     *
     * @example
     * ```typescript
     * // For API errors
     * const apiError = new PlatformApiServiceErrorResponse({...});
     * const apiMessage = PlatformApiServiceErrorResponse.getDefaultFormattedMessage(apiError);
     *
     * // For general errors
     * const jsError = new Error('Something went wrong');
     * const errorMessage = PlatformApiServiceErrorResponse.getDefaultFormattedMessage(jsError);
     * // Shows alert with stack trace
     * ```
     */
    public static getDefaultFormattedMessage(errorResponse: PlatformApiServiceErrorResponse | Error): string {
        return errorResponse instanceof Error
            ? pipe(`[ERROR] Something went wrong, app has been crashed.\n\n${errorResponse.stack}`, [pipeAction<string>(errorMessage => alert(errorMessage))])
            : errorResponse.getDefaultFormattedMessage();
    }

    /**
     * Formats the error message for display to users.
     *
     * @description
     * Creates a user-friendly error message by combining the error message with
     * request ID information (when applicable). Request IDs are excluded for
     * application errors to avoid confusing users with technical details.
     *
     * @returns Formatted error message string
     *
     * @example
     * ```typescript
     * // Application error (no request ID shown)
     * const appError = new PlatformApiServiceErrorResponse({
     *   error: {
     *     code: PlatformApiServiceErrorInfoCode.PlatformValidationException,
     *     message: 'Email is required'
     *   },
     *   requestId: 'req-123'
     * });
     * console.log(appError.getDefaultFormattedMessage());
     * // Output: "Email is required"
     *
     * // System error (includes request ID)
     * const systemError = new PlatformApiServiceErrorResponse({
     *   error: {
     *     code: PlatformApiServiceErrorInfoCode.InternalServerException,
     *     message: 'Database connection failed'
     *   },
     *   requestId: 'req-456'
     * });
     * console.log(systemError.getDefaultFormattedMessage());
     * // Output: "Database connection failed | RequestId: req-456"
     * ```
     */
    public getDefaultFormattedMessage(): string {
        if (this.error.message == undefined) return '';
        const requestIdInfoMessagePart = this.requestId != '' && !this.error.isApplicationError() ? ` | RequestId: ${this.requestId}` : '';
        return `${this.error.message}${requestIdInfoMessagePart}`;
    }
}

/**
 * Interface defining the structure for detailed platform API error information.
 *
 * @description
 * This interface provides a comprehensive structure for API error details,
 * including error codes, messages, validation details, and nested error information.
 *
 * @example
 * ```typescript
 * const errorInfo: IPlatformApiServiceErrorInfo = {
 *   code: PlatformApiServiceErrorInfoCode.PlatformValidationException,
 *   message: 'Validation failed for user data',
 *   target: 'CreateUserRequest',
 *   details: [
 *     {
 *       code: 'EmailRequired',
 *       message: 'Email field is required',
 *       target: 'Email'
 *     }
 *   ]
 * };
 * ```
 */
export interface IPlatformApiServiceErrorInfo {
    /** Error code identifying the type of error */
    code: PlatformApiServiceErrorInfoCode | string;
    /** Human-readable error message */
    message?: string;
    /** Key-value pairs for message placeholder replacement */
    formattedMessagePlaceholderValues?: Map<string, string>;
    /** Technical error message for developers */
    developerExceptionMessage?: string;
    /** Target entity or field that caused the error */
    target?: string;
    /** Nested error details for complex validation scenarios */
    details?: IPlatformApiServiceErrorInfo[];
}

/**
 * Concrete implementation of platform API service error information.
 *
 * @description
 * This class provides detailed error information for API failures, including
 * error classification, message formatting, and support for nested error details.
 * It includes logic to distinguish between application errors (user-facing)
 * and system errors (technical).
 *
 * **Error Categories:**
 * - **Application Errors**: User-facing errors (validation, permissions, business rules)
 * - **System Errors**: Technical errors (connection, server, timeout)
 * - **Domain Errors**: Business logic violations
 * - **Infrastructure Errors**: Platform and system-level failures
 *
 * @example
 * **Simple error creation:**
 * ```typescript
 * const simpleError = new PlatformApiServiceErrorInfo({
 *   code: PlatformApiServiceErrorInfoCode.PlatformValidationException,
 *   message: 'Invalid email format'
 * });
 *
 * console.log(simpleError.isApplicationError()); // true
 * ```
 *
 * @example
 * **Complex validation error with details:**
 * ```typescript
 * const validationError = new PlatformApiServiceErrorInfo({
 *   code: PlatformApiServiceErrorInfoCode.PlatformValidationException,
 *   message: 'Multiple validation errors occurred',
 *   target: 'CreateUserRequest',
 *   details: [
 *     {
 *       code: 'EmailRequired',
 *       message: 'Email is required',
 *       target: 'Email'
 *     },
 *     {
 *       code: 'PasswordTooShort',
 *       message: 'Password must be at least 8 characters',
 *       target: 'Password'
 *     }
 *   ]
 * });
 * ```
 */
export class PlatformApiServiceErrorInfo implements IPlatformApiServiceErrorInfo {
    /**
     * Creates a new PlatformApiServiceErrorInfo instance.
     *
     * @param data - Optional partial error data to initialize the instance
     *
     * @example
     * ```typescript
     * // Empty error info
     * const emptyError = new PlatformApiServiceErrorInfo();
     *
     * // Initialized error info
     * const permissionError = new PlatformApiServiceErrorInfo({
     *   code: PlatformApiServiceErrorInfoCode.PlatformPermissionException,
     *   message: 'Access denied to resource',
     *   target: 'UserProfile'
     * });
     * ```
     */
    public constructor(data?: Partial<IPlatformApiServiceErrorInfo>) {
        if (data != null) {
            if (data.code != null) this.code = data.code;
            if (data.message != null) this.message = data.message;
            if (data.formattedMessagePlaceholderValues != null) this.formattedMessagePlaceholderValues = data.formattedMessagePlaceholderValues;
            if (data.target != null) this.target = data.target;
            if (data.details != null) this.details = data.details.map(p => new PlatformApiServiceErrorInfo(p));
        }
    }

    /** Error code identifying the specific type of error */
    public code: PlatformApiServiceErrorInfoCode | string = '';

    /** Human-readable error message */
    public message: string = '';

    /** Map of placeholder values for formatted message templates */
    public formattedMessagePlaceholderValues?: Map<string, string>;

    /** The target entity, field, or operation that caused the error */
    public target?: string;

    /** Array of nested error details for complex error scenarios */
    public details?: IPlatformApiServiceErrorInfo[];

    /**
     * Determines if this error is an application-level error.
     *
     * @description
     * Application errors are user-facing errors that typically result from:
     * - Input validation failures
     * - Business rule violations
     * - Permission denials
     * - Domain constraint violations
     *
     * These errors are safe to display to users and don't include request IDs
     * in formatted messages to avoid confusion.
     *
     * @returns True if this is an application error, false for system errors
     *
     * @example
     * ```typescript
     * const validationError = new PlatformApiServiceErrorInfo({
     *   code: PlatformApiServiceErrorInfoCode.PlatformValidationException
     * });
     * console.log(validationError.isApplicationError()); // true
     *
     * const serverError = new PlatformApiServiceErrorInfo({
     *   code: PlatformApiServiceErrorInfoCode.InternalServerException
     * });
     * console.log(serverError.isApplicationError()); // false
     * ```
     */
    public isApplicationError(): boolean {
        return (
            this.code == PlatformApiServiceErrorInfoCode.PlatformValidationException ||
            this.code == PlatformApiServiceErrorInfoCode.PlatformApplicationException ||
            this.code == PlatformApiServiceErrorInfoCode.PlatformApplicationValidationException ||
            this.code == PlatformApiServiceErrorInfoCode.PlatformDomainException ||
            this.code == PlatformApiServiceErrorInfoCode.PlatformDomainValidationException ||
            this.code == PlatformApiServiceErrorInfoCode.PlatformPermissionException
        );
    }
}

/**
 * Enumeration of standardized platform API service error codes.
 *
 * @description
 * This enum defines all possible error codes that can be returned by platform
 * API services. Error codes are categorized by their source and type to enable
 * appropriate error handling strategies.
 *
 * **Error Categories:**
 *
 * **Application Layer Errors:**
 * - `PlatformApplicationException`: General application logic errors
 * - `PlatformApplicationValidationException`: Application-level validation failures
 *
 * **Domain Layer Errors:**
 * - `PlatformDomainException`: Business rule violations
 * - `PlatformDomainValidationException`: Domain constraint violations
 *
 * **Security & Permission Errors:**
 * - `PlatformPermissionException`: Access denied, insufficient permissions
 * - `PlatformNotFoundException`: Requested resource not found
 *
 * **Validation Errors:**
 * - `PlatformValidationException`: Input validation failures
 *
 * **Infrastructure Errors:**
 * - `InternalServerException`: Server-side failures
 * - `ConnectionRefused`: Network connectivity issues
 * - `TimeoutError`: Request timeout exceeded
 * - `Unknown`: Unclassified errors
 *
 * @example
 * **Error handling by category:**
 * ```typescript
 * switch (error.error.code) {
 *   case PlatformApiServiceErrorInfoCode.PlatformPermissionException:
 *     this.authService.redirectToLogin();
 *     break;
 *
 *   case PlatformApiServiceErrorInfoCode.PlatformValidationException:
 *     this.displayValidationErrors(error.error.details);
 *     break;
 *
 *   case PlatformApiServiceErrorInfoCode.ConnectionRefused:
 *     this.showOfflineMode();
 *     break;
 *
 *   case PlatformApiServiceErrorInfoCode.InternalServerException:
 *     this.logErrorForSupport(error);
 *     this.showGenericErrorMessage();
 *     break;
 * }
 * ```
 *
 * @example
 * **Creating typed errors:**
 * ```typescript
 * // Permission error
 * const permissionError = new PlatformApiServiceErrorInfo({
 *   code: PlatformApiServiceErrorInfoCode.PlatformPermissionException,
 *   message: 'User does not have permission to access this resource'
 * });
 *
 * // Validation error with details
 * const validationError = new PlatformApiServiceErrorInfo({
 *   code: PlatformApiServiceErrorInfoCode.PlatformValidationException,
 *   message: 'Validation failed',
 *   details: [
 *     { code: 'EmailInvalid', message: 'Email format is invalid' }
 *   ]
 * });
 * ```
 */
export enum PlatformApiServiceErrorInfoCode {
    /** Access denied - user lacks required permissions */
    PlatformPermissionException = 'PlatformPermissionException',
    /** Requested resource was not found */
    PlatformNotFoundException = 'PlatformNotFoundException',

    /** General application logic error */
    PlatformApplicationException = 'PlatformApplicationException',
    /** Application-level validation failure */
    PlatformApplicationValidationException = 'PlatformApplicationValidationException',

    /** Business rule or domain constraint violation */
    PlatformDomainException = 'PlatformDomainException',
    /** Domain-level validation failure */
    PlatformDomainValidationException = 'PlatformDomainValidationException',

    /** Input validation error */
    PlatformValidationException = 'PlatformValidationException',

    /** Internal server error or system failure */
    InternalServerException = 'InternalServerException',
    /** Network connection refused or unavailable */
    ConnectionRefused = 'ConnectionRefused',
    /** Request timeout exceeded */
    TimeoutError = 'TimeoutError',
    /** Unclassified or unknown error */
    Unknown = 'Unknown'
}

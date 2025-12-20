using System.Net;

namespace Easy.Platform.AspNetCore.ExceptionHandling;

/// <summary>
/// Represents a standardized error response structure for ASP.NET Core applications in the Easy.Platform.
/// This class provides a consistent format for error responses across all EasyPlatform microservices,
/// ensuring uniform error handling and client experience.
/// </summary>
/// <remarks>
/// This class is part of the platform's global exception handling infrastructure and provides:
/// - Standardized error response format across all platform services
/// - HTTP status code integration for proper REST API compliance
/// - Request correlation through request ID tracking
/// - Structured error information through PlatformAspNetMvcErrorInfo
/// - JSON serialization support for API responses
///
/// The error response structure includes:
/// - Detailed error information (message, code, validation details)
/// - HTTP status code for proper client handling
/// - Request ID for tracing and correlation across distributed systems
///
/// This format ensures that all platform services return consistent error responses,
/// making it easier for clients to handle errors uniformly regardless of which
/// microservice they're interacting with.
///
/// Usage:
/// This class is typically instantiated by the PlatformGlobalExceptionHandlerMiddleware
/// when formatting exception responses, but can also be used by controllers or
/// other components that need to return standardized error responses.
/// </remarks>
public class PlatformAspNetMvcErrorResponse
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformAspNetMvcErrorResponse"/> class
    /// with the specified error information, status code, and request identifier.
    /// </summary>
    /// <param name="error">
    /// The detailed error information containing message, code, and any validation details.
    /// This provides the core error data that will be returned to the client.
    /// </param>
    /// <param name="statusCode">
    /// The HTTP status code that corresponds to the error condition.
    /// This should follow REST API conventions (400 for bad requests, 500 for server errors, etc.).
    /// </param>
    /// <param name="requestId">
    /// The unique identifier for the request that caused this error.
    /// Used for tracing and correlation across distributed systems and logging.
    /// </param>
    /// <exception cref="ArgumentNullException">
    /// Thrown when <paramref name="error"/> or <paramref name="requestId"/> is null.
    /// </exception>
    public PlatformAspNetMvcErrorResponse(PlatformAspNetMvcErrorInfo error, HttpStatusCode statusCode, string requestId)
    {
        Error = error;
        StatusCode = (int)statusCode;
        RequestId = requestId;
    }

    /// <summary>
    /// Gets the detailed error information containing the error message, code, and any validation details.
    /// This property provides the core error data that describes what went wrong during request processing.
    /// </summary>
    /// <value>
    /// A <see cref="PlatformAspNetMvcErrorInfo"/> instance containing structured error information
    /// that can be used by clients to understand and handle the error appropriately.
    /// </value>
    public PlatformAspNetMvcErrorInfo Error { get; }

    /// <summary>
    /// Gets the HTTP status code that corresponds to this error response.
    /// This value indicates the type of error and helps clients handle the response appropriately.
    /// </summary>
    /// <value>
    /// An integer representing the HTTP status code (e.g., 400 for Bad Request, 500 for Internal Server Error).
    /// This follows standard REST API conventions for error status codes.
    /// </value>
    public int StatusCode { get; }

    /// <summary>
    /// Gets or sets the unique identifier for the request that generated this error response.
    /// This identifier is used for tracing, correlation, and debugging across distributed systems.
    /// </summary>
    /// <value>
    /// A string containing the unique request identifier, typically a ULID or GUID,
    /// that can be used to correlate this error with logs and traces across the platform.
    /// </value>
    public string RequestId { get; set; }
}

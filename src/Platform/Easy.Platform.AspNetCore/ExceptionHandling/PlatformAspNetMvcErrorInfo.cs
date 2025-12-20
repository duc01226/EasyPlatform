using Easy.Platform.Application.Exceptions;
using Easy.Platform.Common.Exceptions;
using Easy.Platform.Domain.Exceptions;

namespace Easy.Platform.AspNetCore.ExceptionHandling;

/// <summary>
/// Provides detailed error information for ASP.NET Core error responses in the Easy.Platform.
/// This class encapsulates error details including error codes, messages, and validation information
/// that can be safely returned to clients while protecting sensitive system information.
/// </summary>
/// <remarks>
/// This class is a key component of the platform's error handling infrastructure and provides:
/// - Structured error information with codes and messages
/// - Support for both user-friendly and developer-specific error details
/// - Validation error details for form and input validation failures
/// - Message placeholder values for localized error messages
/// - Hierarchical error structures with nested error details
/// - Safe error message handling that protects sensitive information
///
/// Key features:
/// - Standardized error codes for consistent error identification
/// - Environment-aware error message handling (detailed in dev, sanitized in production)
/// - Support for validation error collections with field-specific details
/// - Message templating with placeholder value support for localization
/// - Exception type mapping for platform-specific exceptions
/// - Safe fallback messages for unexpected errors
///
/// The class supports multiple error scenarios:
/// - Domain validation exceptions with field-specific errors
/// - Application layer exceptions with business rule violations
/// - General platform exceptions with standardized error codes
/// - Unknown system exceptions with safe error messages
///
/// Error information hierarchy:
/// - Code: A standardized error identifier for client handling
/// - Message: User-friendly error description appropriate for display
/// - Target: The specific field or resource that caused the error
/// - Details: Collection of nested error information for complex validation scenarios
/// - DeveloperExceptionMessage: Detailed technical information (development only)
/// </remarks>
public class PlatformAspNetMvcErrorInfo
{
    private const string DefaultServerErrorMessage = "There is an unexpected error during the processing of the request. Please try again or contact the Administrator for help.";

    /// <summary>
    ///     One of a server-defined set of error types.
    /// </summary>
    public string Code { get; set; }

    public string Message { get; set; }

    public string DeveloperExceptionMessage { get; set; }

    public Dictionary<string, object> FormattedMessagePlaceholderValues { get; set; }

    /// <summary>
    ///     The target of the error.
    /// </summary>
    public string Target { get; set; }

    public List<PlatformAspNetMvcErrorInfo> Details { get; set; }

    public static PlatformAspNetMvcErrorInfo FromUnknownException(Exception exception, bool developerExceptionEnabled)
    {
        return new PlatformAspNetMvcErrorInfo
        {
            Code = "InternalServerException",
            Message = DefaultServerErrorMessage,
            DeveloperExceptionMessage = developerExceptionEnabled ? exception.ToString() : null,
        };
    }

    public static PlatformAspNetMvcErrorInfo FromValidationException(IPlatformValidationException validationException, bool developerExceptionEnabled)
    {
        return new PlatformAspNetMvcErrorInfo
        {
            Code = validationException.GetType().Name,
            Message = validationException.Message,
            DeveloperExceptionMessage = developerExceptionEnabled ? validationException.ToString() : null,
            Details = validationException
                .ValidationResult.AggregateErrors()
                .Select(p => new PlatformAspNetMvcErrorInfo
                {
                    Code = p.ErrorCode,
                    Message = p.ErrorMessage,
                    Target = p.PropertyName,
                    FormattedMessagePlaceholderValues = p.FormattedMessagePlaceholderValues,
                })
                .ToList(),
        };
    }

    public static PlatformAspNetMvcErrorInfo FromApplicationException(PlatformApplicationException applicationException, bool developerExceptionEnabled)
    {
        return new PlatformAspNetMvcErrorInfo
        {
            Code = applicationException.GetType().Name,
            Message = applicationException.Message,
            DeveloperExceptionMessage = developerExceptionEnabled ? applicationException.ToString() : null,
        };
    }

    public static PlatformAspNetMvcErrorInfo FromDomainException(PlatformDomainException domainException, bool developerExceptionEnabled)
    {
        return new PlatformAspNetMvcErrorInfo
        {
            Code = domainException.GetType().Name,
            Message = domainException.Message,
            DeveloperExceptionMessage = developerExceptionEnabled ? domainException.ToString() : null,
        };
    }

    public static PlatformAspNetMvcErrorInfo FromPermissionException(PlatformPermissionException permissionException, bool developerExceptionEnabled)
    {
        return new PlatformAspNetMvcErrorInfo
        {
            Code = permissionException.GetType().Name,
            Message = permissionException.Message,
            DeveloperExceptionMessage = developerExceptionEnabled ? permissionException.ToString() : null,
        };
    }

    public static PlatformAspNetMvcErrorInfo FromNotFoundException(PlatformNotFoundException domainNotFoundException, bool developerExceptionEnabled)
    {
        return new PlatformAspNetMvcErrorInfo
        {
            Code = nameof(PlatformNotFoundException),
            Message = domainNotFoundException.Message,
            DeveloperExceptionMessage = developerExceptionEnabled ? domainNotFoundException.ToString() : null,
        };
    }
}

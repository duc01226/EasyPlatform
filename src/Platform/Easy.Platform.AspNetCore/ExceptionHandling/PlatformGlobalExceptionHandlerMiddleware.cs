#region

using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Easy.Platform.Application;
using Easy.Platform.Application.Exceptions;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Middleware.Abstracts;
using Easy.Platform.Common;
using Easy.Platform.Common.Exceptions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.AspNetCore.ExceptionHandling;

/// <summary>
/// Global exception handling middleware that provides centralized error processing and response formatting
/// for all unhandled exceptions in the ASP.NET Core application pipeline.
/// </summary>
/// <remarks>
/// This middleware is a critical component of the Easy.Platform ASP.NET Core infrastructure that provides:
/// - Centralized exception handling for all HTTP requests
/// - Standardized error response formatting across all EasyPlatform microservices
/// - Exception logging with detailed context information
/// - Different error response formats based on environment (development vs production)
/// - Integration with platform request context for correlation and tracing
/// - Security-conscious error message filtering to prevent information disclosure
///
/// Key features:
/// - Catches all unhandled exceptions in the request pipeline
/// - Maps platform-specific exceptions to appropriate HTTP status codes
/// - Provides detailed error information in development environments
/// - Sanitized error responses in production environments
/// - Request context preservation for logging and correlation
/// - Integration with platform application context and request tracking
///
/// Exception handling flow:
/// 1. Catches unhandled exceptions from downstream middleware
/// 2. Logs exception details with request context for troubleshooting
/// 3. Maps exception types to appropriate HTTP status codes
/// 4. Formats standardized error responses using PlatformAspNetMvcErrorResponse
/// 5. Returns appropriate error information based on environment settings
///
/// Supported exception types:
/// - PlatformDomainException: Domain-specific business rule violations
/// - PlatformValidationException: Input validation failures
/// - PlatformApplicationException: Application layer exceptions
/// - PlatformException: General platform exceptions
/// - General .NET exceptions: Unexpected system errors
///
/// This middleware should be registered first in the ASP.NET Core pipeline to ensure
/// all exceptions are properly handled and logged.
/// </remarks>

/// <summary>
/// This middleware should be used it at the first level to catch general exception from any next middleware.
/// </summary>
public class PlatformGlobalExceptionHandlerMiddleware : PlatformMiddleware
{
    private readonly Lazy<ILogger> loggerLazy;

    public PlatformGlobalExceptionHandlerMiddleware(
        ILoggerFactory loggerFactory,
        IConfiguration configuration,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformApplicationSettingContext applicationSettingContext
    )
    {
        loggerLazy = new Lazy<ILogger>(() => loggerFactory.CreateLogger<PlatformGlobalExceptionHandlerMiddleware>());
        RequestContextAccessor = requestContextAccessor;
        ApplicationSettingContext = applicationSettingContext;
        Configuration = configuration;
    }

    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }
    protected IConfiguration Configuration { get; }
    protected ILogger Logger => loggerLazy.Value;
    protected IPlatformApplicationRequestContextAccessor RequestContextAccessor { get; }
    protected bool DeveloperExceptionEnabled => PlatformEnvironment.IsDevelopment || Configuration.GetValue<bool>("DeveloperExceptionEnabled");

    protected override async Task InternalInvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception e)
        {
            try
            {
                await OnException(context, e);
            }
            catch (Exception exception)
            {
                if (exception is OperationCanceledException or TaskCanceledException)
                {
                    Logger.LogWarning(
                        exception.BeautifyStackTrace(),
                        "Exception {Exception}. RequestId: {RequestId}. RequestContext: {@RequestContext}",
                        exception.GetType().Name,
                        context.TraceIdentifier,
                        RequestContextAccessor.Current.GetAllKeyValues()
                    );
                }
                else
                {
                    Logger.LogError(
                        exception.BeautifyStackTrace(),
                        "Exception {Exception}. RequestId: {RequestId}. RequestContext: {@RequestContext}",
                        exception.GetType().Name,
                        context.TraceIdentifier,
                        RequestContextAccessor.Current.GetAllKeyValues()
                    );
                }
            }
        }
    }

    protected virtual async Task OnException(HttpContext context, Exception exception)
    {
        HandleLogException(Logger, context, exception, RequestContextAccessor);

        if (exception is not (BadHttpRequestException or OperationCanceledException or TaskCanceledException))
        {
            var errorResponse = await exception
                .WhenIs<Exception, PlatformPermissionException, PlatformAspNetMvcErrorResponse>(permissionException => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromPermissionException(permissionException, DeveloperExceptionEnabled),
                    HttpStatusCode.Forbidden,
                    context.TraceIdentifier
                ))
                .WhenIs<IPlatformValidationException>(validationException => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromValidationException(validationException, DeveloperExceptionEnabled),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier
                ))
                .WhenIs<PlatformApplicationException>(applicationException => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromApplicationException(applicationException, DeveloperExceptionEnabled),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier
                ))
                .WhenIs<PlatformNotFoundException>(domainNotFoundException => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromNotFoundException(domainNotFoundException, DeveloperExceptionEnabled),
                    HttpStatusCode.NotFound,
                    context.TraceIdentifier
                ))
                .WhenIs<PlatformDomainException>(domainException => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromDomainException(domainException, DeveloperExceptionEnabled),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier
                ))
                .Else(exception => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromUnknownException(exception, DeveloperExceptionEnabled),
                    HttpStatusCode.InternalServerError,
                    context.TraceIdentifier
                ))
                .ExecuteAsync();

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = errorResponse.StatusCode;
            await context.Response.WriteAsync(
                PlatformJsonSerializer.Serialize(errorResponse, options => options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase),
                context.RequestAborted
            );
        }
    }

    public static void HandleLogException(ILogger logger, HttpContext context, Exception exception, IPlatformApplicationRequestContextAccessor requestContextAccessor)
    {
        switch (exception)
        {
            case BadHttpRequestException
            or OperationCanceledException
            or TaskCanceledException:
                logger.LogWarning(
                    exception.BeautifyStackTrace(),
                    "Exception {Exception}. RequestId: {RequestId}. RequestContext: {@RequestContext}",
                    exception.GetType().Name,
                    context.TraceIdentifier,
                    requestContextAccessor.Current.GetAllKeyValues()
                );
                break;
            case PlatformPermissionException
            or IPlatformValidationException
            or PlatformApplicationException
            or PlatformDomainException:
                LogKnownRequestWarning(logger, exception, context, requestContextAccessor);
                break;
            default:
                LogUnexpectedRequestError(logger, exception, context, requestContextAccessor);
                break;
        }
    }

    public static void LogKnownRequestWarning(ILogger logger, Exception exception, HttpContext context, IPlatformApplicationRequestContextAccessor requestContextAccessor)
    {
        logger.LogWarning(
            exception.BeautifyStackTrace(),
            "[KnownRequestWarning] There is a {ExceptionType} during the processing of the request. RequestId: {RequestId}. RequestContext: {@RequestContext}",
            exception.GetType(),
            context.TraceIdentifier,
            requestContextAccessor.Current.GetAllKeyValues()
        );
    }

    public static void LogUnexpectedRequestError(ILogger logger, Exception exception, HttpContext context, IPlatformApplicationRequestContextAccessor requestContextAccessor)
    {
        logger.LogError(
            exception.BeautifyStackTrace(),
            "[UnexpectedRequestError] There is an unexpected exception during the processing of the request. RequestId: {RequestId}. RequestContext: {@RequestContext}",
            context.TraceIdentifier,
            requestContextAccessor.Current.GetAllKeyValues()
        );
    }
}

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
/// This middleware should be used it at the first level to catch general exception from any next middleware.
/// </summary>
public class PlatformGlobalExceptionHandlerMiddleware : PlatformMiddleware
{
    private readonly Lazy<ILogger> loggerLazy;

    public PlatformGlobalExceptionHandlerMiddleware(
        ILoggerFactory loggerFactory,
        IConfiguration configuration,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformApplicationSettingContext applicationSettingContext)
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
                        RequestContextAccessor.Current.GetAllKeyValues());
                }
                else
                {
                    Logger.LogError(
                        exception.BeautifyStackTrace(),
                        "Exception {Exception}. RequestId: {RequestId}. RequestContext: {@RequestContext}",
                        exception.GetType().Name,
                        context.TraceIdentifier,
                        RequestContextAccessor.Current.GetAllKeyValues());
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
                    context.TraceIdentifier))
                .WhenIs<IPlatformValidationException>(validationException => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromValidationException(validationException, DeveloperExceptionEnabled),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier))
                .WhenIs<PlatformApplicationException>(applicationException => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromApplicationException(applicationException, DeveloperExceptionEnabled),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier))
                .WhenIs<PlatformNotFoundException>(domainNotFoundException => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromNotFoundException(domainNotFoundException, DeveloperExceptionEnabled),
                    HttpStatusCode.NotFound,
                    context.TraceIdentifier))
                .WhenIs<PlatformDomainException>(domainException => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromDomainException(domainException, DeveloperExceptionEnabled),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier))
                .Else(exception => new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromUnknownException(exception, DeveloperExceptionEnabled),
                    HttpStatusCode.InternalServerError,
                    context.TraceIdentifier))
                .ExecuteAsync();

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = errorResponse.StatusCode;
            await context.Response.WriteAsync(
                PlatformJsonSerializer.Serialize(errorResponse, options => options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase),
                context.RequestAborted);
        }
    }

    public static void HandleLogException(ILogger logger, HttpContext context, Exception exception, IPlatformApplicationRequestContextAccessor requestContextAccessor)
    {
        switch (exception)
        {
            case BadHttpRequestException or OperationCanceledException or TaskCanceledException:
                logger.LogWarning(
                    exception.BeautifyStackTrace(),
                    "Exception {Exception}. RequestId: {RequestId}. RequestContext: {@RequestContext}",
                    exception.GetType().Name,
                    context.TraceIdentifier,
                    requestContextAccessor.Current.GetAllKeyValues());
                break;
            case PlatformPermissionException or
                IPlatformValidationException or
                PlatformApplicationException or
                PlatformDomainException:
                LogKnownRequestWarning(logger, exception, context, requestContextAccessor);
                break;
            default:
                LogUnexpectedRequestError(logger, exception, context, requestContextAccessor);
                break;
        }
    }

    public static void LogKnownRequestWarning(
        ILogger logger,
        Exception exception,
        HttpContext context,
        IPlatformApplicationRequestContextAccessor requestContextAccessor)
    {
        logger.LogWarning(
            exception.BeautifyStackTrace(),
            "[KnownRequestWarning] There is a {ExceptionType} during the processing of the request. RequestId: {RequestId}. RequestContext: {@RequestContext}",
            exception.GetType(),
            context.TraceIdentifier,
            requestContextAccessor.Current.GetAllKeyValues());
    }

    public static void LogUnexpectedRequestError(
        ILogger logger,
        Exception exception,
        HttpContext context,
        IPlatformApplicationRequestContextAccessor requestContextAccessor)
    {
        logger.LogError(
            exception.BeautifyStackTrace(),
            "[UnexpectedRequestError] There is an unexpected exception during the processing of the request. RequestId: {RequestId}. RequestContext: {@RequestContext}",
            context.TraceIdentifier,
            requestContextAccessor.Current.GetAllKeyValues());
    }
}

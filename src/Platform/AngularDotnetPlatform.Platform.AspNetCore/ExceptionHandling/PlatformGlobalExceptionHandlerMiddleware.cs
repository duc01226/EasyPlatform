using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using AngularDotnetPlatform.Platform.AspNetCore.Middleware.Abstracts;
using AngularDotnetPlatform.Platform.Domain.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.AspNetCore.ExceptionHandling
{
    /// <summary>
    /// This middleware should be used it at the first level to catch general exception from any next middleware.
    /// </summary>
    public partial class PlatformGlobalExceptionHandlerMiddleware : PlatformMiddleware
    {
        private const string DefaultServerErrorMessage =
            "There is an unexpected error during the processing of the request. Please try again or contact the Administrator for help.";

        protected readonly ILogger Logger;
        private readonly bool developerExceptionEnabled;

        public PlatformGlobalExceptionHandlerMiddleware(
            RequestDelegate next,
            ILogger<PlatformGlobalExceptionHandlerMiddleware> logger,
            IConfiguration configuration) : base(next)
        {
            this.Logger = logger;
            developerExceptionEnabled = configuration.GetValue<bool>("DeveloperExceptionEnabled");
        }

        protected override async Task InternalInvokeAsync(HttpContext context)
        {
            try
            {
                await Next(context);
            }
            catch (Exception e)
            {
                await OnException(context, e);
            }
        }

        protected virtual Task OnException(HttpContext context, Exception exception)
        {
            if (!HandleApplicationError(context, exception, out var errorResponse) &&
                !HandleDomainError(context, exception, out errorResponse))
            {
                Log.UnexpectedRequestError(Logger, exception, context.TraceIdentifier);

                errorResponse = new PlatformAspNetMvcErrorResponse(
                    new PlatformAspNetMvcErrorInfo
                    {
                        Code = "InternalServerException",
                        Message = developerExceptionEnabled ? exception.ToString() : DefaultServerErrorMessage,
                    },
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier);
            }

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = errorResponse.StatusCode;
            return context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse, PlatformJsonSerializer.CurrentOptions.Value));
        }

        protected bool HandleApplicationError(HttpContext context, Exception exception, out PlatformAspNetMvcErrorResponse errorResponse)
        {
            if (exception is PlatformApplicationValidationException applicationValidationException)
            {
                errorResponse = new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromApplicationValidationException(applicationValidationException),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier);
                Log.KnownRequestWarning(Logger, applicationValidationException, context.TraceIdentifier);
                return true;
            }

            if (exception is PlatformApplicationException applicationException)
            {
                errorResponse = new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromApplicationException(applicationException),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier);
                Log.KnownRequestWarning(Logger, applicationException, context.TraceIdentifier);
                return true;
            }

            errorResponse = null;
            return false;
        }

        protected bool HandleDomainError(HttpContext context, Exception exception, out PlatformAspNetMvcErrorResponse errorResponse)
        {
            if (exception is PlatformDomainValidationException domainValidationException)
            {
                errorResponse = new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromDomainValidationException(domainValidationException),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier);
                Log.KnownRequestWarning(Logger, domainValidationException, context.TraceIdentifier);
                return true;
            }

            if (exception is PlatformDomainException domainException)
            {
                errorResponse = new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromDomainException(domainException),
                    HttpStatusCode.BadRequest,
                    context.TraceIdentifier);
                Log.KnownRequestWarning(Logger, domainException, context.TraceIdentifier);
                return true;
            }

            errorResponse = null;
            return false;
        }
    }

    /// <summary>
    /// This pattern was inspired by https://github.com/dotnet/aspnetcore/blob/master/src/SignalR/clients/csharp/Http.Connections.Client/src/HttpConnection.Log.cs.
    /// </summary>
    public partial class PlatformGlobalExceptionHandlerMiddleware
    {
        protected static class Log
        {
            private static readonly Action<ILogger, Exception, string> UnexpectedRequestErrorAction =
                (logger, exception, requestId) => LoggerMessage.Define(LogLevel.Error, new EventId(1, "UnexpectedRequestError"), $"[UnexpectedRequestError] There is an unexpected exception during the processing of the request. RequestId: {requestId}")(logger, exception);

            private static readonly Action<ILogger, string, Exception, string> KnownRequestWarningAction =
                (logger, exceptionType, exception, requestId) => LoggerMessage.Define(LogLevel.Warning, new EventId(2, "KnownRequestWarning"), $"[KnownRequestWarning] There is a {exceptionType} during the processing of the request. RequestId: {requestId}")(logger, exception);

            public static void UnexpectedRequestError(ILogger logger, Exception exception, string requestId)
            {
                UnexpectedRequestErrorAction(logger, exception, requestId);
            }

            public static void KnownRequestWarning<TException>(ILogger logger, TException exception, string requestId) where TException : Exception
            {
                KnownRequestWarningAction(logger, typeof(TException).Name, exception, requestId);
            }
        }
    }
}

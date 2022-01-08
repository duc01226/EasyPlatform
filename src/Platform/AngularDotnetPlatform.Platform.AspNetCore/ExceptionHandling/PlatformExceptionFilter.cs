using System;
using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using AngularDotnetPlatform.Platform.Common.Validators.Exceptions;
using AngularDotnetPlatform.Platform.Domain.Exceptions;

namespace AngularDotnetPlatform.Platform.AspNetCore.ExceptionHandling
{
    public partial class PlatformExceptionFilter : IExceptionFilter
    {
        private const string DefaultServerErrorMessage =
            "There is an unexpected error during the processing of the request. Please try again or contact the Administrator for help.";

        protected readonly ILogger Logger;
        private readonly bool developerExceptionEnabled;

        public PlatformExceptionFilter(ILogger<PlatformExceptionFilter> logger, IConfiguration configuration)
        {
            this.Logger = logger;
            developerExceptionEnabled = configuration.GetValue<bool>("DeveloperExceptionEnabled");
        }

        public void OnException(ExceptionContext context)
        {
            if (!HandleValidationError(context, out var errorResponse) &&
                !HandleApplicationError(context, out errorResponse) &&
                !HandleDomainError(context, out errorResponse))
            {
                Log.UnexpectedRequestError(Logger, context.Exception, context.HttpContext.TraceIdentifier);

                errorResponse = new PlatformAspNetMvcErrorResponse(
                    new PlatformAspNetMvcErrorInfo
                    {
                        Code = "InternalServerException",
                        Message = developerExceptionEnabled ? context.Exception.ToString() : DefaultServerErrorMessage,
                    },
                    HttpStatusCode.BadRequest,
                    context.HttpContext.TraceIdentifier);
            }

            context.Result = new JsonResult(errorResponse);
            context.HttpContext.Response.StatusCode = errorResponse.StatusCode;
            context.ExceptionHandled = true;
        }

        private bool HandleValidationError(ExceptionContext context, out PlatformAspNetMvcErrorResponse errorResponse)
        {
            if (context.Exception is IPlatformValidationException validationException)
            {
                errorResponse = new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromValidationException(validationException),
                    HttpStatusCode.BadRequest,
                    context.HttpContext.TraceIdentifier);
                Log.KnownRequestWarning(Logger, context.Exception, context.HttpContext.TraceIdentifier);
                return true;
            }

            errorResponse = null;
            return false;
        }

        private bool HandleApplicationError(ExceptionContext context, out PlatformAspNetMvcErrorResponse errorResponse)
        {
            if (context.Exception is PlatformApplicationException applicationException)
            {
                errorResponse = new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromApplicationException(applicationException),
                    HttpStatusCode.BadRequest,
                    context.HttpContext.TraceIdentifier);
                Log.KnownRequestWarning(Logger, context.Exception, context.HttpContext.TraceIdentifier);
                return true;
            }

            errorResponse = null;
            return false;
        }

        private bool HandleDomainError(ExceptionContext context, out PlatformAspNetMvcErrorResponse errorResponse)
        {
            if (context.Exception is PlatformDomainException domainException)
            {
                errorResponse = new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromDomainException(domainException),
                    HttpStatusCode.BadRequest,
                    context.HttpContext.TraceIdentifier);
                Log.KnownRequestWarning(Logger, domainException, context.HttpContext.TraceIdentifier);
                return true;
            }

            errorResponse = null;
            return false;
        }
    }

    /// <summary>
    /// This pattern was inspired by https://github.com/dotnet/aspnetcore/blob/master/src/SignalR/clients/csharp/Http.Connections.Client/src/HttpConnection.Log.cs.
    /// </summary>
    public partial class PlatformExceptionFilter
    {
        private static class Log
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

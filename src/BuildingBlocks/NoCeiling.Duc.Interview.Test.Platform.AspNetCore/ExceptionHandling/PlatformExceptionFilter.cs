using System;
using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NoCeiling.Duc.Interview.Test.Platform.Application.Exceptions;

namespace NoCeiling.Duc.Interview.Test.Platform.AspNetCore.ExceptionHandling
{
    public class PlatformExceptionFilter : IExceptionFilter
    {
        private const string DefaultServerErrorMessage =
            "There is an unexpected error during the processing of the request. Please try again or contact the Administrator for help.";
        private static readonly Action<ILogger, Exception, string> GeneralRequestError =
            (logger, exception, requestId) => LoggerMessage.Define(
                LogLevel.Error,
                new EventId(1, "GeneralRequestError"),
                $"There is an exception during the processing of the request. RequestId: {requestId}");

        private readonly ILogger logger;
        private readonly bool developerExceptionEnabled;

        public PlatformExceptionFilter(ILogger<PlatformExceptionFilter> logger, IConfiguration configuration)
        {
            this.logger = logger;
            developerExceptionEnabled = configuration.GetValue<bool>("DeveloperExceptionEnabled");
        }

        public void OnException(ExceptionContext context)
        {
            var exception = context.Exception;
            if (!HandleApplicationError(exception, out var errorResponse))
            {
                GeneralRequestError(logger, exception, context.HttpContext.TraceIdentifier);

                errorResponse = new PlatformAspNetMvcErrorResponse(
                    new PlatformAspNetMvcErrorInfo
                    {
                        Code = "InternalServerException",
                        Message = developerExceptionEnabled ? exception.ToString() : DefaultServerErrorMessage,
                    },
                    HttpStatusCode.BadRequest);
            }

            context.Result = new JsonResult(errorResponse);
            context.HttpContext.Response.StatusCode = errorResponse.StatusCode;
            context.ExceptionHandled = true;
        }

        private bool HandleApplicationError(Exception exception, out PlatformAspNetMvcErrorResponse errorResponse)
        {
            if (exception is PlatformApplicationValidationException applicationValidationException)
            {
                errorResponse = new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromApplicationValidationException(applicationValidationException),
                    HttpStatusCode.BadRequest);
                return true;
            }

            if (exception is PlatformApplicationException applicationException)
            {
                errorResponse = new PlatformAspNetMvcErrorResponse(
                    PlatformAspNetMvcErrorInfo.FromApplicationException(applicationException),
                    HttpStatusCode.BadRequest);
                return true;
            }

            errorResponse = null;
            return false;
        }
    }
}

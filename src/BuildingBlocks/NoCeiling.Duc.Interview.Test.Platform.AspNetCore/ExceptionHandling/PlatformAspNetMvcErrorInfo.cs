using System.Collections.Generic;
using System.Linq;
using NoCeiling.Duc.Interview.Test.Platform.Application.Exceptions;

namespace NoCeiling.Duc.Interview.Test.Platform.AspNetCore.ExceptionHandling
{
    public class PlatformAspNetMvcErrorInfo
    {
        public static PlatformAspNetMvcErrorInfo FromApplicationValidationException(
            PlatformApplicationValidationException applicationValidationException)
        {
            return new PlatformAspNetMvcErrorInfo
            {
                Code = nameof(PlatformApplicationValidationException),
                Message = applicationValidationException.Message,
                Details = applicationValidationException.ValidationResult.Errors
                    .Select(p => new PlatformAspNetMvcErrorInfo
                    {
                        Code = p.ErrorCode,
                        Message = p.ErrorMessage,
                        Target = p.PropertyName,
                        FormattedMessagePlaceholderValues = p.FormattedMessagePlaceholderValues
                    })
                    .ToList()
            };
        }

        public static PlatformAspNetMvcErrorInfo FromApplicationException(
            PlatformApplicationException applicationException)
        {
            return new PlatformAspNetMvcErrorInfo()
            {
                Code = nameof(PlatformApplicationException),
                Message = applicationException.Message
            };
        }

        /// <summary>
        /// One of a server-defined set of error types.
        /// </summary>
        public string Code { get; set; }

        public string Message { get; set; }

        public Dictionary<string, object> FormattedMessagePlaceholderValues { get; set; }

        /// <summary>
        /// The target of the error.
        /// </summary>
        public string Target { get; set; }

        public List<PlatformAspNetMvcErrorInfo> Details { get; set; }
    }
}

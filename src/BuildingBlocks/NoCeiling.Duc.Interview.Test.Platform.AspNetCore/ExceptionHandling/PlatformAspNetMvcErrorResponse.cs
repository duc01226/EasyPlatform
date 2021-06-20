using System.Net;

namespace NoCeiling.Duc.Interview.Test.Platform.AspNetCore.ExceptionHandling
{
    public class PlatformAspNetMvcErrorResponse
    {
        public PlatformAspNetMvcErrorResponse(PlatformAspNetMvcErrorInfo error, HttpStatusCode statusCode)
        {
            Error = error;
            StatusCode = (int)statusCode;
        }

        public PlatformAspNetMvcErrorInfo Error { get; }

        public int StatusCode { get; }
    }
}

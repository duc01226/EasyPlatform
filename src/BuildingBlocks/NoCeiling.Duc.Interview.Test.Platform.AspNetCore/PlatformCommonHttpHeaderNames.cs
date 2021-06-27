namespace NoCeiling.Duc.Interview.Test.Platform.AspNetCore
{
    public static class PlatformCommonHttpHeaderNames
    {
        /// <summary>
        /// The header key follows the RFC standard.
        /// https://github.com/dotnet/corefx/blob/master/src/System.Diagnostics.DiagnosticSource/src/HttpCorrelationProtocol.md.
        /// </summary>
        public const string RequestId = "Request-Id";
    }
}
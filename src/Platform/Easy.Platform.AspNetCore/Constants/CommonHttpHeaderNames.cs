namespace Easy.Platform.AspNetCore.Constants;

/// <summary>
/// Contains platform-wide constants for ASP.NET Core applications in the Easy.Platform.
/// This class provides centralized constant definitions used across all EasyPlatform microservices
/// for consistent configuration and behavior.
/// </summary>
/// <remarks>
/// This static class serves as a central repository for platform-specific constants including:
/// - HTTP header names for consistent cross-service communication
/// - Standard header values and configurations
/// - CORS-related constants for cross-origin resource sharing
/// - Custom platform headers for request tracking and correlation
/// - Security-related header constants
///
/// The constants defined here ensure consistency across all platform services and help
/// maintain standardized HTTP communication patterns throughout the EasyPlatform architecture.
///
/// Usage:
/// These constants are used throughout the platform's ASP.NET Core infrastructure,
/// middleware, and application code to ensure consistent header handling and
/// HTTP communication standards.
/// </remarks>
public static class PlatformAspnetConstant
{
    /// <summary>
    /// Contains standard HTTP header name constants used throughout the Easy.Platform ASP.NET Core infrastructure.
    /// These constants ensure consistent header naming across all EasyPlatform microservices and prevent
    /// header name inconsistencies that could cause communication issues.
    /// </summary>
    /// <remarks>
    /// This nested class provides constants for:
    /// - Standard HTTP headers (Accept, Content-Type, Authorization, etc.)
    /// - CORS-related headers for cross-origin resource sharing
    /// - Cache control and performance-related headers
    /// - Security headers for enhanced application security
    /// - Platform-specific custom headers (like RequestId for distributed tracing)
    /// - Authentication and authorization headers
    ///
    /// Key categories of headers:
    /// - Content negotiation: Accept, Accept-Charset, Accept-Encoding, Accept-Language
    /// - CORS configuration: Access-Control-* headers for cross-origin requests
    /// - Caching: Cache-Control, ETag, Expires, Last-Modified
    /// - Security: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options
    /// - Authentication: Authorization, WWW-Authenticate
    /// - Platform-specific: RequestId for distributed tracing and correlation
    ///
    /// Using these constants instead of hardcoded strings provides:
    /// - Compile-time checking for header name typos
    /// - Centralized management of header names
    /// - Consistency across all platform services
    /// - Easier refactoring and maintenance
    /// - IntelliSense support for developers
    /// </remarks>
    public static class CommonHttpHeaderNames
    {
        public const string Accept = "Accept";
        public const string AcceptCharset = "Accept-Charset";
        public const string AcceptEncoding = "Accept-Encoding";
        public const string AcceptLanguage = "Accept-Language";
        public const string AcceptRanges = "Accept-Ranges";
        public const string AccessControlAllowCredentials = "Access-Control-Allow-Credentials";
        public const string AccessControlAllowHeaders = "Access-Control-Allow-Headers";
        public const string AccessControlAllowMethods = "Access-Control-Allow-Methods";
        public const string AccessControlAllowOrigin = "Access-Control-Allow-Origin";
        public const string AccessControlExposeHeaders = "Access-Control-Expose-Headers";
        public const string AccessControlMaxAge = "Access-Control-Max-Age";
        public const string AccessControlRequestHeaders = "Access-Control-Request-Headers";
        public const string AccessControlRequestMethod = "Access-Control-Request-Method";
        public const string AccessControlAllowOriginWildcard = "*";
        public const string Age = "Age";
        public const string Allow = "Allow";
        public const string Authority = ":authority";
        public const string Authorization = "Authorization";
        public const string CacheControl = "Cache-Control";
        public const string Connection = "Connection";
        public const string ContentDisposition = "Content-Disposition";
        public const string ContentEncoding = "Content-Encoding";
        public const string ContentLanguage = "Content-Language";
        public const string ContentLength = "Content-Length";
        public const string ContentLocation = "Content-Location";
        public const string ContentMd5 = "Content-MD5";
        public const string ContentRange = "Content-Range";
        public const string ContentSecurityPolicy = "Content-Security-Policy";
        public const string ContentSecurityPolicyReportOnly = "Content-Security-Policy-Report-Only";
        public const string ContentType = "Content-Type";
        public const string Cookie = "Cookie";
        public const string Date = "Date";
        public const string ETag = "ETag";
        public const string Expires = "Expires";
        public const string Expect = "Expect";
        public const string From = "From";
        public const string Host = "Host";
        public const string IfMatch = "If-Match";
        public const string IfModifiedSince = "If-Modified-Since";
        public const string IfNoneMatch = "If-None-Match";
        public const string IfRange = "If-Range";
        public const string IfUnmodifiedSince = "If-Unmodified-Since";
        public const string LastModified = "Last-Modified";
        public const string Location = "Location";
        public const string MaxForwards = "Max-Forwards";
        public const string Method = ":method";
        public const string Origin = "Origin";
        public const string Path = ":path";
        public const string Pragma = "Pragma";
        public const string ProxyAuthenticate = "Proxy-Authenticate";
        public const string ProxyAuthorization = "Proxy-Authorization";
        public const string Range = "Range";
        public const string Referer = "Referer";
        public const string RetryAfter = "Retry-After";
        public const string Scheme = ":scheme";
        public const string Server = "Server";
        public const string SetCookie = "Set-Cookie";
        public const string Status = ":status";
        public const string StrictTransportSecurity = "Strict-Transport-Security";
        public const string TransferEncoding = "Transfer-Encoding";
        public const string UserAgent = "User-Agent";
        public const string XssProtection = "X-Xss-Protection";
        public const string ContentTypeOption = "X-Content-Type-Options";

        /// <summary>
        /// The header key follows the RFC standard.
        /// https://github.com/dotnet/corefx/blob/master/src/System.Diagnostics.DiagnosticSource/src/HttpCorrelationProtocol.md.
        /// </summary>
        public const string RequestId = "Request-Id";
    }
}

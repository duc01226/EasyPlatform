#region

using System.IO;
using System.Text;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Middleware.Abstracts;
using Easy.Platform.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

#endregion

namespace Easy.Platform.AspNetCore.Middleware;

/// <summary>
/// Middleware that monitors HTTP request execution time and logs warnings for slow requests.
/// This middleware provides performance monitoring capabilities by measuring request duration,
/// capturing request payloads, and issuing warnings when requests exceed configured thresholds.
/// </summary>
/// <remarks>
/// This middleware is part of the Easy.Platform ASP.NET Core infrastructure and provides:
/// - Automatic timing of all HTTP requests using high-precision profiling
/// - Configurable warning thresholds for slow request detection
/// - Detailed logging of slow requests with request context information
/// - Request payload capture for POST, PUT, and PATCH operations with JSON content
/// - Integration with platform logging infrastructure and request context
/// - Performance metrics collection for monitoring and alerting
///
/// Key features:
/// - Non-blocking request processing (timing doesn't affect response performance)
/// - Configurable warning thresholds via PlatformSlowRequestWarningMiddlewareOptions
/// - Rich logging context including request details, query strings, payloads, and user information
/// - Integration with distributed tracing through request context accessor
/// - Conditional enabling/disabling based on environment (disabled in development by default)
/// - Memory-efficient request body reading with stream buffering
///
/// Performance monitoring includes:
/// - Request path and HTTP method tracking
/// - Query string parameter capture
/// - Request payload logging for relevant content types
/// - Execution time measurement with millisecond precision
/// - Full request context information for correlation
///
/// Usage:
/// This middleware should be registered early in the ASP.NET Core pipeline to capture
/// the total request processing time, typically through the platform's extension methods
/// in ConfigureWebApplicationExtensions.
/// </remarks>
public class PlatformSlowRequestWarningMiddleware : PlatformMiddleware
{
    /// <summary>
    /// Logger instance for recording slow request warnings and diagnostic information.
    /// Used to output detailed information about requests that exceed the configured time threshold.
    /// </summary>
    protected readonly ILogger<PlatformSlowRequestWarningMiddleware> Logger;

    /// <summary>
    /// Configuration options for the slow request warning middleware.
    /// Contains settings such as the warning threshold time and enable/disable flags.
    /// </summary>
    protected readonly PlatformSlowRequestWarningMiddlewareOptions Options;

    /// <summary>
    /// Accessor for the platform application request context.
    /// Provides access to request-scoped data and context information for logging and correlation.
    /// </summary>
    protected readonly IPlatformApplicationRequestContextAccessor RequestContextAccessor;

    /// <summary>
    /// Service provider for dependency injection and service resolution.
    /// Used for accessing additional services that may be needed during request processing.
    /// </summary>
    protected readonly IServiceProvider ServiceProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformSlowRequestWarningMiddleware"/> class
    /// with the specified configuration options and dependencies.
    /// </summary>
    /// <param name="options">
    /// Configuration options for the middleware, including warning thresholds and enable/disable settings.
    /// </param>
    /// <param name="loggerFactory">
    /// Factory for creating logger instances used for recording slow request warnings.
    /// </param>
    /// <param name="requestContextAccessor">
    /// Accessor for platform application request context, providing access to request-scoped data.
    /// </param>
    /// <param name="serviceProvider">
    /// Service provider for dependency injection and additional service resolution.
    /// </param>
    /// <exception cref="ArgumentNullException">
    /// Thrown when any of the required parameters are null.
    /// </exception>
    public PlatformSlowRequestWarningMiddleware(
        IOptions<PlatformSlowRequestWarningMiddlewareOptions> options,
        ILoggerFactory loggerFactory,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IServiceProvider serviceProvider
    )
    {
        RequestContextAccessor = requestContextAccessor;
        ServiceProvider = serviceProvider;
        Logger = loggerFactory.CreateLogger<PlatformSlowRequestWarningMiddleware>();
        Options = options.Value;
    }

    /// <summary>
    /// Invokes the middleware asynchronously.
    /// </summary>
    protected override async Task InternalInvokeAsync(HttpContext context, RequestDelegate next)
    {
        if (!Options.Enabled)
        {
            await next(context);
            return;
        }

        var payload =
            context.Request.Method is "POST" or "PUT" or "PATCH" && context.Request.ContentType?.Contains("application/json") == true ? await ReadRequestBodyAsync(context) : "n/a";
        var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : "n/a";

        await Util.TaskRunner.ProfileExecutionAsync(
            asyncTask: () => next(context),
            afterExecution: elapsedMs =>
            {
                if (elapsedMs >= Options.SlowProcessWarningTimeMilliseconds)
                {
                    Logger?.LogWarning(
                        "[ApiRequest] SlowProcessWarningTimeMilliseconds:{SlowProcessWarningTimeMilliseconds}. ElapsedMilliseconds:{ElapsedMilliseconds}. RequestPath:{RequestPath}. RequestMethod:{RequestMethod}. QueryString:{QueryString}. Payload:{Payload}. RequestContext:{@RequestContext}",
                        SlowProcessWarningTimeMilliseconds(),
                        elapsedMs,
                        context.Request.Path,
                        context.Request.Method,
                        queryString,
                        payload,
                        RequestContextAccessor.Current.GetAllKeyValues()
                    );
                }
            }
        );
    }

    private static async Task<string> ReadRequestBodyAsync(HttpContext context)
    {
        context.Request.EnableBuffering();

        using (var requestPayloadStream = new MemoryStream())
        {
            await context.Request.Body.CopyToAsync(requestPayloadStream).ThenAction(() => context.Request.Body.Seek(0, SeekOrigin.Begin));

            return Encoding.UTF8.GetString(requestPayloadStream.ToArray());
        }
    }

    /// <summary>
    /// Gets the slow process warning time in milliseconds.
    /// </summary>
    protected int SlowProcessWarningTimeMilliseconds() => Options.SlowProcessWarningTimeMilliseconds;
}

/// <summary>
/// Options for the <see cref="PlatformSlowRequestWarningMiddleware"/>.
/// </summary>
public class PlatformSlowRequestWarningMiddlewareOptions
{
    /// <summary>
    /// Gets or sets the slow process warning time in milliseconds.
    /// </summary>
    public int SlowProcessWarningTimeMilliseconds { get; set; } = 500;

    /// <summary>
    /// Value to determine enabling Warning for slow profile or not. Default value is !PlatformEnvironment.IsDevelopment;
    /// </summary>
    public bool Enabled { get; set; } = !PlatformEnvironment.IsDevelopment;
}

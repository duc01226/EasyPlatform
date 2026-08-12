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
/// - Detailed logging of slow requests without raw query or request-context data
/// - Request payload capture for POST, PUT, and PATCH operations with JSON content
/// - Integration with platform logging infrastructure and request context
/// - Performance metrics collection for monitoring and alerting
///
/// Key features:
/// - Non-blocking request processing (timing doesn't affect response performance)
/// - Configurable warning thresholds via PlatformSlowRequestWarningMiddlewareOptions
/// - Minimal logging context including request details and protected payload diagnostics
/// - Integration with distributed tracing through request context accessor
/// - Conditional enabling/disabling based on environment (disabled in development by default)
/// - Memory-efficient request body reading with stream buffering
///
/// Performance monitoring includes:
/// - Request path and HTTP method tracking
/// - Request payload logging for relevant content types, size-capped and sensitive-member redacted
/// - Execution time measurement with millisecond precision
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
        await Util.TaskRunner.ProfileExecutionAsync(
            asyncTask: () => next(context),
            afterExecution: elapsedMs =>
            {
                if (elapsedMs >= Options.SlowProcessWarningTimeMilliseconds)
                {
                    var payloadForDiagnostics = payload != "n/a"
                        ? PlatformHttpRequestBodyDiagnosticSerializer.Serialize(context, payload)
                        : payload;

                    Logger?.LogWarning(
                        "[ApiRequest] SlowProcessWarningTimeMilliseconds:{SlowProcessWarningTimeMilliseconds}. ElapsedMilliseconds:{ElapsedMilliseconds}. RequestPath:{RequestPath}. RequestMethod:{RequestMethod}. Payload:{Payload}",
                        SlowProcessWarningTimeMilliseconds(),
                        elapsedMs,
                        context.Request.Path,
                        context.Request.Method,
                        payloadForDiagnostics
                    );
                }
            }
        );
    }

    /// <summary>
    /// Reads at most <see cref="PlatformHttpRequestBodyDiagnosticSerializer.MaxDiagnosticPayloadBytes"/> of the request
    /// body for diagnostics. The bound is applied here, at the source, because this runs for EVERY JSON POST/PUT/PATCH
    /// -- before it is known whether the request is slow -- and the payload is later walked a second time by
    /// <see cref="PlatformHttpRequestBodyDiagnosticSerializer"/>. Capping the read bounds both passes at once.
    /// Buffering is still enabled and the stream is always rewound, so downstream model binding reads the full body.
    /// </summary>
    private static async Task<string> ReadRequestBodyAsync(HttpContext context)
    {
        context.Request.EnableBuffering();

        try
        {
            // One extra byte distinguishes "exactly at the limit" from "over the limit".
            var buffer = new byte[PlatformHttpRequestBodyDiagnosticSerializer.MaxDiagnosticPayloadBytes + 1];
            var readCount = await context.Request.Body.ReadAtLeastAsync(buffer, buffer.Length, throwOnEndOfStream: false);

            return readCount > PlatformHttpRequestBodyDiagnosticSerializer.MaxDiagnosticPayloadBytes
                ? PlatformHttpRequestBodyDiagnosticSerializer.OversizedPayload
                : Encoding.UTF8.GetString(buffer, 0, readCount);
        }
        finally
        {
            context.Request.Body.Seek(0, SeekOrigin.Begin);
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

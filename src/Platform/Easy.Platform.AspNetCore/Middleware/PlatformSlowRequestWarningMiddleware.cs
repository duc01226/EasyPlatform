using Easy.Platform.AspNetCore.Middleware.Abstracts;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Easy.Platform.AspNetCore.Middleware;

/// <summary>
/// Middleware to log warnings for slow requests.
/// </summary>
public class PlatformSlowRequestWarningMiddleware : PlatformMiddleware
{
    /// <summary>
    /// Gets the options for the middleware.
    /// </summary>
    protected readonly PlatformSlowRequestWarningMiddlewareOptions Options;

    /// <summary>
    /// Gets the logger for the middleware.
    /// </summary>
    protected readonly ILogger<PlatformSlowRequestWarningMiddleware> Logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformSlowRequestWarningMiddleware"/> class.
    /// </summary>
    /// <param name="next">The next middleware in the pipeline.</param>
    /// <param name="options">The options for the middleware.</param>
    /// <param name="loggerFactory">The logger factory.</param>
    public PlatformSlowRequestWarningMiddleware(
        RequestDelegate next,
        IOptions<PlatformSlowRequestWarningMiddlewareOptions> options,
        ILoggerFactory loggerFactory) : base(next)
    {
        Logger = loggerFactory.CreateLogger<PlatformSlowRequestWarningMiddleware>();
        Options = options.Value;
    }

    /// <summary>
    /// Invokes the middleware asynchronously.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    protected override async Task InternalInvokeAsync(HttpContext context)
    {
        await Util.TaskRunner.ProfileExecutionAsync(
            asyncTask: () => Next(context),
            afterExecution: elapsedMilliseconds =>
            {
                if (elapsedMilliseconds >= SlowProcessWarningTimeMilliseconds())
                {
                    Logger?.LogWarning(
                        "[ApiRequest] SlowProcessWarningTimeMilliseconds:{SlowProcessWarningTimeMilliseconds}. ElapsedMilliseconds:{ElapsedMilliseconds}. RequestPath:{RequestPath} RequestMethod: {RequestMethod}",
                        SlowProcessWarningTimeMilliseconds(),
                        elapsedMilliseconds,
                        context.Request.Path,
                        context.Request.Method);
                }
            });
    }

    /// <summary>
    /// Gets the slow process warning time in milliseconds.
    /// </summary>
    /// <returns>The slow process warning time in milliseconds.</returns>
    protected int SlowProcessWarningTimeMilliseconds()
    {
        return Options.SlowProcessWarningTimeMilliseconds;
    }
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
}

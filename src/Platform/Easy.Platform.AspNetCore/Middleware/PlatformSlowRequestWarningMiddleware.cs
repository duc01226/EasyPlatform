using System.IO;
using System.Text;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Middleware.Abstracts;
using Easy.Platform.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Easy.Platform.AspNetCore.Middleware;

/// <summary>
/// Middleware to log warnings for slow requests and include request payload.
/// </summary>
public class PlatformSlowRequestWarningMiddleware : PlatformMiddleware
{
    protected readonly PlatformSlowRequestWarningMiddlewareOptions Options;
    protected readonly ILogger<PlatformSlowRequestWarningMiddleware> Logger;
    protected readonly IPlatformApplicationRequestContextAccessor RequestContextAccessor;
    protected readonly IServiceProvider ServiceProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformSlowRequestWarningMiddleware"/> class.
    /// </summary>
    public PlatformSlowRequestWarningMiddleware(
        RequestDelegate next,
        IOptions<PlatformSlowRequestWarningMiddlewareOptions> options,
        ILoggerFactory loggerFactory,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IServiceProvider serviceProvider) : base(next)
    {
        RequestContextAccessor = requestContextAccessor;
        ServiceProvider = serviceProvider;
        Logger = loggerFactory.CreateLogger<PlatformSlowRequestWarningMiddleware>();
        Options = options.Value;
    }

    /// <summary>
    /// Invokes the middleware asynchronously.
    /// </summary>
    protected override async Task InternalInvokeAsync(HttpContext context)
    {
        if (!Options.Enabled)
        {
            await Next(context);
            return;
        }

        var payload = context.Request.Method is "POST" or "PUT" or "PATCH"
                      && context.Request.ContentType?.Contains("application/json") == true
            ? await ReadRequestBodyAsync(context)
            : "n/a";
        var queryString = context.Request.QueryString.HasValue
            ? context.Request.QueryString.Value
            : "n/a";

        await Util.TaskRunner.ProfileExecutionAsync(
            asyncTask: () => Next(context),
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
                        RequestContextAccessor.Current.GetAllKeyValues());
                }
            });
    }

    private static async Task<string> ReadRequestBodyAsync(HttpContext context)
    {
        context.Request.EnableBuffering();

        using (var requestPayloadStream = new MemoryStream())
        {
            await context.Request.Body.CopyToAsync(requestPayloadStream)
                .ThenAction(() => context.Request.Body.Seek(0, SeekOrigin.Begin));

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

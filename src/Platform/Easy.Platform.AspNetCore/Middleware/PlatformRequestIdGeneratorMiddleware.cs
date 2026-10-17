#region

using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Constants;
using Easy.Platform.AspNetCore.Middleware.Abstracts;
using Microsoft.AspNetCore.Http;

#endregion

namespace Easy.Platform.AspNetCore.Middleware;

/// <summary>
/// Middleware that generates and manages unique request identifiers for HTTP requests.
/// This middleware ensures that every incoming HTTP request has a unique identifier that can be used
/// for logging, tracing, and correlation across distributed systems. Should be added at the first middleware
/// or second after UseGlobalExceptionHandlerMiddleware.
/// </summary>
/// <remarks>
/// This middleware is a core component of the Easy.Platform ASP.NET Core infrastructure and provides:
/// - Automatic request ID generation using ULID format for requests without existing IDs
/// - Request ID preservation for requests that already have IDs (for distributed tracing)
/// - Integration with ASP.NET Core's HttpContext.TraceIdentifier for framework integration
/// - Automatic inclusion of request IDs in response headers for client-side tracking
/// - Integration with platform's application request context for cross-service correlation
///
/// The request ID is essential for:
/// - Distributed tracing across microservices in the EasyPlatform platform
/// - Correlation of logs across different services and components
/// - Debugging and troubleshooting in production environments
/// - Performance monitoring and request tracking
///
/// Processing flow:
/// 1. Check if incoming request has a request ID header
/// 2. Generate new ULID-based request ID if not present
/// 3. Set HttpContext.TraceIdentifier to the request ID
/// 4. Store request ID in platform application context
/// 5. Add request ID to response headers for client tracking
/// 6. Continue to next middleware in pipeline
///
/// This middleware will add a generated ULID request ID into headers and should be positioned early
/// in the middleware pipeline for proper request correlation throughout the application lifecycle.
/// </remarks>
public class PlatformRequestIdGeneratorMiddleware : PlatformMiddleware
{
    /// <summary>
    /// The platform application request context accessor used to store and retrieve request-scoped data.
    /// This provides access to the current request context where the request ID will be stored
    /// for use throughout the application lifecycle.
    /// </summary>
    private readonly IPlatformApplicationRequestContextAccessor applicationRequestContextAccessor;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformRequestIdGeneratorMiddleware"/> class.
    /// </summary>
    /// <param name="applicationRequestContextAccessor">
    /// The platform application request context accessor that provides access to request-scoped data storage.
    /// Used to store the generated or extracted request ID for cross-service correlation.
    /// </param>
    /// <exception cref="ArgumentNullException">
    /// Thrown when <paramref name="applicationRequestContextAccessor"/> is null.
    /// </exception>
    public PlatformRequestIdGeneratorMiddleware(IPlatformApplicationRequestContextAccessor applicationRequestContextAccessor)
    {
        this.applicationRequestContextAccessor = applicationRequestContextAccessor;
    }

    /// <summary>
    /// Internal implementation of the middleware logic that handles request ID generation and management.
    /// This method processes each HTTP request to ensure it has a unique identifier for tracking and correlation.
    /// </summary>
    /// <param name="context">
    /// The HTTP context for the current request, containing request and response information.
    /// </param>
    /// <param name="next">
    /// The next middleware delegate in the pipeline to invoke after processing.
    /// </param>
    /// <returns>
    /// A task representing the asynchronous middleware execution.
    /// </returns>
    /// <remarks>
    /// Processing steps:
    /// 1. Checks if the incoming request already has a request ID header
    /// 2. Generates a new ULID-based request ID if none exists
    /// 3. Updates the HttpContext.TraceIdentifier with the request ID
    /// 4. Stores the request ID in the platform application context
    /// 5. Registers a callback to add the request ID to response headers
    /// 6. Continues execution to the next middleware in the pipeline
    ///
    /// The ULID format is used for request IDs as it provides:
    /// - Lexicographically sortable identifiers
    /// - High entropy and uniqueness
    /// - Timestamp-based ordering
    /// - Better performance than GUIDs in database scenarios
    /// </remarks>
    protected override async Task InternalInvokeAsync(HttpContext context, RequestDelegate next)
    {
        // Check if the incoming request already contains a request ID header
        // This supports distributed tracing scenarios where request IDs are propagated across services
        // Generate a new request ID if not present in the headers
        if (!context.Request.Headers.TryGetValue(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId, out var existedRequestId) ||
            string.IsNullOrEmpty(existedRequestId))
        {
            // Generate a new ULID-based request ID for uniqueness and sortability
            // ULID provides better performance than GUID and includes timestamp information
            context.Request.Headers.Upsert(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId, Ulid.NewUlid().ToString());
        }

        // Set the ASP.NET Core trace identifier to the request ID for framework integration
        // This enables built-in logging and diagnostics to use the same identifier
        // Set the trace identifier for the context
        context.TraceIdentifier = context.Request.Headers[PlatformAspnetConstant.CommonHttpHeaderNames.RequestId];

        // Store the request ID in the platform application context for cross-service access
        // This allows other components to access the request ID without direct HTTP context access
        applicationRequestContextAccessor.Current.SetValue(context.TraceIdentifier, PlatformApplicationCommonRequestContextKeys.RequestIdContextKey);

        // Capture the request ID by value NOW, while the HttpContext is guaranteed to be alive.
        // The OnStarting callback below must NOT read it back off the context: Kestrel pools HttpContext per
        // connection, so by the time the callback runs the context may already have been recycled for the next
        // request. Reading context.TraceIdentifier there would either throw ObjectDisposedException
        // ("IFeatureCollection has been disposed") or emit the WRONG request's ID into the header.
        var requestId = context.TraceIdentifier;

        // Register a callback to include the request ID in the response headers
        // This enables clients to correlate requests and responses for debugging and tracking
        // Add the request ID to the response header for client-side tracking
        //
        // Runs SYNCHRONOUSLY on the request-processing thread — deliberately NOT wrapped in Task.Run.
        // Appending a header is pure in-memory work, so offloading it buys nothing while breaking correctness:
        // the thread-pool hop lets the request finish (or abort) and its pooled HttpContext be uninitialized
        // before the queued work item touches Response.Headers, which Kestrel surfaces as an
        // EventId-13 "An unhandled exception was thrown by the application" error.
        context.Response.OnStarting(() =>
        {
            try
            {
                // Only add the header if it's not already present to avoid duplicates
                if (!context.Response.Headers.ContainsKey(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId))
                    context.Response.Headers.Append(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId, requestId);
            }
            // Defense in depth. Touching a recycled/reset pooled HttpContext is inherently racy — the guard and the
            // read cannot be atomic with respect to Kestrel tearing the context down — so it surfaces
            // non-deterministically as any of these three, exactly as documented on
            // PlatformAspNetApplicationRequestContext.RecordDeadHttpContextRead:
            //   - ObjectDisposedException   — IFeatureCollection has been disposed
            //   - NullReferenceException    — FeatureReferences<T>.UpdateCached dereferencing a nulled Collection
            //   - InvalidOperationException — feature collection mutated mid-read
            // This header is best-effort by contract, so a failed write means "no header", never a crash.
            catch (Exception e) when (e is ObjectDisposedException or NullReferenceException or InvalidOperationException)
            {
                // Intentionally swallowed — see above.
            }

            return Task.CompletedTask;
        });

        // Continue processing through the middleware pipeline
        // Call the next delegate/middleware in the pipeline
        await next(context);
    }
}

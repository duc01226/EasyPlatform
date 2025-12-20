using Easy.Platform.AspNetCore.ExceptionHandling;
using Easy.Platform.AspNetCore.Middleware;
using Easy.Platform.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Easy.Platform.AspNetCore.Extensions;

/// <summary>
/// Provides extension methods for configuring the ASP.NET Core application pipeline with platform-specific middleware.
/// These extensions establish a standardized middleware pipeline configuration for all EasyPlatform microservices,
/// ensuring consistent request processing, error handling, and monitoring across the platform.
/// </summary>
/// <remarks>
/// This static class contains extension methods that configure the ASP.NET Core application pipeline with
/// platform-standard middleware components including:
/// - Global exception handling for centralized error processing
/// - Request ID generation for distributed tracing and correlation
/// - Slow request monitoring and performance warnings
/// - Health check endpoints for service monitoring
/// - Platform-specific middleware ordering and configuration
///
/// Key features:
/// - Standardized middleware pipeline configuration across all services
/// - Proper middleware ordering for optimal request processing
/// - Integration with platform logging and monitoring infrastructure
/// - Support for both development and production environment configurations
/// - Consistent error handling and response formatting
/// - Request correlation and tracing capabilities
///
/// Middleware pipeline order:
/// 1. Global exception handler (first to catch all exceptions)
/// 2. Request ID generator (early for request correlation)
/// 3. Slow request warning monitor (performance tracking)
/// 4. Additional platform middleware as needed
/// 5. Application-specific middleware
///
/// These extensions ensure that all platform services follow the same middleware configuration
/// patterns, providing consistent behavior and facilitating debugging and monitoring across
/// the distributed EasyPlatform architecture.
///
/// Usage:
/// These methods are typically called during application configuration in Startup.cs or Program.cs
/// to establish the standard platform middleware pipeline.
/// </remarks>
public static class ConfigureWebApplicationExtensions
{
    /// <summary>
    /// Adds the platform request ID generator middleware to the application pipeline.
    /// This middleware ensures that every HTTP request has a unique identifier for tracing and correlation
    /// across the distributed EasyPlatform microservices architecture.
    /// </summary>
    /// <param name="applicationBuilder">
    /// The application builder instance to configure with request ID generation middleware.
    /// </param>
    /// <returns>
    /// The configured application builder instance for method chaining.
    /// </returns>
    /// <remarks>
    /// This middleware performs the following operations:
    /// - Generates a unique ULID-based request ID if not already present
    /// - Preserves existing request IDs for distributed tracing scenarios
    /// - Sets the ASP.NET Core TraceIdentifier for framework integration
    /// - Stores the request ID in platform application context for cross-service access
    /// - Adds the request ID to response headers for client-side correlation
    ///
    /// Pipeline position: This middleware should be added early in the pipeline, typically as the
    /// first middleware or second after the global exception handler, to ensure all subsequent
    /// middleware and application code has access to the request ID.
    ///
    /// The generated request ID is used for:
    /// - Distributed tracing across microservices
    /// - Log correlation and debugging
    /// - Performance monitoring and request tracking
    /// - Client-server request correlation
    /// </remarks>
    /// This middleware will add a generated guid request id in to headers. It should be added at the first middleware or
    /// second after UseGlobalExceptionHandlerMiddleware
    /// </summary>
    public static IApplicationBuilder UsePlatformRequestIdGeneratorMiddleware(this IApplicationBuilder applicationBuilder)
    {
        return applicationBuilder.UseMiddleware<PlatformRequestIdGeneratorMiddleware>();
    }

    /// <summary>
    /// Adds the platform global exception handler middleware to the application pipeline.
    /// This middleware provides centralized exception handling and standardized error response formatting
    /// for all unhandled exceptions in the application.
    /// </summary>
    /// <param name="applicationBuilder">
    /// The application builder instance to configure with global exception handling middleware.
    /// </param>
    /// <returns>
    /// The configured application builder instance for method chaining.
    /// </returns>
    /// <remarks>
    /// This middleware performs comprehensive exception handling including:
    /// - Catching all unhandled exceptions from downstream middleware
    /// - Logging exception details with request context for troubleshooting
    /// - Mapping platform-specific exceptions to appropriate HTTP status codes
    /// - Formatting standardized error responses using PlatformAspNetMvcErrorResponse
    /// - Providing environment-appropriate error details (detailed in dev, sanitized in production)
    /// - Preserving request correlation information for distributed tracing
    ///
    /// Pipeline position: This middleware should be used at the very first level of the pipeline
    /// to ensure it can catch exceptions from any subsequent middleware or application code.
    ///
    /// Exception handling includes:
    /// - PlatformDomainException: Domain business rule violations
    /// - PlatformValidationException: Input validation failures
    /// - PlatformApplicationException: Application layer exceptions
    /// - General .NET exceptions: Unexpected system errors
    ///
    /// The middleware ensures consistent error responses across all EasyPlatform microservices
    /// while protecting sensitive system information from being exposed to clients.
    /// </remarks>
    /// This middleware should be used it at the first level to catch exception from any next middleware.
    /// <see cref="PlatformGlobalExceptionHandlerMiddleware" /> will be used.
    /// </summary>
    public static IApplicationBuilder UsePlatformGlobalExceptionHandlerMiddleware(this IApplicationBuilder applicationBuilder)
    {
        return applicationBuilder.UseMiddleware<PlatformGlobalExceptionHandlerMiddleware>();
    }

    /// <summary>
    /// This middleware will add a warning log if the request is slow. <see cref="PlatformSlowRequestWarningMiddleware" /> will be used.
    /// </summary>
    /// <returns></returns>
    public static IApplicationBuilder UsePlatformSlowRequestWarningMiddleware(this IApplicationBuilder applicationBuilder)
    {
        return applicationBuilder.UseMiddleware<PlatformSlowRequestWarningMiddleware>();
    }

    /// <summary>
    /// This method will add the recommended middlewares for the platform.
    /// </summary>
    /// <returns></returns>
    public static IApplicationBuilder UsePlatformDefaultRecommendedMiddlewares(this IApplicationBuilder applicationBuilder, bool includeGlobalExceptionHandlerMiddleware = true)
    {
        if (includeGlobalExceptionHandlerMiddleware)
            applicationBuilder.UsePlatformGlobalExceptionHandlerMiddleware();
        applicationBuilder.UsePlatformRequestIdGeneratorMiddleware();
        applicationBuilder.UsePlatformSlowRequestWarningMiddleware();

        return applicationBuilder;
    }

    /// <summary>
    /// With endpoint routing, the CORS middleware must be configured to execute between the calls to UseRouting and
    /// UseEndpoints.
    /// Incorrect configuration will cause the middleware to stop functioning correctly.
    /// Use <see cref="PlatformAspNetCoreModuleDefaultPolicies.DevelopmentCorsPolicy" /> in dev environment,
    /// if not then <see cref="PlatformAspNetCoreModuleDefaultPolicies.CorsPolicy" /> will be used
    /// </summary>
    public static IApplicationBuilder UsePlatformDefaultCorsPolicy(this IApplicationBuilder applicationBuilder, string specificCorPolicy = null)
    {
        var defaultCorsPolicyName =
            applicationBuilder.ApplicationServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment() || PlatformEnvironment.IsDevelopment
                ? PlatformAspNetCoreModuleDefaultPolicies.DevelopmentCorsPolicy
                : PlatformAspNetCoreModuleDefaultPolicies.CorsPolicy;
        applicationBuilder.UseCors(specificCorPolicy ?? defaultCorsPolicyName);

        return applicationBuilder;
    }

    /// <summary>
    /// If the request is not handled by any Endpoints Controllers, The request will come to this middleware.<br />
    /// If the request path is empty default, return "Service is up" for health check that this api service is online.<br />
    /// This should be placed after UseEndpoints or MapControllers
    /// </summary>
    public static void UseDefaultResponseHealthCheckForEmptyPath(this IApplicationBuilder applicationBuilder, params string[] additionalHealthCheckPaths)
    {
        applicationBuilder.Use(
            async (context, next) =>
            {
                if (context.Request.Path == "/" || additionalHealthCheckPaths.Any(supportPath => context.Request.Path == $"/{supportPath.TrimStart('/')}"))
                    await context.Response.WriteAsync("Service is up.");
                else
                    await next();
            }
        );
    }
}

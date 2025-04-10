using Easy.Platform.AspNetCore.ExceptionHandling;
using Easy.Platform.AspNetCore.Middleware;
using Easy.Platform.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Easy.Platform.AspNetCore.Extensions;

public static class ConfigureWebApplicationExtensions
{
    /// <summary>
    /// This middleware will add a generated guid request id in to headers. It should be added at the first middleware or
    /// second after UseGlobalExceptionHandlerMiddleware
    /// </summary>
    public static IApplicationBuilder UsePlatformRequestIdGeneratorMiddleware(this IApplicationBuilder applicationBuilder)
    {
        return applicationBuilder.UseMiddleware<PlatformRequestIdGeneratorMiddleware>();
    }

    /// <summary>
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
    public static IApplicationBuilder UsePlatformDefaultRecommendedMiddlewares(
        this IApplicationBuilder applicationBuilder,
        bool includeGlobalExceptionHandlerMiddleware = true)
    {
        if (includeGlobalExceptionHandlerMiddleware) applicationBuilder.UsePlatformGlobalExceptionHandlerMiddleware();
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
    public static IApplicationBuilder UsePlatformDefaultCorsPolicy(
        this IApplicationBuilder applicationBuilder,
        string specificCorPolicy = null)
    {
        var defaultCorsPolicyName = applicationBuilder.ApplicationServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment() || PlatformEnvironment.IsDevelopment
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
                else await next();
            });
    }
}

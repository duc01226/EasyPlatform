#region

using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Logging.BackgroundThreadFullStackTrace;
using Serilog;
using Serilog.Exceptions;
using Serilog.Exceptions.Core;

#endregion

namespace Easy.Platform.Common.Logging;

/// <summary>
/// Provides extension methods for configuring Serilog logger instances with Easy.Platform-specific
/// enrichers and exception handling capabilities. This class centralizes logging configuration
/// to ensure consistency across all platform applications.
/// </summary>
/// <remarks>
/// <para>
/// This class implements the Builder pattern for Serilog configuration, enabling fluent
/// configuration of logging capabilities. It integrates platform-specific enrichers that
/// enhance log events with distributed tracing and background thread diagnostics.
/// </para>
/// <para>
/// <strong>Key Features:</strong><br/>
/// • Automatic registration of platform-specific enrichers<br/>
/// • Enhanced exception destructuring with customizable options<br/>
/// • Integration with distributed tracing infrastructure<br/>
/// • Background thread stack trace preservation
/// </para>
/// <para>
/// <strong>Integration Points:</strong><br/>
/// Used extensively in application startup configurations, microservice initializations,
/// and anywhere Serilog logging needs to be configured with platform-standard capabilities.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Basic platform logging setup
/// var logger = new LoggerConfiguration()
///     .EnrichDefaultPlatformEnrichers()
///     .WithExceptionDetails()
///     .WriteTo.Console()
///     .CreateLogger();
///
/// // Advanced setup with custom exception destructurers
/// var logger = new LoggerConfiguration()
///     .EnrichDefaultPlatformEnrichers()
///     .WithExceptionDetails(builder => builder
///         .WithDestructurers(new CustomExceptionDestructurer()))
///     .WriteTo.ApplicationInsights()
///     .CreateLogger();
/// </code>
/// </example>
public static class PlatformLoggerConfigurationExtensions
{
    /// <summary>
    /// Configures the logger with default Easy.Platform enrichers that add essential
    /// diagnostic information to all log events.
    /// </summary>
    /// <param name="loggerConfiguration">The Serilog logger configuration to enhance.</param>
    /// <returns>The logger configuration with platform enrichers registered.</returns>
    /// <remarks>
    /// <para>
    /// <strong>Registered Enrichers:</strong><br/>
    /// 1. <see cref="PlatformBackgroundThreadFullStackTraceEnricher"/> - Preserves original stack traces
    ///    when logging from background threads (Task.Run, ThreadPool, etc.)<br/>
    /// 2. <see cref="PlatformActivityTracingEnricher"/> - Adds distributed tracing identifiers
    ///    (ActivitySpanId, ActivityTraceId, ActivityParentId) for request correlation
    /// </para>
    /// <para>
    /// <strong>Why These Enrichers Matter:</strong><br/>
    /// • <strong>Background Thread Enricher:</strong> Solves the common problem where exceptions
    ///   in background threads only show the Task.Run call site, losing valuable diagnostic context<br/>
    /// • <strong>Activity Tracing Enricher:</strong> Enables log correlation across microservices
    ///   and async operations, essential for distributed system troubleshooting
    /// </para>
    /// <para>
    /// <strong>Usage Pattern:</strong><br/>
    /// This method should be called early in logger configuration, typically in Program.cs
    /// or during dependency injection setup. It's designed to be the foundation layer
    /// upon which additional enrichers and sinks can be added.
    /// </para>
    /// <para>
    /// <strong>Performance Impact:</strong><br/>
    /// Minimal overhead as enrichers only activate when relevant context is available
    /// (active Activity or background thread with stored stack trace).
    /// </para>
    /// </remarks>
    public static LoggerConfiguration EnrichDefaultPlatformEnrichers(this LoggerConfiguration loggerConfiguration)
    {
        return loggerConfiguration.Enrich.With(
            new PlatformBackgroundThreadFullStackTraceEnricher(),
            new PlatformActivityTracingEnricher()
        );
    }

    /// <summary>
    /// Configures enhanced exception logging with detailed destructuring capabilities.
    /// This method enables comprehensive exception information capture while allowing
    /// customization of destructuring behavior for specific exception types.
    /// </summary>
    /// <param name="loggerConfiguration">The Serilog logger configuration to enhance.</param>
    /// <param name="configDestructurers">Optional callback to configure custom exception destructurers.</param>
    /// <returns>The logger configuration with exception details enrichment enabled.</returns>
    /// <remarks>
    /// <para>
    /// <strong>What This Method Provides:</strong><br/>
    /// • Structured exception logging with property-level detail extraction<br/>
    /// • Default destructurers for common .NET exception types<br/>
    /// • Extensibility for application-specific exception handling<br/>
    /// • Protection against logging sensitive information in exceptions
    /// </para>
    /// <para>
    /// <strong>Default Destructurers Include:</strong><br/>
    /// Standard .NET exception types like ArgumentException, InvalidOperationException,
    /// HttpRequestException, and many others with specialized property extraction.
    /// </para>
    /// <para>
    /// <strong>Conditional Configuration Pattern:</strong><br/>
    /// Uses the <see cref="WithExtension.WithIf{T}(T, bool, System.Action{T}[])"/> extension to conditionally
    /// apply custom destructurer configuration only when a callback is provided. This enables
    /// clean fluent configuration without unnecessary complexity when customization isn't needed.
    /// </para>
    /// <para>
    /// <strong>Integration with Platform:</strong><br/>
    /// When used with Entity Framework, consider also using the EfCore-specific extension:
    /// <c>WithPlatformEfCoreExceptionDetailsDestructurers()</c> to prevent database context logging.
    /// </para>
    /// <para>
    /// <strong>Security Considerations:</strong><br/>
    /// Default destructurers are designed to avoid logging sensitive information like
    /// connection strings, authentication tokens, or user credentials that might be
    /// present in exception data or inner exceptions.
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Simple usage with defaults
    /// .WithExceptionDetails()
    ///
    /// // Custom destructurer configuration
    /// .WithExceptionDetails(builder => builder
    ///     .WithDestructurers(new SqlExceptionDestructurer())
    ///     .WithIgnoreStackTraceAndTargetSiteExceptionFilter())
    /// </code>
    /// </example>
    public static LoggerConfiguration WithExceptionDetails(this LoggerConfiguration loggerConfiguration, Action<DestructuringOptionsBuilder> configDestructurers = null)
    {
        return loggerConfiguration.Enrich.WithExceptionDetails(
            new DestructuringOptionsBuilder()
                .WithDefaultDestructurers()
                .WithIf(configDestructurers != null, b => configDestructurers?.Invoke(b))
        );
    }
}

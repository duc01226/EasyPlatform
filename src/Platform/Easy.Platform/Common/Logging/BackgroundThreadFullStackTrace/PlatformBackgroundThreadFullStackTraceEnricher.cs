using Serilog.Core;
using Serilog.Events;

namespace Easy.Platform.Common.Logging.BackgroundThreadFullStackTrace;

/// <summary>
/// A Serilog enricher that automatically includes preserved stack trace information from background threads
/// when logging exceptions. This enricher solves the critical debugging problem where exceptions in
/// background threads (Task.Run, ThreadPool, etc.) lose their original call site context.
/// </summary>
/// <remarks>
/// <para>
/// <strong>The Problem This Solves:</strong><br/>
/// When an exception occurs in a background thread created via Task.Run(), the stack trace only shows
/// the Task.Run call site rather than the original business logic that initiated the background operation.
/// This makes debugging extremely difficult in real-world applications where background processing is common.
/// </para>
/// <para>
/// <strong>How It Works:</strong><br/>
/// 1. Before initiating background work, the original stack trace is captured and stored
/// 2. When an exception occurs in the background thread, this enricher checks for preserved context
/// 3. If both preserved stack trace and an exception are present, adds the original stack trace to the log
/// 4. The enriched log provides complete diagnostic information linking background exceptions to their origin
/// </para>
/// <para>
/// <strong>Integration Points:</strong><br/>
/// • Automatically registered via <see cref="PlatformLoggerConfigurationExtensions.EnrichDefaultPlatformEnrichers"/><br/>
/// • Works with <see cref="PlatformLogger.BackgroundThreadFullStackTraceContextAccessor"/> for context management<br/>
/// • Used extensively by <see cref="Util.TaskRunner"/> methods<br/>
/// • Compatible with all Serilog sinks and output formats
/// </para>
/// <para>
/// <strong>Performance Characteristics:</strong><br/>
/// - Zero overhead when no background context is present<br/>
/// - Minimal string concatenation overhead when context exists<br/>
/// - Only activates when both exception and background context are available<br/>
/// - Uses efficient AsyncLocal{T} for context storage
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Example of how this enricher enhances logging:
///
/// // Original code (problematic):
/// public void ProcessUserData(UserData data)
/// {
///     Task.Run(() => {
///         ValidateUserData(data); // This might throw
///     });
/// }
///
/// // Exception stack trace would only show:
/// // at ProcessUserData.&lt;&gt;c__DisplayClass0_0.&lt;ProcessUserData&gt;b__0() in Program.cs:line 15
/// // at System.Threading.Tasks.Task.InnerInvoke()
/// // at System.Threading.Tasks.Task.Execute()
///
/// // With this enricher (when used via Util.TaskRunner):
/// // Log output includes both the Task.Run location AND the original call site:
/// // {
/// //   "Message": "Validation failed",
/// //   "Exception": "...",
/// //   "PlatformBackgroundThreadFullStackTrace": "   at Program.ProcessUserData(UserData data) in Program.cs:line 12\n   at OrderController.ProcessOrder(Order order) in OrderController.cs:line 45..."
/// // }
/// </code>
/// </example>
public class PlatformBackgroundThreadFullStackTraceEnricher : ILogEventEnricher
{
    /// <summary>
    /// The property name used in log events to store the preserved background thread stack trace.
    /// This constant ensures consistent property naming across all logging infrastructure.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <strong>Usage in Log Analysis:</strong><br/>
    /// When analyzing logs, search for this property name to find the original call context
    /// for background thread exceptions. This is particularly useful in log aggregation
    /// systems like Elasticsearch, Splunk, or Application Insights.
    /// </para>
    /// <para>
    /// <strong>Log Visualization:</strong><br/>
    /// Many logging dashboards can be configured to display this property prominently
    /// when present, providing immediate visibility into the root cause of background exceptions.
    /// </para>
    /// </remarks>
    public const string PlatformBackgroundThreadFullStackTraceLogPropertyName = "PlatformBackgroundThreadFullStackTrace";

    /// <summary>
    /// Enriches log events with preserved background thread stack trace information when applicable.
    /// </summary>
    /// <param name="logEvent">The log event to potentially enrich with background thread context.</param>
    /// <param name="propertyFactory">Factory for creating log event properties.</param>
    /// <remarks>
    /// <para>
    /// <strong>Activation Conditions:</strong><br/>
    /// This enricher only adds information when BOTH conditions are met:<br/>
    /// 1. An exception is present in the log event (logEvent.Exception != null)<br/>
    /// 2. Background thread context is available (PlatformLogger.BackgroundThreadFullStackTraceContextAccessor.Current != null)
    /// </para>
    /// <para>
    /// <strong>Property Management:</strong><br/>
    /// Uses AddOrUpdateProperty() to ensure the background stack trace information is always
    /// current, even if multiple enrichers might attempt to set similar properties.
    /// </para>
    /// <para>
    /// <strong>Context Access Pattern:</strong><br/>
    /// Accesses the global context through <see cref="PlatformLogger.BackgroundThreadFullStackTraceContextAccessor"/>
    /// which provides thread-safe, async-context-aware access to preserved stack traces.
    /// </para>
    /// <para>
    /// <strong>Format and Structure:</strong><br/>
    /// The enriched property contains a human-readable string with the preserved stack trace,
    /// prefixed with a descriptive label for easy identification in log outputs.
    /// </para>
    /// </remarks>
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        // Only enrich when we have both an exception AND preserved background context
        // This ensures we don't add unnecessary properties to normal log events
        if (PlatformLogger.BackgroundThreadFullStackTraceContextAccessor.Current != null && logEvent.Exception != null)
        {
            // Create enrichment property with preserved stack trace information
            // The property value includes a descriptive prefix for easy identification in logs
            var enrichProperty = propertyFactory.CreateProperty(
                PlatformBackgroundThreadFullStackTraceLogPropertyName,
                $"PlatformBackgroundThreadFullStackTrace: {PlatformLogger.BackgroundThreadFullStackTraceContextAccessor.Current}"
            );

            // Add or update the property on the log event
            // AddOrUpdateProperty ensures this information is always current and prevents conflicts
            logEvent.AddOrUpdateProperty(enrichProperty);
        }
    }
}

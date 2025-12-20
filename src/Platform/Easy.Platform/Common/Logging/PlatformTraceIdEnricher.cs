using System.Diagnostics;
using Easy.Platform.Common.Extensions;
using Serilog.Core;
using Serilog.Events;

namespace Easy.Platform.Common.Logging;

/// <summary>
/// A Serilog log event enricher that adds distributed tracing information to log events.
/// This enricher captures Activity (distributed tracing) context and adds three key properties:
/// ActivitySpanId, ActivityTraceId, and ActivityParentId to enable correlation across services.
/// </summary>
/// <remarks>
/// <para>
/// This enricher integrates with .NET's built-in Activity system to provide distributed tracing
/// capabilities for logging. It supports both W3C Trace Context and Hierarchical ID formats.
/// </para>
/// <para>
/// The enricher is automatically registered when using <see cref="PlatformLoggerConfigurationExtensions.EnrichDefaultPlatformEnrichers"/>
/// and works seamlessly with OpenTelemetry, Application Insights, and other APM solutions.
/// </para>
/// <para>
/// <strong>Usage Context:</strong><br/>
/// - Microservices architecture requiring request correlation<br/>
/// - Distributed systems with cross-service communication<br/>
/// - Applications using Activity-based tracing (OpenTelemetry, AppInsights)<br/>
/// - Log aggregation systems that need trace correlation
/// </para>
/// <para>
/// <strong>Properties Added:</strong><br/>
/// • <c>ActivitySpanId</c>: Current operation identifier within a trace<br/>
/// • <c>ActivityTraceId</c>: Root trace identifier for the entire request flow<br/>
/// • <c>ActivityParentId</c>: Parent operation identifier for hierarchical relationships
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Log output will include trace information:
/// // {
/// //   "Message": "Processing user request",
/// //   "ActivitySpanId": "a1b2c3d4e5f67890",
/// //   "ActivityTraceId": "12345678901234567890123456789012",
/// //   "ActivityParentId": "0987654321098765"
/// // }
/// </code>
/// </example>
public class PlatformActivityTracingEnricher : ILogEventEnricher
{
    /// <summary>
    /// Enriches the specified log event with distributed tracing properties from the current Activity context.
    /// </summary>
    /// <param name="logEvent">The log event to enrich with tracing information.</param>
    /// <param name="propertyFactory">Factory for creating log event properties.</param>
    /// <remarks>
    /// <para>
    /// This method examines the current <see cref="Activity.Current"/> and extracts tracing identifiers
    /// using extension methods that handle both W3C and Hierarchical ID formats automatically.
    /// </para>
    /// <para>
    /// <strong>Workflow:</strong><br/>
    /// 1. Retrieves the current Activity from the ambient context<br/>
    /// 2. Extracts SpanId using <see cref="ActivityExtensions.GetSpanId"/> (handles format conversion)<br/>
    /// 3. Extracts TraceId using <see cref="ActivityExtensions.GetTraceId"/> (handles format conversion)<br/>
    /// 4. Extracts ParentId using <see cref="ActivityExtensions.GetParentId"/> (handles format conversion)<br/>
    /// 5. Adds properties only if they don't already exist (prevents duplication)
    /// </para>
    /// <para>
    /// <strong>Null Safety:</strong><br/>
    /// If no Activity is active, the properties will contain empty strings rather than null values,
    /// ensuring consistent log structure across all environments.
    /// </para>
    /// </remarks>
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        // Get current Activity from the distributed tracing context
        // This provides correlation across service boundaries and async operations
        var activity = Activity.Current;

        // Add span identifier - unique ID for this specific operation within the trace
        // Uses extension method to handle both W3C (hexadecimal) and Hierarchical formats
        logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("ActivitySpanId", activity?.GetSpanId()));

        // Add trace identifier - root ID that spans the entire distributed request
        // Essential for correlating logs across multiple services and operations
        logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("ActivityTraceId", activity?.GetTraceId()));

        // Add parent identifier - links this operation to its initiating parent operation
        // Enables hierarchical visualization of distributed request flows
        logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("ActivityParentId", activity?.GetParentId()));
    }
}

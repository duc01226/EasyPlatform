namespace Easy.Platform.Common.Logging;

/// <summary>
/// Provides global configuration constants and settings for the Easy.Platform logging framework.
/// This class centralizes logging-related configuration values that affect platform-wide logging behavior.
/// </summary>
/// <remarks>
/// <para>
/// This configuration class serves as a central point for managing logging constraints and limits
/// across the entire Easy.Platform ecosystem. It helps prevent excessive log verbosity that could
/// impact application performance or storage costs.
/// </para>
/// <para>
/// <strong>Usage Context:</strong><br/>
/// - Log message truncation to prevent storage bloat<br/>
/// - Performance optimization in high-throughput scenarios<br/>
/// - Cost control for cloud-based logging services<br/>
/// - Compliance with log retention policies
/// </para>
/// <para>
/// <strong>Configuration Philosophy:</strong><br/>
/// The default value of 10,000 characters provides a balance between preserving detailed
/// diagnostic information and preventing pathological cases where extremely large objects
/// or stack traces could overwhelm logging infrastructure.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Configure custom log length limit at application startup
/// PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength = 5000;
///
/// // Used internally by platform logging components to truncate messages
/// var truncatedMessage = longMessage.Length > PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength
///     ? longMessage.Substring(0, PlatformLoggingGlobalConfiguration.DefaultRecommendedMaxLogsLength)
///     : longMessage;
/// </code>
/// </example>
public class PlatformLoggingGlobalConfiguration
{
    /// <summary>
    /// Gets or sets the recommended maximum length for log messages across the platform.
    /// This value is used as a guideline for truncating overly verbose log entries to maintain
    /// optimal logging performance and storage efficiency.
    /// </summary>
    /// <value>
    /// The maximum recommended character length for log messages. Default value is 10,000 characters.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Purpose:</strong><br/>
    /// This property helps prevent logging infrastructure overload by establishing a reasonable
    /// upper bound for individual log message sizes. It's particularly important when logging
    /// large objects, stack traces, or detailed debugging information.
    /// </para>
    /// <para>
    /// <strong>When to Modify:</strong><br/>
    /// • High-volume applications requiring tighter log size control<br/>
    /// • Applications with strict storage or bandwidth constraints<br/>
    /// • Compliance requirements demanding specific log size limits<br/>
    /// • Performance-critical scenarios where log processing speed is paramount
    /// </para>
    /// <para>
    /// <strong>Implementation Notes:</strong><br/>
    /// - This is a soft limit; enforcement depends on individual logging components<br/>
    /// - Platform components should respect this value when formatting log output<br/>
    /// - Applications can override this value during startup configuration<br/>
    /// - Consider impact on diagnostics when reducing from default value
    /// </para>
    /// <para>
    /// <strong>Related Components:</strong><br/>
    /// Used by various platform logging enrichers, formatters, and sink implementations
    /// to ensure consistent log message sizing across the application.
    /// </para>
    /// </remarks>
    public static int DefaultRecommendedMaxLogsLength { get; set; } = 10000;
}

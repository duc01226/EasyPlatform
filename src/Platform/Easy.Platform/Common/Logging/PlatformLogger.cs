using Easy.Platform.Common.Logging.BackgroundThreadFullStackTrace;

namespace Easy.Platform.Common.Logging;

/// <summary>
/// Entry point and central coordination hub for Easy.Platform logging functionality.
/// This static class provides access to platform-specific logging capabilities and serves
/// as the primary interface for background thread stack trace management.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Primary Purpose:</strong><br/>
/// This class addresses a critical limitation in .NET background thread debugging where
/// exceptions thrown in Task.Run, ThreadPool operations, or fire-and-forget async operations
/// lose their original call site context. The stack trace only shows the Task.Run invocation
/// rather than the meaningful business logic that initiated the background operation.
/// </para>
/// <para>
/// <strong>Architecture Role:</strong><br/>
/// Acts as a singleton service locator for logging infrastructure, providing global access
/// to specialized logging services while maintaining testability through dependency injection
/// capabilities.
/// </para>
/// <para>
/// <strong>Integration Points:</strong><br/>
/// • <see cref="Util.TaskRunner"/> methods for background operation logging<br/>
/// • <see cref="PlatformBackgroundThreadFullStackTraceEnricher"/> for log enrichment<br/>
/// • Application startup configuration for custom accessor implementations<br/>
/// • Unit testing scenarios requiring mock implementations
/// </para>
/// <para>
/// <strong>Thread Safety:</strong><br/>
/// This class is thread-safe. The BackgroundThreadFullStackTraceContextAccessor uses
/// AsyncLocal{T} internally to maintain proper isolation across concurrent operations.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Basic usage in background operations (typically handled by Util.TaskRunner)
/// public void StartBackgroundProcess()
/// {
///     // Capture current stack trace before entering background thread
///     PlatformLogger.BackgroundThreadFullStackTraceContextAccessor.Current =
///         Environment.StackTrace;
///
///     Task.Run(() => {
///         try
///         {
///             // Business logic that might throw exception
///             ProcessComplexOperation();
///         }
///         catch (Exception ex)
///         {
///             // Exception will now include original stack trace via enricher
///             logger.LogError(ex, "Background operation failed");
///         }
///     });
/// }
///
/// // Custom accessor for testing
/// PlatformLogger.BackgroundThreadFullStackTraceContextAccessor =
///     new MockStackTraceAccessor();
/// </code>
/// </example>
public static class PlatformLogger
{
    /// <summary>
    /// Gets or sets the accessor for managing background thread stack trace context.
    /// This property provides the core functionality for preserving diagnostic information
    /// when transitioning from synchronous to asynchronous execution contexts.
    /// </summary>
    /// <value>
    /// An implementation of <see cref="IPlatformBackgroundThreadFullStackTraceContextAccessor"/>
    /// that manages stack trace preservation across thread boundaries.
    /// Default implementation is <see cref="PlatformBackgroundThreadFullStackTraceContextAccessor"/>.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Why This Matters:</strong><br/>
    /// When using Task.Run() or similar background execution patterns, .NET's default behavior
    /// loses the original call stack context. If an exception occurs in the background thread,
    /// the stack trace only shows the Task.Run call site, making debugging extremely difficult.
    /// </para>
    /// <para>
    /// <strong>How It Works:</strong><br/>
    /// 1. Before initiating background work, capture current stack trace<br/>
    /// 2. Store it in the accessor's Current property<br/>
    /// 3. Background thread operations can access this preserved context<br/>
    /// 4. <see cref="PlatformBackgroundThreadFullStackTraceEnricher"/> automatically includes
    ///    this information in log events when exceptions occur
    /// </para>
    /// <para>
    /// <strong>Lifecycle Management:</strong><br/>
    /// The accessor uses AsyncLocal{T} for proper context flow and automatic cleanup.
    /// Context is automatically cleared when the async operation completes or when
    /// explicitly set to null.
    /// </para>
    /// <para>
    /// <strong>Customization Scenarios:</strong><br/>
    /// • Unit testing with controlled stack trace values<br/>
    /// • Alternative storage mechanisms for specialized environments<br/>
    /// • Performance optimization with custom capture strategies<br/>
    /// • Integration with external diagnostic tools
    /// </para>
    /// <para>
    /// <strong>Thread Safety:</strong><br/>
    /// The default implementation is thread-safe and properly isolates context
    /// between concurrent async operations using AsyncLocal{T} semantics.
    /// </para>
    /// </remarks>
    public static IPlatformBackgroundThreadFullStackTraceContextAccessor BackgroundThreadFullStackTraceContextAccessor { get; set; } =
        new PlatformBackgroundThreadFullStackTraceContextAccessor();
}

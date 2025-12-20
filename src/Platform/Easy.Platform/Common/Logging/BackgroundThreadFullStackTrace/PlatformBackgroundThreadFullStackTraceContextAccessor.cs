using System.Diagnostics.CodeAnalysis;

namespace Easy.Platform.Common.Logging.BackgroundThreadFullStackTrace;

/// <summary>
/// Interface for managing background thread stack trace context preservation.
/// Provides access to stack trace information that needs to be maintained across
/// thread boundaries for enhanced debugging capabilities.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Purpose:</strong><br/>
/// This interface defines the contract for storing and retrieving stack trace information
/// before background thread execution begins. This is essential for maintaining diagnostic
/// context when using Task.Run(), ThreadPool operations, or any fire-and-forget async patterns.
/// </para>
/// <para>
/// <strong>Design Philosophy:</strong><br/>
/// Uses a simple property-based interface to enable easy mocking for unit tests while
/// providing a clean abstraction over the complex AsyncLocal{T} implementation details.
/// </para>
/// <para>
/// <strong>Thread Safety Requirements:</strong><br/>
/// Implementations must be thread-safe and properly handle concurrent access scenarios
/// typical in high-throughput web applications and background processing systems.
/// </para>
/// </remarks>
public interface IPlatformBackgroundThreadFullStackTraceContextAccessor
{
    /// <summary>
    /// Gets or sets the current preserved stack trace context for background thread operations.
    /// </summary>
    /// <value>
    /// A string containing the stack trace that was active before transitioning to background execution,
    /// or null if no context has been preserved.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Lifecycle:</strong><br/>
    /// • Set before initiating background work (typically by Util.TaskRunner methods)<br/>
    /// • Retrieved by logging enrichers when exceptions occur in background threads<br/>
    /// • Automatically cleared when async context completes or explicitly set to null
    /// </para>
    /// <para>
    /// <strong>Null Handling:</strong><br/>
    /// The AllowNull attribute indicates that null values are valid and expected,
    /// representing the absence of preserved context rather than an error condition.
    /// </para>
    /// </remarks>
    [AllowNull]
    string Current { get; set; }
}

/// <summary>
/// Default implementation of background thread stack trace context management using AsyncLocal{T}
/// for proper context flow across async/await boundaries and background thread transitions.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Implementation Strategy:</strong><br/>
/// Uses AsyncLocal{T} with an indirection pattern through FullStackTraceContextHolder to enable
/// proper context clearing across all execution contexts. This pattern ensures that when context
/// is cleared in one thread, it's cleared in all related async contexts.
/// </para>
/// <para>
/// <strong>AsyncLocal{T} Benefits:</strong><br/>
/// • Automatically flows with async/await operations<br/>
/// • Provides proper isolation between concurrent operations<br/>
/// • Survives thread pool thread transitions<br/>
/// • Integrates seamlessly with ASP.NET Core request contexts
/// </para>
/// <para>
/// <strong>Memory Management:</strong><br/>
/// The holder pattern prevents memory leaks by ensuring context can be fully cleared
/// rather than just nulled out, which is important in high-throughput scenarios where
/// thousands of async operations may be running concurrently.
/// </para>
/// <para>
/// <strong>Usage Patterns:</strong><br/>
/// Typically used indirectly through <see cref="PlatformLogger.BackgroundThreadFullStackTraceContextAccessor"/>
/// and integrated background processing utilities rather than called directly by application code.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Internal usage pattern (typically handled by platform utilities):
/// public void StartBackgroundWork()
/// {
///     // Capture current context before background transition
///     var accessor = new PlatformBackgroundThreadFullStackTraceContextAccessor();
///     accessor.Current = Environment.StackTrace;
///
///     Task.Run(() => {
///         // Background thread can now access preserved context
///         var preservedTrace = accessor.Current;
///
///         try
///         {
///             DoBackgroundWork();
///         }
///         catch (Exception ex)
///         {
///             // Exception logging will include preserved trace via enricher
///             logger.LogError(ex, "Background work failed");
///         }
///         finally
///         {
///             // Context automatically cleared when holder goes out of scope
///             accessor.Current = null;
///         }
///     });
/// }
/// </code>
/// </example>
public class PlatformBackgroundThreadFullStackTraceContextAccessor : IPlatformBackgroundThreadFullStackTraceContextAccessor
{
    /// <summary>
    /// AsyncLocal storage for the stack trace context holder, ensuring proper context flow
    /// across async boundaries while enabling complete context clearing.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <strong>Indirection Pattern:</strong><br/>
    /// Rather than storing the stack trace string directly in AsyncLocal{string}, we use
    /// an intermediate holder object. This enables proper context clearing across all
    /// execution contexts when the context needs to be reset.
    /// </para>
    /// <para>
    /// <strong>Thread Safety:</strong><br/>
    /// AsyncLocal{T} provides inherent thread safety and proper isolation between
    /// concurrent async operations, making this implementation safe for use in
    /// high-concurrency scenarios.
    /// </para>
    /// </remarks>
    private static readonly AsyncLocal<FullStackTraceContextHolder> FullStackTraceContextCurrent = new();

    /// <summary>
    /// Gets or sets the current preserved stack trace context.
    /// </summary>
    /// <value>
    /// The preserved stack trace string, or null if no context is currently stored.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Get Operation:</strong><br/>
    /// Retrieves the context string from the current AsyncLocal holder, returning null
    /// if no holder exists or the holder's context is null.
    /// </para>
    /// <para>
    /// <strong>Set Operation:</strong><br/>
    /// Implements a sophisticated context management strategy:<br/>
    /// 1. If setting to null, clears any existing holder context completely<br/>
    /// 2. If setting to a value, creates a new holder to store the context<br/>
    /// 3. Uses the indirection pattern to ensure proper cleanup across async boundaries
    /// </para>
    /// <para>
    /// <strong>Memory Efficiency:</strong><br/>
    /// The holder clearing pattern prevents accumulation of stale AsyncLocal contexts
    /// that could lead to memory pressure in long-running applications with high
    /// async operation throughput.
    /// </para>
    /// </remarks>
    public string Current
    {
        get => FullStackTraceContextCurrent.Value?.Context;
        set
        {
            var holder = FullStackTraceContextCurrent.Value;
            if (holder != null)
                // Clear current StackTraceContext trapped in the AsyncLocals, as its done.
                // This ensures complete cleanup rather than just nulling the reference
                holder.Context = null;

            if (value != null)
                // Use an object indirection to hold the StackTraceContext in the AsyncLocal,
                // so it can be cleared in all ExecutionContexts when its cleared.
                // This pattern enables proper context lifecycle management
                FullStackTraceContextCurrent.Value = new FullStackTraceContextHolder { Context = value };
        }
    }

    /// <summary>
    /// Internal holder class that enables proper AsyncLocal context clearing through indirection.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <strong>Design Rationale:</strong><br/>
    /// By using an intermediate object rather than storing the string directly in AsyncLocal,
    /// we can ensure that setting the context to null actually clears the context across
    /// all related execution contexts, not just the current one.
    /// </para>
    /// <para>
    /// <strong>Lifecycle:</strong><br/>
    /// Instances are created when context is set and automatically garbage collected
    /// when the async operation completes or context is explicitly cleared.
    /// </para>
    /// </remarks>
    private sealed class FullStackTraceContextHolder
    {
        /// <summary>
        /// Gets or sets the actual stack trace context string.
        /// </summary>
        /// <value>The preserved stack trace information, or null when cleared.</value>
        public string Context { get; set; }
    }
}

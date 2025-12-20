#region

using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

// ReSharper disable InconsistentlySynchronizedField

#endregion

namespace Easy.Platform.Application.RequestContext;

/// <summary>
/// Default implementation of <see cref="IPlatformApplicationRequestContextAccessor" />.
/// Inspired by Microsoft.AspNetCore.Http.HttpContextAccessor but supports multiple context lifetime modes
/// including singleton by thread task and by scoped service provider.
/// </summary>
/// <remarks>
/// This accessor manages request context across different lifetime scenarios:
/// - PerScope: Context is tied to the service provider scope
/// - PerAsyncLocalTaskFlow: Context follows async execution flow using AsyncLocal
/// - PerScopeCombinedWithAsyncLocalTaskFlow: Combines both approaches for maximum flexibility
///
/// The implementation uses thread-safe locks and AsyncLocal storage to ensure proper context isolation
/// across concurrent operations while maintaining parent-child scope relationships.
/// </remarks>
public class PlatformDefaultApplicationRequestContextAccessor : IPlatformApplicationRequestContextAccessor, IDisposable
{
    /// <summary>
    /// Thread-safe storage for request context that flows with async operations.
    /// Uses AsyncLocal to ensure context is preserved across async/await boundaries
    /// and isolated between different execution flows.
    /// </summary>
    protected static readonly AsyncLocal<RequestContextHolder> RequestContextCurrentThread = new();

    /// <summary>
    /// Defines how the request context lifetime is managed.
    /// Determines whether context is scoped, follows async flow, or uses a combination of both approaches.
    /// </summary>
    protected readonly ContextLifeTimeModes ContextLifeTimeMode;

    /// <summary>
    /// Factory for creating loggers used throughout the request context operations.
    /// Provides logging capabilities for debugging and monitoring context lifecycle events.
    /// </summary>
    protected readonly ILoggerFactory LoggerFactory;

    /// <summary>
    /// Service provider for resolving dependencies and creating new context instances.
    /// Used to access other services and create child scopes when needed.
    /// </summary>
    protected readonly IServiceProvider ServiceProvider;

    /// <summary>
    /// Request context instance that is tied to the current service provider scope.
    /// This context persists for the lifetime of the scope and is shared across operations within that scope.
    /// </summary>
    protected IPlatformApplicationRequestContext? PerScopeInitiatedContext;

    /// <summary>
    /// Thread synchronization lock for initializing async local task flow context
    /// in PerScopeCombinedWithAsyncLocalTaskFlow mode.
    /// Ensures atomic initialization when combining scope and async local contexts.
    /// </summary>
    private readonly Lock initAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowModeContextLock = new();

    /// <summary>
    /// Thread synchronization lock for context initialization operations.
    /// Prevents race conditions during the initial setup of request context instances.
    /// </summary>
    private readonly Lock initContextLock = new();

    /// <summary>
    /// Thread synchronization lock for setting async local task flow context.
    /// Ensures thread-safe updates to the AsyncLocal context storage.
    /// </summary>
    private readonly Lock setPerAsyncLocalTaskFlowContextLock = new();

    /// <summary>
    /// Initializes a new instance of the PlatformDefaultApplicationRequestContextAccessor class.
    /// Sets up the context accessor with specified lifetime mode and required dependencies.
    /// </summary>
    /// <param name="serviceProvider">Service provider for dependency resolution and scope management</param>
    /// <param name="contextLifeTimeMode">Defines how request context lifetime is managed (scope, async flow, or combined)</param>
    /// <param name="loggerFactory">Factory for creating loggers used in context operations</param>
    /// <remarks>
    /// The constructor initializes the accessor with the specified lifetime mode which determines
    /// how request context instances are created, stored, and retrieved throughout the application lifecycle.
    /// </remarks>
    public PlatformDefaultApplicationRequestContextAccessor(IServiceProvider serviceProvider, ContextLifeTimeModes contextLifeTimeMode, ILoggerFactory loggerFactory)
    {
        ServiceProvider = serviceProvider;
        ContextLifeTimeMode = contextLifeTimeMode;
        LoggerFactory = loggerFactory;
    }

    /// <summary>
    /// Releases all resources used by the PlatformDefaultApplicationRequestContextAccessor.
    /// This method implements the IDisposable pattern and ensures proper cleanup of managed resources.
    /// </summary>
    /// <remarks>
    /// The method calls the protected Dispose(bool) method with true to indicate that
    /// managed resources should be released, and then suppresses finalization since
    /// cleanup has been performed.
    /// </remarks>
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// Gets a value indicating whether the Current property has been accessed and initialized for the first time.
    /// This flag is used to track the initialization state and prevent redundant context setup operations.
    /// </summary>
    /// <remarks>
    /// This property is essential for managing the lazy initialization of request contexts.
    /// It ensures that initialization logic runs only once per accessor instance and helps
    /// coordinate between different lifetime modes.
    /// </remarks>
    public bool FirstAccessCurrentInitiated { get; private set; }

    /// <summary>
    /// Sets the specified values in the current request context and ensures proper initialization
    /// for combined lifetime modes.
    /// </summary>
    /// <param name="values">Dictionary containing key-value pairs to set in the context</param>
    /// <returns>The current instance of the request context accessor for fluent chaining</returns>
    /// <remarks>
    /// This method updates the current context values and handles special initialization logic
    /// for PerScopeCombinedWithAsyncLocalTaskFlow mode to ensure consistency between scope
    /// and async local contexts.
    /// </remarks>
    public IPlatformApplicationRequestContextAccessor SetValues(IDictionary<string, object> values)
    {
        Current.SetValues(values, onlySelf: true);

        InitAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowMode(values);

        return this;
    }

    /// <summary>
    /// Adds the specified values to the current request context and ensures proper initialization
    /// for combined lifetime modes.
    /// </summary>
    /// <param name="values">Dictionary containing key-value pairs to add to the context</param>
    /// <returns>The current instance of the request context accessor for fluent chaining</returns>
    /// <remarks>
    /// This method merges the provided values with existing context values and handles special
    /// initialization logic for PerScopeCombinedWithAsyncLocalTaskFlow mode to ensure consistency
    /// between scope and async local contexts.
    /// </remarks>
    public IPlatformApplicationRequestContextAccessor AddValues(IDictionary<string, object> values)
    {
        Current.AddValues(values, onlySelf: true);

        InitAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowMode(values);

        return this;
    }

    /// <summary>
    /// Gets or sets the current request context instance based on the configured lifetime mode.
    /// This property provides access to the active context depending on whether it's scope-based,
    /// async-local based, or a combination of both.
    /// </summary>
    /// <value>
    /// The current request context instance, which may come from scope storage, async local storage,
    /// or a combination depending on the configured ContextLifeTimeMode.
    /// </value>
    /// <remarks>
    /// The getter initializes the context if not already done and returns the appropriate context
    /// based on the lifetime mode. The setter updates the context storage according to the
    /// configured lifetime mode and manages the FirstAccessCurrentInitiated flag.
    /// </remarks>
    public IPlatformApplicationRequestContext Current
    {
        get
        {
            if (PerScopeInitiatedContext == null || RequestContextCurrentThread.Value?.Context == null)
                InitContext();

            if (ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow || ContextLifeTimeMode == ContextLifeTimeModes.PerScope)
                return PerScopeInitiatedContext;

            if (ContextLifeTimeMode == ContextLifeTimeModes.PerAsyncLocalTaskFlow)
                return RequestContextCurrentThread.Value!.Context;

            return null;
        }
        set
        {
            if (ContextLifeTimeMode == ContextLifeTimeModes.PerAsyncLocalTaskFlow)
                SetPerAsyncLocalTaskFlowContext(value);

            if (ContextLifeTimeMode == ContextLifeTimeModes.PerScope || ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                PerScopeInitiatedContext = value;

            if (value == null)
                FirstAccessCurrentInitiated = false;
        }
    }

    /// <summary>
    /// Initializes the async local task flow context if it's empty when using the combined lifetime mode.
    /// This method ensures that the async local context is properly synchronized with the scope context
    /// in PerScopeCombinedWithAsyncLocalTaskFlow mode.
    /// </summary>
    /// <param name="addValues">Optional values to add to the context during initialization</param>
    /// <remarks>
    /// This method is called internally to handle the special case where both scope and async local
    /// contexts need to be maintained. It uses thread-safe locks to ensure atomic operations during
    /// initialization and value synchronization.
    /// </remarks>
    private void InitAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowMode(IDictionary<string, object>? addValues = null)
    {
        if (ContextLifeTimeMode != ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
            return;

        if (RequestContextCurrentThread.Value?.Context == null || RequestContextCurrentThread.Value!.Context!.IsEmpty())
        {
            lock (initAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowModeContextLock)
            {
                if (RequestContextCurrentThread.Value?.Context == null)
                    SetPerAsyncLocalTaskFlowContext(CreateNewContext(true));

                if (RequestContextCurrentThread.Value!.Context!.IsEmpty())
                    RequestContextCurrentThread.Value!.Context.SetValues(PerScopeInitiatedContext, onlySelf: true);
            }
        }

        if (addValues != null)
            RequestContextCurrentThread.Value!.Context.AddValues(addValues, true);
    }

    /// <summary>
    /// Sets the request context for async local task flow, ensuring thread-safe operations
    /// and proper cleanup of existing contexts.
    /// </summary>
    /// <param name="value">The request context instance to set for async local storage</param>
    /// <remarks>
    /// This method uses thread synchronization to safely update the AsyncLocal storage.
    /// It clears any existing context before setting the new one to prevent memory leaks
    /// and ensures proper isolation between execution contexts.
    /// </remarks>
    private void SetPerAsyncLocalTaskFlowContext(IPlatformApplicationRequestContext value)
    {
        lock (setPerAsyncLocalTaskFlowContextLock)
        {
            var holder = RequestContextCurrentThread.Value;
            if (holder != null)
                // WHY: Clear current Context trapped in the AsyncLocals, as its done using
                // because we want to set a new current user context.
                holder.Context = null;

            // WHY: Use an object indirection to hold the Context in the AsyncLocal,
            // so it can be cleared in all ExecutionContexts when its cleared.
            if (value != null)
                RequestContextCurrentThread.Value = new RequestContextHolder { Context = value };
        }
    }

    /// <summary>
    /// Initializes the request context based on the configured lifetime mode.
    /// This method handles the complex logic of setting up contexts for different lifetime scenarios
    /// and manages parent-child scope relationships.
    /// </summary>
    /// <remarks>
    /// The initialization process varies depending on the lifetime mode:
    /// - For async local modes, it sets up AsyncLocal storage
    /// - For scope modes, it creates scope-bound contexts
    /// - For combined modes, it coordinates both approaches
    /// - It also handles inheritance from parent scopes when available
    /// </remarks>
    private void InitContext()
    {
        if (FirstAccessCurrentInitiated && (RequestContextCurrentThread.Value?.Context != null || ContextLifeTimeMode == ContextLifeTimeModes.PerScope))
            return;

        lock (initContextLock)
        {
            if (!FirstAccessCurrentInitiated)
            {
                if (
                    (ContextLifeTimeMode == ContextLifeTimeModes.PerAsyncLocalTaskFlow ||
                     ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                    && RequestContextCurrentThread.Value?.Context == null
                )
                    SetPerAsyncLocalTaskFlowContext(CreateNewContext(true));
                if (ContextLifeTimeMode == ContextLifeTimeModes.PerScope || ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                    PerScopeInitiatedContext = CreateNewContext(false);

                if (ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                    PerScopeInitiatedContext.AddValues(RequestContextCurrentThread.Value!.Context, onlySelf: true);

                if (ContextLifeTimeMode == ContextLifeTimeModes.PerScope || ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                {
                    var parentScopeSp = ServiceProvider.ParentScope();

                    var parentOrRootRequestContextAccessor = parentScopeSp?.TryResolveRequiredService<IPlatformApplicationRequestContextAccessor>();

                    if (parentOrRootRequestContextAccessor != null)
                    {
                        PerScopeInitiatedContext.AddValues(parentOrRootRequestContextAccessor.Current, onlySelf: true);
                        RequestContextCurrentThread.Value!.Context.AddValues(parentOrRootRequestContextAccessor.Current, onlySelf: true);
                    }
                }

                FirstAccessCurrentInitiated = true;
            }
            else if (RequestContextCurrentThread.Value?.Context == null)
            {
                if (ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                    InitAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowMode();
                else if (ContextLifeTimeMode == ContextLifeTimeModes.PerAsyncLocalTaskFlow)
                    SetPerAsyncLocalTaskFlowContext(CreateNewContext(true));
            }
        }
    }

    /// <summary>
    /// Creates a new instance of the platform application request context with default dependencies.
    /// This virtual method can be overridden by derived classes to provide custom context implementations.
    /// </summary>
    /// <param name="useRootScopeSpForAsyncLocalInstance">
    /// When true, uses the root service provider scope for async local instances to prevent service provider disposal issues.
    /// When false, uses the current service provider scope which may be disposed before async operations complete.
    /// Should be set to true for async local contexts to ensure service provider remains available throughout async execution.
    /// </param>
    /// <returns>A new instance of IPlatformApplicationRequestContext configured with required dependencies</returns>
    /// <remarks>
    /// The default implementation creates a PlatformDefaultApplicationRequestContext with:
    /// - The current service provider for dependency resolution (or root scope if useRootScopeSpForAsyncLocalInstance is true)
    /// - A new PlatformApplicationSettingContext for configuration
    /// - Lazy load request context accessor registers if available
    /// - A reference to this accessor for context management
    ///
    /// <strong>Service Provider Scope Management:</strong>
    /// The useRootScopeSpForAsyncLocalInstance parameter is critical for preventing ObjectDisposedException
    /// in async scenarios where the original service provider scope may be disposed before async operations complete.
    ///
    /// <strong>Bug Prevention:</strong>
    /// If useRootScopeSpForAsyncLocalInstance is always false, the following issues can occur:
    ///
    /// 1. <strong>Scope Disposal Race Condition:</strong>
    ///    - Original HTTP request completes and disposes its service provider scope
    ///    - Async operation (background task, fire-and-forget) continues executing
    ///    - Async operation tries to resolve services from disposed scope
    ///    - Results in ObjectDisposedException when accessing context services
    ///
    /// 2. <strong>Cross-Request Context Bleeding:</strong>
    ///    - Async operations started in one request continue in background
    ///    - If using disposed scope, context may reference stale or invalid data
    ///    - Can lead to data corruption or security issues in multi-tenant scenarios
    ///
    /// 3. <strong>Service Resolution Failures:</strong>
    ///    - Scoped services (like database contexts) become unavailable
    ///    - Lazy-loaded context dependencies fail to resolve
    ///    - Background operations crash with service resolution errors
    ///
    /// <strong>Example Scenario:</strong>
    /// ```
    /// HTTP Request -> Creates Scoped Context -> Starts Async Background Task
    ///     |                    |                           |
    ///     v                    v                           v
    /// Request Completes -> Scope Disposed -> Background Task Continues
    ///                                           |
    ///                                           v
    ///                                    Tries to access context services
    ///                                           |
    ///                                           v
    ///                                    ObjectDisposedException!
    /// ```
    ///
    /// By using the root service provider for async local instances, the context remains
    /// valid throughout the entire async execution flow, preventing disposal-related exceptions
    /// and ensuring consistent service availability across async boundaries.
    /// </remarks>
    protected virtual IPlatformApplicationRequestContext CreateNewContext(bool useRootScopeSpForAsyncLocalInstance)
    {
        var contextSp = useRootScopeSpForAsyncLocalInstance
            ? ServiceProvider.GetRequiredService<IPlatformRootServiceProvider>().GetScopedRootServiceProvider()
            : ServiceProvider;

        return new PlatformDefaultApplicationRequestContext(
            contextSp,
            new PlatformApplicationSettingContext(contextSp),
            contextSp.GetService<PlatformApplicationLazyLoadRequestContextAccessorRegisters>(),
            this
        );
    }

    /// <summary>
    /// Releases managed and unmanaged resources used by the PlatformDefaultApplicationRequestContextAccessor.
    /// This method implements the standard .NET dispose pattern for proper resource cleanup.
    /// </summary>
    /// <param name="disposing">
    /// True if called from Dispose() method (managed resources should be released);
    /// False if called from finalizer (only unmanaged resources should be released)
    /// </param>
    /// <remarks>
    /// When disposing managed resources, this method clears the current context if it has been initialized.
    /// This prevents memory leaks and ensures proper cleanup of context-related resources.
    /// </remarks>
    protected virtual void Dispose(bool disposing)
    {
        // ReleaseUnmanagedResources();
        if (disposing)
        {
            // release managed resources here
#pragma warning disable S1066
            if (FirstAccessCurrentInitiated)
                Current = null;
#pragma warning restore S1066
        }
    }

    ~PlatformDefaultApplicationRequestContextAccessor()
    {
        Dispose(false);
    }

    protected sealed class RequestContextHolder
    {
        public IPlatformApplicationRequestContext Context { get; set; }
    }

    /// <summary>
    /// Defines the different lifetime management modes for platform application request context.
    /// These modes determine how request context instances are created, stored, retrieved, and maintained
    /// throughout the application lifecycle in various execution scenarios.
    /// </summary>
    /// <remarks>
    /// The context lifetime modes provide different strategies for managing request context in complex
    /// distributed and asynchronous scenarios. Each mode offers specific benefits and trade-offs:
    ///
    /// <strong>PerScope:</strong>
    /// - Context is tied directly to the dependency injection service provider scope
    /// - Ideal for traditional synchronous request processing
    /// - Provides automatic cleanup when the scope is disposed
    /// - Best performance for simple request-response scenarios
    /// - Context is shared across all operations within the same service scope
    ///
    /// <strong>PerAsyncLocalTaskFlow:</strong>
    /// - Context flows with async/await operations using AsyncLocal storage
    /// - Perfect for heavily asynchronous operations and background tasks
    /// - Maintains context across async boundaries and task continuations
    /// - Supports context isolation between concurrent async operations
    /// - Essential for fire-and-forget operations that need context
    ///
    /// <strong>PerScopeCombinedWithAsyncLocalTaskFlow:</strong>
    /// - Hybrid approach combining benefits of both scope and async local modes
    /// - Context is available both in scope storage and async local storage
    /// - Provides maximum flexibility for complex execution scenarios
    /// - Handles parent-child scope relationships with async operations
    /// - Recommended for microservices with mixed sync/async patterns
    /// - Ensures context availability regardless of execution path
    ///
    /// <strong>Usage Considerations:</strong>
    /// - PerScope: Use for simple, primarily synchronous applications
    /// - PerAsyncLocalTaskFlow: Use for heavily async applications without complex scoping
    /// - PerScopeCombinedWithAsyncLocalTaskFlow: Use for enterprise applications with complex execution patterns
    ///
    /// <strong>Performance Impact:</strong>
    /// - PerScope: Lowest overhead, fastest performance
    /// - PerAsyncLocalTaskFlow: Moderate overhead due to AsyncLocal management
    /// - PerScopeCombinedWithAsyncLocalTaskFlow: Highest overhead but maximum compatibility
    ///
    /// The choice of lifetime mode significantly impacts how request correlation, user context,
    /// and other request-scoped data flows through the EasyPlatform platform services.
    /// </remarks>
    public enum ContextLifeTimeModes
    {
        /// <summary>
        /// Request context is managed at the service provider scope level.
        /// Context instances are created and maintained within the scope of the dependency injection container
        /// and are automatically cleaned up when the scope is disposed.
        /// </summary>
        /// <remarks>
        /// This mode provides:
        /// - Direct binding to service provider scope lifecycle
        /// - Automatic context cleanup when scope is disposed
        /// - Optimal performance for synchronous request processing
        /// - Simple context sharing within the same service scope
        /// - Parent-child scope relationship support
        ///
        /// Best suited for:
        /// - Traditional MVC/Web API applications
        /// - Primarily synchronous operations
        /// - Applications with clear request-response boundaries
        /// - Scenarios where context doesn't need to flow across async boundaries
        ///
        /// Limitations:
        /// - Context may not be available in async continuations on different threads
        /// - Limited support for fire-and-forget operations
        /// - May lose context in complex async scenarios
        /// </remarks>
        PerScope,

        /// <summary>
        /// Request context flows with asynchronous operations using AsyncLocal storage.
        /// Context is maintained across async/await boundaries and task continuations,
        /// ensuring availability throughout the entire async execution flow.
        /// </summary>
        /// <remarks>
        /// This mode provides:
        /// - Context preservation across async/await operations
        /// - Support for concurrent async operations with context isolation
        /// - Context availability in background tasks and continuations
        /// - Thread-safe context access in multi-threaded scenarios
        /// - Automatic context propagation through task chains
        ///
        /// Best suited for:
        /// - Heavily asynchronous applications
        /// - Background processing services
        /// - Task-based parallel operations
        /// - Fire-and-forget operations that need context
        /// - Applications with complex async execution patterns
        ///
        /// Considerations:
        /// - Slightly higher memory overhead due to AsyncLocal storage
        /// - Context cleanup requires explicit management
        /// - May not integrate as naturally with DI scope lifecycle
        /// </remarks>
        PerAsyncLocalTaskFlow,

        /// <summary>
        /// Hybrid mode combining scope-based and async local context management.
        /// Context is maintained in both service provider scope storage and AsyncLocal storage,
        /// providing maximum flexibility and ensuring context availability across all execution scenarios.
        /// </summary>
        /// <remarks>
        /// This mode provides:
        /// - All benefits of both PerScope and PerAsyncLocalTaskFlow modes
        /// - Context availability regardless of execution path (sync or async)
        /// - Support for complex parent-child scope relationships with async operations
        /// - Automatic synchronization between scope and async local contexts
        /// - Maximum compatibility with various execution patterns
        /// - Fallback mechanisms ensuring context is never lost
        ///
        /// Best suited for:
        /// - Enterprise applications with mixed sync/async patterns
        /// - Microservices with complex execution flows
        /// - Applications requiring maximum context reliability
        /// - Scenarios with dynamic service scope creation within async operations
        /// - EasyPlatform platform services requiring full context coverage
        ///
        /// Trade-offs:
        /// - Highest resource overhead due to dual context management
        /// - More complex initialization and synchronization logic
        /// - Potential for context duplication in memory
        /// - Recommended for applications where context reliability is critical
        ///
        /// Implementation details:
        /// - Maintains context in both scope and AsyncLocal storage
        /// - Synchronizes context between storage mechanisms
        /// - Handles parent-child scope relationships with async boundaries
        /// - Provides thread-safe context access and updates
        /// </remarks>
        PerScopeCombinedWithAsyncLocalTaskFlow
    }
}

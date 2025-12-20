namespace Easy.Platform.Application.RequestContext;

/// <summary>
/// Manages a set of lazy-load request context accessors for deferred, asynchronous context value resolution.
/// This class serves as the runtime coordinator for lazy-loaded context values registered through
/// <see cref="PlatformApplicationModule.LazyLoadRequestContextAccessorRegistersFactory"/>, providing thread-safe
/// caching and execution of expensive context operations only when first accessed.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Core Functionality:</strong>
/// This class bridges the gap between the factory functions defined in application modules and the actual
/// runtime resolution of context values. It manages the lifecycle of lazy-loaded context data using
/// <c>AsyncLocal&lt;T&gt;</c> for thread-safe, request-scoped caching that flows correctly across async/await boundaries.
/// </para>
///
/// <para>
/// <strong>Threading and Isolation:</strong>
/// Uses <c>AsyncLocal&lt;LazyLoadRequestContextHolder&gt;</c> to ensure each request thread and its async continuations
/// have isolated context data. This prevents data leakage between concurrent requests while maintaining
/// context flow across async operations within the same logical request.
/// </para>
///
/// <para>
/// <strong>Lazy Execution Pattern:</strong>
/// Context values are created using <c>Lazy&lt;object&gt;</c> wrappers that invoke the original async factory functions.
/// This ensures that expensive operations (database queries, API calls, complex calculations) are deferred
/// until the context value is actually needed and then cached for subsequent accesses within the same request.
/// </para>
///
/// <para>
/// <strong>Integration with Platform Architecture:</strong>
/// - **Registration:** Receives factory functions from <c>LazyLoadRequestContextAccessorRegistersFactory()</c>
/// - **Resolution:** Converts async factories into lazy synchronous accessors for easier consumption
/// - **Caching:** Maintains request-scoped cache that automatically cleans up when request completes
/// - **Access:** Provides context values through extension methods like <c>RequestContext.CurrentEmployee()</c>
/// </para>
///
/// <para>
/// <strong>Memory Management:</strong>
/// Context data is automatically garbage collected when the request completes, as the <c>AsyncLocal</c>
/// reference goes out of scope. This prevents memory leaks in long-running applications with many requests.
/// </para>
/// </remarks>
public class PlatformApplicationLazyLoadRequestContextAccessorRegisters
{
    protected readonly IPlatformApplicationRequestContextAccessor RequestContextAccessor;

    protected readonly IServiceProvider ServiceProvider;

    /// <summary>
    /// Initializes a new instance by converting asynchronous factory functions
    /// into lazy providers that execute and cache their result on first access.
    /// </summary>
    /// <param name="serviceProvider">The DI service provider.</param>
    /// <param name="requestContextAccessor">The application request context accessor.</param>
    /// <param name="registers">
    /// A dictionary of async factory functions keyed by context key.
    /// Each function takes <see cref="IServiceProvider"/> and <see cref="IPlatformApplicationRequestContextAccessor"/>,
    /// and returns a <see cref="Task{Object}"?> that yields the context value.
    /// </param>
    public PlatformApplicationLazyLoadRequestContextAccessorRegisters(
        IServiceProvider serviceProvider,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>> registers
    )
    {
        ServiceProvider = serviceProvider;
        RequestContextAccessor = requestContextAccessor;
        Registers = registers;
    }

    /// <summary>
    /// Gets the original factory function registrations that define how context values are resolved.
    /// These factories are converted into lazy accessors for runtime use while preserving the original
    /// async factory signatures for reference and debugging purposes.
    /// </summary>
    /// <value>
    /// A dictionary where keys are context keys (e.g., "CurrentEmployee") and values are async factory functions
    /// that take service provider and request context accessor parameters to resolve context values.
    /// </value>
    public Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>> Registers { get; }

    /// <summary>
    /// Adds a new lazy context entry for deferred retrieval.
    /// This method allows runtime registration of additional context factories beyond those
    /// defined in <see cref="PlatformApplicationModule.LazyLoadRequestContextAccessorRegistersFactory"/>.
    /// </summary>
    /// <param name="key">
    /// The unique context key identifier used to access this value (e.g., "CurrentEmployee", "CurrentUserOrganizations").
    /// Must be unique within the application's context scope to avoid conflicts.
    /// </param>
    /// <param name="lazyValue">
    /// An asynchronous factory function that produces the context value when first accessed.
    /// The function receives the current <see cref="IServiceProvider"/> for dependency resolution and
    /// <see cref="IPlatformApplicationRequestContextAccessor"/> for accessing request context data.
    /// Should return a <see cref="Task{Object}"/>? containing the resolved context value.
    /// </param>
    /// <remarks>
    /// <para>
    /// This method is typically used for dynamic context registration scenarios where the set of context
    /// values cannot be determined at module initialization time. Most context values should be registered
    /// through the factory method in application modules for better performance and maintainability.
    /// </para>
    ///
    /// <para>
    /// <strong>Threading Considerations:</strong>
    /// This method modifies the <see cref="Registers"/> dictionary and should be called during application
    /// initialization or from synchronized contexts to avoid race conditions.
    /// </para>
    /// </remarks>
    public void Add(string key, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>> lazyValue)
    {
        Registers[key] = lazyValue;
    }

    /// <summary>
    /// Creates a new dictionary of lazy-loaded context values by converting the registered async factories
    /// into synchronous lazy accessors that cache their results on first execution.
    /// </summary>
    /// <returns>
    /// A dictionary where keys match the registered context keys and values are <c>Lazy&lt;object?&gt;</c>
    /// instances that wrap the original async factory functions for deferred execution and caching.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Async to Sync Conversion:</strong>
    /// This method bridges the gap between async factory functions (which enable dependency injection
    /// and complex data loading) and synchronous lazy accessors (which provide easier consumption patterns).
    /// The conversion uses <c>Lazy&lt;object&gt;</c> with factory functions that call <c>.Result</c> on
    /// the async operations, effectively making them synchronous but still cached.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Implications:</strong>
    /// Since this converts async operations to sync using <c>.Result</c>, it may potentially cause
    /// deadlocks in certain synchronization contexts. However, within the Easy Platform's architecture,
    /// this is typically safe because the calling context is designed to handle this pattern.
    /// </para>
    ///
    /// <para>
    /// <strong>Error Handling:</strong>
    /// Any exceptions thrown by the factory functions will be wrapped in <c>AggregateException</c>
    /// due to the async-to-sync conversion. Calling code should be prepared to handle these appropriately.
    /// </para>
    /// </remarks>
    public virtual Dictionary<string, Lazy<object?>> CreateNewLazyLoadRequestContext()
    {
        return Registers.ToDictionary(p => p.Key, p => new Lazy<object>(() => p.Value(ServiceProvider, RequestContextAccessor)));
    }

    /// <summary>
    /// Internal holder class that provides an indirection layer for storing lazy context data in <c>AsyncLocal</c>.
    /// This indirection allows the context to be cleared across all execution contexts when needed,
    /// preventing memory leaks and ensuring proper request isolation.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The indirection is necessary because <c>AsyncLocal&lt;T&gt;</c> maintains references across
    /// async execution contexts. By using an object holder, we can set the inner property to null
    /// to clear the context in all related execution contexts, rather than just the current one.
    /// </para>
    /// </remarks>
    protected sealed class LazyLoadRequestContextHolder
    {
        /// <summary>
        /// Gets or sets the dictionary of lazy-loaded context values for the current request.
        /// Setting this to null effectively clears the context across all async execution contexts.
        /// </summary>
        public Dictionary<string, Lazy<object?>> LazyLoadRequestContext { get; set; }
    }
}

namespace Easy.Platform.Application.RequestContext;

/// <summary>
/// Manages a set of lazy-load request context accessors for deferred, asynchronous context value resolution.
/// </summary>
public class PlatformApplicationLazyLoadRequestContextAccessorRegisters
{
    private static readonly AsyncLocal<LazyLoadRequestContextHolder> RequestContextCurrentThread = new();

    public Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>> Registers { get; }

    protected readonly IServiceProvider ServiceProvider;
    protected readonly IPlatformApplicationRequestContextAccessor RequestContextAccessor;

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
        Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>> registers)
    {
        ServiceProvider = serviceProvider;
        RequestContextAccessor = requestContextAccessor;
        Registers = registers;
    }

    public Dictionary<string, Lazy<object?>> Current
    {
        get
        {
            if (RequestContextCurrentThread.Value == null)
                Current = CreateNewLazyLoadRequestContext();

            return RequestContextCurrentThread.Value?.LazyLoadRequestContext;
        }
        set
        {
            var holder = RequestContextCurrentThread.Value;
            if (holder != null)
                // WHY: Clear current Context trapped in the AsyncLocals, as its done using
                // because we want to set a new current user context.
                holder.LazyLoadRequestContext = null;

            // WHY: Use an object indirection to hold the Context in the AsyncLocal,
            // so it can be cleared in all ExecutionContexts when its cleared.
            if (value != null)
            {
                RequestContextCurrentThread.Value = new LazyLoadRequestContextHolder
                {
                    LazyLoadRequestContext = value
                };
            }
        }
    }

    /// <summary>
    /// Adds a new lazy context entry for deferred retrieval.
    /// </summary>
    /// <param name="key">The context key to register.</param>
    /// <param name="lazyValue">
    /// An async factory that produces the context value when first accessed,
    /// given <see cref="IServiceProvider"/> and <see cref="IPlatformApplicationRequestContextAccessor"/>.
    /// </param>
    public void Add(string key, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>> lazyValue)
    {
        Registers[key] = lazyValue;
    }

    protected sealed class LazyLoadRequestContextHolder
    {
        public Dictionary<string, Lazy<object?>> LazyLoadRequestContext { get; set; }
    }

    protected virtual Dictionary<string, Lazy<object?>> CreateNewLazyLoadRequestContext()
    {
        return Registers.ToDictionary(p => p.Key, p => new Lazy<object>(() => p.Value(ServiceProvider, RequestContextAccessor)));
    }
}

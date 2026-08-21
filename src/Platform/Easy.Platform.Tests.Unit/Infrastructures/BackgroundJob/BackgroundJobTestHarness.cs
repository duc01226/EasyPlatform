using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Shared, allocation-per-test test doubles for the platform background-job unit tests.
/// <para>
/// Everything here is instance-scoped — there is no shared mutable static state — so every test class and every test
/// method can run in parallel and be repeated N times without interference.
/// </para>
/// </summary>
internal static class BackgroundJobTestHarness
{
    /// <summary>
    /// Builds a REAL DI container (not a mock) that satisfies exactly what the background-job executor base classes
    /// resolve in their constructors, so construction exercises the production resolution path.
    /// </summary>
    public static ServiceProvider BuildServiceProvider(
        TestApplicationSettingContext? settingContext = null,
        TestRequestContextAccessor? requestContextAccessor = null,
        Action<IServiceCollection>? configure = null)
    {
        var services = new ServiceCollection();

        services.AddSingleton<IPlatformApplicationSettingContext>(settingContext ?? new TestApplicationSettingContext());
        services.AddSingleton<IPlatformApplicationRequestContextAccessor>(requestContextAccessor ?? new TestRequestContextAccessor());
        services.AddSingleton<IPlatformRootServiceProvider>(sp => new TestRootServiceProvider(sp));

        configure?.Invoke(services);

        return services.BuildServiceProvider();
    }
}

/// <summary>
/// Minimal <see cref="IPlatformRootServiceProvider" /> that delegates every resolution to the built container.
/// <para>
/// Required because <c>PlatformBackgroundJobExecutor</c>'s constructor resolves this type from the provider it is given
/// (<c>PlatformBackgroundJobExecutor.cs:52</c>), and the non-generic overload passes the ROOT provider itself as that
/// provider — so the root provider must be able to resolve itself.
/// </para>
/// </summary>
internal sealed class TestRootServiceProvider : IPlatformRootServiceProvider
{
    private readonly IServiceProvider inner;

    public TestRootServiceProvider(IServiceProvider inner)
    {
        this.inner = inner;
    }

    public object? GetService(Type serviceType)
    {
        return serviceType == typeof(IPlatformRootServiceProvider) ? this : inner.GetService(serviceType);
    }

    public bool IsServiceTypeRegistered(Type serviceType)
    {
        return GetService(serviceType) != null;
    }

    public int ImplementationAssignableToServiceTypeRegisteredCount(Type assignableToServiceType)
    {
        return 0;
    }

    public Type? GetRegisteredPlatformModuleAssembliesType(string typeName)
    {
        return Type.GetType(typeName);
    }

    public bool IsScopedServiceProvider(IServiceProvider serviceProvider)
    {
        return !ReferenceEquals(serviceProvider, inner);
    }

    public IServiceProvider GetScopedRootServiceProvider()
    {
        return inner;
    }
}

/// <summary>
/// Concrete, fully controllable <see cref="IPlatformApplicationSettingContext" /> — the executors read
/// <see cref="IsDebugInformationMode" /> (which drives <c>LogDebugInformation()</c>),
/// <see cref="ApplicationName" /> (which forms the request-context pipeline routing key) and
/// <see cref="ProcessEventEnsureNoCircularPipeLineMaxCircularCount" /> (which gates the circular-pipeline skip).
/// </summary>
internal sealed class TestApplicationSettingContext : IPlatformApplicationSettingContext
{
    public string ApplicationName { get; set; } = "PlatJobUnitTestApp";

    public Assembly ApplicationAssembly { get; set; } = typeof(TestApplicationSettingContext).Assembly;

    public bool AutoGarbageCollectPerProcessRequestOrBusMessage { get; set; }

    public double AutoGarbageCollectPerProcessRequestOrBusMessageThrottleTimeSeconds { get; set; }

    public HashSet<string>? IgnoreRequestContextKeys { get; set; }

    public bool IsDebugInformationMode { get; set; }

    public int ProcessEventEnsureNoCircularPipeLineMaxCircularCount { get; set; } =
        IPlatformApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCountDefaultValue;
}

/// <summary>
/// Accessor returning one stable <see cref="TestRequestContext" /> instance so a test can inspect exactly what the job
/// wrote into the request context.
/// </summary>
internal sealed class TestRequestContextAccessor : IPlatformApplicationRequestContextAccessor
{
    private IPlatformApplicationRequestContext current = new TestRequestContext();

    public IPlatformApplicationRequestContext Current
    {
        get
        {
            FirstAccessCurrentInitiated = true;
            return current;
        }
        set => current = value ?? new TestRequestContext();
    }

    /// <summary>
    /// Required by <see cref="IPlatformApplicationRequestContextAccessor" /> — true once <see cref="Current" /> has
    /// been read at least once. Previously set but never asserted by any test (recorded LOW finding); asserted now by
    /// <see cref="PlatformApplicationBackgroundJobSchedulerTests.CarryRequestContextService_CurrentRequestContext_TracksFirstAccessInitiation" />.
    /// </summary>
    public bool FirstAccessCurrentInitiated { get; private set; }

    /// <summary>Replaces the whole current context with the supplied values.</summary>
    public IPlatformApplicationRequestContextAccessor SetValues(IDictionary<string, object> values)
    {
        Current.Clear();
        Current.SetValues(values!);
        return this;
    }

    /// <summary>Merges the supplied values into the current context, keeping everything already there.</summary>
    public IPlatformApplicationRequestContextAccessor AddValues(IDictionary<string, object> values)
    {
        Current.SetValues(values!);
        return this;
    }
}

/// <summary>
/// Dictionary-backed <see cref="IPlatformApplicationRequestContext" />.
/// <para>
/// A hand-written fake rather than a Moq proxy: the production code reaches the context through EXTENSION methods
/// (<c>AddConsumerOrEventHandlerPipeLine</c>, <c>ConsumerOrEventHandlerPipeLine</c>) whose behavior depends on the
/// context actually storing and returning values — a loose mock would silently return nulls and the pipeline assertions
/// would prove nothing.
/// </para>
/// </summary>
internal sealed class TestRequestContext : IPlatformApplicationRequestContext
{
    private readonly Dictionary<string, object?> transientValues = new(StringComparer.Ordinal);
    private readonly Dictionary<string, object?> contextValues = new(StringComparer.Ordinal);

    public object this[string key]
    {
        get => contextValues[key]!;
        set => contextValues[key] = value;
    }

    public ICollection<string> Keys => contextValues.Keys;

    public ICollection<object> Values => contextValues.Values.Select(p => p!).ToList();

    public int Count => contextValues.Count;

    public bool IsReadOnly => false;

    public void Add(string key, object value)
    {
        contextValues.Add(key, value);
    }

    public void Add(KeyValuePair<string, object> item)
    {
        contextValues.Add(item.Key, item.Value);
    }

    public void Clear()
    {
        contextValues.Clear();
    }

    public bool Contains(KeyValuePair<string, object> item)
    {
        return contextValues.TryGetValue(item.Key, out var found) && Equals(found, item.Value);
    }

    public bool ContainsKey(string key)
    {
        return contextValues.ContainsKey(key);
    }

    public void CopyTo(KeyValuePair<string, object>[] array, int arrayIndex)
    {
        foreach (var pair in contextValues)
            array[arrayIndex++] = new KeyValuePair<string, object>(pair.Key, pair.Value!);
    }

    public IEnumerator<KeyValuePair<string, object>> GetEnumerator()
    {
        return contextValues.Select(p => new KeyValuePair<string, object>(p.Key, p.Value!)).GetEnumerator();
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator()
    {
        return GetEnumerator();
    }

    public bool Remove(string key)
    {
        return contextValues.Remove(key);
    }

    public bool Remove(KeyValuePair<string, object> item)
    {
        return contextValues.Remove(item.Key);
    }

    public bool TryGetValue(string key, out object value)
    {
        var found = contextValues.TryGetValue(key, out var rawValue);
        value = rawValue!;
        return found;
    }

    public T GetValue<T>(string contextKey)
    {
        return contextValues.TryGetValue(contextKey, out var found) && found is T typedValue ? typedValue : default!;
    }

    public object? GetValue(Type valueType, string contextKey)
    {
        return contextValues.TryGetValue(contextKey, out var found) && found != null && valueType.IsInstanceOfType(found) ? found : null;
    }

    public void SetValue(object? value, string contextKey, bool onlySelf = false)
    {
        contextValues[contextKey] = value;
    }

    public void SetValues(IDictionary<string, object?> values, bool onlySelf = false)
    {
        foreach (var pair in values)
            contextValues[pair.Key] = pair.Value;
    }

    public void SetValues(IPlatformApplicationRequestContext values, bool onlySelf = false)
    {
        foreach (var pair in values)
            contextValues[pair.Key] = pair.Value;
    }

    /// <summary>
    /// Keys this fake treats as deliberately ignored, mirroring the ignore-keys filter production applies in
    /// <c>PlatformDefaultApplicationRequestContext.SetValues</c> (<c>PlatformDefaultApplicationRequestContext.cs:83</c>)
    /// before it ever reaches storage. Without this, <see cref="GetAllKeyValues" /> and
    /// <see cref="GetAllIncludeIgnoredKeyValues" /> returned the identical dictionary and a test asserting on one could
    /// not tell it apart from production accidentally calling the other — see
    /// <c>PlatformApplicationBackgroundJobSchedulerCarryRequestContextService.CurrentRequestContext</c>
    /// (<c>PlatformApplicationBackgroundJobSchedulerCarryRequestContextService.cs:23</c>), which must call
    /// <see cref="GetAllKeyValues" /> specifically so an ignored key never leaks across the scheduling boundary.
    /// </summary>
    public HashSet<string> IgnoredKeys { get; } = new(StringComparer.Ordinal);

    public List<string> GetAllIncludeIgnoredKeys()
    {
        return contextValues.Keys.ToList();
    }

    public IDictionary<string, object?> GetAllIncludeIgnoredKeyValues()
    {
        return new Dictionary<string, object?>(contextValues, StringComparer.Ordinal);
    }

    public List<string> GetAllKeys()
    {
        return contextValues.Keys.Where(key => !IgnoredKeys.Contains(key)).ToList();
    }

    public IDictionary<string, object?> GetAllKeyValues()
    {
        return contextValues
            .Where(pair => !IgnoredKeys.Contains(pair.Key))
            .ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
    }

    public IPlatformApplicationRequestContextAccessor RequestContextAccessor()
    {
        return new TestRequestContextAccessor { Current = this };
    }

    public void SetTransientValue(object? value, string contextKey)
    {
        transientValues[contextKey] = value;
    }

    public T? GetTransientValue<T>(string contextKey)
    {
        return transientValues.TryGetValue(contextKey, out var found) && found is T typedValue ? typedValue : default;
    }
}

#nullable enable

#region

using System.Collections;
using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper.Abstract;
using Easy.Platform.Common.Diagnostics;
using Easy.Platform.Common.Execution;
using Easy.Platform.Common.RequestContext;
using Microsoft.AspNetCore.Http;

#endregion

namespace Easy.Platform.AspNetCore.Context.RequestContext;

/// <summary>
/// ASP.NET Core implementation of the platform application request context.
/// This class manages request-scoped data by aggregating values from multiple sources including HTTP context,
/// user claims, request headers, and manually set values. It provides efficient caching and thread-safe access
/// to request context data throughout the application lifecycle.
/// </summary>
/// <remarks>
/// The class implements a multi-layered data retrieval strategy:
/// 1. First checks cached data for performance
/// 2. Falls back to HTTP context (claims, headers, trace identifier)
/// 3. Uses lazy-loaded context accessor registers as final fallback
///
/// Key features:
/// - Thread-safe caching with ConcurrentDictionary
/// - Support for ignored context keys via application settings
/// - Automatic mapping between context keys and JWT claim types
/// - Exception handling for disposed HTTP contexts
/// - Implements both generic and non-generic access patterns
///
/// <para>
/// <b>Trust model.</b> Two boundaries govern this class and are easy to miss when adding a context key:
/// </para>
/// <para>
/// 1. <b>Inbound</b> — a value may come from a validated claim or from a request header. The header path exists so
/// callers can supply their own per-request preferences; it must never supply a value that states who the caller is
/// or what they may do. Keys listed in
/// <see cref="IPlatformApplicationRequestContextKeyToClaimTypeMapper.NotFromRequestHeaderContextKeys" /> therefore
/// lose that fallback — see <see cref="TryGetValueFromHttpContext{T}" />.
/// </para>
/// <para>
/// 2. <b>Outbound</b> — only keys named in
/// <see cref="IPlatformApplicationRequestContextKeyToClaimTypeMapper.TrustedPropagationContextKeys" /> cross an
/// event, message, or background-job boundary, bounded in count and size. <see cref="GetAllKeyValues" /> returns
/// that allowlisted view, NOT the full context; use <see cref="GetAllIncludeIgnoredKeyValues" /> when the complete
/// in-process context is genuinely needed.
/// </para>
/// <para>
/// Both default to DENY. Adding an application context key that is authority-bearing, or that must survive a
/// boundary, means overriding the mapper — not relying on the platform's defaults to happen to allow it.
/// </para>
/// </remarks>
public class PlatformAspNetApplicationRequestContext : IPlatformApplicationRequestContext
{
    /// <summary>
    /// Maximum number of keys carried across a propagation boundary. Bounds fan-out when an application registers a
    /// large allowlist; keys are taken in <see cref="PropagationPriority" /> order so the correlation and identity
    /// keys survive truncation and only low-priority extras are dropped.
    /// </summary>
    internal const int MaxPropagatedRequestContextKeyCount = 32;

    /// <summary>
    /// Maximum length of a propagated key name. Longer keys are skipped outright — a key name that large is a
    /// malformed or hostile registration, not a legitimate context key.
    /// </summary>
    internal const int MaxPropagatedRequestContextKeySize = 256;

    /// <summary>Maximum measured size of any single propagated value; larger values are dropped, not truncated.</summary>
    internal const int MaxPropagatedRequestContextValueSize = 8192;

    /// <summary>
    /// Maximum measured size of the whole propagated context.
    /// <para />These four caps exist because this context is copied onto every outgoing bus message, event, and
    /// background job. Without a bound, one request carrying an oversized context value multiplies it across the
    /// entire downstream fan-out — inflating every message payload and every inbox/outbox row derived from it.
    /// Dropping a value is always preferred over truncating it: a truncated value is silently wrong, and downstream
    /// code cannot tell the difference between "not present" and "present but mangled".
    /// </summary>
    internal const int MaxPropagatedRequestContextTotalSize = 32768;

    /// <summary>
    /// Cached reflection information for the generic GetValue method.
    /// This enables dynamic invocation of the generic GetValue method when the type is only known at runtime.
    /// The method info is cached as a static readonly field for performance optimization.
    /// </summary>
    private static readonly MethodInfo GetValueByGenericTypeMethodInfo = typeof(PlatformAspNetApplicationRequestContext)
        .GetMethods()
        .First(p => p.IsGenericMethod && p.Name == nameof(GetValue) && p.GetGenericArguments().Length == 1 && p.IsPublic);

    /// <summary>
    /// Application setting context that provides access to configuration settings including ignored request context keys.
    /// Used to determine which context keys should be excluded from non-ignored caches.
    /// </summary>
    protected readonly IPlatformApplicationSettingContext ApplicationSettingContext;

    /// <summary>
    /// Thread-safe cache for lazy-loaded request context data.
    /// Stores values retrieved from lazy-load accessor registers to avoid repeated evaluation.
    /// </summary>
    protected readonly ConcurrentDictionary<string, object?> LazyLoadCachedRequestContextData = new();

    /// <summary>
    /// Dictionary containing lazy-loaded request context accessor registers.
    /// These are fallback data sources that are evaluated lazily when a context key is not found in primary sources.
    /// </summary>
    protected readonly Dictionary<string, Lazy<object?>> LazyLoadCurrentRequestContextAccessorRegisters;

    /// <summary>
    /// Thread-safe cache for request context data excluding ignored keys.
    /// This cache contains only the keys that are not configured to be ignored in the application settings.
    /// </summary>
    protected readonly ConcurrentDictionary<string, object?> NotIgnoredRequestContextKeysRequestContextData = new();

    /// <summary>
    /// Service provider for dependency injection and service resolution.
    /// </summary>
    protected readonly IServiceProvider ServiceProvider;

    /// <summary>
    /// Isolated cache for transient in-memory values that are excluded from all serialization and enumeration operations.
    /// Values stored here are only accessible via <see cref="GetTransientValue{T}"/> and <see cref="SetTransientValue"/>.
    /// These values do not appear in GetAllKeys, GetAllKeyValues, or any context serialization.
    /// </summary>
    protected readonly ConcurrentDictionary<string, object?> TransientInMemoryContextData = new();

    /// <summary>
    /// Mapper that converts context keys to claim types for JWT token and claims-based authentication scenarios.
    /// Enables flexible mapping between application context keys and standard or custom claim types.
    /// </summary>
    private readonly IPlatformApplicationRequestContextKeyToClaimTypeMapper claimTypeMapper;

    /// <summary>
    /// HTTP context accessor that provides thread-safe access to the current HTTP context.
    /// This is crucial for maintaining proper async context flow in ASP.NET Core applications.
    /// </summary>
    private readonly IHttpContextAccessor httpContextAccessor;

    /// <summary>
    /// Thread synchronization lock for initializing cached request context data.
    /// Ensures that cache initialization is performed only once per request context instance.
    /// </summary>
    private readonly Lock initCachedRequestContextDataLock = new();

    /// <summary>
    /// Flag indicating whether the cached request context data has been initialized.
    /// Prevents multiple initialization attempts and ensures proper cache state management.
    /// </summary>
    private bool cachedRequestContextDataInitiated;

    /// <summary>
    /// Initializes a new instance of the PlatformAspNetApplicationRequestContext class.
    /// This constructor sets up all necessary dependencies and data sources for request context management.
    /// </summary>
    /// <param name="httpContextAccessor">Provides access to the current HTTP context in a thread-safe manner</param>
    /// <param name="claimTypeMapper">Maps context keys to JWT claim types for authentication scenarios</param>
    /// <param name="applicationSettingContext">Provides access to application configuration including ignored keys</param>
    /// <param name="serviceProvider">Service provider for dependency injection</param>
    /// <param name="lazyLoadRequestContextAccessorRegisters">Registry of lazy-loaded context data sources</param>
    /// <param name="createdByRequestContextAccessor">The accessor that created this context instance</param>
    public PlatformAspNetApplicationRequestContext(
        IHttpContextAccessor httpContextAccessor,
        IPlatformApplicationRequestContextKeyToClaimTypeMapper claimTypeMapper,
        IPlatformApplicationSettingContext applicationSettingContext,
        IServiceProvider serviceProvider,
        PlatformApplicationLazyLoadRequestContextAccessorRegisters lazyLoadRequestContextAccessorRegisters,
        IPlatformApplicationRequestContextAccessor createdByRequestContextAccessor
    )
    {
        this.httpContextAccessor = httpContextAccessor;
        this.claimTypeMapper = claimTypeMapper;
        ApplicationSettingContext = applicationSettingContext;
        ServiceProvider = serviceProvider;
        CreatedByRequestContextAccessor = createdByRequestContextAccessor;
        LazyLoadCurrentRequestContextAccessorRegisters = lazyLoadRequestContextAccessorRegisters.CreateNewLazyLoadRequestContext();
    }

    /// <summary>
    /// Thread-safe cache containing all request context data including ignored keys.
    /// This is the master cache that stores all retrieved context values for performance optimization.
    /// </summary>
    public ConcurrentDictionary<string, object?> FullCachedRequestContextData { get; } = new();

    /// <summary>
    /// Reference to the request context accessor that created this context instance.
    /// Provides access to the parent accessor for delegation and hierarchical context management.
    /// </summary>
    public IPlatformApplicationRequestContextAccessor CreatedByRequestContextAccessor { get; }

    /// <summary>
    /// Retrieves a value from the request context using a strongly-typed approach.
    /// This method acts as a simplified interface to the core GetValue method, using the current HTTP context
    /// and providing default parameters for common scenarios.
    /// </summary>
    /// <typeparam name="T">The type of value to retrieve</typeparam>
    /// <param name="contextKey">The key identifying the context value to retrieve</param>
    /// <returns>The value associated with the context key, or default(T) if not found</returns>
    /// <remarks>
    /// This method implements a multi-step retrieval process:
    /// 1. Checks the full cached request context data first for performance
    /// 2. Falls back to HTTP context sources (claims, headers, trace identifier)
    /// 3. Uses lazy-loaded accessor registers as a final fallback
    ///
    /// The method leverages the main GetValue overload with predefined parameters for common usage scenarios.
    /// </remarks>
    public T? GetValue<T>(string contextKey)
    {
        return GetValue<T>(
            contextKey,
            CurrentHttpContext(),
            ApplicationSettingContext,
            FullCachedRequestContextData,
            NotIgnoredRequestContextKeysRequestContextData,
            out _,
            claimTypeMapper
        );
    }

    /// <summary>
    /// Sets a single value in the request context cache with an optional flag to limit updates to the current instance.
    /// This method converts the single key-value pair into a dictionary and delegates to the SetValues method.
    /// </summary>
    /// <param name="value">The value to store in the context</param>
    /// <param name="contextKey">The key under which to store the value</param>
    /// <param name="onlySelf">If true, updates only the current instance's cache; if false, delegates to the parent accessor</param>
    /// <remarks>
    /// This is a convenience method that wraps the more general SetValues method for single value operations.
    /// The onlySelf parameter controls whether the update is confined to this context instance or propagated
    /// through the request context accessor hierarchy.
    /// </remarks>
    public void SetValue(object? value, string contextKey, bool onlySelf = false)
    {
        SetValues(new Dictionary<string, object?>([new KeyValuePair<string, object?>(contextKey, value)]), onlySelf);
    }

    /// <summary>
    /// Sets multiple values in the request context cache with an optional flag to control update scope.
    /// If onlySelf is true, updates are applied only to this instance's cache. Otherwise, delegates to the parent accessor.
    /// This method implements the core logic for updating context values while respecting ignore settings.
    /// </summary>
    /// <param name="values">Dictionary of key-value pairs to set in the context</param>
    /// <param name="onlySelf">If true, updates only this instance; if false, delegates to parent accessor</param>
    /// <remarks>
    /// When onlySelf is true, the method directly updates both the full cache and the non-ignored cache.
    /// Keys that are configured to be ignored (via ApplicationSettingContext) are excluded from the non-ignored cache.
    /// When onlySelf is false, the method delegates to the CreatedByRequestContextAccessor for hierarchical updates.
    /// </remarks>
    public void SetValues(IDictionary<string, object?> values, bool onlySelf = false)
    {
        if (onlySelf)
        {
            values.ForEach(p =>
            {
                FullCachedRequestContextData.Upsert(p.Key, p.Value);
                if (!ApplicationSettingContext.GetIgnoreRequestContextKeys().ContainsIgnoreCase(p.Key))
                    NotIgnoredRequestContextKeysRequestContextData.Upsert(p.Key, p.Value);
            });
        }
        else
            CreatedByRequestContextAccessor.SetValues(values);
    }

    /// <summary>
    /// Sets multiple values from another request context instance with an optional flag to control update scope.
    /// This overload extracts all key-value pairs (including ignored keys) from the source context and applies them.
    /// </summary>
    /// <param name="values">The source request context containing values to copy</param>
    /// <param name="onlySelf">If true, updates only this instance; if false, delegates to parent accessor</param>
    /// <remarks>
    /// This method delegates to the main SetValues method after extracting all key-value pairs from the source context.
    /// It provides a convenient way to merge context data from another request context instance.
    /// </remarks>
    public void SetValues(IPlatformApplicationRequestContext values, bool onlySelf = false)
    {
        SetValues(values.GetAllIncludeIgnoredKeyValues(), onlySelf);
    }

    /// <summary>
    /// Retrieves all context keys including those marked as ignored in the application settings.
    /// This method initializes the cached request context data and returns a comprehensive list of all available keys.
    /// </summary>
    /// <returns>A list containing all context keys, including ignored ones</returns>
    /// <remarks>
    /// This method ensures that all available context data is initialized before returning the keys.
    /// It includes keys that would normally be filtered out by the GetAllKeys method.
    /// </remarks>
    public List<string> GetAllIncludeIgnoredKeys()
    {
        InitAllKeyValuesForCachedRequestContextData();

        return GetAllKeys(CurrentHttpContext(), true);
    }

    /// <summary>
    /// Retrieves all context key-value pairs including those marked as ignored in the application settings.
    /// This method ensures all context data is initialized and returns a dictionary containing all key-value pairs.
    /// </summary>
    /// <returns>A dictionary containing all context key-value pairs, including ignored ones</returns>
    /// <remarks>
    /// This method initializes the cached request context data if not already done and provides access
    /// to the complete set of context data, bypassing any ignore filters.
    /// </remarks>
    public IDictionary<string, object?> GetAllIncludeIgnoredKeyValues()
    {
        InitAllKeyValuesForCachedRequestContextData();

        return GetAllKeyValues(CurrentHttpContext(), true);
    }

    /// <summary>
    /// Retrieves the keys of the TRUSTED PROPAGATION context — the explicitly allowlisted keys that resolved to a
    /// value on this request — not every key the request happens to carry.
    /// </summary>
    /// <returns>Allowlisted keys that resolved, capped and ordered as described on <see cref="GetAllKeyValues" />.</returns>
    /// <remarks>
    /// Use <see cref="GetAllIncludeIgnoredKeyValues" /> when the full in-process context is genuinely required.
    /// This method is the boundary-crossing view and is deliberately narrower.
    /// </remarks>
    public List<string> GetAllKeys()
    {
        return BuildTrustedPropagationContext(CurrentHttpContext()).Keys.ToList();
    }

    /// <summary>
    /// Retrieves the TRUSTED PROPAGATION context: the values of keys explicitly allowlisted by
    /// <see cref="IPlatformApplicationRequestContextKeyToClaimTypeMapper.TrustedPropagationContextKeys" />, bounded
    /// in count and size.
    /// </summary>
    /// <returns>A case-insensitive dictionary of allowlisted keys that resolved to a value on this request.</returns>
    /// <remarks>
    /// <para>
    /// <b>Why this is an allowlist, not the full context.</b> This method feeds the copy of request context that
    /// rides along on outgoing bus messages, CQRS events, and background jobs. Anything it returns leaves the
    /// request that produced it and is re-established as ambient context in a different process. Returning the full
    /// context made that boundary transitive: any value reachable from the request — including values a caller
    /// supplied by header — would be re-asserted downstream as if the platform had established it, and would be
    /// persisted into inbox/outbox rows. An allowlist inverts the default: a key crosses the boundary because it was
    /// named, never because nothing denied it.
    /// </para>
    /// <para>
    /// <b>Behaviour change.</b> This previously returned every non-ignored key. Callers that need the complete
    /// in-process context must use <see cref="GetAllIncludeIgnoredKeyValues" />; applications that legitimately
    /// need a business key downstream must add it to their mapper's allowlist rather than rely on it leaking
    /// through.
    /// </para>
    /// </remarks>
    public IDictionary<string, object?> GetAllKeyValues()
    {
        return BuildTrustedPropagationContext(CurrentHttpContext());
    }

    /// <summary>
    /// Returns the request context accessor that created this context instance.
    /// This provides access to the parent accessor for hierarchical context management and delegation scenarios.
    /// </summary>
    /// <returns>The request context accessor that created this instance</returns>
    /// <remarks>
    /// This method provides access to the parent accessor which is useful for delegating operations
    /// and maintaining the hierarchical structure of request context management.
    /// </remarks>
    public IPlatformApplicationRequestContextAccessor RequestContextAccessor()
    {
        return CreatedByRequestContextAccessor;
    }

    /// <inheritdoc />
    public void SetTransientValue(object? value, string contextKey)
    {
        TransientInMemoryContextData.Upsert(contextKey, value);
    }

    /// <inheritdoc />
    public T? GetTransientValue<T>(string contextKey)
    {
        ArgumentNullException.ThrowIfNull(contextKey);

        if (PlatformRequestContextHelper.TryGetAndConvertValue(TransientInMemoryContextData, contextKey, out T? foundValue))
            return foundValue;

        return default;
    }

    /// <summary>
    /// Adds a key-value pair to the request context collection.
    /// This method is a convenience wrapper that delegates to SetValue for consistency with collection interfaces.
    /// </summary>
    /// <param name="item">The key-value pair to add to the context</param>
    /// <remarks>
    /// This method implements the ICollection interface requirement and provides a way to add context data
    /// using the standard collection pattern. It internally uses SetValue to maintain consistency.
    /// </remarks>
    public void Add(KeyValuePair<string, object> item)
    {
        SetValue(item.Value, item.Key);
    }

    public void Clear()
    {
        FullCachedRequestContextData.Clear();
        NotIgnoredRequestContextKeysRequestContextData.Clear();
    }

    public bool Contains(KeyValuePair<string, object?> item)
    {
        InitAllKeyValuesForCachedRequestContextData();
        // ReSharper disable once UsageOfDefaultStructEquality
        return FullCachedRequestContextData.Contains(item);
    }

    public void CopyTo(KeyValuePair<string, object?>[] array, int arrayIndex)
    {
        InitAllKeyValuesForCachedRequestContextData();

        FullCachedRequestContextData.ToList().CopyTo(array, arrayIndex);
    }

    public bool Remove(KeyValuePair<string, object> item)
    {
        InitAllKeyValuesForCachedRequestContextData();

        NotIgnoredRequestContextKeysRequestContextData.Remove(item.Key, out _);
        return FullCachedRequestContextData.Remove(item.Key, out _);
    }

    public int Count
    {
        get
        {
            InitAllKeyValuesForCachedRequestContextData();
            return FullCachedRequestContextData.Count;
        }
    }

    public bool IsReadOnly => false;

    public object? GetValue(Type valueType, string contextKey)
    {
        return GetValueByGenericTypeMethodInfo.MakeGenericMethod(valueType).Invoke(this, parameters: [contextKey]);
    }

    public IEnumerator<KeyValuePair<string, object?>> GetEnumerator()
    {
        InitAllKeyValuesForCachedRequestContextData();
        return FullCachedRequestContextData.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator()
    {
        InitAllKeyValuesForCachedRequestContextData();
        return GetEnumerator();
    }

    public void Add(string key, object value)
    {
        FullCachedRequestContextData.Upsert(key, value);
        if (!ApplicationSettingContext.GetIgnoreRequestContextKeys().Contains(key))
            NotIgnoredRequestContextKeysRequestContextData.Upsert(key, value);
    }

    public bool ContainsKey(string key)
    {
        InitAllKeyValuesForCachedRequestContextData();
        return FullCachedRequestContextData.ContainsKey(key);
    }

    public bool Remove(string key)
    {
        InitAllKeyValuesForCachedRequestContextData();

        NotIgnoredRequestContextKeysRequestContextData.Remove(key, out _);
        return FullCachedRequestContextData.Remove(key, out _);
    }

    public bool TryGetValue(string key, out object? value)
    {
        value = GetValue<object?>(
            key,
            CurrentHttpContext(),
            ApplicationSettingContext,
            FullCachedRequestContextData,
            NotIgnoredRequestContextKeysRequestContextData,
            out var hasFoundValue,
            claimTypeMapper
        );
        return hasFoundValue;
    }

    public object? this[string key]
    {
        get => GetValue<object>(key);
        set => SetValue(value, key);
    }

    public ICollection<string> Keys
    {
        get
        {
            InitAllKeyValuesForCachedRequestContextData();
            return FullCachedRequestContextData.Keys;
        }
    }

    public ICollection<object?> Values
    {
        get
        {
            InitAllKeyValuesForCachedRequestContextData();
            return FullCachedRequestContextData.Values;
        }
    }

    /// <summary>
    /// Retrieves the value associated with the specified context key.
    /// </summary>
    /// <param name="contextKey">The key of the value to get.</param>
    /// <param name="useHttpContext">The HttpContext instance to use.</param>
    /// <param name="fullCachedRequestContextData">The ConcurrentDictionary instance that contains cached user context data.</param>
    /// <param name="hasFoundValue">hasFoundValue</param>
    /// <param name="claimTypeMapper">
    /// The IPlatformApplicationRequestContextKeyToClaimTypeMapper instance that maps user context keys to claim types.
    /// REQUIRED — must not be null. It also carries
    /// <see cref="IPlatformApplicationRequestContextKeyToClaimTypeMapper.NotFromRequestHeaderContextKeys" />, the
    /// policy that decides which keys lose the request-header fallback; passing null would disable that guard for
    /// every key.
    /// </param>
    /// <returns>The value associated with the specified context key. If the specified key is not found, a default value is returned.</returns>
    /// <typeparam name="T">The type of the value to get.</typeparam>
    /// <exception cref="ArgumentNullException">Thrown when the contextKey is null.</exception>
    /// <remarks>
    /// The GetValue[T] method in the PlatformAspNetApplicationRequestContext class is used to retrieve a value associated with a specified context key from the user's context data. This method is generic, meaning it can return values of any type.
    /// <br />
    /// The method first checks if the context data is cached in a ConcurrentDictionary instance.If the data is cached, it retrieves the value from the cache.If the data is not cached, it attempts to retrieve the value from the HttpContext instance.If the value is successfully retrieved from the HttpContext, it is then added to the cache for future use.
    /// <br />
    /// This method is useful for efficiently accessing user-specific data that may be needed across multiple requests in an ASP.NET Core application.By caching the data, the method avoids the overhead of repeatedly retrieving the same data from the HttpContext.
    /// <br />
    /// The IPlatformApplicationRequestContextKeyToClaimTypeMapper instance is used to map user context keys to claim types, which can be useful when working with claims-based identity.
    /// </remarks>
    public T? GetValue<T>(
        string contextKey,
        HttpContext? useHttpContext,
        IPlatformApplicationSettingContext applicationSettingContext,
        ConcurrentDictionary<string, object?> fullCachedRequestContextData,
        ConcurrentDictionary<string, object?> notIgnoredRequestContextKeysRequestContextData,
        out bool hasFoundValue,
        // REQUIRED, deliberately not optional: the mapper carries NotFromRequestHeaderContextKeys, which is what
        // stops an authority-bearing key from being read off a request header. A null mapper makes that guard
        // evaluate false and silently restores the header fallback for EVERY key — a security control must not
        // default to "allow" when its policy source is absent. Callers hold a non-null mapper already.
        IPlatformApplicationRequestContextKeyToClaimTypeMapper claimTypeMapper
    )
    {
        ArgumentNullException.ThrowIfNull(contextKey);

        hasFoundValue = PlatformRequestContextHelper.TryGetAndConvertValue(fullCachedRequestContextData, contextKey, out T? foundValue);
        if (hasFoundValue)
            return foundValue;

        hasFoundValue = TryGetValueFromHttpContext(useHttpContext, contextKey, claimTypeMapper, out foundValue);
        if (hasFoundValue)
        {
            fullCachedRequestContextData.TryAdd(contextKey, foundValue);
            if (!applicationSettingContext.GetIgnoreRequestContextKeys().ContainsIgnoreCase(contextKey))
                notIgnoredRequestContextKeysRequestContextData.TryAdd(contextKey, foundValue);

            return foundValue;
        }

        hasFoundValue = PlatformRequestContextHelper.TryGetAndConvertValue(LazyLoadCachedRequestContextData, contextKey, out foundValue);
        if (hasFoundValue)
            return foundValue;

        hasFoundValue = PlatformRequestContextHelper.TryGetAndConvertValue(LazyLoadCurrentRequestContextAccessorRegisters, contextKey, out foundValue);
        if (hasFoundValue)
        {
            LazyLoadCachedRequestContextData.TryAdd(contextKey, foundValue);
            return foundValue;
        }

        hasFoundValue = false;
        return default;
    }

    protected List<string> GetAllKeys(HttpContext? useHttpContext, bool includeIgnoredKeys = false)
    {
        if (cachedRequestContextDataInitiated)
            return includeIgnoredKeys ? FullCachedRequestContextData.Keys.ToList() : NotIgnoredRequestContextKeysRequestContextData.Keys.ToList();

        var manuallySetValueItemsDicKeys = includeIgnoredKeys ? FullCachedRequestContextData.Keys.ToList() : NotIgnoredRequestContextKeysRequestContextData.Keys.ToList();
        var userClaimsTypeKeys =
            Util.TaskRunner.CatchException<Exception, List<string>>(() => useHttpContext?.User.Claims.Select(p => p.Type).ToList() ?? [], []);
        var requestHeadersKeys =
            Util.TaskRunner.CatchException<Exception, List<string>>(() => useHttpContext?.Request.Headers.Select(p => p.Key).ToList() ?? [], []);

        return new[] { PlatformApplicationCommonRequestContextKeys.RequestIdContextKey }
            .Concat(manuallySetValueItemsDicKeys)
            .Concat(userClaimsTypeKeys)
            .Concat(requestHeadersKeys)
            .WhereIf(!includeIgnoredKeys, p => !ApplicationSettingContext.GetIgnoreRequestContextKeys().ContainsIgnoreCase(p))
            .Where(p => p != null)
            .Distinct()
            .ToList();
    }

    protected IDictionary<string, object?> GetAllKeyValues(HttpContext? useHttpContext, bool includeIgnoredKeys = false)
    {
        if (!cachedRequestContextDataInitiated)
        {
            // Get value from all keys to init all value into dictionary
            _ = GetAllKeys(useHttpContext, includeIgnoredKeys)
                .Select(key => new KeyValuePair<string, object?>(
                    key,
                    GetValue<object>(
                        key,
                        useHttpContext,
                        ApplicationSettingContext,
                        FullCachedRequestContextData,
                        NotIgnoredRequestContextKeysRequestContextData,
                        out _,
                        claimTypeMapper
                    )
                ))
                .ToList();
        }

        return includeIgnoredKeys ? FullCachedRequestContextData : NotIgnoredRequestContextKeysRequestContextData;
    }

    /// <summary>
    /// Materialises the allowlisted, size-bounded context that may cross a process or message boundary.
    /// </summary>
    /// <param name="useHttpContext">The current HTTP context, or <c>null</c> outside a request.</param>
    /// <returns>Resolved allowlisted keys, ordered by importance and cut off at the configured caps.</returns>
    /// <remarks>
    /// <para>
    /// Ordering is deliberate and comes before the caps are applied: <see cref="PropagationPriority" /> first, then
    /// key name for a stable tie-break. Because the caps truncate, order decides WHAT survives — an unordered walk
    /// would let an incidental key crowd out the correlation id or user id, and would produce a different surviving
    /// set on different runs for the same request.
    /// </para>
    /// <para>
    /// The request id is fetched as <c>string</c> rather than <c>object</c> because its resolution path falls back to
    /// the HTTP trace identifier, which the typed accessor is what triggers. Everything else is fetched untyped so a
    /// value keeps whatever shape the application stored.
    /// </para>
    /// <para>
    /// A key that does not resolve (<c>hasFoundValue == false</c>) is omitted rather than propagated as null, so
    /// downstream code can distinguish "absent here" from "explicitly null". Values are budgeted by
    /// <see cref="TryMeasurePropagationValue" /> BEFORE being added — measuring after would mean the oversized value
    /// had already been admitted, and the total cap accounts for key length as well as value size because the key
    /// names travel too.
    /// </para>
    /// <para>
    /// Note the loop skips rather than breaks when a value fails its budget: a single oversized value must not
    /// discard the smaller, lower-priority keys behind it.
    /// </para>
    /// </remarks>
    private Dictionary<string, object?> BuildTrustedPropagationContext(HttpContext? useHttpContext)
    {
        var propagatedContext = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        var measuredTotalSize = 0;

        foreach (var key in claimTypeMapper.TrustedPropagationContextKeys
                     .Where(key => !string.IsNullOrWhiteSpace(key) && key.Length <= MaxPropagatedRequestContextKeySize)
                     .OrderBy(PropagationPriority)
                     .ThenBy(key => key, StringComparer.OrdinalIgnoreCase))
        {
            if (propagatedContext.Count >= MaxPropagatedRequestContextKeyCount)
                break;

            object? value;
            bool hasFoundValue;
            if (key.Equals(PlatformApplicationCommonRequestContextKeys.RequestIdContextKey, StringComparison.OrdinalIgnoreCase))
            {
                value = GetValue<string?>(
                    key,
                    useHttpContext,
                    ApplicationSettingContext,
                    FullCachedRequestContextData,
                    NotIgnoredRequestContextKeysRequestContextData,
                    out hasFoundValue,
                    claimTypeMapper);
            }
            else
            {
                value = GetValue<object?>(
                    key,
                    useHttpContext,
                    ApplicationSettingContext,
                    FullCachedRequestContextData,
                    NotIgnoredRequestContextKeysRequestContextData,
                    out hasFoundValue,
                    claimTypeMapper);
            }
            if (!hasFoundValue)
                continue;

            var remainingTotalSize = MaxPropagatedRequestContextTotalSize - measuredTotalSize - key.Length;
            if (remainingTotalSize < 0
                || !TryMeasurePropagationValue(value, Math.Min(MaxPropagatedRequestContextValueSize, remainingTotalSize), out var measuredValueSize))
                continue;

            propagatedContext[key] = value;
            measuredTotalSize += key.Length + measuredValueSize;
        }

        return propagatedContext;
    }

    /// <summary>
    /// Ranks a key's importance when the propagation caps force truncation — lower wins.
    /// </summary>
    /// <param name="key">A key from the trusted allowlist.</param>
    /// <returns>The rank; unranked application keys share the trailing bucket and tie-break by name.</returns>
    /// <remarks>
    /// The order encodes what a downstream consumer cannot work without. Request id ranks first because losing it
    /// breaks cross-service correlation for the entire downstream chain — the one value whose absence degrades
    /// diagnosis of every other failure. Identity follows, then the pipeline key that the circular-handler guard
    /// depends on. Application-specific keys default to the trailing bucket; an application that needs one of its own
    /// keys to survive truncation ahead of the platform ones should raise its allowlist discipline rather than
    /// reorder this, since these are the keys the platform itself depends on downstream.
    /// </remarks>
    private static int PropagationPriority(string key)
    {
        return key switch
        {
            PlatformApplicationCommonRequestContextKeys.RequestIdContextKey => 0,
            PlatformApplicationCommonRequestContextKeys.UserIdContextKey => 1,
            PlatformApplicationCommonRequestContextKeys.UserNameContextKey => 2,
            PlatformApplicationCommonRequestContextKeys.EmailContextKey => 3,
            PlatformApplicationCommonRequestContextKeys.UserRolesContextKey => 4,
            PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey => 5,
            _ => 100
        };
    }

    /// <summary>
    /// Decides whether a value fits the remaining propagation budget, measuring it WITHOUT serializing it.
    /// </summary>
    /// <param name="value">The candidate value.</param>
    /// <param name="remainingSize">Budget left for this value.</param>
    /// <param name="measuredSize">Measured size when the value fits; meaningless when the method returns false.</param>
    /// <param name="depth">Current nesting depth; the walk refuses to go deeper than 4.</param>
    /// <returns><c>true</c> when the value is both measurable and within budget.</returns>
    /// <remarks>
    /// <para>
    /// <b>Why measure instead of serialize.</b> The obvious implementation — serialize the value and check the
    /// string length — costs an allocation proportional to the value on the hot path of every request, and does it
    /// precisely for values that turn out to be too big to keep. It also runs the value's own converters and
    /// getters, so a hostile or merely expensive model could stall or throw inside context propagation. This walks
    /// the shape instead and allocates nothing beyond the enumerators.
    /// </para>
    /// <para>
    /// <b>Why unknown object graphs are refused.</b> An arbitrary POCO cannot be measured without invoking its
    /// getters, so the final <c>return false</c> drops it. That is fail-closed by design: an unmeasurable value is
    /// also an unbounded one, and letting it through would defeat the caps it could not be checked against.
    /// Applications that need a complex value downstream should propagate a string or a plain dictionary.
    /// </para>
    /// <para>
    /// The depth limit and the 128-item collection limits terminate cyclic and pathologically wide graphs. Both are
    /// hard refusals rather than partial measurements — a partially measured value would be admitted with an
    /// understated size and blow the very budget being enforced. Note <c>depth</c> guards nesting only; sibling
    /// breadth is bounded separately by the item counts.
    /// </para>
    /// </remarks>
    private static bool TryMeasurePropagationValue(object? value, int remainingSize, out int measuredSize, int depth = 0)
    {
        measuredSize = 0;
        if (remainingSize < 0 || depth > 4)
            return false;
        if (value == null)
            return true;

        if (value is string stringValue)
        {
            measuredSize = stringValue.Length;
            return measuredSize <= remainingSize;
        }

        if (value is JsonElement jsonElement)
            return TryMeasureJsonElement(jsonElement, remainingSize, out measuredSize, depth);

        var valueType = value.GetType();
        if (valueType.IsPrimitive || valueType.IsEnum || value is decimal or Guid or DateTime or DateTimeOffset or TimeSpan)
        {
            measuredSize = value.ToString()?.Length ?? 0;
            return measuredSize <= remainingSize;
        }

        if (value is IDictionary dictionary)
        {
            foreach (DictionaryEntry item in dictionary)
            {
                if (dictionary.Count > 128
                    || !TryMeasurePropagationValue(item.Key, remainingSize - measuredSize, out var keySize, depth + 1)
                    || !TryMeasurePropagationValue(item.Value, remainingSize - measuredSize - keySize, out var valueSize, depth + 1))
                    return false;

                measuredSize += keySize + valueSize;
            }

            return true;
        }

        if (value is IEnumerable values)
        {
            var itemCount = 0;
            foreach (var item in values)
            {
                itemCount++;
                if (itemCount > 128
                    || !TryMeasurePropagationValue(item, remainingSize - measuredSize, out var itemSize, depth + 1))
                    return false;

                measuredSize += itemSize;
            }

            return true;
        }

        // Unknown object graphs are intentionally refused rather than invoking arbitrary getters or allocating an
        // unbounded serialization merely to decide whether the value is safe to propagate.
        return false;
    }

    /// <summary>
    /// Measures a <see cref="JsonElement" /> branch of the propagation walk.
    /// </summary>
    /// <param name="element">The element to measure.</param>
    /// <param name="remainingSize">Budget left for this element.</param>
    /// <param name="measuredSize">Measured size when the element fits.</param>
    /// <param name="depth">Current nesting depth, shared with <see cref="TryMeasurePropagationValue" />.</param>
    /// <returns><c>true</c> when the element is within budget.</returns>
    /// <remarks>
    /// <see cref="JsonElement" /> needs its own arm because it is a value that already IS parsed JSON — it arrives
    /// whenever a context value was deserialized rather than set in-process, and the generic object walk would fall
    /// through to the unknown-graph refusal and drop it. Strings are measured by decoded length while numbers and
    /// booleans are measured by raw text, because that is what each will actually occupy once re-emitted.
    /// <see cref="JsonValueKind.Undefined" /> is treated as empty like null, and any unrecognised kind is refused —
    /// the same fail-closed default as the object walk.
    /// </remarks>
    private static bool TryMeasureJsonElement(JsonElement element, int remainingSize, out int measuredSize, int depth)
    {
        measuredSize = 0;
        switch (element.ValueKind)
        {
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                return true;
            case JsonValueKind.String:
                measuredSize = element.GetString()?.Length ?? 0;
                return measuredSize <= remainingSize;
            case JsonValueKind.True:
            case JsonValueKind.False:
            case JsonValueKind.Number:
                measuredSize = element.GetRawText().Length;
                return measuredSize <= remainingSize;
            case JsonValueKind.Array:
                return TryMeasurePropagationValue(element.EnumerateArray(), remainingSize, out measuredSize, depth + 1);
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    if (!TryMeasureJsonElement(property.Value, remainingSize - measuredSize - property.Name.Length, out var propertySize, depth + 1))
                        return false;
                    measuredSize += property.Name.Length + propertySize;
                }

                return true;
            default:
                return false;
        }
    }

    /// <summary>
    /// GetAllKeyValues also from HttpContext and other source to auto save data into CachedRequestContext
    /// </summary>
    protected void InitAllKeyValuesForCachedRequestContextData()
    {
        // MUST go through CurrentHttpContext(), never httpContextAccessor.HttpContext directly, so a
        // request-detached background flow is honored here too. Reading the accessor directly bypassed that
        // gate and gave this method its own independent path into the recycled-HttpContext race.
        if (cachedRequestContextDataInitiated || CurrentHttpContext() == null)
            return;

        lock (initCachedRequestContextDataLock)
        {
            if (cachedRequestContextDataInitiated || CurrentHttpContext() == null)
                return;

            // GetAllKeyValues already auto cache item in http context into CachedRequestContextData
            GetAllKeyValues(CurrentHttpContext(), true);
            cachedRequestContextDataInitiated = true;
        }
    }

    /// <summary>
    /// To get the current http context.
    /// This method is very important and explain the reason why we don't store _httpContextAccessor.HttpContext
    /// to a private variable such as private HttpContext _context = _httpContextAccessor.HttpContext.
    /// The important reason is HttpContext property inside HttpContextAccessor is AsyncLocal property. That's why
    /// we need to keep this behavior or we will face the thread issue or accessing DisposedObject.
    /// More details at: https://github.com/aspnet/AspNetCore/blob/master/src/Http/Http/src/HttpContextAccessor.cs#L16.
    /// </summary>
    /// <returns>The current HttpContext with thread safe.</returns>
    /// <remarks>
    /// Returns null when the current flow is detached (see <see cref="PlatformDetachedExecutionFlow" />).
    /// A fire-and-forget background scope inherits this AsyncLocal HttpContext from the thread that scheduled
    /// it, but Kestrel recycles and resets that pooled HttpContext as soon as the response completes. Reading
    /// it from the background flow is a use-after-recycle race that surfaces as a NullReferenceException deep
    /// inside Microsoft.Extensions.Features, so background flows MUST resolve request context from the values
    /// captured at dispatch time instead.
    /// </remarks>
    public HttpContext? CurrentHttpContext()
    {
        // This layer supplies the request-specific reading of the generic "flow is detached" fact: a detached
        // flow has no owning request, so it gets no HttpContext.
        if (PlatformDetachedExecutionFlow.IsDetached) return null;

        return httpContextAccessor.HttpContext;
    }

    /// <summary>
    /// Resolves a context key from the live HTTP context, in trust order: request id (trace identifier) → validated
    /// user claims → request headers. The ordering is the security property, not an optimisation — a claim, having
    /// been established by authentication, always wins over anything the caller sent, and authority-bearing keys are
    /// cut off before the header step is ever reached.
    /// </summary>
    /// <typeparam name="T">Expected value type.</typeparam>
    /// <param name="useHttpContext">Current HTTP context; a null, featureless, or aborted context resolves nothing.</param>
    /// <param name="contextKey">Key to resolve.</param>
    /// <param name="claimTypeMapper">
    /// Claim mapping AND header-fallback policy. Non-nullable: see the inline note below and on
    /// <see cref="GetValue{T}" />.
    /// </param>
    /// <param name="foundValue">The resolved value, or <c>default</c>.</param>
    /// <returns><c>true</c> when a value was resolved from the HTTP context.</returns>
    private static bool TryGetValueFromHttpContext<T>(
        HttpContext? useHttpContext,
        string contextKey,
        // Non-nullable: this method hosts the header-fallback guard below, which must never be reachable without
        // the mapper that defines which keys the guard protects. See the note on GetValue's parameter.
        IPlatformApplicationRequestContextKeyToClaimTypeMapper claimTypeMapper,
        out T? foundValue
    )
    {
        try
        {
            // NOTE: do NOT add a `useHttpContext.Features is null` guard here. DefaultHttpContext.Features is
            // `_features.Collection ?? ContextDisposed()`, and ContextDisposed() THROWS ObjectDisposedException
            // rather than returning null — so such a check is dead code that can only ever throw. It was added
            // once before (commit b157ae7263e) against this very crash and did not prevent it.
            //
            // RequestAborted is 'true' if the request has been aborted or has completed normally.
            if (useHttpContext == null ||
                useHttpContext.Request?.Headers is null ||
                useHttpContext.RequestAborted.IsCancellationRequested)
            {
                foundValue = default;
                return false;
            }

            if (contextKey == PlatformApplicationCommonRequestContextKeys.RequestIdContextKey)
                return TryGetRequestId(useHttpContext, out foundValue);

            if (TryGetValueFromUserClaims(useHttpContext.User, contextKey, claimTypeMapper, out foundValue))
                return true;

            // Authority-bearing keys stop here: present as a validated claim, or not present at all.
            // Falling through to the header lookup would let the caller assert the value the system was supposed to
            // establish about them — impersonation for a user id, privilege escalation for a role, side-effect
            // suppression for a trusted internal flag.
            // See IPlatformApplicationRequestContextKeyToClaimTypeMapper.NotFromRequestHeaderContextKeys.
            if (claimTypeMapper.NotFromRequestHeaderContextKeys.Contains(contextKey))
            {
                foundValue = default;
                return false;
            }

            if (TryGetValueFromRequestHeaders(useHttpContext.Request.Headers, contextKey, claimTypeMapper, out foundValue))
                return true;

            return false;
        }
        catch (Exception e) when (RecordDeadHttpContextRead(e))
        {
            // Reading a recycled/reset pooled HttpContext is inherently racy: the guard above and the reads
            // below it cannot be atomic with respect to Kestrel tearing the context down once the response
            // completed. That race surfaces non-deterministically as any of these three:
            //   - ObjectDisposedException  — IFeatureCollection has been disposed (e.g. via TraceIdentifier)
            //   - NullReferenceException   — FeatureReferences<T>.UpdateCached dereferencing a nulled Collection
            //   - InvalidOperationException — feature collection mutated mid-read
            // This read is best-effort by contract (the adjacent GetAllKeys already swallows every exception
            // from its HttpContext reads), so a failed read means "no value", never a crash.
            //
            // PlatformDetachedExecutionFlow should make this unreachable for background flows: if this filter
            // ever fires in practice, there is a detached path that is not being marked. That expectation is
            // MEASURED, not merely asserted — see RecordDeadHttpContextRead below and the counter it feeds.
            foundValue = default;
            return false;
        }
    }

    /// <summary>
    /// Counter of HttpContext reads that failed because the context was already being torn down.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>This instrument exists to make a claim falsifiable.</b> <see cref="PlatformDetachedExecutionFlow" />
    /// is supposed to make the dead-context read path unreachable: a background flow is marked detached, so
    /// <see cref="CurrentHttpContext" /> hands it <c>null</c> and it never touches the recycled object. If that
    /// holds, this counter stays at zero forever. <b>Any non-zero value means a root-derived dispatch path
    /// exists that is not marking its flow detached</b> — go find it. Without this counter the swallow is
    /// silent and that regression is invisible, which is exactly how the original defect survived four fixes.
    /// </para>
    /// <para>
    /// Declared here rather than on <see cref="PlatformMeter" /> itself so the generic meter stays free of
    /// request-context vocabulary: the owning layer names its own instrument and reuses the shared
    /// <see cref="PlatformMeter.Instance" /> so it still exports through the platform's OpenTelemetry meter.
    /// </para>
    /// </remarks>
    private static readonly Counter<long> DeadHttpContextReadTotal =
        PlatformMeter.Instance.CreateCounter<long>("easyplatform.requestcontext.dead_context_read_total");

    /// <summary>
    /// Exception filter for <see cref="TryGetValueFromHttpContext{T}" />: records the occurrence, then reports
    /// whether the exception is one of the three the teardown race can produce.
    /// </summary>
    /// <remarks>
    /// Runs as a <c>when</c> filter purely so the counter is incremented for the exceptions actually handled,
    /// with no behavioural change: it returns the identical predicate the inline filter used, and increments
    /// only when that predicate is true. Returning <c>false</c> leaves any other exception propagating exactly
    /// as before. The filter is deliberately allocation-free and never throws — a throwing exception filter
    /// would be swallowed by the runtime and silently change which handler runs.
    /// </remarks>
    private static bool RecordDeadHttpContextRead(Exception e)
    {
        if (e is not (ObjectDisposedException or NullReferenceException or InvalidOperationException))
            return false;

        try
        {
            DeadHttpContextReadTotal.Add(1, new KeyValuePair<string, object?>("exception", e.GetType().Name));
        }
        catch
        {
            // Telemetry must never change control flow: if the meter pipeline is disposed during host
            // shutdown, the read still degrades to "no value" exactly as it did before this counter existed.
        }

        return true;
    }

    private static bool TryGetValueFromRequestHeaders<T>(
        IHeaderDictionary? useHttpContextRequestHeaders,
        string contextKey,
        IPlatformApplicationRequestContextKeyToClaimTypeMapper? claimTypeMapper,
        out T? foundValue
    )
    {
        foundValue = default;

        // If the input is null from the start, we can exit early.
        if (useHttpContextRequestHeaders == null) return false;

        try
        {
            var contextKeyMappedToOneOfClaimTypes = GetContextKeyMappedToOneOfClaimTypes(contextKey, claimTypeMapper);

            // This entire LINQ chain is now inside the 'try' block.
            // If 'useHttpContextRequestHeaders' is disposed, the enumeration
            // triggered by .FirstOrDefault() will throw, and the catch block will handle it.
            var stringRequestHeaderValues =
                contextKeyMappedToOneOfClaimTypes
                    .Select(contextKeyMappedToJwtClaimType =>
                        useHttpContextRequestHeaders
                            .Where(p => string.Equals(p.Key, contextKeyMappedToJwtClaimType, StringComparison.OrdinalIgnoreCase))
                            .Select(p => p.Value.ToString())
                            .ToList()
                    )
                    .FirstOrDefault(p => p.Any()) ?? [];

            // If the above succeeds, we proceed as normal.
            return PlatformRequestContextHelper.TryParseFromStrings(out foundValue, stringRequestHeaderValues);
        }
        // A disposed IHeaderDictionary can throw either of these exceptions.
        // Catching them prevents the application from crashing.
        catch (ObjectDisposedException)
        {
            // Headers were disposed. Log this event if you can.
            // We return false, indicating the value was not found.
            return false;
        }
#pragma warning disable S1696
        catch (NullReferenceException)
#pragma warning restore S1696
        {
            // This is the other symptom of a disposed header collection.
            // Log this event too. Return false as the value was not found.
            return false;
        }
    }

    private static HashSet<string> GetContextKeyMappedToOneOfClaimTypes(string contextKey, IPlatformApplicationRequestContextKeyToClaimTypeMapper? claimTypeMapper)
    {
        return (claimTypeMapper?.ToOneOfClaimTypes(contextKey) ?? [contextKey]).Where(p => p != null).ToHashSet();
    }

    private static bool TryGetRequestId<T>(HttpContext httpContext, out T? foundValue)
    {
        if (httpContext.TraceIdentifier.IsNotNullOrEmpty() && typeof(T) == typeof(string))
        {
            foundValue = (T)(object)httpContext.TraceIdentifier;
            return true;
        }

        foundValue = default;
        return false;
    }

    /// <summary>
    /// Return True if found value and out the value of type <see cref="T" />.
    /// Return false if value is not found and out default of type <see cref="T" />.
    /// </summary>
    private static bool TryGetValueFromUserClaims<T>(
        ClaimsPrincipal userClaims,
        string contextKey,
        IPlatformApplicationRequestContextKeyToClaimTypeMapper? claimTypeMapper,
        out T foundValue
    )
    {
        var contextKeyMappedToOneOfClaimTypes = GetContextKeyMappedToOneOfClaimTypes(contextKey, claimTypeMapper);

        var matchedClaimStringValues = contextKeyMappedToOneOfClaimTypes.Any()
            ? contextKeyMappedToOneOfClaimTypes
                .Select(contextKeyMappedToJwtClaimType => userClaims.FindAll(contextKeyMappedToJwtClaimType).Select(p => p.Value))
                .Aggregate((current, next) => current.Concat(next).ToList())
                .Distinct()
                .ToList()
            : [];

        // Try Get Deserialized value from matchedClaimStringValues
        return PlatformRequestContextHelper.TryParseFromStrings(out foundValue, matchedClaimStringValues);
    }
}

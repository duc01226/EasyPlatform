#nullable enable

#region

using System.Collections;
using System.Collections.Concurrent;
using System.Reflection;
using System.Security.Claims;
using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper.Abstract;
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
/// </remarks>
public class PlatformAspNetApplicationRequestContext : IPlatformApplicationRequestContext
{
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
    /// Retrieves all context keys excluding those marked as ignored in the application settings.
    /// This method initializes the cached request context data and returns only the non-ignored keys.
    /// </summary>
    /// <returns>A list containing context keys that are not marked as ignored</returns>
    /// <remarks>
    /// This method provides access to context keys that are actively tracked and not filtered out by ignore settings.
    /// It's the standard way to get available context keys for most use cases.
    /// </remarks>
    public List<string> GetAllKeys()
    {
        InitAllKeyValuesForCachedRequestContextData();

        return GetAllKeys(CurrentHttpContext());
    }

    /// <summary>
    /// Retrieves all context key-value pairs excluding those marked as ignored in the application settings.
    /// This method initializes the cached request context data if not already done and returns a filtered dictionary.
    /// </summary>
    /// <returns>A dictionary containing context key-value pairs that are not marked as ignored</returns>
    /// <remarks>
    /// This method provides access to the actively tracked context data while respecting ignore settings.
    /// It's the standard way to get all available context data for most use cases.
    /// </remarks>
    public IDictionary<string, object?> GetAllKeyValues()
    {
        InitAllKeyValuesForCachedRequestContextData();

        return GetAllKeyValues(CurrentHttpContext());
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
    /// <param name="claimTypeMapper">The IPlatformApplicationRequestContextKeyToClaimTypeMapper instance that maps user context keys to claim types.</param>
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
        IPlatformApplicationRequestContextKeyToClaimTypeMapper? claimTypeMapper = null
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
    /// GetAllKeyValues also from HttpContext and other source to auto save data into CachedRequestContext
    /// </summary>
    protected void InitAllKeyValuesForCachedRequestContextData()
    {
        if (cachedRequestContextDataInitiated || httpContextAccessor.HttpContext == null)
            return;

        lock (initCachedRequestContextDataLock)
        {
            if (cachedRequestContextDataInitiated || httpContextAccessor.HttpContext == null)
                return;

            // GetAllKeyValues already auto cache item in http context into CachedRequestContextData
            GetAllKeyValues(httpContextAccessor.HttpContext, true);
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
    public HttpContext? CurrentHttpContext()
    {
        return httpContextAccessor.HttpContext;
    }

    private static bool TryGetValueFromHttpContext<T>(
        HttpContext? useHttpContext,
        string contextKey,
        IPlatformApplicationRequestContextKeyToClaimTypeMapper? claimTypeMapper,
        out T? foundValue
    )
    {
        try
        {
            // This property will be 'true' if the request has been aborted
            // or has completed normally.
            if (useHttpContext == null ||
                useHttpContext.Features is null ||
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

            if (TryGetValueFromRequestHeaders(useHttpContext.Request.Headers, contextKey, claimTypeMapper, out foundValue))
                return true;

            return false;
        }
        catch (ObjectDisposedException)
        {
            // Fix System.ObjectDisposedException: IFeatureCollection has been disposed error may happen when accessing HttpContext.TraceIdentifier
            foundValue = default;
            return false;
        }
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

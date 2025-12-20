#region

using System.Collections;
using System.Collections.Concurrent;
using System.Reflection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.RequestContext;
using Type = System.Type;

#endregion

namespace Easy.Platform.Application.RequestContext;

public class PlatformDefaultApplicationRequestContext : IPlatformApplicationRequestContext
{
    private static readonly MethodInfo GetValueByGenericTypeMethodInfo =
        typeof(PlatformDefaultApplicationRequestContext).GetMethods()
            .First(p => p.IsGenericMethod && p.Name == nameof(GetValue) && p.GetGenericArguments().Length == 1 && p.IsPublic);

    protected readonly IPlatformApplicationSettingContext ApplicationSettingContext;
    protected readonly ConcurrentDictionary<string, object?> FullCachedRequestContextData = new();
    protected readonly ConcurrentDictionary<string, object?> LazyLoadCachedRequestContextData = new();
    protected readonly Dictionary<string, Lazy<object?>> LazyLoadCurrentRequestContextAccessorRegisters;
    protected readonly ConcurrentDictionary<string, object?> NotIgnoredRequestContextKeysRequestContextData = new();
    protected readonly IServiceProvider ServiceProvider;

    public PlatformDefaultApplicationRequestContext(
        IServiceProvider serviceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformApplicationLazyLoadRequestContextAccessorRegisters lazyLoadRequestContextAccessorRegisters,
        IPlatformApplicationRequestContextAccessor createdByRequestContextAccessor)
    {
        ServiceProvider = serviceProvider;
        ApplicationSettingContext = applicationSettingContext;
        CreatedByRequestContextAccessor = createdByRequestContextAccessor;
        LazyLoadCurrentRequestContextAccessorRegisters = lazyLoadRequestContextAccessorRegisters.CreateNewLazyLoadRequestContext();
    }

    public IPlatformApplicationRequestContextAccessor CreatedByRequestContextAccessor { get; }

    public T GetValue<T>(string contextKey)
    {
        ArgumentNullException.ThrowIfNull(contextKey);

        if (PlatformRequestContextHelper.TryGetAndConvertValue(FullCachedRequestContextData, contextKey, out T? foundValue)) return foundValue;

        if (PlatformRequestContextHelper.TryGetAndConvertValue(LazyLoadCachedRequestContextData, contextKey, out foundValue)) return foundValue;

        if (PlatformRequestContextHelper.TryGetAndConvertValue(LazyLoadCurrentRequestContextAccessorRegisters, contextKey, out foundValue))
        {
            LazyLoadCachedRequestContextData.TryAdd(contextKey, foundValue);
            return foundValue;
        }

        return default;
    }

    public object GetValue(Type valueType, string contextKey)
    {
        return GetValueByGenericTypeMethodInfo
            .MakeGenericMethod(valueType)
            .Invoke(this, parameters: [contextKey]);
    }

    public void SetValue(object? value, string contextKey, bool onlySelf = false)
    {
        SetValues(new Dictionary<string, object?>([new KeyValuePair<string, object?>(contextKey, value)]), onlySelf);
    }

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

    public void SetValues(IPlatformApplicationRequestContext values, bool onlySelf = false)
    {
        SetValues(values.GetAllIncludeIgnoredKeyValues(), onlySelf);
    }

    public List<string> GetAllIncludeIgnoredKeys()
    {
        return FullCachedRequestContextData.Keys.ToList();
    }

    public IDictionary<string, object?> GetAllIncludeIgnoredKeyValues()
    {
        return FullCachedRequestContextData;
    }

    public List<string> GetAllKeys()
    {
        return NotIgnoredRequestContextKeysRequestContextData.Keys.ToList();
    }

    public IDictionary<string, object?> GetAllKeyValues()
    {
        return NotIgnoredRequestContextKeysRequestContextData;
    }

    public IPlatformApplicationRequestContextAccessor RequestContextAccessor()
    {
        return CreatedByRequestContextAccessor;
    }

    public void Add(KeyValuePair<string, object> item)
    {
        FullCachedRequestContextData.Upsert(item.Key, item.Value);
        if (!ApplicationSettingContext.GetIgnoreRequestContextKeys().Contains(item.Key))
            NotIgnoredRequestContextKeysRequestContextData.Upsert(item.Key, item.Value);
    }

    public void Clear()
    {
        FullCachedRequestContextData.Clear();
        NotIgnoredRequestContextKeysRequestContextData.Clear();
    }

    public bool Contains(KeyValuePair<string, object> item)
    {
        // ReSharper disable once UsageOfDefaultStructEquality
        return FullCachedRequestContextData.Contains(item);
    }

    public void CopyTo(KeyValuePair<string, object>[] array, int arrayIndex)
    {
        FullCachedRequestContextData.ToList().CopyTo(array, arrayIndex);
    }

    public bool Remove(KeyValuePair<string, object> item)
    {
        NotIgnoredRequestContextKeysRequestContextData.Remove(item.Key, out _);
        return FullCachedRequestContextData.Remove(item.Key, out _);
    }

    public int Count
    {
        get
        {
            return FullCachedRequestContextData.Count;
        }
    }

    public bool IsReadOnly => false;

    public IEnumerator<KeyValuePair<string, object>> GetEnumerator()
    {
        return FullCachedRequestContextData.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator()
    {
        return GetEnumerator();
    }

    public void Add(string key, object value)
    {
        SetValue(value, key);
    }

    public bool ContainsKey(string key)
    {
        return FullCachedRequestContextData.ContainsKey(key);
    }

    public bool Remove(string key)
    {
        NotIgnoredRequestContextKeysRequestContextData.Remove(key, out _);
        return FullCachedRequestContextData.Remove(key, out _);
    }

    public bool TryGetValue(string key, out object value)
    {
        return FullCachedRequestContextData.TryGetValue(key, out value);
    }

    public object this[string key]
    {
        get => FullCachedRequestContextData[key];
        set
        {
            FullCachedRequestContextData[key] = value;
            if (!ApplicationSettingContext.GetIgnoreRequestContextKeys().Contains(key))
                NotIgnoredRequestContextKeysRequestContextData.Upsert(key, value);
        }
    }

    public ICollection<string> Keys => FullCachedRequestContextData.Keys;
    public ICollection<object> Values => FullCachedRequestContextData.Values;
}

using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Represent the structured cache key. The string formatted value is "{Context}.{Collection}.{RequestKey}";
/// </summary>
public readonly struct PlatformCacheKey
    : IEquatable<PlatformCacheKey>
{
    public const string DefaultContext = "__DefaultGlobalCacheContext__";
    public const string DefaultCollection = "All";
    public const string DefaultRequestKey = "All";
    public const string RequestKeySeparator = "---:";
    public const string RequestKeySeparatorAutoValidReplaced = "_";
    public const string RequestKeyPartsSeparator = "-+-";
    public const string RequestKeyPartsPrefix = "(";
    public const string RequestKeyPartsSuffix = ")";
    public const string SpecialDistributedCacheKeyFolderSeparator = ":";
    public const string SpecialDistributedCacheKeyFolderSeparatorAutoValidReplaced = "=";
    public const string NullValue = "(NULL)";

    public PlatformCacheKey(string requestKey = DefaultRequestKey)
    {
        RequestKey = AutoFixKeyPartValue(requestKey);
    }

    public PlatformCacheKey(string[] requestKeyParts)
    {
        RequestKey = requestKeyParts.Length == 0 ? DefaultRequestKey : BuildRequestKey(requestKeyParts);
    }

    public PlatformCacheKey(string collection, string requestKey) : this(requestKey)
    {
        Collection = AutoFixKeyPartValue(collection);
    }

    public PlatformCacheKey(string collection, params string[] requestKeyParts) : this(requestKeyParts)
    {
        Collection = AutoFixKeyPartValue(collection);
    }

    public PlatformCacheKey(string context, string collection, string requestKey) : this(collection, requestKey)
    {
        Context = AutoFixKeyPartValue(context);
    }

    public PlatformCacheKey(string context, string collection, params string[] requestKeyParts) : this(
        collection,
        requestKeyParts)
    {
        Context = AutoFixKeyPartValue(context);
    }

    /// <summary>
    /// The context of the cached data. Usually it's like the database or service name.
    /// </summary>
    public string Context { get; init; } = DefaultContext;

    /// <summary>
    /// The Type of the cached data. Usually it's like the database collection or data class name.
    /// </summary>
    public string Collection { get; init; } = DefaultCollection;

    /// <summary>
    /// The request key for cached data. Usually it could be data identifier, or request unique key.
    /// </summary>
    public string RequestKey { get; init; }

    public bool Equals(PlatformCacheKey other)
    {
        return ToString() == other.ToString();
    }

    public static string AutoFixKeyPartValue(string keyPartValue)
    {
        return keyPartValue?.Replace(RequestKeySeparator, RequestKeySeparatorAutoValidReplaced)
            .Replace(SpecialDistributedCacheKeyFolderSeparator, SpecialDistributedCacheKeyFolderSeparatorAutoValidReplaced);
    }

    public static implicit operator string(PlatformCacheKey platformCacheKey)
    {
        return platformCacheKey.ToString();
    }

    public static implicit operator PlatformCacheKey(string fullCacheKeyString)
    {
        return FromFullCacheKeyString(fullCacheKeyString);
    }

    public static PlatformCacheKey FromFullCacheKeyString(string fullCacheKeyString)
    {
        var cacheKeyParts = fullCacheKeyString.Split(RequestKeySeparator).ToList();

        var context = cacheKeyParts.Count > 0 ? cacheKeyParts[0] : DefaultContext;
        var collection = cacheKeyParts.Count > 1 ? cacheKeyParts[1] : DefaultCollection;
        var requestKey = cacheKeyParts.Count > 2 ? cacheKeyParts.Skip(2).JoinToString(RequestKeySeparator) : DefaultRequestKey;

        return new PlatformCacheKey(context, collection, requestKey);
    }

    public static string BuildRequestKey(string[] requestKeyParts)
    {
        if (requestKeyParts.Length == 0)
            throw new ArgumentException("requestKeyParts must be not empty.", nameof(requestKeyParts));

        return requestKeyParts
            .Select(
                p =>
                    $"{RequestKeyPartsPrefix}{(p ?? NullValue).Replace(SpecialDistributedCacheKeyFolderSeparator, SpecialDistributedCacheKeyFolderSeparatorAutoValidReplaced)}{RequestKeyPartsSuffix}")
            .JoinToString(RequestKeyPartsSeparator);
    }

    public static string[] SplitRequestKeyParts(string requestKey)
    {
        return requestKey
            .Split(RequestKeyPartsSeparator)
            .Select(
                requestKeyPartString =>
                {
                    return requestKeyPartString.Substring(
                        RequestKeyPartsPrefix.Length,
                        requestKeyPartString.Length - RequestKeyPartsPrefix.Length - RequestKeyPartsSuffix.Length);
                })
            .ToArray();
    }

    public override string ToString()
    {
        return $"{Context}{RequestKeySeparator}{Collection}{RequestKeySeparator}{RequestKey}";
    }

    public string[] RequestKeyParts()
    {
        return SplitRequestKeyParts(RequestKey);
    }

    public override bool Equals(object obj)
    {
        return obj is PlatformCacheKey other && Equals(other);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Context, Collection, RequestKey);
    }

    public static bool operator ==(PlatformCacheKey left, PlatformCacheKey right)
    {
        return left.Equals(right);
    }

    public static bool operator !=(PlatformCacheKey left, PlatformCacheKey right)
    {
        return !(left == right);
    }

    public static List<string> CombineWithCacheKeyContextAndCollectionTag(PlatformCacheKey cacheKey, List<string>? tags)
    {
        return (tags ?? []).Concat([BuildCacheKeyContextTag(cacheKey.Context), BuildCacheKeyContextAndCollectionTag(cacheKey.Context, cacheKey.Collection)]).ToList();
    }

    public static string BuildCacheKeyContextAndCollectionTag(string cacheKeyContext, string cacheKeyCollection)
    {
        return $"{BuildCacheKeyContextTag(cacheKeyContext)};Collection={cacheKeyCollection}";
    }

    public static string BuildCacheKeyContextTag(string cacheKeyContext)
    {
        return $"Context={cacheKeyContext}";
    }
}

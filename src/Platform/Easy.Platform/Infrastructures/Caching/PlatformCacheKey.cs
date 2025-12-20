using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Represents a structured cache key in the format "{Context}.{Collection}.{RequestKey}".
/// This structure helps organize cache entries and enables operations like clearing
/// all keys in a specific context or collection.
/// </summary>
public readonly struct PlatformCacheKey : IEquatable<PlatformCacheKey>
{
    /// <summary>
    /// Default context value used when no specific context is provided.
    /// </summary>
    public const string DefaultContext = "__DefaultGlobalCacheContext__";

    /// <summary>
    /// Default collection value used when no specific collection is provided.
    /// </summary>
    public const string DefaultCollection = "All";

    /// <summary>
    /// Default request key value used when no specific request key is provided.
    /// </summary>
    public const string DefaultRequestKey = "All";

    /// <summary>
    /// Separator used between parts in a request key.
    /// </summary>
    public const string RequestKeySeparator = "---:";

    /// <summary>
    /// Value that automatically replaces the RequestKeySeparator in key values to ensure valid keys.
    /// </summary>
    public const string RequestKeySeparatorAutoValidReplaced = "_";

    /// <summary>
    /// Separator used between parts in a multi-part request key.
    /// </summary>
    public const string RequestKeyPartsSeparator = "-+-";

    /// <summary>
    /// Prefix for request key parts.
    /// </summary>
    public const string RequestKeyPartsPrefix = "(";

    /// <summary>
    /// Suffix for request key parts.
    /// </summary>
    public const string RequestKeyPartsSuffix = ")";

    /// <summary>
    /// Separator used in distributed cache keys for folder-like hierarchies.
    /// </summary>
    public const string SpecialDistributedCacheKeyFolderSeparator = ":";

    /// <summary>
    /// Value that automatically replaces the SpecialDistributedCacheKeyFolderSeparator in key values to ensure valid keys.
    /// </summary>
    public const string SpecialDistributedCacheKeyFolderSeparatorAutoValidReplaced = "=";

    /// <summary>
    /// String representation for null values in cache keys.
    /// </summary>
    public const string NullValue = "(NULL)";

    /// <summary>
    /// Initializes a new instance of the PlatformCacheKey with a specified request key.
    /// </summary>
    /// <param name="requestKey">The request key part of the cache key. Defaults to "All".</param>
    public PlatformCacheKey(string requestKey = DefaultRequestKey)
    {
        RequestKey = AutoFixKeyPartValue(requestKey);
    }

    /// <summary>
    /// Initializes a new instance of the PlatformCacheKey with array of request key parts
    /// that will be combined into a single request key.
    /// </summary>
    /// <param name="requestKeyParts">The parts to combine into the request key.</param>
    public PlatformCacheKey(string[] requestKeyParts)
    {
        RequestKey = requestKeyParts.Length == 0 ? DefaultRequestKey : BuildRequestKey(requestKeyParts);
    }

    /// <summary>
    /// Initializes a new instance of the PlatformCacheKey with a specified collection and request key.
    /// </summary>
    /// <param name="collection">The collection part of the cache key.</param>
    /// <param name="requestKey">The request key part of the cache key.</param>
    public PlatformCacheKey(string collection, string requestKey)
        : this(requestKey)
    {
        Collection = AutoFixKeyPartValue(collection);
    }

    /// <summary>
    /// Initializes a new instance of the PlatformCacheKey with a specified collection and request key parts.
    /// </summary>
    /// <param name="collection">The collection part of the cache key.</param>
    /// <param name="requestKeyParts">The parts to combine into the request key.</param>
    public PlatformCacheKey(string collection, params string[] requestKeyParts)
        : this(requestKeyParts)
    {
        Collection = AutoFixKeyPartValue(collection);
    }

    /// <summary>
    /// Initializes a new instance of the PlatformCacheKey with a specified context, collection, and request key.
    /// </summary>
    /// <param name="context">The context part of the cache key.</param>
    /// <param name="collection">The collection part of the cache key.</param>
    /// <param name="requestKey">The request key part of the cache key.</param>
    public PlatformCacheKey(string context, string collection, string requestKey)
        : this(collection, requestKey)
    {
        Context = AutoFixKeyPartValue(context);
    }

    /// <summary>
    /// Initializes a new instance of the PlatformCacheKey with a specified context, collection, and request key parts.
    /// </summary>
    /// <param name="context">The context part of the cache key.</param>
    /// <param name="collection">The collection part of the cache key.</param>
    /// <param name="requestKeyParts">The parts to combine into the request key.</param>
    public PlatformCacheKey(string context, string collection, params string[] requestKeyParts)
        : this(collection, requestKeyParts)
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
        return keyPartValue
            ?.Replace(RequestKeySeparator, RequestKeySeparatorAutoValidReplaced)
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
            .Select(p =>
                $"{RequestKeyPartsPrefix}{(p ?? NullValue).Replace(SpecialDistributedCacheKeyFolderSeparator, SpecialDistributedCacheKeyFolderSeparatorAutoValidReplaced)}{RequestKeyPartsSuffix}"
            )
            .JoinToString(RequestKeyPartsSeparator);
    }

    public static string[] SplitRequestKeyParts(string requestKey)
    {
        return requestKey
            .Split(RequestKeyPartsSeparator)
            .Select(requestKeyPartString =>
            {
                return requestKeyPartString.Substring(
                    RequestKeyPartsPrefix.Length,
                    requestKeyPartString.Length - RequestKeyPartsPrefix.Length - RequestKeyPartsSuffix.Length
                );
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
        return (tags ?? [])
            .Concat([BuildCacheKeyContextTag(cacheKey.Context), BuildCacheKeyContextAndCollectionTag(cacheKey.Context, cacheKey.Collection)])
            .ToList();
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

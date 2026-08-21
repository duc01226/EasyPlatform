using System.Text;
using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Represents a structured cache key in the format "{KeyEncodingVersionPrefix}{Context}.{Collection}.{RequestKey}".
/// This structure helps organize cache entries and enables operations like clearing
/// all keys in a specific context or collection.
/// </summary>
public readonly struct PlatformCacheKey : IEquatable<PlatformCacheKey>
{
    /// <summary>
    /// Version stamp of the cache-key ENCODING. <see cref="ToString" /> renders it in front of EVERY key, so a key
    /// written by this version can never be confused with a key written by an older one.
    /// <para>
    /// <b>MUST be bumped whenever the key encoding changes</b> - that means the shape produced by
    /// <see cref="ToString" />, the sanitising done by <see cref="AutoFixKeyPartValue" />, the part escaping done by
    /// <see cref="EncodeRequestKeyPartValue" /> / <see cref="DecodeRequestKeyPartValue" />, or the value of any
    /// separator / prefix / suffix / marker constant declared below. WHY: a cache entry is addressed by its RENDERED
    /// string, so if the encoding changes without a version bump, a key written by an old deployment and a
    /// LOGICALLY DIFFERENT key written by a new deployment can render identically and silently share one cache
    /// entry - which is exactly the null-part vs literal-"(NULL)"-part collision that v2 was introduced to fix.
    /// </para>
    /// <para>
    /// <b>DEPLOY CONSEQUENCE - read before bumping.</b> Bumping the version DELETES NOTHING. Entries already stored
    /// under the previous version simply stop being read (their stored key no longer matches anything the new code
    /// renders) and are evicted later by their own TTL. The deployment therefore has a transient ELEVATED CACHE-MISS
    /// period whose duration is bounded by the LONGEST configured entry TTL, during which the origin (database /
    /// downstream service) absorbs the extra load. That is the deliberate trade: it avoids both a full cache flush
    /// and an uncontrolled window in which two encodings write into the same key space. Tag bookkeeping is not
    /// versioned - <see cref="BuildCacheKeyContextTag" /> is built from Context/Collection only - so tag-based
    /// invalidation still enumerates old entries, it just re-renders them under the new version.
    /// </para>
    /// <para>
    /// History: v1 = the original unversioned encoding (no explicit prefix). v2 = adds
    /// <see cref="RequestKeyPartEscapeMarker" /> escaping so a null request key part and a part whose literal value
    /// is <see cref="NullValue" /> no longer collide, AND so a part whose literal value contains the wrapped-and-joined
    /// shape <see cref="RequestKeyPartsSuffix" /><see cref="RequestKeyPartsSeparator" /><see cref="RequestKeyPartsPrefix" />
    /// (e.g. <c>)-+-(</c>) no longer collides with a genuine multi-part boundary, AND so a part containing
    /// <see cref="SpecialDistributedCacheKeyFolderSeparator" /> (":") is ESCAPED rather than replaced, closing the
    /// last collision in this path - <c>"a:b"</c> and <c>"a=b"</c> used to render identically. All three escapes
    /// shipped together in the SAME unreleased v2, so there is ONE cache-invalidation event instead of three; that
    /// bundling is the entire reason to land an escape now rather than in a later version.
    /// </para>
    /// </summary>
    public const string KeyEncodingVersion = "v2";

    /// <summary>
    /// Separator placed between <see cref="KeyEncodingVersion" /> and the rest of the rendered key. Deliberately NOT
    /// <see cref="RequestKeySeparator" />: the version must not add a separator segment, so a rendered key still
    /// splits into EXACTLY three segments (Context / Collection / RequestKey) for <see cref="FromFullCacheKeyString" />.
    /// </summary>
    public const string KeyEncodingVersionSeparator = "|";

    /// <summary>
    /// The literal prefix ("v2|") that <see cref="ToString" /> writes in front of every rendered cache key and
    /// <see cref="FromFullCacheKeyString" /> strips back off. It is stripped AT MOST ONCE, so a Context whose own
    /// value starts with this prefix still round-trips unchanged.
    /// </summary>
    public const string KeyEncodingVersionPrefix = KeyEncodingVersion + KeyEncodingVersionSeparator;

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
    /// String representation for null values in cache keys. ONLY a real <c>null</c> request key part is allowed to
    /// render as this bare marker - see <see cref="RequestKeyPartEscapeMarker" />.
    /// </summary>
    public const string NullValue = "(NULL)";

    /// <summary>
    /// Escape marker introduced by key encoding <see cref="KeyEncodingVersion" /> so that
    /// <see cref="BuildRequestKey" /> is injective.
    /// <para>
    /// Before v2 a part was rendered as <c>(p ?? NullValue)</c>, so a part whose LITERAL value was
    /// <see cref="NullValue" /> rendered byte-for-byte like a <c>null</c> part: two logically different keys shared
    /// one cache entry. From v2 every NON-null part is escaped first, so the bare marker is unreachable for a
    /// non-null part and the two can never collide again.
    /// </para>
    /// <para>
    /// SCOPE - the injectivity guarantee is about <see cref="BuildRequestKey" /> (the request-key-PARTS path), which
    /// escapes all four of the characters it must remove: this marker, <see cref="NullValue" />,
    /// <see cref="RequestKeyPartsSeparator" />, and <see cref="SpecialDistributedCacheKeyFolderSeparator" />. It does
    /// NOT extend to Context, Collection, or a request key passed as a single pre-built string - those go through
    /// <see cref="AutoFixKeyPartValue" />, which still REPLACES rather than escapes and is therefore still lossy by
    /// design. TC-PLATREPO-065 pins that surviving behavior so the difference between the two paths stays visible.
    /// </para>
    /// </summary>
    public const string RequestKeyPartEscapeMarker = "~";

    /// <summary>
    /// Encoded form of a literal <see cref="RequestKeyPartEscapeMarker" /> occurrence inside a request key part.
    /// The marker self-escapes and is escaped FIRST, otherwise decoding would be ambiguous.
    /// </summary>
    public const string RequestKeyPartEscapedEscapeMarker = RequestKeyPartEscapeMarker + RequestKeyPartEscapeMarker;

    /// <summary>
    /// Encoded form of a literal <see cref="NullValue" /> occurrence inside a NON-null request key part.
    /// </summary>
    public const string RequestKeyPartEscapedNullValue = RequestKeyPartEscapeMarker + "N";

    /// <summary>
    /// Encoded form of a literal <see cref="RequestKeyPartsSeparator" /> ("-+-") occurrence inside a request key
    /// part value. <see cref="BuildRequestKey" /> wraps every part in <see cref="RequestKeyPartsPrefix" /> /
    /// <see cref="RequestKeyPartsSuffix" /> and joins the wrapped parts with <see cref="RequestKeyPartsSeparator" />,
    /// then <see cref="SplitRequestKeyParts" /> recovers the parts by splitting the WHOLE joined string on every
    /// occurrence of that separator. Without this escape, a part whose own literal value contains the separator -
    /// most notably the wrapped-and-joined shape <c>)-+-(</c> - is indistinguishable from a genuine part boundary,
    /// so <c>BuildRequestKey(["a)-+-(b"])</c> renders byte-for-byte identical to <c>BuildRequestKey(["a", "b"])</c>
    /// and the two logically different keys collide in the cache (finding M1). Escaping every literal occurrence of
    /// the separator BEFORE wrapping/joining guarantees the separator can only ever appear, unescaped, at a real
    /// join point that <see cref="BuildRequestKey" /> itself inserted - which is what makes
    /// <see cref="SplitRequestKeyParts" /> unambiguous for every part value, not just the ones probed by tests.
    /// <see cref="RequestKeyPartsPrefix" /> / <see cref="RequestKeyPartsSuffix" /> themselves do NOT need escaping:
    /// <see cref="SplitRequestKeyParts" /> strips them by FIXED length (1 char each), not by scanning for matching
    /// parentheses, so once the separator can no longer leak out of a part's own content, each split segment is
    /// guaranteed to be exactly one wrapped part and stripping is exact regardless of what characters - including
    /// "(" or ")" - the decoded value itself contains.
    /// </summary>
    public const string RequestKeyPartEscapedPartsSeparator = RequestKeyPartEscapeMarker + "S";

    /// <summary>
    /// Encoded form of a literal <see cref="SpecialDistributedCacheKeyFolderSeparator" /> (":") occurrence inside a
    /// request key part value. The colon cannot simply be left alone - a distributed cache treats it as a logical
    /// folder separator, so a part containing one would inject a folder boundary into the cache's key namespace.
    /// <para>
    /// Before this escape the colon was handled by REPLACING it with
    /// <see cref="SpecialDistributedCacheKeyFolderSeparatorAutoValidReplaced" /> ("="). A replacement removes the
    /// character but destroys the distinction: <c>"a:b"</c> and <c>"a=b"</c> both rendered as <c>"a=b"</c>, so two
    /// logically different keys shared one cache entry - the SAME defect class the null-sentinel and parts-separator
    /// escapes exist to eliminate, and a reachable one, because serialized JSON (which always contains colons) is
    /// fed through request key parts in production. Escaping instead of replacing keeps the colon out of the rendered
    /// key AND keeps it recoverable, which is what makes <see cref="BuildRequestKey" /> injective.
    /// </para>
    /// <para>
    /// Shipped in the SAME <see cref="KeyEncodingVersion" /> as the other two escapes deliberately: each of them
    /// changes how a part renders, so each would otherwise need its own version bump and its own fleet-wide
    /// cache-invalidation event. Bundling them costs one invalidation instead of three.
    /// </para>
    /// <para>
    /// NOTE the deliberately narrow scope: this escape applies to REQUEST KEY PARTS only. Context and Collection
    /// still go through <see cref="AutoFixKeyPartValue" />, which remains a lossy replacement for both ":" and
    /// <see cref="RequestKeySeparator" /> - see TC-PLATREPO-065, which pins that surviving behavior.
    /// </para>
    /// </summary>
    public const string RequestKeyPartEscapedFolderSeparator = RequestKeyPartEscapeMarker + "C";

    private static readonly char RequestKeyPartEscapeMarkerChar = RequestKeyPartEscapeMarker[0];

    private static readonly char RequestKeyPartEscapedNullValueMarkerChar = RequestKeyPartEscapedNullValue[1];

    private static readonly char RequestKeyPartEscapedPartsSeparatorMarkerChar = RequestKeyPartEscapedPartsSeparator[1];

    private static readonly char RequestKeyPartEscapedFolderSeparatorMarkerChar = RequestKeyPartEscapedFolderSeparator[1];

    private static readonly char SpecialDistributedCacheKeyFolderSeparatorChar = SpecialDistributedCacheKeyFolderSeparator[0];

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

    /// <summary>
    /// Parses a rendered cache key string back into its Context / Collection / RequestKey triple.
    /// <para>
    /// Accepts BOTH a versioned key (written by <see cref="ToString" /> of this version) and an unversioned legacy
    /// key: <see cref="StripKeyEncodingVersionPrefix" /> removes the version stamp when present. A legacy key
    /// therefore still parses - it is simply re-rendered under the CURRENT version, which is why an entry stored
    /// under the old encoding stops being addressable and expires by its own TTL instead of being read
    /// (see <see cref="KeyEncodingVersion" /> for the deploy consequence).
    /// </para>
    /// </summary>
    public static PlatformCacheKey FromFullCacheKeyString(string fullCacheKeyString)
    {
        var cacheKeyParts = fullCacheKeyString.Split(RequestKeySeparator).ToList();

        var context = cacheKeyParts.Count > 0 ? StripKeyEncodingVersionPrefix(cacheKeyParts[0]) : DefaultContext;
        var collection = cacheKeyParts.Count > 1 ? cacheKeyParts[1] : DefaultCollection;
        var requestKey = cacheKeyParts.Count > 2 ? cacheKeyParts.Skip(2).JoinToString(RequestKeySeparator) : DefaultRequestKey;

        return new PlatformCacheKey(context, collection, requestKey);
    }

    /// <summary>
    /// Renders an ordered set of request key parts into a single request key. Each part is wrapped in
    /// <see cref="RequestKeyPartsPrefix" /> / <see cref="RequestKeyPartsSuffix" /> and joined with
    /// <see cref="RequestKeyPartsSeparator" />; the part VALUE itself is rendered by
    /// <see cref="EncodeRequestKeyPartValue" />.
    /// </summary>
    public static string BuildRequestKey(string[] requestKeyParts)
    {
        if (requestKeyParts.Length == 0)
            throw new ArgumentException("requestKeyParts must be not empty.", nameof(requestKeyParts));

        return requestKeyParts
            .Select(p => $"{RequestKeyPartsPrefix}{EncodeRequestKeyPartValue(p)}{RequestKeyPartsSuffix}")
            .JoinToString(RequestKeyPartsSeparator);
    }

    /// <summary>
    /// Renders ONE request key part value. Inverse of <see cref="DecodeRequestKeyPartValue" />.
    /// <para>
    /// A <c>null</c> part renders as the bare <see cref="NullValue" /> marker. A NON-null part is escaped so it can
    /// never produce that marker itself, which is what stops a part whose literal value is <see cref="NullValue" />
    /// from sharing a cache entry with a <c>null</c> part. A NON-null part is ALSO escaped so its content can never
    /// reproduce a literal <see cref="RequestKeyPartsSeparator" />, which is what stops a part whose literal value
    /// contains the wrapped-and-joined shape (e.g. <c>)-+-(</c>) from sharing a cache entry with a genuine multi-part
    /// key - see <see cref="RequestKeyPartEscapedPartsSeparator" />. Escaping order matters: the escape marker
    /// self-escapes FIRST, otherwise decoding could not tell an escaped marker from an escape sequence introduced
    /// afterwards; the null-sentinel and separator escapes are then order-independent of EACH OTHER because neither
    /// one's pattern is a substring of the other's replacement.
    /// </para>
    /// <para>
    /// A NON-null part is FINALLY escaped so its content can never reproduce a literal
    /// <see cref="SpecialDistributedCacheKeyFolderSeparator" /> (":"), which both keeps a part from injecting a
    /// folder boundary into the distributed cache's key namespace AND - unlike the replacement this escape
    /// superseded - keeps the colon recoverable, so <c>"a:b"</c> and <c>"a=b"</c> no longer collide. See
    /// <see cref="RequestKeyPartEscapedFolderSeparator" />.
    /// </para>
    /// <para>
    /// With all four escapes in place this method is INJECTIVE over every input: distinct part values, including
    /// <c>null</c>, always render to distinct strings, and <see cref="DecodeRequestKeyPartValue" /> is its exact
    /// inverse. The colon escape is what completed that - it is the reason the guarantee is now unconditional rather
    /// than "injective except for parts containing a colon". Context and Collection are a SEPARATE path
    /// (<see cref="AutoFixKeyPartValue" />) and are deliberately NOT covered - see TC-PLATREPO-065.
    /// </para>
    /// </summary>
    public static string EncodeRequestKeyPartValue(string requestKeyPartValue)
    {
        if (requestKeyPartValue == null) return NullValue;

        // ORDER IS LOAD-BEARING. The marker self-escape MUST run first: every later step INTRODUCES a marker, so
        // running it first is what guarantees any marker still standing afterwards begins an escape sequence this
        // method wrote, never a literal marker the caller supplied. The remaining three are order-independent of
        // each other - no one's pattern (":", "(NULL)", "-+-") appears in any other's replacement ("~C", "~N", "~S").
        return requestKeyPartValue
            .Replace(RequestKeyPartEscapeMarker, RequestKeyPartEscapedEscapeMarker)
            .Replace(SpecialDistributedCacheKeyFolderSeparator, RequestKeyPartEscapedFolderSeparator)
            .Replace(NullValue, RequestKeyPartEscapedNullValue)
            .Replace(RequestKeyPartsSeparator, RequestKeyPartEscapedPartsSeparator);
    }

    /// <summary>
    /// Recovers ONE request key part value from its rendered form. Exact inverse of
    /// <see cref="EncodeRequestKeyPartValue" />, so <c>Decode(Encode(p)) == p</c> for EVERY part with no exceptions -
    /// INCLUDING <c>null</c>, which is recovered as <c>null</c> rather than as the literal <see cref="NullValue" />
    /// text (that text now only ever comes back from a part that really held it), INCLUDING a part whose literal
    /// value contains <see cref="RequestKeyPartsSeparator" /> (that text now only ever comes back from a part that
    /// really held it, never from a genuine part boundary), and INCLUDING a part containing
    /// <see cref="SpecialDistributedCacheKeyFolderSeparator" />, which is escaped rather than replaced and so
    /// survives the round trip as itself instead of arriving back as
    /// <see cref="SpecialDistributedCacheKeyFolderSeparatorAutoValidReplaced" />.
    /// </summary>
    public static string DecodeRequestKeyPartValue(string encodedRequestKeyPartValue)
    {
        // Only a real null part is rendered as the bare marker: a literal "(NULL)" part was escaped to "~N".
        if (encodedRequestKeyPartValue is null or NullValue) return null;

        if (!encodedRequestKeyPartValue.Contains(RequestKeyPartEscapeMarkerChar)) return encodedRequestKeyPartValue;

        var decodedBuilder = new StringBuilder(encodedRequestKeyPartValue.Length);
        var currentIndex = 0;

        while (currentIndex < encodedRequestKeyPartValue.Length)
        {
            var isEscapeSequence = encodedRequestKeyPartValue[currentIndex] == RequestKeyPartEscapeMarkerChar
                                   && currentIndex + 1 < encodedRequestKeyPartValue.Length;
            var escapedChar = isEscapeSequence ? encodedRequestKeyPartValue[currentIndex + 1] : '\0';

            if (isEscapeSequence && escapedChar == RequestKeyPartEscapeMarkerChar)
            {
                decodedBuilder.Append(RequestKeyPartEscapeMarkerChar);
                currentIndex += 2;
            }
            else if (isEscapeSequence && escapedChar == RequestKeyPartEscapedNullValueMarkerChar)
            {
                decodedBuilder.Append(NullValue);
                currentIndex += 2;
            }
            else if (isEscapeSequence && escapedChar == RequestKeyPartEscapedPartsSeparatorMarkerChar)
            {
                decodedBuilder.Append(RequestKeyPartsSeparator);
                currentIndex += 2;
            }
            else if (isEscapeSequence && escapedChar == RequestKeyPartEscapedFolderSeparatorMarkerChar)
            {
                decodedBuilder.Append(SpecialDistributedCacheKeyFolderSeparatorChar);
                currentIndex += 2;
            }
            else
            {
                // Also covers a DANGLING marker, which can only come from a request key this encoding never built
                // (for example a raw value assigned through the RequestKey init accessor). Kept verbatim.
                decodedBuilder.Append(encodedRequestKeyPartValue[currentIndex]);
                currentIndex += 1;
            }
        }

        return decodedBuilder.ToString();
    }

    public static string[] SplitRequestKeyParts(string requestKey)
    {
        return requestKey
            .Split(RequestKeyPartsSeparator)
            .Select(requestKeyPartString =>
            {
                return DecodeRequestKeyPartValue(
                    requestKeyPartString.Substring(
                        RequestKeyPartsPrefix.Length,
                        requestKeyPartString.Length - RequestKeyPartsPrefix.Length - RequestKeyPartsSuffix.Length
                    )
                );
            })
            .ToArray();
    }

    /// <summary>
    /// Renders the canonical, VERSIONED wire format
    /// "{KeyEncodingVersionPrefix}{Context}---:{Collection}---:{RequestKey}". This is the single place a cache key
    /// becomes a distributed-cache key string (the implicit string conversion and <see cref="Equals(PlatformCacheKey)" />
    /// both go through it), so stamping the version here versions EVERY key with no path able to skip it.
    /// </summary>
    public override string ToString()
    {
        return $"{KeyEncodingVersionPrefix}{Context}{RequestKeySeparator}{Collection}{RequestKeySeparator}{RequestKey}";
    }

    /// <summary>
    /// Removes AT MOST ONE leading <see cref="KeyEncodingVersionPrefix" /> from the Context segment of a rendered
    /// key. Stripping only once is what makes the round trip exact for a Context whose own value starts with the
    /// prefix. A legacy unversioned key has no prefix and is returned untouched.
    /// </summary>
    private static string StripKeyEncodingVersionPrefix(string cacheKeyContextSegment)
    {
        return cacheKeyContextSegment.StartsWith(KeyEncodingVersionPrefix, StringComparison.Ordinal)
            ? cacheKeyContextSegment[KeyEncodingVersionPrefix.Length..]
            : cacheKeyContextSegment;
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

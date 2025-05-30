#region

using System.Collections.Concurrent;
using System.Reflection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;

#endregion

namespace Easy.Platform.Common.RequestContext;

/// <summary>
/// Provides high-performance helper methods for working with platform request contexts.
/// This class contains utilities for extracting and converting values from request context dictionaries,
/// with support for various data types and formats.
///
/// Optimized for .NET 9 with improved type handling, caching, and nullable reference type support.
/// </summary>
public static class PlatformRequestContextHelper
{
    #region Main TryGetValue Method

    /// <summary>
    /// Attempts to retrieve and convert a value from a request context dictionary with enhanced performance and type safety.
    /// </summary>
    /// <typeparam name="T">The desired type to convert the value to.</typeparam>
    /// <typeparam name="TItem">The type of items stored in the request context dictionary.</typeparam>
    /// <param name="requestContext">The dictionary containing request context values.</param>
    /// <param name="contextKey">The key to look up in the request context.</param>
    /// <param name="item">When this method returns, contains the converted value if found, or the default value if not found or conversion failed.</param>
    /// <returns>True if a value was found and successfully converted to type T; otherwise, false.</returns>
    /// <remarks>
    /// This method performs optimized attempts to retrieve and convert the value:
    /// 1. Uses cached reflection for performance-critical operations
    /// 2. Implements fast path for common scenarios
    /// 3. Handles lazy-loaded values and Task-wrapped values efficiently
    /// 4. Supports comprehensive type conversion with proper edge case handling
    /// 5. Attempts JSON deserialization as fallback with validation
    /// </remarks>
    public static bool TryGetAndConvertValue<T, TItem>(IDictionary<string, TItem> requestContext, string contextKey, out T item)
    {
        // Fast path validation
        if (requestContext is null || string.IsNullOrEmpty(contextKey))
        {
            item = default;
            return false;
        }

        var foundContextKey = contextKey;

        // Try direct key lookup first, then case-insensitive using original logic
        // contextKey.ToLower() to support search case-insensitive for some server auto normalize the header context key
        var originalValue = requestContext.TryGetValue(foundContextKey, out var fromOriginalContextKeyValue)
            ? fromOriginalContextKeyValue
            : requestContext.TryGetValueOrDefault(
                foundContextKey.Pipe(p =>
                {
                    foundContextKey = p.ToLower();
                    return foundContextKey;
                })
            );

        if (originalValue is null)
        {
            item = default;
            return false;
        }

        // Handle lazy-loaded values with optimized type checking
        if (originalValue is Lazy<object?> lazyValue) return TryUnwrapLazyValue(lazyValue, out item);

        // Check if the type is directly assignable (original business logic)
        if (!originalValue.GetType().IsAssignableTo(typeof(T)))
        {
            // String collection handling with ReAssign
            if (originalValue is IEnumerable<string> originalValueListStringValues &&
                TryParseFromStrings(out item, originalValueListStringValues.ToList()))
            {
                UpdateContextWithConvertedValue(requestContext, item, foundContextKey);
                return true;
            }

            // Object collection handling with ReAssign
            if (originalValue is IEnumerable<object> originalValueListObjectValues &&
                TryParseFromStrings(out item, originalValueListObjectValues.Where(p => p != null).Select(p => p.ToString()).ToList()))
            {
                UpdateContextWithConvertedValue(requestContext, item, foundContextKey);
                return true;
            }

            // JSON conversion (non-string objects) with ReAssign
            if (originalValue is not string && PlatformJsonSerializer.TryDeserialize(originalValue.ToJson(), out item))
            {
                UpdateContextWithConvertedValue(requestContext, item, foundContextKey);
                return true;
            }

            // String-based conversion with ReAssign
            if (TryParseFromStrings(out item, originalValue is string originalValueStr ? [originalValueStr] : [originalValue.ToJson()]))
            {
                UpdateContextWithConvertedValue(requestContext, item, foundContextKey);
                return true;
            }

            item = default;
            return false;
        }

        // Direct assignable types
        item = (T)(object)originalValue;
        return true;
    }

    #endregion

    #region Enhanced String Parsing Methods

    /// <summary>
    /// Updates the request context dictionary with the parsed value.
    /// This is used after converting a value to make sure the dictionary contains the correctly typed value.
    /// </summary>
    /// <typeparam name="T">The type of the parsed value.</typeparam>
    /// <typeparam name="TItem">The type of items stored in the request context dictionary.</typeparam>
    /// <param name="requestContext">The dictionary containing request context values.</param>
    /// <param name="item">The parsed value to store.</param>
    /// <param name="foundContextKey">The key where the value should be stored.</param>
    private static void UpdateContextWithConvertedValue<T, TItem>(IDictionary<string, TItem> requestContext, T item, string foundContextKey)
    {
        if (typeof(TItem) == typeof(object))
            requestContext.Upsert(foundContextKey, (TItem)(object)item);
    }

    #endregion

    #region Enhanced String Parsing Methods

    /// <summary>
    /// Attempts to parse and convert string values to the specified type with enhanced type handling.
    /// </summary>
    /// <typeparam name="T">The target type to convert the string values to.</typeparam>
    /// <param name="foundValue">When this method returns, contains the converted value if parsing succeeded, or the default value if parsing failed.</param>
    /// <param name="stringValues">The list of string values to parse.</param>
    /// <returns>True if the parsing and conversion were successful; otherwise, false.</returns>
    /// <remarks>
    /// This method handles various type conversions:
    /// - For object type: returns the last string or the entire list if multiple values
    /// - For string type: returns the last string value
    /// - For numeric types: attempts to parse as a number
    /// - For boolean: attempts to parse as a boolean
    /// - For collection types: attempts to parse each string as an item in the collection
    /// - As a fallback, attempts to deserialize from JSON
    /// </remarks>
    public static bool TryParseFromStrings<T>(out T foundValue, List<string> stringValues)
    {
        if (!stringValues.Any())
        {
            foundValue = default;
            return false;
        }

        if (typeof(T) == typeof(object))
        {
            foundValue = stringValues.Count <= 1 ? (T)(object)stringValues.LastOrDefault() : (T)(object)stringValues;
            return true;
        }

        if (typeof(T) == typeof(string))
        {
            foundValue = (T)(object)stringValues.LastOrDefault();
            return true;
        }

        // If T is number type - using original logic with optimized lookup
        if (NumericTypes.Contains(typeof(T)))
        {
            var parsedSuccess = double.TryParse(stringValues.LastOrDefault(), out var parsedValue);
            if (parsedSuccess)
            {
                // WHY: Serialize then Deserialize to ensure could parse from double to int, long, float, etc.. any of number type T
                foundValue = PlatformJsonSerializer.Deserialize<T>(parsedValue.ToJson());
                return true;
            }
        }

        if (typeof(T) == typeof(bool))
        {
            var parsedSuccess = bool.TryParse(stringValues.LastOrDefault(), out var parsedValue);
            if (parsedSuccess)
            {
                foundValue = (T)(object)parsedValue;
                return true;
            }
        }

        // Handle case if type T is a list with many items and each stringValue is a json represent an item
        var isTryGetListValueSuccess = TryParseStringsToCollection(stringValues, out foundValue);
        if (isTryGetListValueSuccess)
            return true;

        return PlatformJsonSerializer.TryDeserialize(stringValues.LastOrDefault(), out foundValue);
    }

    #endregion

    #region Private Fields and Caching

    /// <summary>
    /// Cache for UnboxAsync method instances to avoid repeated reflection calls
    /// </summary>
    private static readonly ConcurrentDictionary<Type, MethodInfo> UnboxMethodCache = new();

    /// <summary>
    /// Cache for collection interface types to optimize repeated lookups
    /// </summary>
    private static readonly ConcurrentDictionary<Type, Type?> CollectionInterfaceCache = new();

    /// <summary>
    /// HashSet set of numeric types for fast lookup
    /// </summary>
    private static readonly HashSet<Type> NumericTypes =
    [
        typeof(int),
        typeof(long),
        typeof(short),
        typeof(byte),
        typeof(uint),
        typeof(ulong),
        typeof(ushort),
        typeof(sbyte),
        typeof(float),
        typeof(double),
        typeof(decimal),
        typeof(int?),
        typeof(long?),
        typeof(short?),
        typeof(byte?),
        typeof(uint?),
        typeof(ulong?),
        typeof(ushort?),
        typeof(sbyte?),
        typeof(float?),
        typeof(double?),
        typeof(decimal?)
    ];

    #endregion

    #region Helper Methods

    /// <summary>
    /// Unwrap lazy-loaded values with optimized Task handling
    /// </summary>
    private static bool TryUnwrapLazyValue<T>(Lazy<object?> lazyValue, out T item)
    {
        var value = lazyValue.Value;

        // Handle Task<T> scenarios with cached reflection
        if (value is Task<object?> rawTask && IsTaskType<T>()) return TryUnboxTask(rawTask, out item);

        // Direct type match
        if (value is T directValue)
        {
            item = directValue;
            return true;
        }

        item = default;
        return false;
    }

    /// <summary>
    /// Optimized check for Task<T> types
    /// </summary>
    private static bool IsTaskType<T>()
    {
        var type = typeof(T);
        return type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Task<>);
    }

    /// <summary>
    /// Try to unbox Task<T> conversion with cached UnboxAsync method
    /// </summary>
    private static bool TryUnboxTask<T>(Task<object?> rawTask, out T item)
    {
        try
        {
            var targetType = typeof(T);
            var elementType = targetType.GetGenericArguments()[0];

            // Get cached UnboxAsync method
            var unboxMethod = UnboxMethodCache.GetOrAdd(elementType, type => typeof(TaskExtension).GetMethod(nameof(TaskExtension.UnboxAsync))!.MakeGenericMethod(type));

            var boxedResult = unboxMethod.Invoke(null, [rawTask])!;
            item = (T)boxedResult;
            return true;
        }
        catch
        {
            item = default;
            return false;
        }
    }

    #endregion

    #region Collection Interface Detection (Optimized)

    /// <summary>
    /// Finds the first interface type in the given generic type that implements IEnumerable&lt;T&gt; with caching.
    /// </summary>
    /// <typeparam name="T">The type to analyze for collection interfaces.</typeparam>
    /// <returns>The first interface type that implements IEnumerable&lt;T&gt; or null if none found.</returns>
    /// <remarks>
    /// This method is used to determine if a type is a collection and get the element type of the collection.
    /// It's used for converting string values to collection types.
    /// </remarks>
    public static Type FindEnumerableInterface<T>()
    {
        return CollectionInterfaceCache.GetOrAdd(typeof(T), type => type.GetInterfaces().FirstOrDefault(i => i.IsAssignableToGenericType(typeof(IEnumerable<>))));
    }

    /// <summary>
    /// Attempts to parse a list of string values into a collection of the specified type.
    /// </summary>
    /// <typeparam name="T">The collection type to convert the strings to.</typeparam>
    /// <param name="matchedClaimStringValues">The string values to parse, where each string could represent an item in the collection.</param>
    /// <param name="foundValue">When this method returns, contains the parsed collection if successful, or the default value if parsing failed.</param>
    /// <returns>True if the parsing and conversion were successful; otherwise, false.</returns>
    /// <remarks>
    /// This method works by:
    /// 1. Finding the collection interface type of T (e.g., IEnumerable&lt;ItemType&gt;)
    /// 2. Determining the item type of the collection
    /// 3. Attempting to parse each string into the item type
    /// 4. If all items are successfully parsed, creates a collection of the correct type
    /// </remarks>
    public static bool TryParseStringsToCollection<T>(List<string> matchedClaimStringValues, out T foundValue)
    {
        var firstValueListInterface = FindEnumerableInterface<T>();

        if (firstValueListInterface != null)
        {
            var listItemType = firstValueListInterface.GetGenericArguments()[0];

            var parsedItemList = matchedClaimStringValues
                .Select(matchedClaimStringValue =>
                {
                    if (listItemType == typeof(string))
                        return new { itemDeserializedValue = (object)matchedClaimStringValue, isParsedItemSucceeded = true };

                    var isParsedItemSucceeded = PlatformJsonSerializer.TryDeserialize(matchedClaimStringValue, listItemType, out var itemDeserializedValue);

                    return new { itemDeserializedValue, isParsedItemSucceeded };
                })
                .ToList();

            if (parsedItemList.All(p => p.isParsedItemSucceeded))
            {
                // Serialize then Deserialize to type T so ensure parse matchedClaimStringValues to type T successfully
                foundValue = PlatformJsonSerializer.Deserialize<T>(parsedItemList.Select(p => p.itemDeserializedValue).ToJson());
                return true;
            }
        }

        foundValue = default;

        return false;
    }

    #endregion
}

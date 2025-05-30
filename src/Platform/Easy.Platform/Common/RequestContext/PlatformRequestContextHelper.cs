#region

using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;

#endregion

namespace Easy.Platform.Common.RequestContext;

public static class PlatformRequestContextHelper
{
    public static bool TryGetValue<T, TItem>(IDictionary<string, TItem> requestContext, string contextKey, out T item)
    {
        var foundContextKey = contextKey;

        // contextKey.ToLower() to support search case-insensitive for some server auto normalize the header context key
        var originalValue = requestContext.TryGetValue(foundContextKey, out var fromOriginalContextKeyValue)
            ? fromOriginalContextKeyValue
            : requestContext.TryGetValueOrDefault(
                foundContextKey.Pipe(p =>
                {
                    foundContextKey = p.ToLower();
                    return foundContextKey;
                }));

        if (originalValue is not null)
        {
            if (originalValue is Lazy<object?> originalLazyValue)
            {
                // if the caller asked for a Task<Something>
                if (originalLazyValue.Value is Task<object?> rawTask
                    && typeof(T).IsGenericType
                    && typeof(T).GetGenericTypeDefinition() == typeof(Task<>))
                {
                    // grab U from Task<U>
                    var uType = typeof(T).GetGenericArguments()[0];

                    // find our UnboxAsync<U> helper and bind it
                    var unboxMethod = typeof(TaskExtension)
                        .GetMethod(nameof(TaskExtension.UnboxAsync))!
                        .MakeGenericMethod(uType);

                    // invoke UnboxAsync<U>(rawTask) → returns Task<U>
                    var boxed = unboxMethod.Invoke(null, [rawTask])!;

                    // now safely cast to T (which we know is Task<U>)
                    item = (T)boxed;
                    return true;
                }

                // otherwise cast to the plain T
                if (originalLazyValue.Value is T tVal)
                {
                    item = tVal;
                    return true;
                }
            }
            else
            {
                if (!originalValue.GetType().IsAssignableTo(typeof(T)))
                {
                    if (originalValue is IEnumerable<string> originalValueListStringValues &&
                        TryGetParsedValuesFromStringValues(out item, originalValueListStringValues.ToList()))
                    {
                        ReAssignParsedExactFoundValue(requestContext, item, foundContextKey);
                        return true;
                    }

                    if (originalValue is IEnumerable<object> originalValueListObjectValues &&
                        TryGetParsedValuesFromStringValues(out item, originalValueListObjectValues.Select(p => p.ToString()).ToList()))
                    {
                        ReAssignParsedExactFoundValue(requestContext, item, foundContextKey);
                        return true;
                    }

                    if (originalValue is not string &&
                        PlatformJsonSerializer.TryDeserialize(originalValue.ToJson(), out item))
                    {
                        ReAssignParsedExactFoundValue(requestContext, item, foundContextKey);
                        return true;
                    }

                    if (TryGetParsedValuesFromStringValues(
                        out item,
                        originalValue is string originalValueStr ? [originalValueStr] : [originalValue.ToJson()]))
                    {
                        ReAssignParsedExactFoundValue(requestContext, item, foundContextKey);
                        return true;
                    }

                    return false;
                }

                item = (T)(object)originalValue;
                return true;
            }
        }

        item = default;

        return false;
    }

    private static void ReAssignParsedExactFoundValue<T, TItem>(IDictionary<string, TItem> requestContext, T item, string foundContextKey)
    {
        if (typeof(TItem) == typeof(object))
            requestContext.Upsert(foundContextKey, (TItem)(object)item);
    }

    /// <summary>
    /// Try Get Deserialized value from matchedClaimStringValues
    /// </summary>
    public static bool TryGetParsedValuesFromStringValues<T>(out T foundValue, List<string> stringValues)
    {
        if (!stringValues.Any())
        {
            foundValue = default;
            return false;
        }

        if (typeof(T) == typeof(object))
        {
            foundValue = (T)(object)stringValues;
            return true;
        }

        if (typeof(T) == typeof(string))
        {
            foundValue = (T)(object)stringValues.LastOrDefault();
            return true;
        }

        // If T is number type
        if (typeof(T).IsAssignableTo(typeof(double)) ||
            typeof(T) == typeof(int) ||
            typeof(T) == typeof(float) ||
            typeof(T) == typeof(double) ||
            typeof(T) == typeof(long) ||
            typeof(T) == typeof(short))
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
        var isTryGetListValueSuccess =
            TryGetParsedListValueFromUserClaimStringValues(stringValues, out foundValue);
        if (isTryGetListValueSuccess)
            return true;

        return PlatformJsonSerializer.TryDeserialize(
            stringValues.LastOrDefault(),
            out foundValue);
    }

    public static Type FindFirstValueListInterfaceType<T>()
    {
        var firstValueListInterface = typeof(T)
            .GetInterfaces()
            .FirstOrDefault(p => p.IsAssignableToGenericType(typeof(IEnumerable<>)));
        return firstValueListInterface;
    }

    public static bool TryGetParsedListValueFromUserClaimStringValues<T>(
        List<string> matchedClaimStringValues,
        out T foundValue)
    {
        var firstValueListInterface = FindFirstValueListInterfaceType<T>();

        if (firstValueListInterface != null)
        {
            var listItemType = firstValueListInterface.GetGenericArguments()[0];

            var parsedItemList = matchedClaimStringValues
                .Select(matchedClaimStringValue =>
                {
                    if (listItemType == typeof(string))
                        return new { itemDeserializedValue = (object)matchedClaimStringValue, isParsedItemSucceeded = true };

                    var isParsedItemSucceeded = PlatformJsonSerializer.TryDeserialize(
                        matchedClaimStringValue,
                        listItemType,
                        out var itemDeserializedValue);

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
}

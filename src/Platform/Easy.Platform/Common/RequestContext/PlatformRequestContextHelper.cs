using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;

namespace Easy.Platform.Common.RequestContext;

public static class PlatformRequestContextHelper
{
    public static bool TryGetValue<T>(IDictionary<string, object> requestContext, string contextKey, out T item)
    {
        // contextKey.ToLower() to support search case-insensitive for some server auto normalize the header context key
        var originalValue = requestContext.TryGetValue(contextKey, out var fromOriginalContextKeyValue)
            ? fromOriginalContextKeyValue
            : requestContext.TryGetValueOrDefault(contextKey.ToLower());

        if (originalValue != null)
        {
            if (typeof(T) != typeof(string) &&
                (originalValue is string || !originalValue.GetType().IsAssignableTo(typeof(T))))
            {
                var originalValueStr = originalValue.As<string>();

                var isParsedSuccess = TryGetParsedValuesFromStringValues(
                    out item,
                    originalValueStr != null ? [originalValueStr] : [originalValue.ToJson()]);

                return isParsedSuccess;
            }

            item = (T)originalValue;
            return true;
        }

        item = default;

        return false;
    }

    /// <summary>
    /// Try Get Deserialized value from matchedClaimStringValues
    /// </summary>
    public static bool TryGetParsedValuesFromStringValues<T>(out T foundValue, List<string> stringValues)
    {
        if (FindFirstValueListInterfaceType<T>() == null && !stringValues.Any())
        {
            foundValue = default;
            return false;
        }

        if (typeof(T) == typeof(string) ||
            typeof(T) == typeof(object))
        {
            if (!stringValues.Any())
            {
                foundValue = default;
                return false;
            }

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
                .Select(
                    matchedClaimStringValue =>
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

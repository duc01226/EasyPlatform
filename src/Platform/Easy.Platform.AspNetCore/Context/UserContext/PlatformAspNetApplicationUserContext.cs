using System.Security.Claims;
using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.AspNetCore.Context.UserContext.UserContextKeyToClaimTypeMapper.Abstract;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.AspNetCore.Http;

namespace Easy.Platform.AspNetCore.Context.UserContext;

public class PlatformAspNetApplicationUserContext : IPlatformApplicationUserContext
{
    private readonly IPlatformApplicationUserContextKeyToClaimTypeMapper claimTypeMapper;
    private readonly IHttpContextAccessor httpContextAccessor;

    public PlatformAspNetApplicationUserContext(
        IHttpContextAccessor httpContextAccessor,
        IPlatformApplicationUserContextKeyToClaimTypeMapper claimTypeMapper)
    {
        this.httpContextAccessor = httpContextAccessor;
        this.claimTypeMapper = claimTypeMapper;
    }

    public T GetValue<T>(string contextKey)
    {
        if (contextKey == null)
            throw new ArgumentNullException(nameof(contextKey));

        if (HttpContextIsNotAvailable())
            return default;

        if (TryGetValueFromStoredBySetValueItems(contextKey, out T item))
            return item;

        if (TryGetValueFromHttpContext(contextKey, out T foundValue))
        {
            SetValue(foundValue, contextKey);
            return foundValue;
        }

        return default;
    }

    public void SetValue(object value, string contextKey)
    {
        if (contextKey == null)
            throw new ArgumentNullException(nameof(contextKey));

        if (HttpContextIsNotAvailable())
            return;

        var computedKey = PlatformApplicationUserContextKeyBuilder.ComputedPlatformFormatContextKeyFor(contextKey);
        CurrentHttpContext().Items[computedKey] = value;
    }

    public List<string> GetAllKeys()
    {
        if (HttpContextIsNotAvailable())
            return new List<string>();

        return CurrentHttpContext()
            .Items.Keys
            .Where(
                key => key is string keyString &&
                       keyString.StartsWith(PlatformApplicationUserContextKeyBuilder.ContextKeyPrefix))
            .Select(key => (string)key)
            .ToList();
    }

    public void Clear()
    {
        if (HttpContextIsNotAvailable())
            return;

        var keys = GetAllKeys();
        foreach (var key in keys)
            CurrentHttpContext().Items.Remove(key);
    }

    /// <summary>
    /// To check the availability of the HttContextAccessor.
    /// </summary>
    /// <returns>True if the accessor is not available and otherwise false.</returns>
    private bool HttpContextIsNotAvailable()
    {
        return httpContextAccessor?.HttpContext == null;
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
    private HttpContext CurrentHttpContext()
    {
        return httpContextAccessor.HttpContext;
    }

    private bool TryGetValueFromStoredBySetValueItems<T>(string contextKey, out T item)
    {
        var computedKey = PlatformApplicationUserContextKeyBuilder.ComputedPlatformFormatContextKeyFor(contextKey);

        if (CurrentHttpContext().Items.ContainsKey(computedKey) && CurrentHttpContext().Items[computedKey] != null)
        {
            item = (T)CurrentHttpContext().Items[computedKey];
            return true;
        }

        item = default;

        return false;
    }

    private bool TryGetValueFromHttpContext<T>(string contextKey, out T foundValue)
    {
        if (contextKey == PlatformApplicationCommonUserContextKeys.RequestId)
            return TryGetRequestId(CurrentHttpContext(), out foundValue);

        if (TryGetValueFromUserClaims(CurrentHttpContext().User, contextKey, out foundValue))
            return true;

        if (TryGetValueFromRequestHeaders(CurrentHttpContext().Request.Headers, contextKey, out foundValue))
            return true;

        return false;
    }

    private bool TryGetValueFromRequestHeaders<T>(
        IHeaderDictionary requestHeaders,
        string contextKey,
        out T foundValue)
    {
        var contextKeyMappedToOneOfClaimTypes = claimTypeMapper.ToOneOfClaimTypes(contextKey);

        var stringRequestHeaderValues = contextKeyMappedToOneOfClaimTypes
                                            .Select(
                                                contextKeyMappedToJwtClaimType =>
                                                    requestHeaders.ContainsKey(contextKeyMappedToJwtClaimType)
                                                        ? new List<string>(
                                                            requestHeaders[contextKeyMappedToJwtClaimType])
                                                        : new List<string>())
                                            .FirstOrDefault(p => p.Any()) ??
                                        new List<string>();

        // Try Get Deserialized value from matchedClaimStringValues
        return TryGetParsedValuesFromStringValues(out foundValue, stringRequestHeaderValues);
    }

    private bool TryGetRequestId<T>(HttpContext httpContext, out T foundValue)
    {
        if (!string.IsNullOrEmpty(httpContext.TraceIdentifier) && typeof(T) == typeof(string))
        {
            foundValue = (T)(object)httpContext.TraceIdentifier;
            return true;
        }

        foundValue = default;
        return false;
    }

    /// <summary>
    /// Return True if found value and out the value of type <see cref="T"/>.
    /// Return false if value is not found and out default of type <see cref="T"/>.
    /// </summary>
    private bool TryGetValueFromUserClaims<T>(ClaimsPrincipal userClaims, string contextKey, out T foundValue)
    {
        var contextKeyMappedToOneOfClaimTypes = claimTypeMapper.ToOneOfClaimTypes(contextKey);

        var matchedClaimStringValues = contextKeyMappedToOneOfClaimTypes.Select(
                                           contextKeyMappedToJwtClaimType =>
                                               userClaims.FindAll(contextKeyMappedToJwtClaimType)
                                                   .Select(p => p.Value)
                                                   .ToList()).FirstOrDefault(p => p.Any()) ??
                                       new List<string>();

        // Try Get Deserialized value from matchedClaimStringValues
        return TryGetParsedValuesFromStringValues(out foundValue, matchedClaimStringValues);
    }

    /// <summary>
    /// Try Get Deserialized value from matchedClaimStringValues
    /// </summary>
    private bool TryGetParsedValuesFromStringValues<T>(out T foundValue, List<string> stringValues)
    {
        if (FindFirstValueListInterfaceType<T>() == null && !stringValues.Any())
        {
            foundValue = default;
            return false;
        }

        if (typeof(T) == typeof(string))
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
                foundValue = PlatformJsonSerializer.Deserialize<T>(PlatformJsonSerializer.Serialize(parsedValue));
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

    private bool TryGetParsedListValueFromUserClaimStringValues<T>(
        List<string> matchedClaimStringValues,
        out T foundValue)
    {
        var firstValueListInterface = FindFirstValueListInterfaceType<T>();

        if (firstValueListInterface != null)
        {
            var listItemType = firstValueListInterface.GetGenericArguments()[0];

            var isParsedAllItemSuccess = true;

            var parsedItemList = matchedClaimStringValues
                .Select(
                    matchedClaimStringValue =>
                    {
                        if (listItemType == typeof(string))
                            return matchedClaimStringValue;

                        var parsedItemResult = PlatformJsonSerializer.TryDeserialize(
                            matchedClaimStringValue,
                            listItemType,
                            out var itemDeserializedValue);

                        if (parsedItemResult == false)
                            isParsedAllItemSuccess = false;

                        return itemDeserializedValue;
                    })
                .ToList();

            if (isParsedAllItemSuccess)
            {
                // Serialize then Deserialize to type T so ensure parse matchedClaimStringValues to type T successfully
                foundValue = PlatformJsonSerializer.Deserialize<T>(PlatformJsonSerializer.Serialize(parsedItemList));
                return true;
            }
        }

        foundValue = default;

        return false;
    }

    private static Type FindFirstValueListInterfaceType<T>()
    {
        var firstValueListInterface = typeof(T)
            .GetInterfaces()
            .FirstOrDefault(
                p =>
                    p.IsGenericType &&
                    (p.GetGenericTypeDefinition().IsAssignableTo(typeof(IEnumerable<>)) ||
                     p.GetGenericTypeDefinition().IsAssignableTo(typeof(ICollection<>))));
        return firstValueListInterface;
    }
}

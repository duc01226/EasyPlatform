using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.AspNetCore.Context.UserContext.UserContextKeyToClaimTypeMapper;
using AngularDotnetPlatform.Platform.AspNetCore.Context.UserContext.UserContextKeyToClaimTypeMapper.Abstract;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.JsonSerialization;
using Microsoft.AspNetCore.Http;

namespace AngularDotnetPlatform.Platform.AspNetCore.Context.UserContext
{
    public class PlatformAspNetApplicationUserContext : IPlatformApplicationUserContext
    {
        private readonly IHttpContextAccessor httpContextAccessor;
        private readonly IPlatformApplicationUserContextKeyToClaimTypeMapper claimTypeMapper;

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
            {
                return default;
            }

            var computedKey = PlatformApplicationUserContextKeyBuilder.ComputedContextKeyFor(contextKey);

            if (CurrentHttpContext().Items.ContainsKey(computedKey))
            {
                return (T)CurrentHttpContext().Items[computedKey];
            }

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
            {
                return;
            }

            var computedKey = PlatformApplicationUserContextKeyBuilder.ComputedContextKeyFor(contextKey);
            CurrentHttpContext().Items[computedKey] = value;
        }

        public List<string> GetAllKeys()
        {
            if (HttpContextIsNotAvailable())
            {
                return new List<string>();
            }

            return CurrentHttpContext().Items.Keys
                .Where(key => key is string keyString && keyString.StartsWith(PlatformApplicationUserContextKeyBuilder.ContextKeyPrefix))
                .Select(key => (string)key)
                .ToList();
        }

        public void Clear()
        {
            if (HttpContextIsNotAvailable())
            {
                return;
            }

            var keys = GetAllKeys();
            foreach (var key in keys)
            {
                CurrentHttpContext().Items.Remove(key);
            }
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

        private bool TryGetValueFromHttpContext<T>(string contextKey, out T foundValue)
        {
            if (contextKey == PlatformApplicationCommonUserContextKeys.RequestId)
            {
                return TryGetRequestId(CurrentHttpContext(), out foundValue);
            }

            if (TryGetValueFromUserClaims(CurrentHttpContext().User, contextKey, out foundValue))
            {
                return true;
            }

            if (TryGetValueFromRequestHeaders(CurrentHttpContext().Request.Headers, contextKey, out foundValue))
            {
                return true;
            }

            return false;
        }

        private bool TryGetValueFromRequestHeaders<T>(IHeaderDictionary requestHeaders, string contextKey, out T foundValue)
        {
            var contextKeyMappedToJwtClaimType = MapContextKeyToJwtClaimType(contextKey);

            var stringRequestHeaderValues = requestHeaders.ContainsKey(contextKeyMappedToJwtClaimType)
                ? new List<string>(requestHeaders[contextKeyMappedToJwtClaimType])
                : new List<string>();

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
            var contextKeyMappedToJwtClaimType = MapContextKeyToJwtClaimType(contextKey);

            var matchedClaimStringValues = userClaims.FindAll(contextKeyMappedToJwtClaimType).Select(p => p.Value).ToList();

            // Try Get Deserialized value from matchedClaimStringValues
            return TryGetParsedValuesFromStringValues(out foundValue, matchedClaimStringValues);
        }

        /// <summary>
        /// Try Get Deserialized value from matchedClaimStringValues
        /// </summary>
        private bool TryGetParsedValuesFromStringValues<T>(out T foundValue, List<string> stringValues)
        {
            if (typeof(T) == typeof(string))
            {
                foundValue = (T)(object)stringValues.LastOrDefault();
                return true;
            }

            // If T is number type
            if (typeof(T).IsAssignableTo(typeof(double)))
            {
                var parsedSuccess = double.TryParse(stringValues.LastOrDefault(), out var parsedValue);
                if (parsedSuccess)
                {
                    // Serialize then Deserialize to ensure could parse from double to int, long, float, etc.. any of number type
                    foundValue = JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(parsedValue));
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

            // Handle case if type T is a list with many items.
            var isTryGetListValueSuccess =
                TryGetParsedListValueFromUserClaimStringValues(stringValues, out foundValue);
            if (isTryGetListValueSuccess)
                return true;

            return JsonSerializerExtension.TryDeserialize(
                stringValues.LastOrDefault(),
                out foundValue,
                PlatformJsonSerializer.CurrentOptions.Value);
        }

        private bool TryGetParsedListValueFromUserClaimStringValues<T>(
            List<string> matchedClaimStringValues,
            out T foundValue)
        {
            var firstValueListInterface = typeof(T)
                .GetInterfaces()
                .FirstOrDefault(p =>
                    p.IsGenericType &&
                    (p.GetGenericTypeDefinition().IsAssignableTo(typeof(IEnumerable<>)) ||
                     p.GetGenericTypeDefinition().IsAssignableTo(typeof(ICollection<>))));

            if (firstValueListInterface != null)
            {
                var listItemType = firstValueListInterface.GetGenericArguments()[0];

                var isParsedAllItemSuccess = true;

                var parsedItemList = matchedClaimStringValues.Select(matchedClaimStringValue =>
                {
                    if (listItemType == typeof(string))
                    {
                        return matchedClaimStringValue;
                    }

                    var parsedItemResult = JsonSerializerExtension.TryDeserialize(
                        matchedClaimStringValue,
                        listItemType,
                        out var itemDeserializedValue,
                        PlatformJsonSerializer.CurrentOptions.Value);

                    if (parsedItemResult == false)
                        isParsedAllItemSuccess = false;

                    return itemDeserializedValue;
                });

                if (isParsedAllItemSuccess)
                {
                    // Serialize then Deserialize to type T so ensure parse matchedClaimStringValues to type T successfully
                    foundValue = JsonSerializer.Deserialize<T>(
                        JsonSerializer.Serialize(parsedItemList, PlatformJsonSerializer.CurrentOptions.Value));
                    return true;
                }
            }

            foundValue = default;

            return false;
        }

        private string MapContextKeyToJwtClaimType(string contextKey)
        {
            return claimTypeMapper.ToClaimType(contextKey);
        }
    }
}

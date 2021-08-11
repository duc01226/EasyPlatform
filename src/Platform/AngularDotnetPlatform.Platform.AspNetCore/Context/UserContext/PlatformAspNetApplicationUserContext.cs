using System;
using System.Collections.Generic;
using System.Linq;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using Microsoft.AspNetCore.Http;

namespace AngularDotnetPlatform.Platform.AspNetCore.Context.UserContext
{
    public class PlatformAspNetApplicationUserContext : IPlatformApplicationUserContext
    {
        private readonly IHttpContextAccessor httpContextAccessor;

        public PlatformAspNetApplicationUserContext(IHttpContextAccessor httpContextAccessor)
        {
            this.httpContextAccessor = httpContextAccessor;
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
    }
}

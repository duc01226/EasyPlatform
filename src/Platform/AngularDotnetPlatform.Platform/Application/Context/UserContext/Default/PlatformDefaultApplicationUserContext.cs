using System.Collections.Generic;
using System.Linq;

namespace AngularDotnetPlatform.Platform.Application.Context.UserContext.Default
{
    public class PlatformDefaultApplicationUserContext : IPlatformApplicationUserContext
    {
        private readonly Dictionary<string, object> userContextData = new Dictionary<string, object>();

        public T GetValue<T>(string contextKey = "")
        {
            return (T)userContextData.GetValueOrDefault(ComputedContextKeyFor(contextKey));
        }

        public void SetValue(object value, string contextKey = "")
        {
            userContextData[ComputedContextKeyFor(contextKey)] = value;
        }

        public List<string> GetAllKeys()
        {
            return userContextData.Keys.ToList();
        }

        public void Clear()
        {
            userContextData.Clear();
        }

        private static string ComputedContextKeyFor(string contextKey)
        {
            return PlatformApplicationUserContextKeyBuilder.ComputedPlatformFormatContextKeyFor(contextKey);
        }
    }
}

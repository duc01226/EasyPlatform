using System.Text.Json;

namespace AngularDotnetPlatform.Platform.Utils
{
    public static partial class Util
    {
        public static class Strings
        {
            public static T Parse<T>(string value)
            {
                return JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(value));
            }
        }
    }
}

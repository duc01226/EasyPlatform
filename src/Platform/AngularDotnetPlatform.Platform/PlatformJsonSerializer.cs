using System;
using System.Text.Json;

namespace AngularDotnetPlatform.Platform
{
    public static class PlatformJsonSerializer
    {
        public static readonly JsonSerializerOptions DefaultValue;

        static PlatformJsonSerializer()
        {
            DefaultValue = new JsonSerializerOptions()
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        /// <summary>
        /// Use Lazy for thread safe
        /// </summary>
        public static Lazy<JsonSerializerOptions> CurrentOptions { get; private set; } =
            new Lazy<JsonSerializerOptions>(() => DefaultValue);

        public static void SetCurrentOptions(JsonSerializerOptions serializerOptions)
        {
            CurrentOptions = new Lazy<JsonSerializerOptions>(() => serializerOptions);
        }
    }
}

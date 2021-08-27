using System;
using System.Collections;
using System.Dynamic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AngularDotnetPlatform.Platform.JsonSerialization
{
    public static class PlatformJsonSerializer
    {
        public static readonly JsonSerializerOptions DefaultOptions;

        static PlatformJsonSerializer()
        {
            DefaultOptions = SetupDefaultOptions();
        }

        /// <summary>
        /// Use Lazy for thread safe
        /// </summary>
        public static Lazy<JsonSerializerOptions> CurrentOptions { get; private set; } =
            new Lazy<JsonSerializerOptions>(() => DefaultOptions);

        public static void SetCurrentOptions(JsonSerializerOptions serializerOptions)
        {
            CurrentOptions = new Lazy<JsonSerializerOptions>(() => serializerOptions);
        }

        private static JsonSerializerOptions SetupDefaultOptions()
        {
            var result = new JsonSerializerOptions()
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                IgnoreNullValues = true
            };
            result.Converters.Add(new JsonStringEnumConverter());
            result.Converters.Add(new PlatformObjectJsonConverter());
            result.Converters.Add(new PlatformDynamicJsonConverter());
            return result;
        }
    }
}

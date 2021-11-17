using System;
using System.Collections;
using System.Collections.Generic;
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
            DefaultOptions = BuildDefaultOptions();
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

        public static JsonSerializerOptions BuildDefaultOptions(
            bool useJsonStringEnumConverter = true,
            bool useCamelCaseNaming = false,
            List<JsonConverter> customConverters = null)
        {
            var result = new JsonSerializerOptions()
            {
                IgnoreNullValues = true
            };
            if (useCamelCaseNaming)
                result.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            if (useJsonStringEnumConverter)
                result.Converters.Add(new JsonStringEnumConverter());
            result.Converters.Add(new PlatformObjectJsonConverter());
            result.Converters.Add(new PlatformDynamicJsonConverter());
            if (customConverters != null)
                customConverters.ForEach(p => result.Converters.Add(p));
            return result;
        }
    }
}

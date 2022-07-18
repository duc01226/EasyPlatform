using System.Text.Json;
using System.Text.Json.Serialization;

namespace Easy.Platform.Common.JsonSerialization
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
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
            if (useCamelCaseNaming)
                result.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            if (useJsonStringEnumConverter)
                result.Converters.Add(new JsonStringEnumConverter());
            result.Converters.Add(new PlatformObjectJsonConverter());
            result.Converters.Add(new PlatformDynamicJsonConverter());
            result.Converters.Add(new PlatformCustomJsonConverterForType());
            customConverters?.ForEach(p => result.Converters.Add(p));
            return result;
        }

        public static string Serialize<TValue>(TValue value)
        {
            return JsonSerializer.Serialize(value, value?.GetType() ?? typeof(TValue), CurrentOptions.Value);
        }

        public static string Serialize<TValue>(TValue value, JsonSerializerOptions customSerializerOptions)
        {
            return JsonSerializer.Serialize(
                value,
                value?.GetType() ?? typeof(TValue),
                customSerializerOptions ?? CurrentOptions.Value);
        }

        public static T Deserialize<T>(string jsonValue)
        {
            return JsonSerializer.Deserialize<T>(jsonValue, CurrentOptions.Value);
        }

        public static T Deserialize<T>(string jsonValue, JsonSerializerOptions customSerializerOptions)
        {
            return JsonSerializer.Deserialize<T>(jsonValue, customSerializerOptions ?? CurrentOptions.Value);
        }

        public static object Deserialize(
            string jsonValue,
            Type returnType,
            JsonSerializerOptions customSerializerOptions = null)
        {
            return JsonSerializer.Deserialize(jsonValue, returnType, customSerializerOptions ?? CurrentOptions.Value);
        }

        public static byte[] SerializeToUtf8Bytes<TValue>(
            TValue value,
            JsonSerializerOptions customSerializerOptions = null)
        {
            return JsonSerializer.SerializeToUtf8Bytes(
                value,
                value?.GetType() ?? typeof(TValue),
                customSerializerOptions ?? CurrentOptions.Value);
        }

        public static TValue Deserialize<TValue>(
            ReadOnlySpan<byte> utf8Json,
            JsonSerializerOptions customSerializerOptions = null)
        {
            return JsonSerializer.Deserialize<TValue>(utf8Json, customSerializerOptions ?? CurrentOptions.Value);
        }

        public static object Deserialize(
            ReadOnlySpan<byte> utf8Json,
            Type returnType,
            JsonSerializerOptions customSerializerOptions = null)
        {
            return JsonSerializer.Deserialize(utf8Json, returnType, customSerializerOptions ?? CurrentOptions.Value);
        }

        public static T TryDeserializeOrDefault<T>(string jsonValue)
        {
            try
            {
                return Deserialize<T>(jsonValue);
            }
            catch
            {
                return default;
            }
        }
    }
}

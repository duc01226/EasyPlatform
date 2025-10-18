#region

using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization.Converters;

#endregion

namespace Easy.Platform.Common.JsonSerialization;

/// <summary>
/// Provides utility methods for JSON serialization and deserialization with customizable options.
/// </summary>
public static class PlatformJsonSerializer
{
    public const int DefaultJsonSerializerOptionsMaxDepth = 64;

    public static readonly ConcurrentDictionary<string, JsonConverter> AdditionalDefaultConverters = new();

    /// <summary>
    /// Gets the default JSON serialization options.
    /// </summary>
    public static readonly Lazy<JsonSerializerOptions> DefaultOptions = new(() => BuildDefaultOptions());

    public static readonly ConcurrentDictionary<string, List<PropertyInfo>> SerializeFilterPropsCache = new();

    /// <summary>
    /// Lazy-initialized current JSON serialization options for thread safety.
    /// </summary>
    public static Lazy<JsonSerializerOptions> CurrentOptions { get; private set; } = new(() => DefaultOptions.Value);

    /// <summary>
    /// Sets the current JSON serialization options.
    /// </summary>
    /// <param name="serializerOptions">The custom JSON serialization options.</param>
    public static void SetCurrentOptions(JsonSerializerOptions serializerOptions)
    {
        CurrentOptions = new Lazy<JsonSerializerOptions>(() => serializerOptions);
    }

    /// <summary>
    /// Configures the provided JSON serialization options with platform-specific best practices and customizations.
    /// </summary>
    /// <param name="options">The JSON serialization options to configure.</param>
    /// <param name="useJsonStringEnumConverter">Whether to use the <see cref="JsonStringEnumConverter" />.</param>
    /// <param name="useCamelCaseNaming">Whether to use camel case property naming.</param>
    /// <param name="customConverters">Additional custom JSON converters.</param>
    /// <param name="ignoreJsonConverterTypes">Input list of default platform json converters that you want to be ignored</param>
    /// <returns>The configured JSON serialization options.</returns>
    public static JsonSerializerOptions ConfigOptions(
        JsonSerializerOptions options,
        bool useJsonStringEnumConverter = true,
        bool useCamelCaseNaming = false,
        List<JsonConverter> customConverters = null,
        HashSet<Type> ignoreJsonConverterTypes = null)
    {
        options.TypeInfoResolver = new PlatformJsonTypeInfoResolver();
        options.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.ReadCommentHandling = JsonCommentHandling.Skip;
        options.PropertyNameCaseInsensitive = true;
        options.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.MaxDepth = DefaultJsonSerializerOptionsMaxDepth;

        if (useCamelCaseNaming)
            options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;

        /*
         * the order of converters in the Converters list in JsonSerializerOptions can affect how serialization and deserialization are handled in .NET.
         * When serializing or deserializing objects, the System.Text.Json library processes the converters in the order they are added to the Converters list.
         * The first converter that can handle the type being serialized or deserialized will be used.
         */
        options.Converters.Clear();

        AdditionalDefaultConverters.ForEach(p => options.Converters.Add(p.Value));

        if (useJsonStringEnumConverter)
            options.Converters.Add(new JsonStringEnumConverter());

        if (ignoreJsonConverterTypes?.Contains(typeof(PlatformObjectJsonConverter)) != true)
            options.Converters.Add(new PlatformObjectJsonConverter());
        if (ignoreJsonConverterTypes?.Contains(typeof(PlatformClassTypeJsonConverter)) != true)
            options.Converters.Add(new PlatformClassTypeJsonConverter());
        if (ignoreJsonConverterTypes?.Contains(typeof(PlatformIgnoreMethodBaseJsonConverter)) != true)
            options.Converters.Add(new PlatformIgnoreMethodBaseJsonConverter());
        if (ignoreJsonConverterTypes?.Contains(typeof(PlatformDateTimeJsonConverter)) != true)
            options.Converters.Add(new PlatformDateTimeJsonConverter());
        if (ignoreJsonConverterTypes?.Contains(typeof(PlatformNullableDateTimeJsonConverter)) != true)
            options.Converters.Add(new PlatformNullableDateTimeJsonConverter());
        if (ignoreJsonConverterTypes?.Contains(typeof(PlatformDateOnlyJsonConverter)) != true)
            options.Converters.Add(new PlatformDateOnlyJsonConverter());
        if (ignoreJsonConverterTypes?.Contains(typeof(PlatformNullableDateOnlyJsonConverter)) != true)
            options.Converters.Add(new PlatformNullableDateOnlyJsonConverter());
        if (ignoreJsonConverterTypes?.Contains(typeof(PlatformPrimitiveTypeToStringJsonConverter)) != true)
            options.Converters.Add(new PlatformPrimitiveTypeToStringJsonConverter());

        customConverters?.ForEach(options.Converters.Add);

        return options;
    }

    public static void ConfigApplyCurrentOptions(
        JsonSerializerOptions options)
    {
        options.TypeInfoResolver = CurrentOptions.Value.TypeInfoResolver;
        options.DefaultIgnoreCondition = CurrentOptions.Value.DefaultIgnoreCondition;
        options.ReadCommentHandling = CurrentOptions.Value.ReadCommentHandling;
        options.PropertyNameCaseInsensitive = CurrentOptions.Value.PropertyNameCaseInsensitive;
        options.ReferenceHandler = CurrentOptions.Value.ReferenceHandler;
        options.PropertyNamingPolicy = CurrentOptions.Value.PropertyNamingPolicy;
        options.DictionaryKeyPolicy = CurrentOptions.Value.DictionaryKeyPolicy;
        options.Encoder = CurrentOptions.Value.Encoder;
        options.MaxDepth = CurrentOptions.Value.MaxDepth;
        options.AllowTrailingCommas = CurrentOptions.Value.AllowTrailingCommas;
        options.WriteIndented = CurrentOptions.Value.WriteIndented;
        options.IgnoreReadOnlyProperties = CurrentOptions.Value.IgnoreReadOnlyProperties;
        options.IgnoreReadOnlyFields = CurrentOptions.Value.IgnoreReadOnlyFields;
        options.IncludeFields = CurrentOptions.Value.IncludeFields;
        options.NumberHandling = CurrentOptions.Value.NumberHandling;
        options.DefaultBufferSize = CurrentOptions.Value.DefaultBufferSize;
        options
            .PipeAction(p => p.Converters.Clear())
            .PipeAction(options => CurrentOptions.Value.Converters.ForEach(converter => options.Converters.Add(converter)));
    }

    /// <summary>
    /// Builds the default JSON serialization options.
    /// </summary>
    /// <param name="useJsonStringEnumConverter">Whether to use the <see cref="JsonStringEnumConverter" />.</param>
    /// <param name="useCamelCaseNaming">Whether to use camel case property naming.</param>
    /// <param name="customConverters">Additional custom JSON converters.</param>
    /// <returns>The default JSON serialization options.</returns>
    public static JsonSerializerOptions BuildDefaultOptions(
        bool useJsonStringEnumConverter = true,
        bool useCamelCaseNaming = false,
        List<JsonConverter> customConverters = null)
    {
        return ConfigOptions(new JsonSerializerOptions(), useJsonStringEnumConverter, useCamelCaseNaming, customConverters);
    }

    /// <summary>
    /// Serializes the specified value to a JSON string using the provided options or the current default options.
    /// </summary>
    /// <typeparam name="TValue">The type of the value to serialize.</typeparam>
    /// <param name="value">The value to serialize.</param>
    /// <param name="forceUseRuntimeType">Whether to force the use of the runtime type for abstract types.</param>
    /// <returns>The JSON string representation of the serialized value.</returns>
    public static string Serialize<TValue>(TValue value, bool forceUseRuntimeType)
    {
        return Serialize(value, customSerializerOptions: null, forceUseRuntimeType);
    }

    /// <summary>
    /// Serializes the specified value to a JSON string using the provided options or the current default options.
    /// </summary>
    /// <typeparam name="TValue">The type of the value to serialize.</typeparam>
    /// <param name="value">The value to serialize.</param>
    /// <returns>The JSON string representation of the serialized value.</returns>
    public static string Serialize<TValue>(TValue value)
    {
        return Serialize(value, customSerializerOptions: null);
    }

    /// <summary>
    /// Serializes the specified value to a JSON string using the provided options or the current default options.
    /// </summary>
    /// <typeparam name="TValue">The type of the value to serialize.</typeparam>
    /// <param name="value">The value to serialize.</param>
    /// <param name="customSerializerOptions">Custom JSON serialization options.</param>
    /// <param name="forceUseRuntimeType">Whether to force the use of the runtime type for abstract types.</param>
    /// <param name="propPredicate">propPredicate</param>
    /// <param name="objType">use objType instead of generic type</param>
    /// <returns>The JSON string representation of the serialized value.</returns>
    public static string Serialize<TValue>(
        TValue value,
        JsonSerializerOptions customSerializerOptions,
        bool forceUseRuntimeType = false,
        Expression<Func<PropertyInfo, bool>> propPredicate = null,
        Type objType = null)
    {
        var givenObjectType = objType ?? typeof(TValue);

        var givenOrRuntimeObjType = givenObjectType.IsAbstract || forceUseRuntimeType ? value.GetType() : givenObjectType;

        if (propPredicate != null)
        {
            var filteredProps = SerializeFilterPropsCache.GetOrAdd(
                $"{givenOrRuntimeObjType.FullName ?? givenOrRuntimeObjType.Name}{propPredicate}",
                key => givenOrRuntimeObjType
                    .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                    .Where(propInfo => propInfo.GetCustomAttribute<JsonIgnoreAttribute>() == null)
                    .Where(propPredicate.Compile())
                    .ToList());

            return Serialize(
                new Dictionary<string, object>(filteredProps.Select(prop => new KeyValuePair<string, object>(prop.Name, prop.GetValue(value)))),
                customSerializerOptions,
                forceUseRuntimeType);
        }
        else
        {
            if (givenObjectType.IsAbstract || forceUseRuntimeType)
            {
                try
                {
                    // Try to use the real runtime type to support TValue as an abstract base type.
                    // Serialize exactly the type. If not successful, fallback to the original type.
                    return JsonSerializer.Serialize(value, givenOrRuntimeObjType, customSerializerOptions ?? CurrentOptions.Value);
                }
                catch
                {
                    return JsonSerializer.Serialize(value, givenObjectType, customSerializerOptions ?? CurrentOptions.Value);
                }
            }

            return JsonSerializer.Serialize(value, givenOrRuntimeObjType, customSerializerOptions ?? CurrentOptions.Value);
        }
    }

    public static string Serialize<TValue>(TValue value, Action<JsonSerializerOptions> customSerializerOptionsConfig)
    {
        return Serialize(value, customSerializerOptions: CurrentOptions.Value.Clone().With(customSerializerOptionsConfig));
    }

    public static string SerializeWithDefaultOptions<TValue>(
        TValue value,
        bool useJsonStringEnumConverter = true,
        bool useCamelCaseNaming = false,
        List<JsonConverter> customConverters = null)
    {
        return Serialize(value, BuildDefaultOptions(useJsonStringEnumConverter, useCamelCaseNaming, customConverters));
    }

    public static T Deserialize<T>(string jsonValue)
    {
        return JsonSerializer.Deserialize<T>(jsonValue, CurrentOptions.Value);
    }

    public static T DeserializeWithDefaultOptions<T>(
        string jsonValue,
        bool useJsonStringEnumConverter = true,
        bool useCamelCaseNaming = false,
        List<JsonConverter> customConverters = null)
    {
        return Deserialize<T>(jsonValue, BuildDefaultOptions(useJsonStringEnumConverter, useCamelCaseNaming, customConverters));
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
        JsonSerializerOptions customSerializerOptions = null,
        bool forceUseRuntimeType = false)
    {
        if (typeof(TValue).IsAbstract || forceUseRuntimeType)
        {
            try
            {
                // Try to use real runtime type to support TValue is abstract base type. Serialize exactly the type.
                // If not work come back to original type
                return JsonSerializer.SerializeToUtf8Bytes(value, value.GetType(), customSerializerOptions ?? CurrentOptions.Value);
            }
            catch (Exception)
            {
                return JsonSerializer.SerializeToUtf8Bytes(value, typeof(TValue), customSerializerOptions ?? CurrentOptions.Value);
            }
        }

        return JsonSerializer.SerializeToUtf8Bytes(value, typeof(TValue), customSerializerOptions ?? CurrentOptions.Value);
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

    public static T TryDeserializeOrDefault<T>(string jsonValue, T defaultValue = default)
    {
        try
        {
            return Deserialize<T>(jsonValue);
        }
        catch
        {
            return defaultValue;
        }
    }

    /// <summary>
    /// Try to Deserialize json string.
    /// If success return true and out the deserialized value of type <see cref="T" />.
    /// If error return false and out default of type <see cref="T" />
    /// </summary>
    public static bool TryDeserialize<T>(
        string json,
        out T deserializedValue,
        JsonSerializerOptions options = null)
    {
        var tryDeserializeResult = TryDeserialize(
            json,
            typeof(T),
            out var deserializedObjectValue,
            options ?? CurrentOptions.Value);

        if (tryDeserializeResult)
            deserializedValue = (T)deserializedObjectValue;
        else
            deserializedValue = default;

        return tryDeserializeResult;
    }

    public static bool TryDeserialize(
        string json,
        Type deserializeType,
        out object deserializedValue,
        JsonSerializerOptions options = null)
    {
        try
        {
            deserializedValue = JsonSerializer.Deserialize(json, deserializeType, options ?? CurrentOptions.Value);
            return true;
        }
        catch (Exception)
        {
            deserializedValue = default;
            return false;
        }
    }
}

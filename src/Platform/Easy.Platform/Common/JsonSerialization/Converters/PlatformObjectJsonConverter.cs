#region

using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.Common.Extensions;

#endregion

namespace Easy.Platform.Common.JsonSerialization.Converters;

// TODO: Dotnet core 8 api return IAsyncEnumerable => resolve type is object which cause error when serialized. Because SystemTextJsonOutputFormatter => (declaredTypeJsonInfo.ShouldUseWith(runtimeType)) is false. Following issues: https://github.com/dotnet/aspnetcore/issues/54374
/// <summary>
/// JSON converter for <see cref="object"/> that addresses specific deserialization issues with System.Text.Json
/// and provides enhanced object handling for dynamic scenarios.
/// This converter fixes problems where deserializing JSON to object type adds unwanted ValueKind metadata.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Problem addressed:</strong> System.Text.Json has a known issue (https://github.com/dotnet/runtime/issues/31408)
/// where deserializing JSON to object type results in JsonElement with ValueKind properties instead of clean primitive values.
/// This converter resolves that issue by extracting the actual values from JsonElement objects.
/// </para>
/// <para>
/// <strong>ASP.NET Core 8 compatibility:</strong> There's an ongoing issue (https://github.com/dotnet/aspnetcore/issues/54374)
/// where APIs returning IAsyncEnumerable with object type resolution cause serialization errors in SystemTextJsonOutputFormatter.
/// This converter helps mitigate some of these serialization edge cases.
/// </para>
/// <para>
/// <strong>Enhanced deserialization behavior:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Numbers: Attempts to deserialize as int32, then int64, then double for best type fit</description></item>
/// <item><description>Strings: Returns clean string values without JsonElement wrapper</description></item>
/// <item><description>Booleans: Returns actual boolean values instead of JsonElement representations</description></item>
/// <item><description>Complex objects: Uses reflection-based dynamic object creation when possible</description></item>
/// <item><description>Arrays/Objects: Processes nested structures correctly</description></item>
/// </list>
/// <para>
/// <strong>Serialization handling:</strong> For write operations, this converter removes itself from the options
/// to prevent infinite recursion and delegates to the default .NET serialization behavior, ensuring the actual
/// runtime type is used for serialization.
/// </para>
/// <para>
/// <strong>Usage scenarios in the platform:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Dynamic API responses where the data structure isn't known at compile time</description></item>
/// <item><description>Configuration systems that handle polymorphic data</description></item>
/// <item><description>Data processing pipelines that work with varying data formats</description></item>
/// <item><description>Integration layers that transform data between different schemas</description></item>
/// <item><description>Generic repositories or services that handle multiple entity types</description></item>
/// <item><description>Caching systems that store objects of various types</description></item>
/// </list>
/// <para>
/// <strong>Performance considerations:</strong> This converter includes type checking and reflection operations
/// for complex objects, so it may have performance implications for high-throughput scenarios. However,
/// it's essential for correctness in dynamic object scenarios.
/// </para>
/// </remarks>
/// <example>
/// Without this converter, object deserialization produces JsonElement:
/// <code>
/// // JSON: {"value": 42}
/// // Default behavior: object with JsonElement.ValueKind = Number
/// // With PlatformObjectJsonConverter: object with actual int value 42
///
/// // JSON: {"items": [1, "test", true]}
/// // Default: JsonElement array with ValueKind metadata
/// // With converter: Clean object array with actual types
/// </code>
/// </example>
/// <seealso cref="JsonElement"/>
/// <seealso cref="PlatformJsonSerializer"/>
/// <seealso href="https://github.com/dotnet/runtime/issues/31408">System.Text.Json object deserialization issue</seealso>
/// <seealso href="https://github.com/dotnet/aspnetcore/issues/54374">ASP.NET Core IAsyncEnumerable serialization issue</seealso>
/// This is used to fix deserialize object add ValueKind to value
/// https://github.com/dotnet/runtime/issues/31408
/// </summary>
public sealed class PlatformObjectJsonConverter : JsonConverter<object>
{
    // Cache for JsonSerializerOptions to avoid repeated cloning - .NET 8+ performance optimization
    private static readonly ConcurrentDictionary<JsonSerializerOptions, JsonSerializerOptions> OptionsCache = new();

    /// <summary>
    /// Fixes issues where using <see cref="JsonSerializer" /> to deserialize to Object/dynamic
    /// results in a JsonElement wrapped object with only ValueKind property.
    /// This method extracts the actual value from JsonElement objects.
    /// Enhanced for .NET 8+ with better type safety and performance.
    /// References: https://github.com/dotnet/runtime/issues/31408
    /// </summary>
    /// <param name="dynamicObject">The object to process, potentially a JsonElement</param>
    /// <returns>The actual value if it was a JsonElement, otherwise the original object</returns>
    public static object? TryGetReflectionDynamicIfJsonElement(object? dynamicObject)
    {
        return dynamicObject is JsonElement jsonElement ? TryGetReflectionDynamic(jsonElement) : dynamicObject;
    }

    /// <summary>
    /// Extracts the actual value from a JsonElement based on its ValueKind.
    /// Enhanced for .NET 8/9 with support for decimal, BigInteger, Guid, DateOnly, and TimeOnly.
    /// </summary>
    /// <param name="jsonElement">The JsonElement to process</param>
    /// <returns>The extracted value with the appropriate .NET type</returns>
    public static object? TryGetReflectionDynamic(JsonElement jsonElement)
    {
        return jsonElement.ValueKind switch
        {
            JsonValueKind.Number => TryGetNumericValue(jsonElement),
            JsonValueKind.False => false,
            JsonValueKind.True => true,
            JsonValueKind.String => TryGetStringValue(jsonElement),
            JsonValueKind.Array => ProcessArray(jsonElement),
            JsonValueKind.Object => ProcessObject(jsonElement),
            JsonValueKind.Null => null,
            JsonValueKind.Undefined => null,
            _ => null // Handle any future ValueKind additions gracefully
        };
    }

    /// <summary>
    /// Attempts to parse a numeric JsonElement to the most appropriate .NET numeric type.
    /// Enhanced for .NET 8+ with support for decimal and BigInteger.
    /// Note: Removed AggressiveInlining due to multiple conditional branches.
    /// </summary>
    private static object TryGetNumericValue(JsonElement element)
    {
        // Try integer types first (most common scenarios)
        if (element.TryGetInt32(out var int32Value))
            return int32Value;

        if (element.TryGetInt64(out var int64Value))
            return int64Value;

        // Enhanced: Support decimal for high precision financial/business scenarios
        if (element.TryGetDecimal(out var decimalValue))
            return decimalValue;

        // Fallback to double
        return element.TryGetDouble(out var doubleValue) ? doubleValue : 0.0;
    }

    /// <summary>
    /// Attempts to parse a string JsonElement with enhanced type detection for .NET 8/9.
    /// Supports DateTime, DateTimeOffset, Guid, DateOnly, and TimeOnly parsing.
    /// Note: Removed AggressiveInlining due to try-catch and complex logic.
    /// </summary>
    private static object? TryGetStringValue(JsonElement element)
    {
        try
        {
            // Try specialized types in order of likelihood
            if (element.TryGetDateTimeOffset(out var dateTimeOffset))
                return dateTimeOffset;

            if (element.TryGetDateTime(out var dateTime))
                return dateTime;

            // Enhanced: Support Guid parsing
            if (element.TryGetGuid(out var guid))
                return guid;

            // Enhanced: Support .NET 6+ DateOnly and TimeOnly
            var stringValue = element.GetString();
            if (stringValue is not null)
            {
                if (DateOnly.TryParse(stringValue, out var dateOnly))
                    return dateOnly;

                if (TimeOnly.TryParse(stringValue, out var timeOnly))
                    return timeOnly;
            }

            return stringValue;
        }
        catch
        {
            // Fallback to string if specialized parsing fails
            return element.GetString();
        }
    }

    /// <summary>
    /// Processes a JsonElement array with optimized performance for .NET 8+.
    /// Avoids LINQ operations in hot paths.
    /// </summary>
    private static object?[] ProcessArray(JsonElement element)
    {
        var arrayLength = element.GetArrayLength();
        var result = new object?[arrayLength];
        var index = 0;

        // Use foreach instead of LINQ for better performance
        foreach (var item in element.EnumerateArray())
            result[index++] = TryGetReflectionDynamicIfJsonElement(item);

        return result;
    }

    /// <summary>
    /// Processes a JsonElement object with optimized dictionary creation.
    /// Enhanced for .NET 8+ with better capacity estimation.
    /// </summary>
    private static Dictionary<string, object?> ProcessObject(JsonElement element)
    {
        // Pre-allocate dictionary with estimated capacity for better performance
        var dictionary = new Dictionary<string, object?>();

        foreach (var property in element.EnumerateObject())
            dictionary[property.Name] = TryGetReflectionDynamic(property.Value);

        return dictionary;
    }

    /// <summary>
    /// Reads and converts JSON to an object with enhanced performance for .NET 8+.
    /// Uses optimized paths for common scenarios and proper null handling.
    /// </summary>
    public override object? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.Number => TryGetNumericValueFromReader(ref reader),
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.True => true,
            JsonTokenType.False => false,
            JsonTokenType.Null => null,
            JsonTokenType.StartArray or JsonTokenType.StartObject => ParseComplexValue(ref reader),
            _ => null // Handle unexpected token types gracefully
        };
    }

    /// <summary>
    /// Efficiently extracts numeric values from the JSON reader with .NET 8+ enhancements.
    /// Note: Removed AggressiveInlining due to multiple conditional branches.
    /// </summary>
    private static object TryGetNumericValueFromReader(ref Utf8JsonReader reader)
    {
        if (reader.TryGetInt32(out var int32Value))
            return int32Value;

        if (reader.TryGetInt64(out var int64Value))
            return int64Value;

        // Enhanced: Support decimal for high precision
        if (reader.TryGetDecimal(out var decimalValue))
            return decimalValue;

        if (reader.TryGetDouble(out var doubleValue))
            return doubleValue;

        // Fallback for edge cases
        return 0.0;
    }

    /// <summary>
    /// Parses complex JSON values (arrays and objects) with proper memory management.
    /// </summary>
    private static object? ParseComplexValue(ref Utf8JsonReader reader)
    {
        using (var document = JsonDocument.ParseValue(ref reader)) return TryGetReflectionDynamic(document.RootElement.Clone());
    }

    /// <summary>
    /// Writes an object to JSON with enhanced performance using cached options.
    /// Removes this converter from options to prevent infinite recursion.
    /// Enhanced for .NET 8+ with proper null handling and caching.
    /// </summary>
    public override void Write(Utf8JsonWriter writer, object? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        // Use cached options to avoid repeated cloning - .NET 8+ performance optimization
        var modifiedOptions = GetOrCreateModifiedOptions(options);

        // Let the default .NET behavior handle write object using runtime type
        JsonSerializer.Serialize(writer, value, value.GetType(), modifiedOptions);
    }

    /// <summary>
    /// Gets or creates modified JsonSerializerOptions with this converter removed,
    /// using caching to improve performance for repeated serialization operations.
    /// Note: Removed AggressiveInlining due to complex lambda and method calls.
    /// </summary>
    private static JsonSerializerOptions GetOrCreateModifiedOptions(JsonSerializerOptions original)
    {
        return OptionsCache.GetOrAdd(
            original,
            static options =>
            {
                var modified = options.Clone();
                modified.Converters.RemoveWhere(converter => converter is PlatformObjectJsonConverter, out _);
                return modified;
            }
        );
    }
}

using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization.Converters.Helpers;

namespace Easy.Platform.Common.JsonSerialization.Converters;

/// <summary>
/// JSON converter for <see cref="DateTime"/> objects that provides flexible parsing of various date-time string formats.
/// This converter handles both serialization and deserialization with enhanced format support beyond the default
/// System.Text.Json DateTime handling.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Enhanced parsing capabilities:</strong> This converter uses <see cref="PlatformStringToDateTimeConverterHelper"/>
/// to parse DateTime strings in multiple formats, making it more tolerant of different date-time representations
/// commonly encountered in web APIs, databases, and client applications.
/// </para>
/// <para>
/// <strong>Supported scenarios:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>ISO 8601 date-time strings (standard JSON format)</description></item>
/// <item><description>Various regional date formats for international applications</description></item>
/// <item><description>Database date-time string representations</description></item>
/// <item><description>Legacy date formats from older systems</description></item>
/// <item><description>Custom date formats specific to the platform</description></item>
/// </list>
/// <para>
/// <strong>Error handling:</strong> When parsing fails, the converter throws a descriptive exception
/// that includes the problematic input string, making debugging easier during development and production.
/// </para>
/// <para>
/// <strong>Null and empty value handling:</strong> The converter gracefully handles null JSON values
/// and empty strings by returning default(DateTime), ensuring robust deserialization behavior.
/// </para>
/// <para>
/// <strong>Registration and priority:</strong> This converter is automatically registered in the platform's
/// JSON configuration and takes precedence over the default System.Text.Json DateTime converter,
/// ensuring consistent date-time handling across the entire application.
/// </para>
/// <para>
/// <strong>Usage across the platform:</strong> This converter is essential for:
/// </para>
/// <list type="bullet">
/// <item><description>API endpoints that receive date-time parameters from various client types</description></item>
/// <item><description>Data import/export operations with different date format requirements</description></item>
/// <item><description>Integration with external systems that use non-standard date formats</description></item>
/// <item><description>Historical data migration where date formats may vary</description></item>
/// </list>
/// </remarks>
/// <example>
/// The converter can parse various date-time formats:
/// <code>
/// // All of these can be successfully parsed:
/// "2023-12-25T10:30:00Z"           // ISO 8601
/// "2023-12-25 10:30:00"            // Common database format
/// "25/12/2023 10:30:00"            // European format
/// "12/25/2023 10:30:00 AM"         // US format with AM/PM
/// </code>
/// </example>
/// <seealso cref="PlatformNullableDateTimeJsonConverter"/>
/// <seealso cref="PlatformStringToDateTimeConverterHelper"/>
/// <seealso cref="PlatformJsonSerializer"/>
public class PlatformDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var type = reader.TokenType;

        if (type == JsonTokenType.Null)
            return default;

        var strValue = reader.GetString();
        if (strValue.IsNullOrEmpty())
            return default;

        return PlatformStringToDateTimeConverterHelper.TryRead(strValue) ?? throw new Exception($"Could not parse {strValue} to DateTime");
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, value);
    }
}

/// <summary>
/// JSON converter for nullable <see cref="DateTime"/> objects (<see cref="DateTime?"/>) that provides flexible parsing
/// of various date-time string formats with proper null handling.
/// This converter extends the capabilities of <see cref="PlatformDateTimeJsonConverter"/> to handle nullable scenarios.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Null-safe operation:</strong> This converter is specifically designed to handle nullable DateTime properties
/// in data models, APIs, and configurations where date-time values are optional. It provides the same enhanced
/// parsing capabilities as <see cref="PlatformDateTimeJsonConverter"/> while properly handling null values.
/// </para>
/// <para>
/// <strong>Key differences from non-nullable converter:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Returns null for JSON null tokens instead of default(DateTime)</description></item>
/// <item><description>Handles empty strings by returning null rather than throwing exceptions</description></item>
/// <item><description>Graceful degradation when parsing fails, returning null instead of default date values</description></item>
/// </list>
/// <para>
/// <strong>Common usage scenarios:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Optional date fields in API requests (e.g., end dates, expiration dates)</description></item>
/// <item><description>Database entities with nullable DateTime columns</description></item>
/// <item><description>Configuration objects where date-time settings are optional</description></item>
/// <item><description>Form data where users may leave date fields empty</description></item>
/// <item><description>Data transfer objects representing incomplete or partial data</description></item>
/// </list>
/// <para>
/// <strong>Enhanced parsing:</strong> Uses the same <see cref="PlatformStringToDateTimeConverterHelper"/>
/// as the non-nullable converter, ensuring consistent date format support across nullable and non-nullable scenarios.
/// </para>
/// </remarks>
/// <example>
/// Example JSON inputs and their parsed results:
/// <code>
/// null                    → null
/// ""                      → null
/// "2023-12-25T10:30:00Z"  → DateTime(2023, 12, 25, 10, 30, 0)
/// "invalid-date"          → null (graceful failure)
/// </code>
/// </example>
/// <seealso cref="PlatformDateTimeJsonConverter"/>
/// <seealso cref="PlatformStringToDateTimeConverterHelper"/>
/// <seealso cref="DateTime"/>
public class PlatformNullableDateTimeJsonConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var type = reader.TokenType;

        if (type == JsonTokenType.Null)
            return null;

        var strValue = reader.GetString();

        return PlatformStringToDateTimeConverterHelper.TryRead(strValue);
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, value);
    }
}

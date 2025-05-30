using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization.Converters.Helpers;

namespace Easy.Platform.Common.JsonSerialization.Converters;

/// <summary>
/// JSON converter for <see cref="DateOnly"/> objects that provides flexible parsing of various date string formats.
/// This converter handles both serialization and deserialization of DateOnly values with enhanced format support
/// beyond the default System.Text.Json DateOnly handling.
/// </summary>
/// <remarks>
/// <para>
/// <strong>DateOnly type advantages:</strong> DateOnly (.NET 6+) represents dates without time components,
/// making it ideal for scenarios like birth dates, due dates, schedules, and business logic that operates
/// on calendar dates rather than specific moments in time.
/// </para>
/// <para>
/// <strong>Enhanced parsing capabilities:</strong> This converter uses <see cref="PlatformStringToDateTimeConverterHelper.TryReadDateOnly"/>
/// to parse date strings in multiple formats, providing more flexibility than the default JSON DateOnly handling.
/// </para>
/// <para>
/// <strong>Supported date formats:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>ISO 8601 date strings (YYYY-MM-DD)</description></item>
/// <item><description>Various regional date formats (DD/MM/YYYY, MM/DD/YYYY)</description></item>
/// <item><description>Database date representations</description></item>
/// <item><description>Legacy date formats from older systems</description></item>
/// <item><description>Custom date formats specific to business requirements</description></item>
/// </list>
/// <para>
/// <strong>Error handling:</strong> When date parsing fails, the converter throws a descriptive exception
/// that includes the problematic input string, facilitating easier debugging and error tracking.
/// </para>
/// <para>
/// <strong>Null and empty value handling:</strong> The converter handles null JSON values and empty strings
/// by returning default(DateOnly), ensuring consistent behavior across the application.
/// </para>
/// <para>
/// <strong>Platform integration:</strong> This converter is automatically registered in the platform's
/// JSON configuration and works seamlessly with model binding, API serialization, and data persistence layers.
/// </para>
/// <para>
/// <strong>Common usage scenarios:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Employee management systems with hire dates, birth dates</description></item>
/// <item><description>Project management with milestone and deadline dates</description></item>
/// <item><description>Financial systems with transaction dates, reporting periods</description></item>
/// <item><description>Scheduling applications with appointment dates</description></item>
/// <item><description>HR systems with leave dates, performance review cycles</description></item>
/// </list>
/// </remarks>
/// <example>
/// The converter can parse various date formats:
/// <code>
/// // All of these can be successfully parsed:
/// "2023-12-25"                     // ISO 8601
/// "25/12/2023"                     // European format
/// "12/25/2023"                     // US format
/// "2023.12.25"                     // Alternative separator
/// </code>
/// </example>
/// <seealso cref="PlatformNullableDateOnlyJsonConverter"/>
/// <seealso cref="PlatformStringToDateTimeConverterHelper"/>
/// <seealso cref="DateOnly"/>
/// <seealso cref="PlatformDateOnlyModelBinderProvider"/>
public class PlatformDateOnlyJsonConverter : JsonConverter<DateOnly>
{
    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var type = reader.TokenType;

        if (type == JsonTokenType.Null)
            return default;

        var strValue = reader.GetString();
        if (strValue.IsNullOrEmpty())
            return default;

        return PlatformStringToDateTimeConverterHelper.TryReadDateOnly(strValue) ?? throw new Exception($"Could not parse {strValue} to DateOnly");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, value);
    }
}

/// <summary>
/// JSON converter for nullable <see cref="DateOnly"/> objects (<see cref="DateOnly?"/>) that provides flexible parsing
/// of various date string formats with proper null handling.
/// This converter extends the capabilities of <see cref="PlatformDateOnlyJsonConverter"/> to handle nullable scenarios.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Nullable DateOnly advantages:</strong> In many business scenarios, dates are optional or may not be set initially.
/// This converter handles such cases gracefully, allowing for optional date fields in data models, APIs, and user interfaces.
/// </para>
/// <para>
/// <strong>Null-safe operation:</strong> This converter is specifically designed to handle nullable DateOnly properties
/// where date values are optional, such as optional deadlines, tentative schedules, or future planning dates.
/// </para>
/// <para>
/// <strong>Key differences from non-nullable converter:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Returns null for JSON null tokens instead of default(DateOnly)</description></item>
/// <item><description>Handles empty strings by returning null rather than throwing exceptions</description></item>
/// <item><description>Graceful degradation when parsing fails, returning null instead of default date values</description></item>
/// <item><description>Proper serialization of null values as JSON null</description></item>
/// </list>
/// <para>
/// <strong>Business use cases:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Optional project end dates that may not be set initially</description></item>
/// <item><description>Employee termination dates (null for active employees)</description></item>
/// <item><description>Optional contract expiration dates</description></item>
/// <item><description>Tentative event dates that may be rescheduled</description></item>
/// <item><description>Optional milestone dates in project planning</description></item>
/// <item><description>Birth dates in customer profiles (privacy considerations)</description></item>
/// </list>
/// <para>
/// <strong>Enhanced parsing:</strong> Uses the same <see cref="PlatformStringToDateTimeConverterHelper.TryReadDateOnly"/>
/// as the non-nullable converter, ensuring consistent date format support across nullable and non-nullable scenarios.
/// </para>
/// </remarks>
/// <example>
/// Example JSON inputs and their parsed results:
/// <code>
/// null                    → null
/// ""                      → null
/// "2023-12-25"            → DateOnly(2023, 12, 25)
/// "25/12/2023"            → DateOnly(2023, 12, 25)
/// "invalid-date"          → null (graceful failure)
/// </code>
/// </example>
/// <seealso cref="PlatformDateOnlyJsonConverter"/>
/// <seealso cref="PlatformStringToDateTimeConverterHelper"/>
/// <seealso cref="DateOnly"/>
public class PlatformNullableDateOnlyJsonConverter : JsonConverter<DateOnly?>
{
    public override DateOnly? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var type = reader.TokenType;

        if (type == JsonTokenType.Null)
            return null;

        var strValue = reader.GetString();

        return PlatformStringToDateTimeConverterHelper.TryReadDateOnly(strValue);
    }

    public override void Write(Utf8JsonWriter writer, DateOnly? value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, value);
    }
}

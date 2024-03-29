using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization.Converters.Helpers;

namespace Easy.Platform.Common.JsonSerialization.Converters;

public class PlatformDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var type = reader.TokenType;

        if (type == JsonTokenType.Null) return default;

        var strValue = reader.GetString();
        if (strValue.IsNullOrEmpty()) return default;

        return PlatformStringToDateTimeConverterHelper.TryRead(strValue) ?? throw new Exception($"Could not parse {strValue} to DateTime");
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, value);
    }
}

public class PlatformNullableDateTimeJsonConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var type = reader.TokenType;

        if (type == JsonTokenType.Null) return null;

        var strValue = reader.GetString();

        return PlatformStringToDateTimeConverterHelper.TryRead(strValue);
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, value);
    }
}

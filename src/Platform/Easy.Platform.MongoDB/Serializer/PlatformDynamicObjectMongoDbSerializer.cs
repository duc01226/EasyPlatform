#region

using System.Collections;
using System.Globalization;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.JsonSerialization.Converters;
using Easy.Platform.MongoDB.Serializer.Abstract;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

#endregion

#pragma warning disable S907

namespace Easy.Platform.MongoDB.Serializer;

public class PlatformDynamicObjectMongoDbSerializer : ClassSerializerBase<object>, IPlatformMongoAutoRegisterBaseSerializer<object>
{
    public override object? Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
        => ConvertFromBson(BsonSerializer.Deserialize<BsonValue>(context.Reader));

    public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, object value)
        => WriteValue(context.Writer, value);

    private static void WriteValue(IBsonWriter writer, object? value)
    {
        value = PlatformObjectJsonConverter.TryGetReflectionDynamicIfJsonElement(value);

        switch (value)
        {
            case null:
                writer.WriteNull();
                return;
            case string stringValue:
                writer.WriteString(stringValue);
                return;
            case char charValue:
                writer.WriteString(charValue.ToString());
                return;
            case bool boolValue:
                writer.WriteBoolean(boolValue);
                return;
            case byte or sbyte or short or ushort or int:
                writer.WriteInt32(Convert.ToInt32(value, CultureInfo.InvariantCulture));
                return;
            case uint or long:
                writer.WriteInt64(Convert.ToInt64(value, CultureInfo.InvariantCulture));
                return;
            case ulong ulongValue when ulongValue <= long.MaxValue:
                writer.WriteInt64((long)ulongValue);
                return;
            case float or double:
                writer.WriteDouble(Convert.ToDouble(value, CultureInfo.InvariantCulture));
                return;
            case decimal decimalValue:
                writer.WriteDecimal128(new Decimal128(decimalValue));
                return;
            case DateTime dateTimeValue:
                writer.WriteDateTime(BsonUtils.ToMillisecondsSinceEpoch(dateTimeValue.ToUniversalTime()));
                return;
            case DateTimeOffset dateTimeOffsetValue:
                writer.WriteString(dateTimeOffsetValue.ToString("O", CultureInfo.InvariantCulture));
                return;
            case Guid guidValue:
                writer.WriteString(guidValue.ToString());
                return;
            case DateOnly dateOnlyValue:
                writer.WriteString(dateOnlyValue.ToString("O", CultureInfo.InvariantCulture));
                return;
            case TimeOnly timeOnlyValue:
                writer.WriteString(timeOnlyValue.ToString("O", CultureInfo.InvariantCulture));
                return;
            case Enum enumValue:
                writer.WriteString(enumValue.ToString());
                return;
            case BsonValue bsonValue:
                BsonValueSerializer.Instance.Serialize(
                    BsonSerializationContext.CreateRoot(writer),
                    new BsonSerializationArgs { NominalType = typeof(BsonValue) },
                    bsonValue);
                return;
            case IDictionary dictionary:
                WriteDictionary(writer, dictionary);
                return;
            case IEnumerable enumerable:
                WriteEnumerable(writer, enumerable);
                return;
            default:
                WritePocoAsDynamicGraph(writer, value);
                return;
        }
    }

    private static void WriteDictionary(IBsonWriter writer, IDictionary dictionary)
    {
        writer.WriteStartDocument();

        foreach (DictionaryEntry entry in dictionary)
        {
            if (entry.Key is not string key)
                throw new BsonSerializationException("Dynamic object dictionary keys must be strings.");

            writer.WriteName(key);
            WriteValue(writer, entry.Value);
        }

        writer.WriteEndDocument();
    }

    private static void WriteEnumerable(IBsonWriter writer, IEnumerable enumerable)
    {
        writer.WriteStartArray();
        foreach (var item in enumerable) WriteValue(writer, item);
        writer.WriteEndArray();
    }

    private static void WritePocoAsDynamicGraph(IBsonWriter writer, object value)
    {
        var json = PlatformJsonSerializer.SerializeWithDefaultOptions(value, useCamelCaseNaming: true);
        var dynamicGraph = PlatformJsonSerializer.DeserializeWithDefaultOptions<object>(json, useCamelCaseNaming: true);

        if (ReferenceEquals(dynamicGraph, value))
            throw new BsonSerializationException($"Could not convert dynamic object value of type '{value.GetType()}' to a BSON-compatible graph.");

        WriteValue(writer, dynamicGraph);
    }

    private static object? ConvertFromBson(BsonValue value)
    {
        switch (value.BsonType)
        {
            case BsonType.Int32:
                return value.AsInt32;
            case BsonType.Int64:
                return value.AsInt64;
            case BsonType.Double:
                return value.AsDouble;
            case BsonType.Decimal128:
                return value.AsDecimal;
            case BsonType.DateTime:
                return value.ToUniversalTime();
            case BsonType.Boolean:
                return value.AsBoolean;
            case BsonType.String:
            {
                if (DateTimeOffset.TryParse(value.AsString, out var dateTimeOffsetValue))
                    return dateTimeOffsetValue;
                if (DateTime.TryParse(value.AsString, out var dateValue))
                    return dateValue;
                return value.AsString;
            }
            case BsonType.Binary:
                return value.AsBsonBinaryData.Bytes;
            case BsonType.ObjectId:
                return value.AsObjectId.ToString();
            case BsonType.Array:
                return value
                    .AsBsonArray
                    .Select(ConvertFromBson)
                    .ToArray();
            case BsonType.Document:
                return ConvertDocument(value.AsBsonDocument);
            case BsonType.Undefined:
            case BsonType.Null:
                return null;
            default:
                return BsonTypeMapper.MapToDotNetValue(value);
        }
    }

    private static object? ConvertDocument(BsonDocument document)
    {
        if (IsLegacyValueWrapper(document) || IsLegacyCollectionWrapper(document))
            return ConvertFromBson(document["_v"]);

        return document.ToDictionary(element => element.Name, element => ConvertFromBson(element.Value));
    }

    private static bool IsLegacyValueWrapper(BsonDocument document)
        => document.ElementCount == 1 && document.GetElement(0).Name == "_v";

    private static bool IsLegacyCollectionWrapper(BsonDocument document)
    {
        return document.ElementCount == 2
               && document.Contains("_t")
               && document.Contains("_v")
               && IsSystemCollectionDiscriminator(document["_t"]);
    }

    private static bool IsSystemCollectionDiscriminator(BsonValue discriminator)
    {
        if (discriminator.IsString) return IsSystemCollectionTypeName(discriminator.AsString);

        return discriminator.IsBsonArray
               && discriminator.AsBsonArray.All(item => item.IsString)
               && discriminator.AsBsonArray.Any(item => IsSystemCollectionTypeName(item.AsString));
    }

    private static bool IsSystemCollectionTypeName(string typeName)
        => typeName.StartsWith("System.Collections.", StringComparison.Ordinal)
           || (typeName.StartsWith("System.", StringComparison.Ordinal) && typeName.Contains('[', StringComparison.Ordinal));
}

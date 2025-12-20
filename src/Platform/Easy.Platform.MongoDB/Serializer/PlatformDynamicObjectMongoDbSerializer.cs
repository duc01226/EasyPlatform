#region

using System.Collections;
using System.Text.Json;
using Easy.Platform.Common.JsonSerialization.Converters;
using Easy.Platform.MongoDB.Serializer.Abstract;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

#endregion

#pragma warning disable S907

namespace Easy.Platform.MongoDB.Serializer;

public class PlatformDynamicObjectMongoDbSerializer : ClassSerializerBase<object>, IPlatformMongoAutoRegisterBaseSerializer<object>
{
    public override object Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
    {
        return TryGetReflectionDynamic(BsonSerializer.Deserialize<BsonValue>(context.Reader));
    }

    public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, object value)
    {
        var valueToSerialize = value is JsonElement jsonElement ? PlatformObjectJsonConverter.TryGetReflectionDynamicIfJsonElement(jsonElement) : value;

        if (valueToSerialize == null)
        {
            context.Writer.WriteNull();
            return;
        }

        // Check if the value is a collection (but not a string or dictionary, which are also IEnumerable).
        // This specifically targets arrays like object[], List<object>, etc.
        // Serialize method encounters an object[], it looks up the default MongoDB serializer for object[]. This default serializer wraps each element in a document (like { "_v": "value-string" }) to handle the possibility of mixed types within the array.
        if (valueToSerialize is IEnumerable enumerable and not IDictionary and not string)
        {
            context.Writer.WriteStartArray();

            // Serialize each element in the collection. This will use the correct
            // serializer for the element's actual type (e.g., StringSerializer for a string).
            foreach (var item in enumerable) BsonSerializer.Serialize(context.Writer, item);

            context.Writer.WriteEndArray();
        }
        else
        {
            // If it's not a collection, serialize it using the default lookup logic.
            var actualType = valueToSerialize.GetType();

            var serializer = BsonSerializer.LookupSerializer(actualType);

            serializer.Serialize(context, args, valueToSerialize);
        }
    }

    private static dynamic TryGetReflectionDynamic(BsonValue dynamicObjectAsBsonValue)
    {
        switch (dynamicObjectAsBsonValue.BsonType)
        {
            case BsonType.Int32:
                return dynamicObjectAsBsonValue.AsInt32;
            case BsonType.Int64:
                return dynamicObjectAsBsonValue.AsInt64;
            case BsonType.Double:
                return dynamicObjectAsBsonValue.AsDouble;
            case BsonType.Decimal128:
                return dynamicObjectAsBsonValue.AsDecimal;
            case BsonType.DateTime:
                return dynamicObjectAsBsonValue.ToUniversalTime();
            case BsonType.Boolean:
                return dynamicObjectAsBsonValue.AsBoolean;
            case BsonType.String:
            {
                if (DateTimeOffset.TryParse(dynamicObjectAsBsonValue.AsString, out var dateTimeOffsetValue))
                    return dateTimeOffsetValue;
                if (DateTime.TryParse(dynamicObjectAsBsonValue.AsString, out var dateValue))
                    return dateValue;
                return dynamicObjectAsBsonValue.AsString;
            }
            case BsonType.Array:
                return dynamicObjectAsBsonValue
                    .AsBsonArray
                    .Select(TryGetReflectionDynamic)
                    .ToArray();
            case BsonType.Document:
            {
                var doc = dynamicObjectAsBsonValue.AsBsonDocument;

                // Check if the document is a wrapper object like { "_v": someValue }
                if (doc.ElementCount == 1 && doc.GetElement(0).Name == "_v")
                {
                    // If so, unwrap it and process the inner value.
                    return TryGetReflectionDynamic(doc.GetElement(0).Value);
                }

                // Otherwise, treat it as a regular document and convert to a dictionary.
                return doc.ToDictionary(item => item.Name, item => TryGetReflectionDynamic(item.Value));
            }
            case BsonType.Undefined:
            case BsonType.Null:
            default:
                return null;
        }
    }
}

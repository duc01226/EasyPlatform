using System;
using System.Linq;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.MongoDB.Serializer.Abstract;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Serializer
{
    public class PlatformDynamicObjectMongoDbSerializer : SerializerBase<object>, IPlatformMongoAutoRegisterBaseSerializer<object>
    {
        public override object Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
        {
            return TryGetReflectionDynamic(BsonSerializer.Deserialize<BsonValue>(context.Reader));
        }

        public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, object value)
        {
            BsonSerializer.Serialize(context.Writer, PlatformObjectJsonConverter.TryGetReflectionDynamicIfJsonElement(value));
        }

        private static dynamic TryGetReflectionDynamic(BsonValue dynamicObjectAsBsonValue)
        {
            dynamic result = null;
            switch (dynamicObjectAsBsonValue.BsonType)
            {
                case BsonType.Int32:
                {
                    result = dynamicObjectAsBsonValue.AsInt32;
                    break;
                }

                case BsonType.Int64:
                {
                    result = dynamicObjectAsBsonValue.AsInt64;
                    break;
                }

                case BsonType.Double:
                {
                    result = dynamicObjectAsBsonValue.AsDouble;
                    break;
                }

                case BsonType.Decimal128:
                {
                    result = dynamicObjectAsBsonValue.AsDecimal128;
                    break;
                }

                case BsonType.DateTime:
                {
                    result = dynamicObjectAsBsonValue.ToUniversalTime();
                    break;
                }

                case BsonType.Boolean:
                    result = dynamicObjectAsBsonValue.AsBoolean;
                    break;
                case BsonType.String:
                {
                    try
                    {
                        result = dynamicObjectAsBsonValue.AsString;
                        if (DateTimeOffset.TryParse(result, out DateTimeOffset dateTimeOffsetValue))
                        {
                            result = dateTimeOffsetValue;
                        }
                        else if (DateTime.TryParse(result, out DateTime dateValue))
                        {
                            result = dateValue;
                        }
                    }
                    catch
                    {
                        result = dynamicObjectAsBsonValue.AsString;
                    }

                    break;
                }

                case BsonType.Array:
                    result = dynamicObjectAsBsonValue
                        .AsBsonArray
                        .Select(o => TryGetReflectionDynamic(o))
                        .ToArray();
                    break;

                case BsonType.Document:
                {
                    var dynamicDocument = dynamicObjectAsBsonValue.AsBsonDocument;
                    var keyValueObject = dynamicDocument.ToDictionary(item => item.Name, item => item.Value);
                    result = keyValueObject;
                    break;
                }

                case BsonType.Undefined:
                case BsonType.Null:
                default:
                {
                    result = null;
                    break;
                }
            }

            return result;
        }
    }
}

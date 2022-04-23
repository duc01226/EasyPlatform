using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.MongoDB.Serializer.Abstract;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo.Serializers
{
    /// <summary>
    /// Example implement a custom serializer for any data type.
    /// This will be registered automatically via <see cref="IPlatformMongoBaseSerializer"/>
    /// </summary>
    public class ExampleColorSerializer : StructSerializerBase<Color>, IPlatformMongoBaseSerializer<Color>
    {
        public override Color Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
        {
            return JsonSerializer.Deserialize<Color>(context.Reader.ReadString());
        }

        public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, Color value)
        {
            context.Writer.WriteString(JsonSerializer.Serialize(value));
        }
    }
}

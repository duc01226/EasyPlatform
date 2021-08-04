using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MongoDB.Bson.Serialization;

namespace AngularDotnetPlatform.Platform.MongoDB.Serializer
{
    public interface IPlatformMongoBaseSerializer : IBsonSerializer
    {
    }

    public interface IPlatformMongoBaseSerializer<TValue> : IBsonSerializer<TValue>, IPlatformMongoBaseSerializer
    {
    }
}

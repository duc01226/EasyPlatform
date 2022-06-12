using System;
using System.Linq;
using Easy.Platform.Domain.Entities;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Mapping
{
    /// <summary>
    /// This interface is used for conventional register class mapping via PlatformMongoDbPersistenceModule.AutoRegisterAllClassMap
    /// </summary>
    public interface IPlatformMongoClassMapping
    {
    }

    /// <summary>
    /// Used to map any entity which is inherited from <see cref="IEntity{TPrimaryKey}"/>
    /// </summary>
    public abstract class PlatformMongoClassMapping<TEntity, TPrimaryKey> : IPlatformMongoClassMapping
        where TEntity : IEntity<TPrimaryKey>
    {
        public PlatformMongoClassMapping()
        {
            if (!BsonClassMap.IsClassMapRegistered(typeof(TEntity)))
            {
                BsonClassMap.RegisterClassMap<TEntity>(ClassMapInitializer);
            }
        }

        public virtual void ClassMapInitializer(BsonClassMap<TEntity> cm)
        {
            cm.AutoMap();
            cm.SetDiscriminatorIsRequired(true);
            cm.MapIdProperty(p => p.Id);
            cm.SetIgnoreExtraElements(true);
        }

        public static void MapAllEnumToString<T>(BsonClassMap<T> classMap)
        {
            foreach (var bsonMemberMap in classMap.DeclaredMemberMaps.Where(p => p.MemberType.IsEnum))
            {
                bsonMemberMap.SetSerializer((IBsonSerializer)Activator.CreateInstance(
                    type: typeof(EnumSerializer<>).MakeGenericType(bsonMemberMap.MemberType),
                    args: new object[] { BsonType.String }));
            }
        }
    }
}

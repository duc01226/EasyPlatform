using Easy.Platform.Domain.Entities;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Mapping;

/// <summary>
/// This interface is used for conventional register class mapping via PlatformMongoDbPersistenceModule.AutoRegisterAllClassMap
/// </summary>
public interface IPlatformMongoClassMapping
{
}

public abstract class PlatformMongoClassMapping
{
    public static void ApplyEnumAsStringMappingConvention<TEntity>(BsonClassMap<TEntity> cm)
    {
        foreach (var bsonMemberMap in cm.DeclaredMemberMaps)
            if (bsonMemberMap.MemberType.IsEnum)
            {
                bsonMemberMap.SetSerializer(
                    (IBsonSerializer)Activator.CreateInstance(
                        type: typeof(EnumSerializer<>).MakeGenericType(bsonMemberMap.MemberType),
                        args: new object[]
                        {
                            BsonType.String
                        }));
            }
            else
            {
                var underlyingNullableType = Nullable.GetUnderlyingType(bsonMemberMap.MemberType);

                // if It's nullable enum
                if (underlyingNullableType != null && underlyingNullableType.IsEnum)
                {
                    var enumType = underlyingNullableType;

                    bsonMemberMap.SetSerializer(
                        (IBsonSerializer)Activator.CreateInstance(
                            type: typeof(NullableSerializer<>).MakeGenericType(enumType),
                            args: new[]
                            {
                                Activator.CreateInstance(
                                    type: typeof(EnumSerializer<>).MakeGenericType(enumType),
                                    args: new object[]
                                    {
                                        BsonType.String
                                    })
                            }));
                }
            }
    }

    public static void ApplyGuidAsStringMappingConvention<TEntity>(BsonClassMap<TEntity> cm)
    {
        foreach (var bsonMemberMap in cm.DeclaredMemberMaps)
            if (bsonMemberMap.MemberType == typeof(Guid))
                bsonMemberMap.SetSerializer(
                    (IBsonSerializer)Activator.CreateInstance(
                        type: typeof(GuidSerializer),
                        args: new object[]
                        {
                            BsonType.String
                        }));
            else if (bsonMemberMap.MemberType == typeof(Guid?))
                bsonMemberMap.SetSerializer(
                    (IBsonSerializer)Activator.CreateInstance(
                        type: typeof(NullableSerializer<Guid>),
                        args: new object[]
                        {
                            new GuidSerializer(BsonType.String)
                        }));
    }
}

/// <summary>
/// Used to map any entity which is inherited from <see cref="IEntity{TPrimaryKey}"/>
/// </summary>
public abstract class PlatformMongoClassMapping<TEntity, TPrimaryKey> : PlatformMongoClassMapping,
    IPlatformMongoClassMapping
    where TEntity : IEntity<TPrimaryKey>
{
    public PlatformMongoClassMapping()
    {
        if (!BsonClassMap.IsClassMapRegistered(typeof(TEntity)))
            BsonClassMap.RegisterClassMap<TEntity>(ClassMapInitializer);
    }

    public virtual void ClassMapInitializer(BsonClassMap<TEntity> cm)
    {
        cm.AutoMap();
        cm.SetDiscriminatorIsRequired(true);
        cm.MapIdProperty(p => p.Id);
        cm.SetIgnoreExtraElements(true);
    }
}

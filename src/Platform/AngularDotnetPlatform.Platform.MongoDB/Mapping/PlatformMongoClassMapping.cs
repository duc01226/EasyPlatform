using AngularDotnetPlatform.Platform.Domain.Entities;
using MongoDB.Bson.Serialization;

namespace AngularDotnetPlatform.Platform.MongoDB.Mapping
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
}

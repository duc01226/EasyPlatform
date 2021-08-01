using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.Entities;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.IdGenerators;

namespace AngularDotnetPlatform.Platform.MongoDB.Mapping
{
    /// <summary>
    /// This interface is used for conventional register class mapping via PlatformMongoDbPersistenceModule.AutoRegisterAllClassMap
    /// </summary>
    public interface IPlatformMongoClassMapping
    {
    }

    public abstract class PlatformMongoClassMapping<TEntity, TPrimaryKey> : IPlatformMongoClassMapping
        where TEntity : IEntity<TPrimaryKey>
    {
        public PlatformMongoClassMapping()
        {
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

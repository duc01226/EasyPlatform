using System;
using AngularDotnetPlatform.Platform.Domain.Entities;
using MongoDB.Bson.Serialization;

namespace AngularDotnetPlatform.Platform.MongoDB.Mapping
{
    /// <summary>
    /// Used to map any entity which is inherited from <see cref="Entity{TEntity,TPrimaryKey}"/>
    /// </summary>
    public abstract class PlatformMongoBaseEntityClassMapping<TEntity, TPrimaryKey> : IPlatformMongoClassMapping
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        public static void RegisterBaseEntityClassMapping(Action<BsonClassMap<Entity<TEntity, TPrimaryKey>>> classMapInitializer = null)
        {
            if (!BsonClassMap.IsClassMapRegistered(typeof(Entity<TEntity, TPrimaryKey>)))
                BsonClassMap.RegisterClassMap(classMapInitializer ?? DefaultBaseEntityClassMapInitializer);
        }

        public static void DefaultBaseEntityClassMapInitializer(BsonClassMap<Entity<TEntity, TPrimaryKey>> cm)
        {
            cm.AutoMap();
            cm.SetDiscriminatorIsRequired(true);
            cm.MapIdProperty(p => p.Id);
            cm.SetIgnoreExtraElements(true);
        }

        public PlatformMongoBaseEntityClassMapping()
        {
            if (!BsonClassMap.IsClassMapRegistered(typeof(Entity<TEntity, TPrimaryKey>)))
                BsonClassMap.RegisterClassMap<Entity<TEntity, TPrimaryKey>>(BaseEntityClassMapInitializer);
            if (!BsonClassMap.IsClassMapRegistered(typeof(TEntity)))
                BsonClassMap.RegisterClassMap<TEntity>(ClassMapInitializer);
        }

        public virtual void BaseEntityClassMapInitializer(BsonClassMap<Entity<TEntity, TPrimaryKey>> cm)
        {
            DefaultBaseEntityClassMapInitializer(cm);
        }

        public virtual void ClassMapInitializer(BsonClassMap<TEntity> cm)
        {
            cm.AutoMap();
            cm.SetDiscriminatorIsRequired(true);
            cm.SetIgnoreExtraElements(true);
        }
    }
}

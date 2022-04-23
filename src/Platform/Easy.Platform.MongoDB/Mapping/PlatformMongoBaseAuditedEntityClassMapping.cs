using Easy.Platform.Domain.Entities;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.MongoDB.Mapping
{
    /// <summary>
    /// Used to map any entity which is inherited from <see cref="AuditedEntity{TEntity,TPrimaryKey,TUserId}"/>
    /// </summary>
    public abstract class PlatformMongoBaseAuditedEntityClassMapping<TEntity, TPrimaryKey, TUserId> : IPlatformMongoClassMapping
        where TEntity : AuditedEntity<TEntity, TPrimaryKey, TUserId>, new()
    {
        public PlatformMongoBaseAuditedEntityClassMapping()
        {
            BsonClassMap.RegisterClassMap<Entity<TEntity, TPrimaryKey>>(BaseEntityClassMapInitializer);
            BsonClassMap.RegisterClassMap<AuditedEntity<TEntity, TPrimaryKey, TUserId>>(BaseAuditedEntityClassMapInitializer);
            BsonClassMap.RegisterClassMap<TEntity>(ClassMapInitializer);
        }

        public virtual void BaseEntityClassMapInitializer(BsonClassMap<Entity<TEntity, TPrimaryKey>> cm)
        {
            cm.AutoMap();
            cm.SetDiscriminatorIsRequired(true);
            cm.MapIdProperty(p => p.Id);
            cm.SetIgnoreExtraElements(true);
        }

        public virtual void BaseAuditedEntityClassMapInitializer(BsonClassMap<AuditedEntity<TEntity, TPrimaryKey, TUserId>> cm)
        {
            cm.AutoMap();
            cm.SetDiscriminatorIsRequired(true);
            cm.SetIgnoreExtraElements(true);
        }

        public virtual void ClassMapInitializer(BsonClassMap<TEntity> cm)
        {
            cm.AutoMap();
            cm.SetDiscriminatorIsRequired(true);
            cm.SetIgnoreExtraElements(true);
        }
    }
}

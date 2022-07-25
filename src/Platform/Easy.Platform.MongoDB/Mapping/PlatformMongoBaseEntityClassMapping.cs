using Easy.Platform.Domain.Entities;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.MongoDB.Mapping;

public abstract class PlatformMongoBaseEntityClassMapping : PlatformMongoClassMapping
{
    public static void RegisterBaseEntityClassMapping<TEntity, TPrimaryKey>(
        Action<BsonClassMap<Entity<TEntity, TPrimaryKey>>> classMapInitializer,
        bool autoApplyGuidAsStringMappingConvention,
        bool autoApplyEnumAsStringMappingConvention) where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        if (!BsonClassMap.IsClassMapRegistered(typeof(Entity<TEntity, TPrimaryKey>)))
            BsonClassMap.RegisterClassMap(
                classMapInitializer ??
                (cm => DefaultBaseEntityClassMapInitializer(
                    cm,
                    autoApplyGuidAsStringMappingConvention,
                    autoApplyEnumAsStringMappingConvention)));
    }

    public static void DefaultBaseEntityClassMapInitializer<TEntity, TPrimaryKey>(
        BsonClassMap<Entity<TEntity, TPrimaryKey>> cm,
        bool autoApplyGuidAsStringMappingConvention,
        bool autoApplyEnumAsStringMappingConvention) where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        cm.AutoMap();
        cm.SetDiscriminatorIsRequired(true);
        cm.MapIdProperty(p => p.Id);
        cm.SetIgnoreExtraElements(true);
        cm.SetIsRootClass(true);
        if (autoApplyGuidAsStringMappingConvention)
            ApplyGuidAsStringMappingConvention(cm);
        if (autoApplyEnumAsStringMappingConvention)
            ApplyEnumAsStringMappingConvention(cm);
    }
}

/// <summary>
/// Used to map any entity which is inherited from <see cref="Entity{TEntity,TPrimaryKey}"/>
/// </summary>
public abstract class PlatformMongoBaseEntityClassMapping<TEntity, TPrimaryKey> : PlatformMongoBaseEntityClassMapping,
        IPlatformMongoClassMapping
    where TEntity : Entity<TEntity, TPrimaryKey>, new()
{
    public PlatformMongoBaseEntityClassMapping()
    {
        if (!BsonClassMap.IsClassMapRegistered(typeof(Entity<TEntity, TPrimaryKey>)))
            BsonClassMap.RegisterClassMap<Entity<TEntity, TPrimaryKey>>(BaseEntityClassMapInitializer);
        if (!BsonClassMap.IsClassMapRegistered(typeof(TEntity)))
            BsonClassMap.RegisterClassMap<TEntity>(ClassMapInitializer);
    }

    public virtual bool AutoApplyGuidAsStringMappingConvention => true;

    public virtual bool AutoApplyEnumAsStringMappingConvention => true;

    public virtual void BaseEntityClassMapInitializer(BsonClassMap<Entity<TEntity, TPrimaryKey>> cm)
    {
        DefaultBaseEntityClassMapInitializer(
            cm,
            AutoApplyGuidAsStringMappingConvention,
            AutoApplyEnumAsStringMappingConvention);
    }

    public virtual void ClassMapInitializer(BsonClassMap<TEntity> cm)
    {
        cm.AutoMap();
        cm.SetDiscriminatorIsRequired(true);
        cm.SetIgnoreExtraElements(true);
        if (AutoApplyGuidAsStringMappingConvention)
            ApplyGuidAsStringMappingConvention(cm);
        if (AutoApplyEnumAsStringMappingConvention)
            ApplyEnumAsStringMappingConvention(cm);
    }
}

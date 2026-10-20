using Easy.Platform.MongoDB.Mapping;
using MongoDB.Bson.Serialization;
using PlatformExampleApp.TaskManagement.Domain.Entities;

namespace PlatformExampleApp.TaskManagement.Persistence.Mongo;

/// <summary>
/// Registers the standard platform entity mapping for the aggregate and its idempotent read projection.
/// The base mapping preserves string IDs, enum-as-string values, domain-event support, and the aggregate row-version field.
/// </summary>
public sealed class TaskBoardItemEntityMongoClassMapping : PlatformMongoBaseEntityClassMapping<TaskBoardItemEntity, string>
{
}

public sealed class TaskBoardItemProjectionEntityMongoClassMapping :
    PlatformMongoBaseEntityClassMapping<TaskBoardItemProjectionEntity, string>
{
    public override void ClassMapInitializer(BsonClassMap<TaskBoardItemProjectionEntity> cm)
    {
        base.ClassMapInitializer(cm);

        // Existing documents store the aggregate token under ConcurrencyUpdateToken. Keep that meaning
        // and give the projection's independent compare-and-swap token a separate physical field.
        cm.GetMemberMap(nameof(TaskBoardItemProjectionEntity.ConcurrencyUpdateToken))
            .SetElementName("ProjectionConcurrencyUpdateToken");
        cm.GetMemberMap(nameof(TaskBoardItemProjectionEntity.TaskConcurrencyUpdateToken))
            .SetElementName("ConcurrencyUpdateToken");
    }
}

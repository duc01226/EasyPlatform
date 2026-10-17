using Easy.Platform.MongoDB.Mapping;
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
}

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.MongoDB;
using Easy.Platform.Persistence;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using PlatformExampleApp.TaskManagement.Domain.Entities;

namespace PlatformExampleApp.TaskManagement.Persistence.Mongo;

/// <summary>
/// TaskManagement's typed Mongo context. Application collections remain module-owned, while platform system collections
/// are namespaced so a shared physical database cannot accidentally merge inbox, outbox, or migration ledgers.
/// </summary>
public sealed class TaskManagementDbContext : PlatformMongoDbContext<TaskManagementDbContext>
{
    public TaskManagementDbContext(
        IPlatformMongoDatabase<TaskManagementDbContext> database,
        ILoggerFactory loggerFactory,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        PlatformPersistenceConfiguration<TaskManagementDbContext> persistenceConfiguration,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationSettingContext applicationSettingContext) : base(
        database,
        loggerFactory,
        requestContextAccessor,
        persistenceConfiguration,
        rootServiceProvider,
        applicationSettingContext)
    {
    }

    public IMongoCollection<TaskBoardItemEntity> TaskBoardItemCollection => GetCollection<TaskBoardItemEntity>();

    public IMongoCollection<TaskBoardItemProjectionEntity> TaskBoardItemProjectionCollection =>
        GetCollection<TaskBoardItemProjectionEntity>();

    protected override string PlatformSystemCollectionNamePrefix =>
        TaskManagementMongoPersistenceModule.SYSTEM_COLLECTION_NAME_PREFIX;

    public override async Task InternalEnsureIndexesAsync(bool recreate = false)
    {
        if (recreate)
            await Task.WhenAll(
                TaskBoardItemCollection.Indexes.DropAllAsync(),
                TaskBoardItemProjectionCollection.Indexes.DropAllAsync());

        // Indexes exist only for real query shapes:
        // - The aggregate is read and written by Id (the optimistic-concurrency update filter is Id + token), so the
        //   default _id index covers it; no secondary aggregate index is needed.
        // - The projection is looked up by TaskId and listed ordered by TaskId; the unique TaskId index serves both and
        //   also turns a concurrent double insert into a duplicate-key failure that platform retry converges.
        await TaskBoardItemProjectionCollection.Indexes.CreateOneAsync(
            new CreateIndexModel<TaskBoardItemProjectionEntity>(
                Builders<TaskBoardItemProjectionEntity>.IndexKeys.Ascending(projection => projection.TaskId),
                new CreateIndexOptions { Unique = true, Name = "UX_TaskBoardItemProjection_TaskId" }));
    }

    public override List<KeyValuePair<Type, string>> EntityTypeToCollectionNameMaps()
    {
        return
        [
            new KeyValuePair<Type, string>(typeof(TaskBoardItemEntity), "TaskBoardItemEntity"),
            new KeyValuePair<Type, string>(typeof(TaskBoardItemProjectionEntity), "TaskBoardItemProjectionEntity")
        ];
    }
}

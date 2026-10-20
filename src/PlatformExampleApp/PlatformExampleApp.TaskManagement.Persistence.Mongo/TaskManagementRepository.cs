using System;
using Easy.Platform.Domain.Entities;
using Easy.Platform.MongoDB.Domain.Repositories;
using PlatformExampleApp.TaskManagement.Domain.Repositories;

namespace PlatformExampleApp.TaskManagement.Persistence.Mongo;

/// <summary>
/// TaskManagement's provider adapter. The projection write capability is exposed through the module-owned additive port;
/// application query handlers still depend on the query-only base contract.
/// </summary>
internal sealed class TaskManagementRepository<TEntity> :
    PlatformMongoDbRepository<TEntity, string, TaskManagementDbContext>,
    ITaskManagementProjectionRepository<TEntity>
    where TEntity : class, IEntity<string>, new()
{
    public TaskManagementRepository(IServiceProvider serviceProvider) : base(serviceProvider)
    {
    }
}

internal sealed class TaskManagementRootRepository<TEntity> :
    PlatformMongoDbRootRepository<TEntity, string, TaskManagementDbContext>,
    ITaskManagementRootRepository<TEntity>
    where TEntity : class, IRootEntity<string>, new()
{
    public TaskManagementRootRepository(IServiceProvider serviceProvider) : base(serviceProvider)
    {
    }
}

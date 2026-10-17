using System;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Repositories;
using PlatformExampleApp.TaskManagement.Domain.Entities;

namespace PlatformExampleApp.TaskManagement.Domain.Repositories;

/// <summary>
/// TaskManagement-owned query repository port. Persistence adapters implement this contract;
/// application code never reaches a provider-specific repository or another module's repository.
/// </summary>
/// <typeparam name="TEntity">The TaskManagement entity type, including read-side projections.</typeparam>
public interface ITaskManagementRepository<TEntity> : IPlatformQueryableRepository<TEntity, string>
    where TEntity : class, IEntity<string>, new()
{
}

/// <summary>
/// TaskManagement-owned write port for non-root read projections. Keeping this separate from the query port prevents
/// query handlers from accidentally acquiring mutation capability while still allowing event handlers to use the
/// platform repository implementation through a module-specific contract.
/// </summary>
public interface ITaskManagementProjectionRepository<TEntity> : ITaskManagementRepository<TEntity>
    where TEntity : class, IEntity<string>, new()
{
    Task<TEntity> CreateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default);

    Task<TEntity> CreateOrUpdateAsync(
        TEntity entity,
        Expression<Func<TEntity, bool>> customCheckExistingPredicate,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// TaskManagement-owned root repository port. Persistence adapters implement this contract;
/// application code never reaches a provider-specific repository or another module's repository.
/// </summary>
/// <typeparam name="TEntity">The TaskManagement aggregate-root type.</typeparam>
public interface ITaskManagementRootRepository<TEntity> : IPlatformQueryableRootRepository<TEntity, string>
    where TEntity : class, IRootEntity<string>, new()
{
}

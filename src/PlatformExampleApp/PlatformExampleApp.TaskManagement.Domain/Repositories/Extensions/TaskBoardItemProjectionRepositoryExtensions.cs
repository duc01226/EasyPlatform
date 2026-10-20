using System;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Common.Validations.Extensions;
using PlatformExampleApp.TaskManagement.Domain.Entities;

namespace PlatformExampleApp.TaskManagement.Domain.Repositories.Extensions;

/// <summary>
/// The single write path for <see cref="TaskBoardItemProjectionEntity" />. Every projection writer (the local entity
/// event handler and the transport consumer) calls this one method, so the read-then-upsert-by-TaskId rule is owned
/// once. The "what should the row become" decision lives on the entity (<see cref="TaskBoardItemProjectionEntity.Converge" />).
/// </summary>
/// <remarks>
/// Missing rows use insert-only writes; existing rows retain their captured projection version for optimistic
/// concurrency. Duplicate-key and version conflicts flow to the callers' bounded platform retry, which re-reads and
/// recomputes the entire operation. Reading the aggregate after the projection ensures a stale aggregate cannot be
/// paired with a newer projection version and overwrite a later local update.
/// </remarks>
public static class TaskBoardItemProjectionRepositoryExtensions
{
    /// <summary>
    /// Converges the stored projection for one task and writes it only when it changed.
    /// </summary>
    /// <param name="repository">The TaskManagement projection write port.</param>
    /// <param name="taskId">The task whose projection is converged.</param>
    /// <param name="createdEvent">The creation event being delivered, or null for a state-only delivery.</param>
    /// <param name="loadCurrentTaskState">Loads committed state after the projection read; null for transport-only delivery.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The converged projection, or null when there is nothing to project yet.</returns>
    public static async Task<TaskBoardItemProjectionEntity> UpsertTaskBoardItemProjectionAsync(
        this ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity> repository,
        string taskId,
        TaskBoardItemCreatedDomainEvent createdEvent,
        Func<CancellationToken, Task<TaskBoardItemEntity>> loadCurrentTaskState,
        CancellationToken cancellationToken = default)
    {
        var existingProjection = await repository.FirstOrDefaultAsync(
            TaskBoardItemProjectionEntity.ByTaskIdExpr(taskId),
            cancellationToken);
        var currentTaskState = loadCurrentTaskState == null
            ? null
            : await loadCurrentTaskState(cancellationToken);

        var projection = TaskBoardItemProjectionEntity
            .Converge(existingProjection, createdEvent, currentTaskState, out var hasChanges)
            .EnsureValid();

        if (projection == null || !hasChanges)
            return projection;

        if (existingProjection == null)
            return await repository.CreateAsync(projection, dismissSendEvent: true, cancellationToken: cancellationToken);

        return await repository.CreateOrUpdateAsync(
            projection,
            customCheckExistingPredicate: TaskBoardItemProjectionEntity.ByTaskIdExpr(taskId),
            dismissSendEvent: true,
            cancellationToken: cancellationToken);
    }
}

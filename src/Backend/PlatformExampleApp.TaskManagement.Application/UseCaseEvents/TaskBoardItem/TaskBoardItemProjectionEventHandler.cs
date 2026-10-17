using System;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;
using PlatformExampleApp.TaskManagement.Domain.Repositories.Extensions;

namespace PlatformExampleApp.TaskManagement.Application.UseCaseEvents.TaskBoardItem;

/// <summary>
/// The owner of the TaskManagement read projection's state. Creation materializes the projection and every later
/// aggregate change (for example a status change) applies the current aggregate state (title, status, concurrency
/// token) to the same per-task row. It works without messaging, so a standalone host with the bus disabled still
/// has a correct read model.
/// </summary>
/// <remarks>
/// Handlers run after the source unit of work commits and may run in the background, so two events for one task can
/// be handled out of order. The handler therefore reloads the latest committed aggregate instead of trusting the event
/// snapshot: whichever event is handled last writes the newest state, and an older event cannot regress the row.
/// <see cref="TaskBoardItemProjectionRepositoryExtensions.UpsertTaskBoardItemProjectionAsync" /> is the shared write
/// path (also used by the transport consumer).
/// </remarks>
internal class TaskBoardItemProjectionEventHandler
    : PlatformCqrsEntityEventApplicationHandler<TaskBoardItemEntity>
{
    private readonly ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity> projectionRepository;
    private readonly ITaskManagementRootRepository<TaskBoardItemEntity> taskBoardItemRepository;

    public TaskBoardItemProjectionEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity> projectionRepository,
        ITaskManagementRootRepository<TaskBoardItemEntity> taskBoardItemRepository)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.projectionRepository = projectionRepository;
        this.taskBoardItemRepository = taskBoardItemRepository;
    }

    /// <summary>
    /// The internal projection is not persisted through the process-wide inbox. Its own typed repository/UoW is the
    /// ownership boundary; the external transport path has a separate keyed inbox consumer.
    /// </summary>
    public override bool EnableInboxEventBusMessage => false;

    public override Task<bool> HandleWhen(PlatformCqrsEntityEvent<TaskBoardItemEntity> @event)
    {
        return Task.FromResult(
            TaskBoardItemCreatedDomainEvent.FindIn(@event) != null ||
            (@event.CrudAction == PlatformCqrsEntityEventCrudAction.Updated && @event.EntityData != null));
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<TaskBoardItemEntity> @event,
        CancellationToken cancellationToken)
    {
        var createdEvent = TaskBoardItemCreatedDomainEvent.FindIn(@event);

        var taskId = createdEvent?.TaskId ?? @event.EntityData?.Id;

        if (string.IsNullOrWhiteSpace(taskId))
            return;

        // An update for a task with no projection has nothing to correct: the creation delivery materializes the row
        // and, because it also reloads the latest aggregate, it already carries any earlier update.
        await projectionRepository.UpsertTaskBoardItemProjectionAsync(
            taskId,
            createdEvent,
            // The shared writer captures the projection version before loading the latest aggregate. A concurrent
            // projection write then conflicts instead of letting an old aggregate overwrite the newer row.
            async ct => await taskBoardItemRepository.FirstOrDefaultAsync(item => item.Id == taskId, ct) ?? @event.EntityData,
            cancellationToken);
    }
}

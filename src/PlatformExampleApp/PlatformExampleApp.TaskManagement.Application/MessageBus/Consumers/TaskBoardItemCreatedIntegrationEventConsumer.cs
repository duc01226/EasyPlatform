using System;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Common;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Contracts.Messages;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;
using PlatformExampleApp.TaskManagement.Domain.Repositories.Extensions;

namespace PlatformExampleApp.TaskManagement.Application.MessageBus.Consumers;

/// <summary>
/// Consumes the TaskManagement creation contract through the module's keyed inbox lane.
/// </summary>
/// <remarks>
/// Role: this consumer is a DEMONSTRATION of the cross-module transport path (keyed outbox, broker, keyed inbox,
/// consumer). In a real system the consumer of <see cref="TaskBoardItemCreatedIntegrationEvent" /> would live in another
/// module; TaskManagement consumes its own event only so the example proves the keyed lane end to end in one module.
/// The local <c>TaskBoardItemProjectionEventHandler</c> remains the owner of projection state.
/// <para>
/// Because both paths can write the same row, they share one write path
/// (<see cref="TaskBoardItemProjectionRepositoryExtensions.UpsertTaskBoardItemProjectionAsync" />). The contract carries no
/// aggregate state token, so this consumer only materializes a MISSING projection and never overwrites an existing one;
/// replay, duplicate delivery, and a concurrent local write all converge on one row per TaskId.
/// </para>
/// </remarks>
internal class TaskBoardItemCreatedIntegrationEventConsumer
    : PlatformApplicationMessageBusConsumer<TaskBoardItemCreatedIntegrationEvent>
{
    private readonly ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity> projectionRepository;

    public TaskBoardItemCreatedIntegrationEventConsumer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity> projectionRepository)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.projectionRepository = projectionRepository;
    }

    protected override PlatformMessageBusStoreKey MessageBusStoreKey => TaskManagementApplicationModule.MessageBusStoreKeyInstance;

    protected override string MessageBusApplicationName => TaskManagementApplicationModule.MessageBusApplicationNameValue;

    public override async Task HandleLogicAsync(
        TaskBoardItemCreatedIntegrationEvent message,
        string routingKey)
    {
        var createdEvent = new TaskBoardItemCreatedDomainEvent
        {
            SourceEventId = message.TrackingId,
            TaskId = message.TaskId,
            Title = message.Title,
            Status = ParseStatus(message.Status)
        };

        await projectionRepository.UpsertTaskBoardItemProjectionAsync(
            createdEvent.TaskId,
            createdEvent,
            loadCurrentTaskState: null,
            CancellationToken.None);
    }

    private static TaskBoardItemStatus ParseStatus(string statusValue)
    {
        return PlatformValidationResult
            .Validate(
                Enum.TryParse<TaskBoardItemStatus>(statusValue, true, out var parsedStatus) ? parsedStatus : default,
                Enum.IsDefined(parsedStatus),
                "Task status is not supported")
            .EnsureValid();
    }
}

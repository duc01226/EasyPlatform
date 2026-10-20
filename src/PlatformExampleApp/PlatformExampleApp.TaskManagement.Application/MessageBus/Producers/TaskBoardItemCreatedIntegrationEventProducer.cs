using System;
using System.Linq;
using System.Threading.Tasks;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Contracts.Messages;
using PlatformExampleApp.TaskManagement.Domain.Entities;

namespace PlatformExampleApp.TaskManagement.Application.MessageBus.Producers;

/// <summary>
/// Maps the internal TaskManagement creation event to the extraction-ready transport contract.
/// The source domain-event identity is carried as the message TrackingId so outbox identity and consumer replay
/// identity remain stable without coupling the contract to the domain event type.
/// </summary>
internal class TaskBoardItemCreatedIntegrationEventProducer
    : PlatformCqrsEventBusMessageProducer<
        PlatformCqrsEntityEvent<TaskBoardItemEntity>,
        TaskBoardItemCreatedIntegrationEvent>
{
    public TaskBoardItemCreatedIntegrationEventProducer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationBusMessageProducer applicationBusMessageProducer)
        : base(
            loggerFactory,
            unitOfWorkManager,
            serviceProvider,
            rootServiceProvider,
            applicationBusMessageProducer)
    {
    }

    protected override PlatformMessageBusStoreKey MessageBusStoreKey => TaskManagementApplicationModule.MessageBusStoreKeyInstance;

    protected override string MessageBusApplicationName => TaskManagementApplicationModule.MessageBusApplicationNameValue;

    public override Task<bool> HandleWhen(PlatformCqrsEntityEvent<TaskBoardItemEntity> @event)
    {
        return Task.FromResult(TaskBoardItemCreatedDomainEvent.FindIn(@event) != null);
    }

    protected override TaskBoardItemCreatedIntegrationEvent BuildMessage(
        PlatformCqrsEntityEvent<TaskBoardItemEntity> @event)
    {
        var createdEvent = TaskBoardItemCreatedDomainEvent.FindIn(@event)
            ?? throw new InvalidOperationException(
                $"The {nameof(TaskBoardItemCreatedIntegrationEvent)} producer requires a TaskBoardItemCreatedDomainEvent.");

        return new TaskBoardItemCreatedIntegrationEvent
        {
            TrackingId = createdEvent.SourceEventId,
            CreatedUtcDate = DateTime.UtcNow,
            ProduceFrom = MessageBusApplicationName,
            RequestContext = @event.RequestContext ?? [],
            TaskId = createdEvent.TaskId,
            Title = createdEvent.Title,
            Status = createdEvent.Status.ToString()
        };
    }
}

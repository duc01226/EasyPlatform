#region

using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseEvents;

internal sealed class DemoBulkEntitiesEventHandler : PlatformCqrsBulkEntitiesEventApplicationHandler<TextSnippetEntity, string>
{
    public DemoBulkEntitiesEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider) : base(
        loggerFactory,
        unitOfWorkManager,
        serviceProvider,
        rootServiceProvider)
    {
    }

    protected override Task HandleAsync(PlatformCqrsBulkEntitiesEvent<TextSnippetEntity, string> @event, CancellationToken cancellationToken)
    {
        return Task.Run(
            () =>
            {
                @event.Entities.ForEach(entity =>
                {
                    Console.WriteLine(
                        $"EntityId {entity.Id} is {@event.CrudAction}. DomainEvents: {@event.DomainEvents.GetValueOrDefault(entity.Id)?.ToFormattedJson() ?? "null"}");
                });
            },
            cancellationToken);
    }
}

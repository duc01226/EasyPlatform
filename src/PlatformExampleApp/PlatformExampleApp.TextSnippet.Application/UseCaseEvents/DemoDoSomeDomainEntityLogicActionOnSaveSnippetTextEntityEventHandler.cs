using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseEvents;

internal sealed class DemoDoSomeDomainEntityLogicActionOnSaveSnippetTextEntityEventHandler : PlatformCqrsEntityEventApplicationHandler<TextSnippetEntity>
{
    public DemoDoSomeDomainEntityLogicActionOnSaveSnippetTextEntityEventHandler(
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

    // Default is true to improve performance when command save, the event is executed separately and could be in parallel.
    // Set it to false if you want the event executed sync with the command and in order
    // protected override bool MustWaitHandlerExecutionFinishedImmediately() => true;

    // Can override to return False to TURN OFF support for store cqrs event handler as inbox
    // protected override bool EnableInboxEventBusMessage => false;

    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<TextSnippetEntity> @event)
    {
        return true;
    }

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<TextSnippetEntity> @event, CancellationToken cancellationToken)
    {
        // Test slow event do not affect main command
        await Task.Delay(5.Seconds(), cancellationToken);

        var encryptSnippetTextEvent = @event
            .FindEvents<TextSnippetEntity.EncryptSnippetTextDomainEvent>()
            .FirstOrDefault();

        if (encryptSnippetTextEvent != null &&
            (@event.CrudAction == PlatformCqrsEntityEventCrudAction.Created || @event.CrudAction == PlatformCqrsEntityEventCrudAction.Updated))
        {
            // Demo handle domain entity event which is more specific than just CRUD operation
        }
    }
}

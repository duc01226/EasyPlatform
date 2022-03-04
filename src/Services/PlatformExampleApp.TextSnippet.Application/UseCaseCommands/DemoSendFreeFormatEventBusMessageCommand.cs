using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using PlatformExampleApp.TextSnippet.Application.EventBus.FreeFormatMessages;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands
{
    public class DemoSendFreeFormatEventBusMessageCommand : PlatformCqrsCommand<DemoSendFreeFormatEventBusMessageCommandResult>
    {
        public string Property1 { get; set; }
        public int Property2 { get; set; }
    }

    public class DemoSendFreeFormatEventBusMessageCommandResult : PlatformCqrsCommandResult
    {
    }

    public class DemoSendFreeFormatEventBusMessageCommandHandler :
        PlatformCqrsCommandApplicationHandler<DemoSendFreeFormatEventBusMessageCommand, DemoSendFreeFormatEventBusMessageCommandResult>
    {
        private readonly IPlatformEventBusProducer eventBusProducer;

        public DemoSendFreeFormatEventBusMessageCommandHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs,
            IPlatformEventBusProducer eventBusProducer) : base(userContext, unitOfWorkManager, cqrs)
        {
            this.eventBusProducer = eventBusProducer;
        }

        protected override async Task<DemoSendFreeFormatEventBusMessageCommandResult> HandleAsync(
            DemoSendFreeFormatEventBusMessageCommand request,
            CancellationToken cancellationToken)
        {
            await eventBusProducer.SendFreeFormatMessageAsync(
                new DemoSendFreeFormatEventBusMessage()
                {
                    Property1 = request.Property1,
                    Property2 = request.Property2
                },
                cancellationToken);
            return new DemoSendFreeFormatEventBusMessageCommandResult();
        }
    }
}

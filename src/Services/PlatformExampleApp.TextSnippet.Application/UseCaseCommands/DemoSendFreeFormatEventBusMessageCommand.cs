using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.BackgroundJob;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using PlatformExampleApp.TextSnippet.Domain.DomainServices;

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
        PlatformCqrsCommandHandler<DemoSendFreeFormatEventBusMessageCommand, DemoSendFreeFormatEventBusMessageCommandResult>
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
            await eventBusProducer.SendFreeFormatMessageAsync(request, cancellationToken);
            return new DemoSendFreeFormatEventBusMessageCommandResult();
        }
    }
}

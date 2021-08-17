using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Producers.CommandEventBusProducers
{
    public class SaveTextSnippetCommandEventBusProducer : PlatformCqrsCommandEventBusProducer<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
    {
        public SaveTextSnippetCommandEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformEventBusProducer eventBusProducer,
            IPlatformApplicationSettingContext applicationSettingContext,
            IPlatformApplicationUserContextAccessor userContextAccessor,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, eventBusProducer, applicationSettingContext, userContextAccessor, loggerFactory)
        {
        }
    }
}

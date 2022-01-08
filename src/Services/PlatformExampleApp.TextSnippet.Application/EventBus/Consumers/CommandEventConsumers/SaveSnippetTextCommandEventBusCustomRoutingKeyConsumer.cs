using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Common.JsonSerialization;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.CommandEventConsumers
{
    [PlatformEventBusConsumer(PlatformCqrsCommandEvent.EventTypeValue, "CustomRoutingKeyForFlexibleMigrateWithOldSystem")]
    public class SaveSnippetTextCommandEventBusCustomRoutingKeyConsumer : PlatformInboxCqrsCommandEventBusConsumer<SaveSnippetTextCommand>
    {
        public SaveSnippetTextCommandEventBusCustomRoutingKeyConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message)
        {
            return Task.Run(() =>
            {
                Logger.LogInformation($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            });
        }
    }
}

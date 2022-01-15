using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Common.JsonSerialization;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.CommandEventConsumers
{
    [PlatformEventBusConsumer(PlatformCqrsCommandEvent.EventTypeValue, "CustomRoutingKeyForFlexibleMigrateWithOldSystem")]
    public class SaveSnippetTextCommandEventBusCustomRoutingKeyAndFreeFormatMessageConsumer : PlatformInboxEventBusFreeFormatMessageConsumer<PlatformEventBusMessage<SaveSnippetTextCommand>>
    {
        public SaveSnippetTextCommandEventBusCustomRoutingKeyAndFreeFormatMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message, string routingKey)
        {
            return Task.Run(() =>
            {
                Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            });
        }
    }
}

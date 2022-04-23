using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.Consumers;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Easy.Platform.Common.JsonSerialization;
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

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message, string routingKey)
        {
            return Task.Run(() =>
            {
                Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            });
        }
    }
}

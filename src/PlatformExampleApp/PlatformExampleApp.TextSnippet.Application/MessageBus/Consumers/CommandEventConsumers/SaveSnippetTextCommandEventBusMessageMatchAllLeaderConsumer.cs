using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Timing;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Consumers.CommandEventConsumers
{
    /// <summary>
    /// We use MatchAllPatternValue for producer context when consumer is leader
    /// </summary>
    [PlatformMessageBusConsumer(
        PlatformCqrsCommandEvent.EventTypeValue,
        PlatformMessageBusConsumerAttribute.MatchAllPatternValue,
        "SaveSnippetTextCommand")]
    public class
        SaveSnippetTextCommandEventBusMessageMatchAllLeaderConsumer : PlatformCqrsCommandEventBusMessageConsumer<
            SaveSnippetTextCommand>
    {
        public SaveSnippetTextCommandEventBusMessageMatchAllLeaderConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(
            PlatformBusMessage<SaveSnippetTextCommand> message,
            string routingKey)
        {
            if (message.CreatedUtcDate.AddSeconds(5) > Clock.UtcNow)
                throw new Exception(
                    "Test requeue message mechanism. Consumer temporarily failed for first 5 seconds from the created date of message");

            Logger.LogInformationIfEnabled(
                $"{GetType().FullName} has handled message. Message Detail: ${PlatformJsonSerializer.Serialize(message)}");
            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        // Set AutoSaveInboxMessage = false to test requeue works because message is not saved as inbox => throw ex => requeue message
        public override bool AutoSaveInboxMessage => false;
    }
}

using System;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.Consumers;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Timing;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.CommandEventConsumers
{
    /// <summary>
    /// We use MatchAllPatternValue for producer context when consumer is leader
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsCommandEvent.EventTypeValue, PlatformEventBusConsumerAttribute.MatchAllPatternValue, "SaveSnippetTextCommand")]
    public class SaveSnippetTextCommandEventBusMatchAllLeaderConsumer : PlatformCqrsCommandEventBusConsumer<SaveSnippetTextCommand>
    {
        public SaveSnippetTextCommandEventBusMatchAllLeaderConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message, string routingKey)
        {
            if (message.CreatedUtcDate.AddSeconds(5) > Clock.UtcNow)
                throw new Exception("Test requeue message mechanism. Consumer temporarily failed for first 5 seconds from the created date of message");

            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            return Task.CompletedTask;
        }
    }
}

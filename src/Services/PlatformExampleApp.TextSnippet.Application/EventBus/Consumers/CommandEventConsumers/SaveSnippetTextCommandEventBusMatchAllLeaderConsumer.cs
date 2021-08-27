using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using AngularDotnetPlatform.Platform.JsonSerialization;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.CommandEventConsumers
{
    /// <summary>
    /// We use MatchAllPatternValue for producer context when consumer is leader
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsCommandEvent.EventTypeValue, PlatformEventBusConsumerAttribute.MatchAllPatternValue, "SaveSnippetTextCommand")]
    public class SaveSnippetTextCommandEventBusMatchAllLeaderConsumer : PlatformCqrsCommandEventBusConsumer<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
    {
        public SaveSnippetTextCommandEventBusMatchAllLeaderConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message)
        {
            Logger.LogInformation($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            return Task.CompletedTask;
        }
    }
}

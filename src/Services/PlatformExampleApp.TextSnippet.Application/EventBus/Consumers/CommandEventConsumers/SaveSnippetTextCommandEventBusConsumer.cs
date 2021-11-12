using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using AngularDotnetPlatform.Platform.JsonSerialization;
using AngularDotnetPlatform.Platform.Timing;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.CommandEventConsumers
{
    /// <summary>
    /// Demo using <see cref="PlatformInboxCqrsCommandEventBusConsumer{TCommand,TCommandResult}"/> to support inbox consumer
    /// The SaveSnippetTextCommandEventBusMatchAllLeaderConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again.
    /// <br/>
    /// <inheritdoc cref="PlatformInboxCqrsCommandEventBusConsumer{TCommand,TCommandResult}"/>
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsCommandEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "SaveSnippetTextCommand", additionalCustomRoutingKeys: new[] { "CustomRoutingKeyForFlexibleMigrateWithOldSystem" })]
    public class SaveSnippetTextCommandEventBusConsumer : PlatformInboxCqrsCommandEventBusConsumer<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
    {
        public SaveSnippetTextCommandEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }

        // Example override this function to config this specific consumer warning time if you expect
        // a specific consumer to run fast or slow
        // In this Example we expect this consumer run less than 2 seconds (2000 milliseconds)
        public override long? ProcessWarningTimeMilliseconds()
        {
            return 2000;
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message)
        {
            return Task.Run(() =>
            {
                // Sleep to demo warning slow consumer
                Thread.Sleep(TimeSpan.FromMilliseconds((ProcessWarningTimeMilliseconds() ?? DefaultProcessWarningTimeMilliseconds) + 1000));

                Logger.LogInformation($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            });
        }
    }
}

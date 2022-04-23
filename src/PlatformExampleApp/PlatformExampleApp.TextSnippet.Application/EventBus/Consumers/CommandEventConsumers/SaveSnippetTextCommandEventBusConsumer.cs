using System;
using System.Text.Json;
using System.Threading;
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
    /// <summary>
    /// Demo using <see cref="PlatformInboxCqrsCommandEventBusConsumer{TCommand}"/> to support inbox consumer
    /// The SaveSnippetTextCommandEventBusMatchAllLeaderConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again.
    /// <br/>
    /// <inheritdoc cref="PlatformInboxCqrsCommandEventBusConsumer{TCommand}"/>
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsCommandEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "SaveSnippetTextCommand")]
    public class SaveSnippetTextCommandEventBusConsumer : PlatformInboxCqrsCommandEventBusConsumer<SaveSnippetTextCommand>
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

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message, string routingKey)
        {
            return Task.Run(() =>
            {
                // Sleep to demo warning slow consumer
                Thread.Sleep(TimeSpan.FromMilliseconds((ProcessWarningTimeMilliseconds() ?? DefaultProcessWarningTimeMilliseconds) + 1000));

                Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            });
        }
    }

    /// <summary>
    /// Demo using <see cref="PlatformInboxCqrsCommandEventBusConsumer{TCommand}"/> to support inbox consumer
    /// The SaveSnippetTextCommandEventBusMatchAllLeaderConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again.
    /// <br/>
    /// Consume without using <see cref="PlatformEventBusConsumerAttribute"/>, Consumer will treat the message as free format message.
    /// Must ensure MessageClassName is unique in the system.
    /// <inheritdoc cref="PlatformInboxCqrsCommandEventBusConsumer{TCommand}"/>
    /// </summary>
    public class SaveSnippetTextCommandAsFreeFormatEventBusConsumer : PlatformInboxCqrsCommandEventBusConsumer<SaveSnippetTextCommand>
    {
        public SaveSnippetTextCommandAsFreeFormatEventBusConsumer(
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

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message, string routingKey)
        {
            return Task.Run(() =>
            {
                // Sleep to demo warning slow consumer
                Thread.Sleep(TimeSpan.FromMilliseconds((ProcessWarningTimeMilliseconds() ?? DefaultProcessWarningTimeMilliseconds) + 1000));

                Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            });
        }
    }
}

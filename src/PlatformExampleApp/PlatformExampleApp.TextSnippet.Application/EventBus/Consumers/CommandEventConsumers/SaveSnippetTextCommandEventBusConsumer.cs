using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.Consumers;
using Easy.Platform.Application.EventBus.Consumers.CqrsEventConsumers;
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
    /// Demo using <see cref="PlatformCqrsCommandEventBusConsumer{TCommand}"/> to support inbox consumer
    /// The SaveSnippetTextCommandEventBusMatchAllLeaderConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again.
    /// <br/>
    /// <inheritdoc cref="PlatformCqrsCommandEventBusConsumer{TCommand}"/>
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsCommandEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "SaveSnippetTextCommand")]
    public class SaveSnippetTextCommandEventBusConsumer : PlatformCqrsCommandEventBusConsumer<SaveSnippetTextCommand>
    {
        public SaveSnippetTextCommandEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        // Example override this function to config this specific consumer warning time if you expect
        // a specific consumer to run fast or slow
        // In this Example we expect this consumer run less than 2 seconds (2000 milliseconds)
        public override long? SlowProcessWarningTimeMilliseconds()
        {
            return 2000;
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message, string routingKey)
        {
            return Task.Run(() =>
            {
                // Sleep to demo warning slow consumer
                Thread.Sleep(TimeSpan.FromMilliseconds((SlowProcessWarningTimeMilliseconds() ?? DefaultProcessWarningTimeMilliseconds) + 1000));

                Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            });
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }

    /// <summary>
    /// Demo using <see cref="PlatformCqrsCommandEventBusConsumer{TCommand}"/> to support inbox consumer
    /// The SaveSnippetTextCommandEventBusMatchAllLeaderConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again.
    /// <br/>
    /// Consume without using <see cref="PlatformEventBusConsumerAttribute"/>, Consumer will treat the message as free format message.
    /// Must ensure MessageClassName is unique in the system.
    /// <inheritdoc cref="PlatformCqrsCommandEventBusConsumer{TCommand}"/>
    /// </summary>
    public class SaveSnippetTextCommandAsFreeFormatEventBusConsumer : PlatformCqrsCommandEventBusConsumer<SaveSnippetTextCommand>
    {
        public SaveSnippetTextCommandAsFreeFormatEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        // Example override this function to config this specific consumer warning time if you expect
        // a specific consumer to run fast or slow
        // In this Example we expect this consumer run less than 2 seconds (2000 milliseconds)
        public override long? SlowProcessWarningTimeMilliseconds()
        {
            return 2000;
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<SaveSnippetTextCommand> message, string routingKey)
        {
            return Task.Run(() =>
            {
                // Sleep to demo warning slow consumer
                Thread.Sleep(TimeSpan.FromMilliseconds((SlowProcessWarningTimeMilliseconds() ?? DefaultProcessWarningTimeMilliseconds) + 1000));

                Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            });
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }
}

using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Consumers.CommandEventConsumers;

/// <summary>
/// Demo using <see cref="PlatformCqrsCommandEventBusMessageConsumer{TCommand}"/> to support inbox consumer
/// The SaveSnippetTextCommandEventBusMatchAllLeaderConsumer will throw error => Trigger message requeue =>
/// Inbox consumer will prevent a consumer consume the same message again.
/// <br/>
/// <inheritdoc cref="PlatformCqrsCommandEventBusMessageConsumer{TCommand}"/>
/// </summary>
[PlatformMessageBusConsumer(
    PlatformCqrsCommandEvent.EventTypeValue,
    TextSnippetApplicationConstants.ApplicationName,
    "SaveSnippetTextCommand")]
public class SaveSnippetTextCommandEventBusMessageConsumer : PlatformCqrsCommandEventBusMessageConsumer<SaveSnippetTextCommand>
{
    public SaveSnippetTextCommandEventBusMessageConsumer(
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

    protected override Task InternalHandleAsync(
        PlatformBusMessage<SaveSnippetTextCommand> message,
        string routingKey)
    {
        return Task.Run(
            () =>
            {
                // Sleep to demo warning slow consumer
                Thread.Sleep(
                    TimeSpan.FromMilliseconds(
                        (SlowProcessWarningTimeMilliseconds() ?? DefaultProcessWarningTimeMilliseconds) + 1000));

                Logger.LogInformationIfEnabled(
                    $"{GetType().FullName} has handled message. Message Detail: ${PlatformJsonSerializer.Serialize(message)}");
            });
    }

    // Can override this method return false to user normal consumer without using inbox message
    //public override bool AutoSaveInboxMessage => false;
}

/// <summary>
/// Demo using <see cref="PlatformCqrsCommandEventBusMessageConsumer{TCommand}"/> to support inbox consumer
/// The SaveSnippetTextCommandEventBusMatchAllLeaderConsumer will throw error => Trigger message requeue =>
/// Inbox consumer will prevent a consumer consume the same message again.
/// <br/>
/// Consume without using <see cref="PlatformMessageBusConsumerAttribute"/>, Consumer will treat the message as free format message.
/// Must ensure MessageClassName is unique in the system.
/// <inheritdoc cref="PlatformCqrsCommandEventBusMessageConsumer{TCommand}"/>
/// </summary>
public class SaveSnippetTextCommandAsFreeFormatEventBusMessageConsumer : PlatformCqrsCommandEventBusMessageConsumer<SaveSnippetTextCommand>
{
    public SaveSnippetTextCommandAsFreeFormatEventBusMessageConsumer(
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

    protected override Task InternalHandleAsync(
        PlatformBusMessage<SaveSnippetTextCommand> message,
        string routingKey)
    {
        return Task.Run(
            () =>
            {
                // Sleep to demo warning slow consumer
                Thread.Sleep(
                    TimeSpan.FromMilliseconds(
                        (SlowProcessWarningTimeMilliseconds() ?? DefaultProcessWarningTimeMilliseconds) + 1000));

                Logger.LogInformationIfEnabled(
                    $"{GetType().FullName} has handled message. Message Detail: ${PlatformJsonSerializer.Serialize(message)}");
            });
    }

    // Can override this method return false to user normal consumer without using inbox message
    //public override bool AutoSaveInboxMessage => false;
}

using System;
using System.Threading.Tasks;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Consumers.CommandEventConsumers
{
    [PlatformMessageBusConsumer("CustomGroupForExchange", "CustomRoutingKeyForFlexibleMigrateWithOldSystem")]
    public class SaveSnippetTextCommandEventBusMessageCustomRoutingKeyConsumer : PlatformCqrsCommandEventBusMessageConsumer<SaveSnippetTextCommand>
    {
        public SaveSnippetTextCommandEventBusMessageCustomRoutingKeyConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformBusMessage<SaveSnippetTextCommand> message, string routingKey)
        {
            return Task.Run(() =>
            {
                Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${PlatformJsonSerializer.Serialize(message)}");
            });
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }

    [PlatformMessageBusConsumer("CustomGroupForExchange", "CustomRoutingKeyForFlexibleMigrateWithOldSystem")]
    public class SaveSnippetTextCommandEventBusCustomRoutingKeyAndFreeFormatMessageConsumer : PlatformApplicationBusFreeFormatMessageConsumer<PlatformBusMessage<SaveSnippetTextCommand>>
    {
        public SaveSnippetTextCommandEventBusCustomRoutingKeyAndFreeFormatMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformBusMessage<SaveSnippetTextCommand> message, string routingKey)
        {
            return Task.Run(() =>
            {
                Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${PlatformJsonSerializer.Serialize(message)}");
            });
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }
}

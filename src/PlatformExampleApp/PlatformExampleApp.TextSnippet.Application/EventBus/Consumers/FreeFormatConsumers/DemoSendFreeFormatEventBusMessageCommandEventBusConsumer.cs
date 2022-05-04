using System;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.Consumers;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.EventBus.FreeFormatMessages;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.FreeFormatConsumers
{
    public class DemoSendFreeFormatEventBusMessageCommandEventBusConsumer
        : PlatformEventBusFreeFormatMessageConsumer<DemoSendFreeFormatEventBusMessage>
    {
        public DemoSendFreeFormatEventBusMessageCommandEventBusConsumer(ILoggerFactory loggerFactory) : base(loggerFactory)
        {
        }

        protected override Task InternalHandleAsync(DemoSendFreeFormatEventBusMessage message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"Message {nameof(DemoSendFreeFormatEventBusMessage)} by {GetType().Name} has been handled");

            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }

    /// <summary>
    /// Use DemoSendFreeFormatInboxEventBusMessageCommandEventBusConsumer if you need to use platform repository/use inbox messages pattern
    /// </summary>
    public class DemoSendFreeFormatInboxEventBusMessageCommandApplicationEventBusConsumer
        : PlatformApplicationEventBusFreeFormatMessageConsumer<DemoSendFreeFormatEventBusMessage>
    {
        public DemoSendFreeFormatInboxEventBusMessageCommandApplicationEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager, IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(DemoSendFreeFormatEventBusMessage message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"Message {nameof(DemoSendFreeFormatEventBusMessage)} has been handled");

            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }
}

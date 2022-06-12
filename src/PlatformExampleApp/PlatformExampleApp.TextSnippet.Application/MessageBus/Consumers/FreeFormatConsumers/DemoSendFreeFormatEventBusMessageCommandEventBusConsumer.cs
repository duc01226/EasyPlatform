using System;
using System.Threading.Tasks;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.MessageBus.FreeFormatMessages;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Consumers.FreeFormatConsumers
{
    public class DemoSendFreeFormatEventBusMessageCommandEventBusConsumer
        : PlatformMessageBusFreeFormatMessageConsumer<DemoSendFreeFormatEventBusMessage>
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
        : PlatformApplicationBusFreeFormatMessageConsumer<DemoSendFreeFormatEventBusMessage>
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

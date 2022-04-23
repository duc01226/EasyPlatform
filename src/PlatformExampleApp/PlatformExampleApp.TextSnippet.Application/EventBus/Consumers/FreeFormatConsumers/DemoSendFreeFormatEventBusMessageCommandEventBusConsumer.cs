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
    }

    /// <summary>
    /// Use PlatformUowEventBusFreeFormatMessageConsumer if you need to use platform repository
    /// </summary>
    public class DemoSendFreeFormatUowEventBusMessageCommandEventBusConsumer
        : PlatformUowEventBusFreeFormatMessageConsumer<DemoSendFreeFormatEventBusMessage>
    {
        public DemoSendFreeFormatUowEventBusMessageCommandEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }

        protected override Task InternalHandleAsync(DemoSendFreeFormatEventBusMessage message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"Message {nameof(DemoSendFreeFormatEventBusMessage)} by {GetType().Name} has been handled");

            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// Use DemoSendFreeFormatInboxEventBusMessageCommandEventBusConsumer if you need to use inbox messages pattern
    /// </summary>
    public class DemoSendFreeFormatInboxEventBusMessageCommandEventBusConsumer
        : PlatformInboxEventBusFreeFormatMessageConsumer<DemoSendFreeFormatEventBusMessage>
    {
        public DemoSendFreeFormatInboxEventBusMessageCommandEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager, IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }

        protected override Task InternalHandleAsync(DemoSendFreeFormatEventBusMessage message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"Message {nameof(DemoSendFreeFormatEventBusMessage)} has been handled");

            return Task.CompletedTask;
        }
    }
}

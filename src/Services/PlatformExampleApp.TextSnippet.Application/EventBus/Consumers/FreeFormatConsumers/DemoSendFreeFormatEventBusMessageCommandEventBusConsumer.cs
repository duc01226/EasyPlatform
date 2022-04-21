using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
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
            Logger.LogInformationIfEnabled($"Message {nameof(DemoSendFreeFormatEventBusMessage)} has been handled");

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
            Logger.LogInformationIfEnabled($"Message {nameof(DemoSendFreeFormatEventBusMessage)} has been handled");

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

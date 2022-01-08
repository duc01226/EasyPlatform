using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.FreeFormatConsumers
{
    public class DemoSendFreeFormatEventBusMessageCommandEventBusConsumer
        : PlatformEventBusFreeFormatMessageConsumer<DemoSendFreeFormatEventBusMessageCommand>
    {
        public DemoSendFreeFormatEventBusMessageCommandEventBusConsumer(ILoggerFactory loggerFactory) : base(loggerFactory)
        {
        }

        protected override Task InternalHandleAsync(DemoSendFreeFormatEventBusMessageCommand message, string routingKey)
        {
            Logger.LogInformation($"Message {nameof(DemoSendFreeFormatEventBusMessageCommand)} has been handled");

            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// Use PlatformUowEventBusFreeFormatMessageConsumer if you need to use platform repository
    /// </summary>
    public class DemoSendFreeFormatUowEventBusMessageCommandEventBusConsumer
        : PlatformUowEventBusFreeFormatMessageConsumer<DemoSendFreeFormatEventBusMessageCommand>
    {
        public DemoSendFreeFormatUowEventBusMessageCommandEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }

        protected override Task InternalHandleAsync(DemoSendFreeFormatEventBusMessageCommand message, string routingKey)
        {
            Logger.LogInformation($"Message {nameof(DemoSendFreeFormatEventBusMessageCommand)} has been handled");

            return Task.CompletedTask;
        }
    }
}

using System;
using AngularDotnetPlatform.Platform.Application.EventBus;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    public class PlatformRabbitMqInboxEventBusMessageCleanerHostedService : PlatformInboxEventBusMessageCleanerHostedService
    {
        private readonly PlatformRabbitMqOptions options;

        public PlatformRabbitMqInboxEventBusMessageCleanerHostedService(
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory,
            PlatformRabbitMqOptions options) : base(serviceProvider, loggerFactory)
        {
            this.options = options;
        }

        protected override long MessageExpiredInDays()
        {
            return TimeSpan.FromSeconds(options.RequeueExpiredTimeSpanInSeconds).Days;
        }

        protected override int NumberOfDeleteMessagesBatch()
        {
            return options.InboxEventBusMessageCleanerOptions.NumberOfDeleteMessagesBatch;
        }

        protected override TimeSpan ProcessTriggerIntervalTime()
        {
            return TimeSpan.FromMinutes(options.InboxEventBusMessageCleanerOptions.ProcessTriggerIntervalInMinutes);
        }
    }
}

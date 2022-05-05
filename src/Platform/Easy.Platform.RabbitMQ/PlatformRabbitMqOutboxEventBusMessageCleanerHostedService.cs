using System;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.EventBus.OutboxPattern;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqOutboxEventBusMessageCleanerHostedService : PlatformOutboxEventBusMessageCleanerHostedService
    {
        private readonly PlatformRabbitMqOptions options;

        public PlatformRabbitMqOutboxEventBusMessageCleanerHostedService(
            IHostApplicationLifetime applicationLifetime,
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory,
            IPlatformApplicationSettingContext applicationSettingContext,
            PlatformRabbitMqOptions options) : base(applicationLifetime, serviceProvider, loggerFactory, applicationSettingContext)
        {
            this.options = options;
        }

        protected override long MessageExpiredInDays()
        {
            return TimeSpan.FromSeconds(options.InboxEventBusMessageOptions.MessageExpiredInSeconds).Days;
        }

        protected override int NumberOfDeleteMessagesBatch()
        {
            return options.InboxEventBusMessageOptions.NumberOfDeleteMessagesBatch;
        }

        protected override TimeSpan ProcessTriggerIntervalTime()
        {
            return TimeSpan.FromMinutes(options.InboxEventBusMessageOptions.ProcessTriggerIntervalInMinutes);
        }
    }
}

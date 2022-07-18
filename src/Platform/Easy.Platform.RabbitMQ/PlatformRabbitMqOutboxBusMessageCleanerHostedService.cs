using System;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqOutboxBusMessageCleanerHostedService : PlatformOutboxBusMessageCleanerHostedService
    {
        private readonly PlatformRabbitMqOptions options;

        public PlatformRabbitMqOutboxBusMessageCleanerHostedService(
            IHostApplicationLifetime applicationLifetime,
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory,
            IPlatformApplicationSettingContext applicationSettingContext,
            IConfiguration configuration,
            PlatformRabbitMqOptions options) : base(
            applicationLifetime,
            serviceProvider,
            loggerFactory,
            applicationSettingContext,
            configuration)
        {
            this.options = options;
        }

        protected override double DeleteProcessedMessageInSeconds()
        {
            return options.OutboxEventBusMessageOptions.DeleteProcessedMessageInSeconds;
        }

        protected override int NumberOfDeleteMessagesBatch()
        {
            return options.OutboxEventBusMessageOptions.NumberOfDeleteMessagesBatch;
        }

        protected override TimeSpan ProcessTriggerIntervalTime()
        {
            return TimeSpan.FromMinutes(options.OutboxEventBusMessageOptions.ProcessTriggerIntervalInMinutes);
        }
    }
}

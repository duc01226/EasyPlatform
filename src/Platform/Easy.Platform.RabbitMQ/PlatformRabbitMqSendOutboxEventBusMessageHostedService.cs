using System;
using Easy.Platform.Application.EventBus.OutboxPattern;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqSendOutboxEventBusMessageHostedService : PlatformSendOutboxEventBusMessageHostedService
    {
        private readonly PlatformRabbitMqOptions options;

        public PlatformRabbitMqSendOutboxEventBusMessageHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            PlatformRabbitMqOptions options) : base(applicationLifetime, loggerFactory, serviceProvider)
        {
            this.options = options;
        }

        protected override double RetryProcessFailedMessageDelayTimeInSeconds()
        {
            return options.RequeueDelayTimeInSeconds;
        }

        protected override double MessageProcessingExpiredInDays()
        {
            return options.RequeueExpiredInSeconds / (60 * 60 * 24);
        }
    }
}

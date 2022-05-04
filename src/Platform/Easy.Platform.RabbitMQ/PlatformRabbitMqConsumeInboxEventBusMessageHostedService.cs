using System;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqConsumeInboxEventBusMessageHostedService : PlatformConsumeInboxEventBusMessageHostedService
    {
        private readonly PlatformRabbitMqOptions options;

        public PlatformRabbitMqConsumeInboxEventBusMessageHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformEventBusManager eventBusManager,
            PlatformRabbitMqOptions options) : base(applicationLifetime, loggerFactory, serviceProvider, eventBusManager)
        {
            this.options = options;
        }

        protected override bool IsLogConsumerProcessTime()
        {
            return options.IsLogConsumerProcessTime;
        }

        protected override double LogErrorSlowProcessWarningTimeMilliseconds()
        {
            return options.LogErrorSlowProcessWarningTimeMilliseconds;
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

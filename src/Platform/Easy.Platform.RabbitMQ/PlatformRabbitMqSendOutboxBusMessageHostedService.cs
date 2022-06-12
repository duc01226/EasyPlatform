using System;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqSendOutboxBusMessageHostedService : PlatformSendOutboxBusMessageHostedService
    {
        private readonly PlatformRabbitMqOptions options;

        public PlatformRabbitMqSendOutboxBusMessageHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationSettingContext applicationSettingContext,
            PlatformOutboxConfig outboxConfig,
            PlatformRabbitMqOptions options) : base(applicationLifetime, loggerFactory, serviceProvider, applicationSettingContext, outboxConfig)
        {
            this.options = options;
        }

        protected override double RetryProcessFailedMessageDelayTimeInSeconds()
        {
            return options.RequeueDelayTimeInSeconds;
        }
    }
}

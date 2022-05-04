using System;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqInboxEventBusMessageCleanerHostedService : PlatformInboxEventBusMessageCleanerHostedService
    {
        private readonly PlatformRabbitMqOptions options;

        public PlatformRabbitMqInboxEventBusMessageCleanerHostedService(
            IHostApplicationLifetime applicationLifetime,
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory,
            PlatformRabbitMqOptions options) : base(applicationLifetime, serviceProvider, loggerFactory)
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

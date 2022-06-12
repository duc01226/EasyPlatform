using System;
using System.Threading.Tasks;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqInboxBusMessageCleanerHostedService : PlatformInboxBusMessageCleanerHostedService
    {
        private readonly PlatformRabbitMqOptions options;

        public PlatformRabbitMqInboxBusMessageCleanerHostedService(
            IHostApplicationLifetime applicationLifetime,
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory,
            IPlatformApplicationSettingContext applicationSettingContext,
            PlatformRabbitMqOptions options) : base(applicationLifetime, serviceProvider, loggerFactory, applicationSettingContext)
        {
            this.options = options;
        }

        protected override double DeleteProcessedMessageInSeconds()
        {
            return options.InboxEventBusMessageOptions.DeleteProcessedMessageInSeconds;
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

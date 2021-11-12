using AngularDotnetPlatform.Platform.Application.EventBus;
using RabbitMQ.Client;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    public class PlatformRabbitMqOptions
    {
        public PlatformRabbitMqOptions()
        {
            RequeueDelayTimeInSeconds = 60;
            RequeueExpiredInSeconds = RequeueDelayTimeInSeconds * 60 * 24 * 7;
            InboxMessageExpiredInSeconds = RequeueExpiredInSeconds;
        }

        public string HostNames { get; set; }

        public string Username { get; set; }

        public string Password { get; set; }

        public int Port { get; set; } = AmqpTcpEndpoint.UseDefaultPort;

        public string VirtualHost { get; set; } = "/";

        public string ClientProvidedName { get; set; }

        /// <summary>
        /// Used to set RetryCount policy when tried to create rabbit mq channel <see cref="IModel"/>
        /// </summary>
        public int CreateChannelRetryCount { get; set; } = 5;

        public int PublishMessageRetryCount { get; set; } = 5;

        public int RunConsumerRetryCount { get; set; } = 5;

        public ushort QueuePrefetchCount { get; set; } = 100;

        /// <summary>
        /// Used to set <see cref="ConnectionFactory.NetworkRecoveryInterval"/>
        /// </summary>
        public int NetworkRecoveryIntervalSeconds { get; set; } = 15;

        /// <summary>
        /// Used to set <see cref="ConnectionFactory.RequestedConnectionTimeout"/>
        /// </summary>
        public int RequestedConnectionTimeoutSeconds { get; set; } = 10;

        /// <summary>
        /// Config the time to true to log consumer process time
        /// </summary>
        public bool LogConsumerProcessTime { get; set; } = true;

        /// <summary>
        /// Config the time in milliseconds to log warning if the process consumer time is over LogConsumerProcessWarningTimeMilliseconds.
        /// </summary>
        public long LogConsumerProcessWarningTimeMilliseconds { get; set; } = 5000;

        public int RequeueDelayTimeInSeconds { get; set; }

        public long RequeueExpiredInSeconds { get; set; }

        public long InboxMessageExpiredInSeconds { get; set; }

        public int ProcessRequeueMessageRetryCount { get; set; } = 10;

        public PlatformRabbitMqInboxEventBusMessageCleanerOptions InboxEventBusMessageCleanerOptions { get; set; } =
            new PlatformRabbitMqInboxEventBusMessageCleanerOptions();
    }

    public class PlatformRabbitMqInboxEventBusMessageCleanerOptions
    {
        /// <summary>
        /// <inheritdoc cref="PlatformInboxEventBusMessageCleanerHostedService.ProcessTriggerIntervalTime"/>
        /// </summary>
        public long ProcessTriggerIntervalInMinutes { get; set; } = 1;

        /// <summary>
        /// <inheritdoc cref="PlatformInboxEventBusMessageCleanerHostedService.NumberOfDeleteMessagesBatch"/>
        /// </summary>
        public int NumberOfDeleteMessagesBatch { get; set; } = 500;
    }
}

using System;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Application.EventBus.OutboxPattern;
using RabbitMQ.Client;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqOptions
    {
        public PlatformRabbitMqOptions()
        {
            RequeueDelayTimeInSeconds = 60;
            RequeueExpiredInSeconds = TimeSpan.FromDays(7).TotalSeconds;
            InboxEventBusMessageOptions.DeleteProcessedMessageInSeconds = RequeueExpiredInSeconds;
            OutboxEventBusMessageOptions.DeleteProcessedMessageInSeconds = RequeueExpiredInSeconds;
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
        public int FirstTimeInitChannelRetryCount { get; set; } = 5;

        public int RunConsumerRetryCount { get; set; } = 5;

        /// <summary>
        /// Config the prefectCount. (Not default is 0 mean unlimited) to limit messages to prevent rabbit mq down
        /// Reference: https://www.rabbitmq.com/tutorials/tutorial-two-dotnet.html. Filter: BasicQos
        /// </summary>
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
        public bool IsLogConsumerProcessTime { get; set; } = true;

        /// <summary>
        /// Config the time in milliseconds to log warning if the process consumer time is over LogConsumerProcessWarningTimeMilliseconds.
        /// </summary>
        public long LogErrorSlowProcessWarningTimeMilliseconds { get; set; } = 5000;

        public double RequeueDelayTimeInSeconds { get; set; }

        public double RequeueExpiredInSeconds { get; set; }

        public int ProcessRequeueMessageRetryCount { get; set; } = 10;

        public PlatformRabbitMqInboxEventBusMessageOptions InboxEventBusMessageOptions { get; set; } =
            new PlatformRabbitMqInboxEventBusMessageOptions();

        public PlatformRabbitMqOutboxEventBusMessageOptions OutboxEventBusMessageOptions { get; set; } =
            new PlatformRabbitMqOutboxEventBusMessageOptions();
    }

    public class PlatformRabbitMqInboxEventBusMessageOptions
    {
        /// <summary>
        /// <inheritdoc cref="PlatformInboxEventBusMessageCleanerHostedService.ProcessTriggerIntervalTime"/>
        /// </summary>
        public long ProcessTriggerIntervalInMinutes { get; set; } = 1;

        /// <summary>
        /// <inheritdoc cref="PlatformInboxEventBusMessageCleanerHostedService.NumberOfDeleteMessagesBatch"/>
        /// </summary>
        public int NumberOfDeleteMessagesBatch { get; set; } = PlatformInboxEventBusMessageCleanerHostedService.DefaultNumberOfDeleteMessagesBatch;

        public double DeleteProcessedMessageInSeconds { get; set; }
    }

    public class PlatformRabbitMqOutboxEventBusMessageOptions
    {
        /// <summary>
        /// <inheritdoc cref="PlatformOutboxEventBusMessageCleanerHostedService.ProcessTriggerIntervalTime"/>
        /// </summary>
        public long ProcessTriggerIntervalInMinutes { get; set; } = 1;

        /// <summary>
        /// <inheritdoc cref="PlatformOutboxEventBusMessageCleanerHostedService.NumberOfDeleteMessagesBatch"/>
        /// </summary>
        public int NumberOfDeleteMessagesBatch { get; set; } = PlatformOutboxEventBusMessageCleanerHostedService.DefaultNumberOfDeleteMessagesBatch;

        public double DeleteProcessedMessageInSeconds { get; set; }
    }
}

using RabbitMQ.Client;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    public class PlatformRabbitMqOptions
    {
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

        public bool LogConsumerProcessTime { get; set; } = false;

        public int RequeueDelayTimeInSeconds { get; set; } = 60;
    }
}

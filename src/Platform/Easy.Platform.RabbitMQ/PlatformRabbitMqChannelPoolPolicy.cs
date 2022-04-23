using System;
using System.Linq;
using System.Reflection;
using System.Threading;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.ObjectPool;
using Polly;
using Polly.Retry;
using RabbitMQ.Client;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqChannelPoolPolicy : IPooledObjectPolicy<IModel>
    {
        private readonly RetryPolicy retryPolicy;
        private readonly PlatformRabbitMqOptions options;
        private readonly IConnectionFactory factory;
        private readonly ILogger<PlatformRabbitMqChannelPoolPolicy> logger;
        private Lazy<IConnection> connection;

        public PlatformRabbitMqChannelPoolPolicy(
            PlatformRabbitMqOptions options,
            ILogger<PlatformRabbitMqChannelPoolPolicy> logger)
        {
            connection = new Lazy<IConnection>(CreateConnection);
            this.options = options;

            this.logger = logger;

            retryPolicy = Policy
                .Handle<Exception>()
                .WaitAndRetry(
                    this.options.CreateChannelRetryCount,
                    retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));

            factory = InitializeFactory();
        }

        public IModel Create()
        {
            return retryPolicy.ExecuteAndThrowFinalException(
                executeFunc: CreateChannel,
                beforeThrowFinalException: ex => { logger.LogError(ex, "Create rabbit-mq channel failed."); });
        }

        public bool Return(IModel obj)
        {
            if (obj.IsOpen)
            {
                return true;
            }

            obj.Dispose();

            return false;
        }

        private IModel CreateChannel()
        {
            try
            {
                return connection.Value.CreateModel();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Create rabbit-mq channel failed.");
                ReInitNewConnection();
                throw;
            }
        }

        /// <summary>
        /// connection hang up during broker node restarted
        /// in this case, try to close old and create new connection
        /// </summary>
        private void ReInitNewConnection()
        {
            logger.LogInformationIfEnabled("Re-init new rabbit-mq connection started.");

            try
            {
                connection.Value.Close(TimeSpan.FromSeconds(5));
                logger.LogInformationIfEnabled("Release old rabbit-mq connection successfully.");
            }
            catch (Exception releaseEx)
            {
                logger.LogError(releaseEx, "Release rabbit-mq old connection failed.");
            }
            finally
            {
                connection = new Lazy<IConnection>(CreateConnection);
            }

            logger.LogInformationIfEnabled("Re-init new rabbit-mq connection successfully.");
        }

        private IConnectionFactory InitializeFactory()
        {
            var connectionFactory = new ConnectionFactory
            {
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(options.NetworkRecoveryIntervalSeconds),
                UserName = options.Username,
                Password = options.Password,
                VirtualHost = options.VirtualHost,
                Port = options.Port,
                DispatchConsumersAsync = true,
                RequestedConnectionTimeout = TimeSpan.FromSeconds(options.RequestedConnectionTimeoutSeconds),
                ClientProvidedName = options.ClientProvidedName ?? Assembly.GetEntryAssembly()?.FullName
            };

            return connectionFactory;
        }

        private IConnection CreateConnection()
        {
            logger.LogInformationIfEnabled("Creating new rabbit-mq connection.");

            var hostNames = options.HostNames.Split(',').Where(hostName => !string.IsNullOrEmpty(hostName)).ToArray();

            return retryPolicy.ExecuteAndThrowFinalException(
                executeFunc: () => factory.CreateConnection(hostNames),
                beforeThrowFinalException: ex => logger.LogError(ex, "Create rabbit-mq connection failed."));
        }
    }
}

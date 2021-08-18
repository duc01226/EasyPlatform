using System;
using System.Linq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.ObjectPool;
using Polly;
using Polly.Retry;
using RabbitMQ.Client;

namespace AngularDotnetPlatform.Platform.RabbitMQ
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
            var policyResult = retryPolicy.ExecuteAndCapture(CreateChannel);

            if (policyResult.FinalException != null)
            {
                logger.LogError(policyResult.FinalException, "Finally create rabbit-mq channel failed.");
                throw policyResult.FinalException;
            }

            // The final handled result captured. Will be IConnection if the policy executed successfully, or terminated with an exception.
            return policyResult.Result;
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
            logger.LogInformation("Re-init new rabbit-mq connection started.");

            try
            {
                connection.Value.Close(TimeSpan.FromSeconds(5));
                logger.LogInformation("Release old rabbit-mq connection successfully.");
            }
            catch (Exception releaseEx)
            {
                logger.LogError(releaseEx, "Release rabbit-mq old connection failed.");
            }
            finally
            {
                connection = new Lazy<IConnection>(CreateConnection);
            }

            logger.LogInformation("Re-init new rabbit-mq connection successfully.");
        }

        private IConnectionFactory InitializeFactory()
        {
            var connectionFactory = new ConnectionFactory
            {
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(options.NetworkRecoveryIntervalSeconds),
                UserName = options.Username,
                Password = options.Password,
                VirtualHost = "/",
                Port = AmqpTcpEndpoint.UseDefaultPort,
                DispatchConsumersAsync = true,
                RequestedConnectionTimeout = TimeSpan.FromSeconds(options.RequestedConnectionTimeoutSeconds),
                ClientProvidedName = options.ClientProvidedName
            };

            return connectionFactory;
        }

        private IConnection CreateConnection()
        {
            logger.LogInformation("Creating new rabbit-mq connection.");

            var hostNames = options.HostNames.Split(',').Where(hostName => !string.IsNullOrEmpty(hostName)).ToArray();

            var policyResult = retryPolicy.ExecuteAndCapture(() => factory.CreateConnection(hostNames));

            if (policyResult.FinalException != null)
            {
                logger.LogError(policyResult.FinalException, "Finally create rabbit-mq connection failed.");
                throw policyResult.FinalException;
            }

            // The final handled result captured. Will be IConnection if the policy executed successfully, or terminated with an exception.
            return policyResult.Result;
        }
    }
}

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
            catch (Exception)
            {
                // connection hang up during broker node restarted
                // in this case, try to create new connection
                logger.LogInformation("create channel failed, release old connection");
                try
                {
                    connection.Value.Close(TimeSpan.FromSeconds(3));
                    logger.LogDebug("connection closed");
                }
                catch (Exception releaseEx)
                {
                    logger.LogError(releaseEx, "release connection failed");
                }
                finally
                {
                    connection = new Lazy<IConnection>(CreateConnection);
                }

                logger.LogInformation("release connection done");

                throw;
            }
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
            logger.LogInformation("Creating new rabbit connection");
            var hostNames = options.HostNames.Split(',').Where(hostName => !string.IsNullOrEmpty(hostName)).ToArray();

            var policyResult = retryPolicy.ExecuteAndCapture(() => factory.CreateConnection(hostNames));

            if (policyResult.FinalException != null)
            {
                logger.LogError(policyResult.FinalException, "create connection failed");
                throw policyResult.FinalException;
            }

            // The final handled result captured. Will be IConnection if the policy executed successfully, or terminated with an exception.
            return policyResult.Result;
        }
    }
}

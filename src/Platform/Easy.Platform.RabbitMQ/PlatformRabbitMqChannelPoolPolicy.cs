using System;
using System.Linq;
using System.Reflection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.ObjectPool;
using RabbitMQ.Client;

namespace Easy.Platform.RabbitMQ
{
    public class PlatformRabbitMqChannelPoolPolicy : IPooledObjectPolicy<IModel>
    {
        private readonly PlatformRabbitMqOptions options;
        private readonly ILogger<PlatformRabbitMqChannelPoolPolicy> logger;
        private readonly IConnectionFactory connectionFactory;

        private Lazy<IConnection> connection;

        public PlatformRabbitMqChannelPoolPolicy(
            PlatformRabbitMqOptions options,
            ILogger<PlatformRabbitMqChannelPoolPolicy> logger)
        {
            this.options = options;
            this.logger = logger;

            connection = new Lazy<IConnection>(CreateConnection);
            connectionFactory = InitializeFactory();
        }

        public IModel Create()
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

        public bool Return(IModel obj)
        {
            if (obj.IsOpen)
            {
                return true;
            }

            Util.Tasks.CatchException(obj.Dispose);

            return false;
        }

        /// <summary>
        /// Connection hang up during broker node restarted
        /// in this case, try to close old and create new connection
        /// </summary>
        private void ReInitNewConnection()
        {
            logger.LogInformationIfEnabled("Re-init new rabbit-mq connection started.");

            try
            {
                connection.Value.Close(TimeSpan.FromSeconds(5));
                connection.Value.Dispose();

                logger.LogInformationIfEnabled("Release old rabbit-mq connection successfully.");
            }
            catch (Exception releaseEx)
            {
                logger.LogWarning(releaseEx, "Release rabbit-mq old connection failed.");
            }
            finally
            {
                connection = new Lazy<IConnection>(CreateConnection);
            }

            logger.LogInformationIfEnabled("Re-init new rabbit-mq connection successfully.");
        }

        private IConnectionFactory InitializeFactory()
        {
            var connectionFactoryResult = new ConnectionFactory
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

            return connectionFactoryResult;
        }

        private IConnection CreateConnection()
        {
            try
            {
                logger.LogInformationIfEnabled("Creating new rabbit-mq connection.");

                var hostNames = options.HostNames.Split(',')
                    .Where(hostName => !string.IsNullOrEmpty(hostName))
                    .ToArray();

                return connectionFactory.CreateConnection(hostNames);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Create rabbit-mq connection failed.");
                throw;
            }
        }
    }
}

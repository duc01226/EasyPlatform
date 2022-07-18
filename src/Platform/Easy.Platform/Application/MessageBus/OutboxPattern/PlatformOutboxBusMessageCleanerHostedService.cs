using Easy.Platform.Application.Context;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Hosting;
using Easy.Platform.Common.Timing;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

namespace Easy.Platform.Application.MessageBus.OutboxPattern
{
    public abstract class PlatformOutboxBusMessageCleanerHostedService : PlatformIntervalProcessHostedService
    {
        /// <summary>
        /// Default number messages is deleted in every process. Default is 100;
        /// </summary>
        public const int DefaultNumberOfDeleteMessagesBatch = 100;

        public const string DefaultDeleteProcessedMessageInSecondsSettingKey =
            "MessageBus:OutboxDeleteProcessedMessageInSeconds";

        private readonly IServiceProvider serviceProvider;
        private readonly IPlatformApplicationSettingContext applicationSettingContext;

        private bool isProcessing = false;

        protected readonly IConfiguration Configuration;

        public PlatformOutboxBusMessageCleanerHostedService(
            IHostApplicationLifetime applicationLifetime,
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory,
            IPlatformApplicationSettingContext applicationSettingContext,
            IConfiguration configuration) : base(applicationLifetime, loggerFactory)
        {
            this.serviceProvider = serviceProvider;
            this.applicationSettingContext = applicationSettingContext;
            this.Configuration = configuration;
        }

        public static bool MatchImplementation(ServiceDescriptor serviceDescriptor)
        {
            return MatchImplementation(serviceDescriptor.ImplementationType) ||
                   MatchImplementation(serviceDescriptor.ImplementationInstance?.GetType());
        }

        public static bool MatchImplementation(Type implementationType)
        {
            return implementationType?.IsAssignableTo(
                typeof(PlatformOutboxBusMessageCleanerHostedService)) == true;
        }

        protected override async Task IntervalProcessAsync(CancellationToken cancellationToken)
        {
            if (!ApplicationStartedAndRunning || !HasOutboxEventBusMessageRepositoryRegistered() || isProcessing)
                return;

            isProcessing = true;

            try
            {
                // WHY: Retry in case of the db is not started, initiated or restarting
                await Policy.Handle<Exception>()
                    .WaitAndRetryAsync(
                        retryCount: ProcessClearMessageRetryCount(),
                        sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                        onRetry: (ex, timeSpan, currentRetry, ctx) =>
                        {
                            Log.Warning(
                                Logger,
                                ex,
                                $"Retry CleanOutboxEventBusMessage {currentRetry} time(s) failed with error: {ex.Message}. [ApplicationName:{applicationSettingContext.ApplicationName}]. [ApplicationAssembly:{applicationSettingContext.ApplicationAssembly.FullName}]");
                        })
                    .ExecuteAndThrowFinalExceptionAsync(() => CleanOutboxEventBusMessage(cancellationToken));
            }
            catch (Exception ex)
            {
                Log.Error(
                    Logger,
                    ex,
                    $"Retry CleanOutboxEventBusMessage failed with error: {ex.Message}. [ApplicationName:{applicationSettingContext.ApplicationName}]. [ApplicationAssembly:{applicationSettingContext.ApplicationAssembly.FullName}]");
            }

            isProcessing = false;
        }

        protected virtual int ProcessClearMessageRetryCount()
        {
            return 5;
        }

        /// <summary>
        /// To config maximum number messages is deleted in every process. Default is <see cref="DefaultNumberOfDeleteMessagesBatch"/>;
        /// </summary>
        protected virtual int NumberOfDeleteMessagesBatch()
        {
            return DefaultNumberOfDeleteMessagesBatch;
        }

        /// <summary>
        /// To config how long a message can live in the database in seconds. Default is one week (7 days);
        /// </summary>
        protected virtual double DeleteProcessedMessageInSeconds()
        {
            return Configuration.GetSection(DefaultDeleteProcessedMessageInSecondsSettingKey)?.Get<int?>() ??
                   TimeSpan.FromDays(7).TotalSeconds;
        }

        protected bool HasOutboxEventBusMessageRepositoryRegistered()
        {
            using (var scope = serviceProvider.CreateScope())
            {
                return scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>() != null;
            }
        }

        protected async Task CleanOutboxEventBusMessage(CancellationToken cancellationToken)
        {
            using (var scope = serviceProvider.CreateScope())
            {
                var uowManager = scope.ServiceProvider.GetService<IUnitOfWorkManager>();
                using (var uow = uowManager!.Begin())
                {
                    var outboxEventBusMessageRepo =
                        scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>();

                    var expiredMessages = outboxEventBusMessageRepo!.GetAllQuery()
                        .Where(p => p.LastSendDate <= Clock.UtcNow.AddDays(-DeleteProcessedMessageInSeconds()) &&
                                    p.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed)
                        .OrderBy(p => p.SendStatus)
                        .Take(NumberOfDeleteMessagesBatch())
                        .ToList();

                    if (expiredMessages.Count > 0)
                    {
                        await outboxEventBusMessageRepo.DeleteManyAsync(expiredMessages, dismissSendEvent: true,
                            cancellationToken);

                        await uow.CompleteAsync(cancellationToken);

                        Log.Information(Logger,
                            message:
                            $"CleanOutboxEventBusMessage success. Number of deleted messages: {expiredMessages.Count}");
                    }
                }
            }
        }

        public class Log
        {
            public static void Error(ILogger logger, Exception ex = null, string message = null)
            {
                if (ex != null)
                    logger.LogError(ex, $"{message ?? ex.Message}");
                else if (message != null)
                    logger.LogError($"{message}");
            }

            public static void Warning(ILogger logger, Exception ex = null, string message = null)
            {
                if (ex != null)
                    logger.LogWarning(ex, $"{message ?? ex.Message}");
                else if (message != null)
                    logger.LogWarning($"{message}");
            }

            public static void Information(ILogger logger, Exception ex = null, string message = null)
            {
                if (ex != null)
                    logger.LogInformationIfEnabled(ex, $"{message ?? ex.Message}");
                else if (message != null)
                    logger.LogInformationIfEnabled($"{message}");
            }
        }
    }

    public class PlatformDefaultOutboxBusMessageCleanerHostedService : PlatformOutboxBusMessageCleanerHostedService
    {
        public PlatformDefaultOutboxBusMessageCleanerHostedService(
            IHostApplicationLifetime applicationLifetime,
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory,
            IPlatformApplicationSettingContext applicationSettingContext,
            IConfiguration configuration) : base(applicationLifetime, serviceProvider, loggerFactory,
            applicationSettingContext, configuration)
        {
        }
    }
}

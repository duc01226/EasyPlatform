using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Common.Hosting;
using AngularDotnetPlatform.Platform.Common.Timing;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

namespace AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern
{
    public abstract class PlatformInboxEventBusMessageCleanerHostedService : PlatformIntervalProcessHostedService
    {
        private readonly IServiceProvider serviceProvider;

        public PlatformInboxEventBusMessageCleanerHostedService(
            IHostApplicationLifetime applicationLifetime,
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory) : base(applicationLifetime, loggerFactory)
        {
            this.serviceProvider = serviceProvider;
        }

        public static bool MatchImplementation(ServiceDescriptor serviceDescriptor)
        {
            return MatchImplementation(serviceDescriptor.ImplementationType) ||
                   MatchImplementation(serviceDescriptor.ImplementationInstance?.GetType());
        }

        public static bool MatchImplementation(Type implementationType)
        {
            return implementationType?.IsAssignableTo(
                typeof(PlatformInboxEventBusMessageCleanerHostedService)) == true;
        }

        protected override async Task IntervalProcess(CancellationToken cancellationToken)
        {
            if (!ApplicationStartedAndRunning || !HasInboxEventBusMessageRepositoryRegistered())
                return;

            // Retry in case of the db is not started, initiated or restarting
            await Policy.Handle<Exception>()
                .WaitAndRetryAsync(
                    retryCount: ProcessClearMessageRetryCount(),
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (ex, timeSpan, currentRetry, ctx) =>
                    {
                        Log.Warning(
                            Logger,
                            ex,
                            $"Retry CleanInboxEventBusMessage {currentRetry} time(s) failed with error: {ex.Message}");
                    })
                .ExecuteAndThrowFinalExceptionAsync(() => CleanInboxEventBusMessage(cancellationToken));
        }

        protected virtual int ProcessClearMessageRetryCount()
        {
            return 5;
        }

        /// <summary>
        /// To config maximum number messages is deleted in every process. Default is one week;
        /// </summary>
        protected virtual int NumberOfDeleteMessagesBatch()
        {
            return 500;
        }

        /// <summary>
        /// To config how long a message can live in the database in days. Default is one week;
        /// </summary>
        protected virtual long MessageExpiredInDays()
        {
            return 7;
        }

        protected bool HasInboxEventBusMessageRepositoryRegistered()
        {
            using (var scope = serviceProvider.CreateScope())
            {
                return scope.ServiceProvider.GetService<IPlatformInboxEventBusMessageRepository>() != null;
            }
        }

        protected async Task CleanInboxEventBusMessage(CancellationToken cancellationToken)
        {
            using (var scope = serviceProvider.CreateScope())
            {
                var uowManager = scope.ServiceProvider.GetService<IUnitOfWorkManager>();
                using (var uow = uowManager!.Begin())
                {
                    var inboxEventBusMessageRepo = scope.ServiceProvider.GetService<IPlatformInboxEventBusMessageRepository>();

                    var expiredMessages = inboxEventBusMessageRepo!.GetAllQuery()
                        .Where(p => p.ConsumerDate <= Clock.UtcNow.AddDays(-MessageExpiredInDays()))
                        .OrderBy(p => p.ConsumerDate)
                        .Take(NumberOfDeleteMessagesBatch())
                        .ToList();

                    if (expiredMessages.Count > 0)
                    {
                        await inboxEventBusMessageRepo.DeleteManyAsync(expiredMessages, true, cancellationToken);

                        await uow.CompleteAsync(cancellationToken);

                        Log.Information(Logger, message: $"CleanInboxEventBusMessage success. Number of deleted messages: {expiredMessages.Count}");
                    }
                }
            }
        }

        public class Log
        {
            public static void Error(ILogger logger, Exception ex = null, string message = null, object[] args = null)
            {
                if (ex != null)
                    logger.LogError(ex, $"{message ?? ex.Message}", args ?? Array.Empty<object>());
                else if (message != null)
                    logger.LogError($"{message}", args);
            }

            public static void Warning(ILogger logger, Exception ex = null, string message = null, object[] args = null)
            {
                if (ex != null)
                    logger.LogWarning(ex, $"{message ?? ex.Message}", args ?? Array.Empty<object>());
                else if (message != null)
                    logger.LogWarning($"{message}", args);
            }

            public static void Information(ILogger logger, Exception ex = null, string message = null, object[] args = null)
            {
                if (ex != null)
                    logger.LogInformation(ex, $"{message ?? ex.Message}", args ?? Array.Empty<object>());
                else if (message != null)
                    logger.LogInformation($"{message}", args);
            }
        }
    }

    public class PlatformDefaultInboxEventBusMessageCleanerHostedService : PlatformInboxEventBusMessageCleanerHostedService
    {
        public PlatformDefaultInboxEventBusMessageCleanerHostedService(
            IHostApplicationLifetime applicationLifetime,
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory) : base(applicationLifetime, serviceProvider, loggerFactory)
        {
        }
    }
}

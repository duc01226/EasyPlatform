using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Timing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

namespace AngularDotnetPlatform.Platform.Application.EventBus
{
    public abstract class PlatformInboxEventBusMessageCleanerHostedService : IHostedService, IDisposable
    {
        private readonly IServiceProvider serviceProvider;
        private readonly ILogger logger;

        private Timer timer;
        private bool disposed = false;

        public PlatformInboxEventBusMessageCleanerHostedService(IServiceProvider serviceProvider, ILoggerFactory loggerFactory)
        {
            this.serviceProvider = serviceProvider;
            this.logger = loggerFactory.CreateLogger(GetType());
        }

        public static bool MatchImplementation(ServiceDescriptor serviceDescriptor, IServiceProvider serviceProvider)
        {
            return serviceDescriptor.ImplementationType?.IsAssignableTo(
                       typeof(PlatformInboxEventBusMessageCleanerHostedService)) == true ||
                   serviceDescriptor.ImplementationInstance?.GetType()
                       .IsAssignableTo(typeof(PlatformInboxEventBusMessageCleanerHostedService)) == true ||
                   serviceDescriptor.ImplementationFactory?.Invoke(serviceProvider)?.GetType()
                       .IsAssignableTo(typeof(PlatformInboxEventBusMessageCleanerHostedService)) == true;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            if (HasInboxEventBusMessageRepositoryRegistered())
                timer = new Timer(Process, null, TimeSpan.Zero, ProcessTriggerIntervalTime());

            return Task.CompletedTask;
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            if (timer != null)
                await timer.DisposeAsync();
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        /// <summary>
        /// The main action of the hosted service that being triggered by the Timer. This will clean old expired inbox message
        /// </summary>
        /// <param name="state">An object containing information to be used by the callback method, or null.</param>
        protected virtual void Process(object state)
        {
            // Retry in case of the db is not started, initiated or restarting
            var finalResult = Policy.Handle<Exception>()
                .WaitAndRetry(
                    retryCount: ProcessClearMessageRetryCount(),
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (ex, timeSpan, currentRetry, ctx) =>
                    {
                        Log.Warning(
                            logger,
                            ex,
                            $"Retry Process clean inbox event bus message {currentRetry} time(s) failed with error: {ex.Message}");
                    })
                .ExecuteAndCapture(CleanInboxEventBusMessage);

            if (finalResult.FinalException != null)
            {
                throw finalResult.FinalException;
            }
        }

        /// <summary>
        /// To config the period of the timer to trigger the <see cref="Process"/> method.
        /// </summary>
        /// <returns>The configuration as <see cref="TimeSpan"/> type.</returns>
        protected virtual TimeSpan ProcessTriggerIntervalTime()
        {
            return TimeSpan.FromMinutes(1);
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

        protected virtual void Dispose(bool disposing)
        {
            if (disposed)
                return;

            timer?.Dispose();
        }

        protected bool HasInboxEventBusMessageRepositoryRegistered()
        {
            using (var scope = serviceProvider.CreateScope())
            {
                return scope.ServiceProvider.GetService<IPlatformInboxEventBusMessageRepository>() != null;
            }
        }

        protected void CleanInboxEventBusMessage()
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
                        inboxEventBusMessageRepo.DeleteMany(expiredMessages, true).Wait();

                        uow.CompleteAsync().Wait();

                        Log.Information(logger, message: $"CleanInboxEventBusMessage success. Number of deleted messages: {expiredMessages.Count}");
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
            IServiceProvider serviceProvider,
            ILoggerFactory loggerFactory) : base(serviceProvider, loggerFactory)
        {
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

namespace Easy.Platform.Infrastructures.BackgroundJob
{
    public abstract class PlatformBackgroundJobModule : PlatformInfrastructureModule
    {
        public PlatformBackgroundJobModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            RegisterBackgroundJob(serviceCollection);
        }

        protected override async Task InternalInit(IServiceScope serviceScope)
        {
            await base.InternalInit(serviceScope);

            await StartBackgroundJobProcessing(serviceScope);

            await ReplaceAllRecurringBackgroundJobs(serviceScope);
        }

        protected async Task StartBackgroundJobProcessing(IServiceScope serviceScope)
        {
            var backgroundJobProcessingService = serviceScope.ServiceProvider.GetService<IPlatformBackgroundJobProcessingService>();

            if (backgroundJobProcessingService!.Started())
                await backgroundJobProcessingService.Stop();

            if (backgroundJobProcessingService!.Started() == false)
            {
                var applicationLifetime = serviceScope.ServiceProvider.GetService<IHostApplicationLifetime>();
                var retryCount = 10;

                await Policy.Handle<Exception>()
                    .WaitAndRetryAsync(
                        retryCount: retryCount,
                        sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                        onRetry: (exception, timeSpan, retry, ctx) =>
                        {
                            var logger = serviceScope.ServiceProvider.GetService<ILogger>();

                            logger.LogWarning(exception,
                                "[StartBackgroundJobProcessing] Exception {ExceptionType} with message {Message} detected on attempt StartBackgroundJobProcessing {retry} of {retries}",
                                exception.GetType().Name,
                                exception.Message,
                                retry,
                                retryCount);
                        })
                    .ExecuteAndThrowFinalExceptionAsync(async () =>
                    {
                        await backgroundJobProcessingService.Start();
                        applicationLifetime?.ApplicationStopping.Register(() =>
                        {
                            backgroundJobProcessingService.Stop().Wait();
                        });
                    });
            }
        }

        protected Task ReplaceAllRecurringBackgroundJobs(IServiceScope serviceScope)
        {
            var scheduler = serviceScope.ServiceProvider.GetService<IPlatformBackgroundJobScheduler>();
            if (scheduler != null)
            {
                var allCurrentRecurringJobExecutors = serviceScope.ServiceProvider
                    .GetServices<IPlatformBackgroundJobExecutor>()
                    .Where(p => !string.IsNullOrEmpty(PlatformRecurringJobAttribute.GetCronExpressionInfo(p.GetType())))
                    .ToList();

                scheduler.ReplaceAllRecurringBackgroundJobs(allCurrentRecurringJobExecutors);
            }

            return Task.CompletedTask;
        }

        protected virtual void RegisterBackgroundJob(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllFromType<IPlatformBackgroundJobExecutor>(
                ServiceLifeTime.Transient,
                Assembly,
                replaceIfExist: true);

            serviceCollection.RegisterAllFromType<IPlatformBackgroundJobScheduler>(
                ServiceLifeTime.Transient,
                Assembly,
                replaceIfExist: true,
                replaceStrategy: ServiceCollectionExtension.ReplaceServiceStrategy.ByService);

            serviceCollection.RegisterAllFromType<IPlatformBackgroundJobProcessingService>(
                ServiceLifeTime.Singleton,
                Assembly,
                replaceIfExist: true,
                replaceStrategy: ServiceCollectionExtension.ReplaceServiceStrategy.ByService);
        }
    }
}

using System;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Common.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Common.Hosting
{
    public abstract class PlatformHostedService : IHostedService, IDisposable
    {
        protected readonly ILogger Logger;
        protected readonly IHostApplicationLifetime ApplicationLifetime;

        protected PlatformHostedService(IHostApplicationLifetime applicationLifetime, ILoggerFactory loggerFactory)
        {
            Logger = loggerFactory.CreateLogger(GetType());
            ApplicationLifetime = applicationLifetime;

            ApplicationLifetime.ApplicationStarted.Register(() =>
            {
                ApplicationStartedAndRunning = true;

                StartProcess(ApplicationLifetime.ApplicationStopping).Wait(applicationLifetime.ApplicationStopping);

                Logger.LogInformationIfEnabled($"Process of {GetType().Name} Started");
            });
            ApplicationLifetime.ApplicationStopping.Register(() =>
            {
                ApplicationStartedAndRunning = false;
            });
        }

        /// <summary>
        /// To determine that the application has started and running.
        /// </summary>
        protected bool ApplicationStartedAndRunning { get; private set; }

        protected bool Disposed { get; set; }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            await StopProcess(cancellationToken);

            Logger.LogInformationIfEnabled($"Process of {GetType().Name} Stopped");
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected abstract Task StartProcess(CancellationToken cancellationToken);
        protected virtual Task StopProcess(CancellationToken cancellationToken) { return Task.CompletedTask; }

        protected virtual void Dispose(bool disposing)
        {
            if (Disposed)
                return;

            if (disposing)
            {
                DisposeManagedResource();
            }

            Disposed = true;
        }

        protected virtual void DisposeManagedResource() { }
    }
}

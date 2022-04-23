using System;
using System.Threading.Tasks;
using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Infrastructures.BackgroundJob;
using Hangfire;

namespace Easy.Platform.HangfireBackgroundJob
{
    public sealed class PlatformHangfireBackgroundJobProcessingService : IPlatformBackgroundJobProcessingService, IDisposable
    {
        public static readonly long WaitForShutdownTimeoutInSeconds = 5 * 60;

        private readonly BackgroundJobServerOptions options;

        private BackgroundJobServer currentBackgroundJobServer;
        private bool isRunning = false;

        public PlatformHangfireBackgroundJobProcessingService(BackgroundJobServerOptions options)
        {
            this.options = options;
        }

        public bool Started()
        {
            return currentBackgroundJobServer != null;
        }

        public Task Start()
        {
            return Task.Run(() =>
            {
                if (currentBackgroundJobServer == null || !isRunning)
                {
                    currentBackgroundJobServer = new BackgroundJobServer(options);
                    isRunning = true;
                }
            });
        }

        public Task Stop()
        {
            return Task.Run(() =>
            {
                currentBackgroundJobServer?.SendStop();
                currentBackgroundJobServer?.WaitForShutdown(TimeSpan.FromSeconds(WaitForShutdownTimeoutInSeconds));
                currentBackgroundJobServer?.Dispose();
                currentBackgroundJobServer = null;
                isRunning = false;
            });
        }

        public void Dispose()
        {
            currentBackgroundJobServer?.Dispose();
        }
    }
}

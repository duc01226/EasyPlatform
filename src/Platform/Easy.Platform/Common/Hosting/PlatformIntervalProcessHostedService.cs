using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Common.Hosting
{
    public abstract class PlatformIntervalProcessHostedService : PlatformHostedService
    {
        private Timer timer;

        protected PlatformIntervalProcessHostedService(
            IHostApplicationLifetime applicationLifetime,
            ILoggerFactory loggerFactory) : base(applicationLifetime, loggerFactory)
        {
        }

        protected override Task StartProcess(CancellationToken cancellationToken)
        {
            timer = new Timer(
                callback: state => IntervalProcessAsync(cancellationToken).Wait(cancellationToken),
                state: null,
                dueTime: TimeSpan.Zero,
                period: ProcessTriggerIntervalTime());

            return Task.CompletedTask;
        }

        protected override async Task StopProcess(CancellationToken cancellationToken)
        {
            await base.StopProcess(cancellationToken);

            if (timer != null)
                await timer.DisposeAsync();
        }

        protected abstract Task IntervalProcessAsync(CancellationToken cancellationToken);

        /// <summary>
        /// To config the period of the timer to trigger the <see cref="IntervalProcessAsync"/> method.
        /// </summary>
        /// <returns>The configuration as <see cref="TimeSpan"/> type.</returns>
        protected virtual TimeSpan ProcessTriggerIntervalTime()
        {
            return TimeSpan.FromMinutes(1);
        }

        protected override void DisposeManagedResource()
        {
            timer?.Dispose();
        }
    }
}

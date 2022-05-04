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
            timer = new Timer(state => IntervalProcess(cancellationToken), null, TimeSpan.Zero, ProcessTriggerIntervalTime());

            return Task.CompletedTask;
        }

        protected override async Task StopProcess(CancellationToken cancellationToken)
        {
            await base.StopProcess(cancellationToken);

            if (timer != null)
                await timer.DisposeAsync();
        }

        protected abstract Task IntervalProcess(CancellationToken cancellationToken);

        /// <summary>
        /// To config the period of the timer to trigger the <see cref="IntervalProcess"/> method.
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

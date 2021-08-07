using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Utils
{
    public static partial class Util
    {
        public static class Tasks
        {
            public static Task DelayAction(Func<Task> action, TimeSpan delayTime, CancellationToken cancellationToken)
            {
                return Task.Run(
                    async () =>
                    {
                        await Task.Delay(TimeSpan.FromSeconds(10), cancellationToken);
                        await action();
                    },
                    cancellationToken);
            }

            public static Task DelayActionMultipleTimes(Func<Task> action, TimeSpan[] delayTimes, CancellationToken cancellationToken)
            {
                return Task.WhenAll(delayTimes.Select(delayTime => DelayAction(action, delayTime, cancellationToken)));
            }

            public static Task DelayAction(Action action, TimeSpan delayTime, CancellationToken cancellationToken)
            {
                return DelayAction(() => Task.Run(action, cancellationToken), delayTime, cancellationToken);
            }
        }
    }
}

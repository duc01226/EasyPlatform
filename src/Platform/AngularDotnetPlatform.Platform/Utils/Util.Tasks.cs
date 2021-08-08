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
            /// <summary>
            /// Execute an action after a given of time.
            /// </summary>
            public static Task QueueDelayAsyncAction(Func<CancellationToken, Task> action, TimeSpan delayTime, CancellationToken cancellationToken)
            {
                return Task.Run(
                    async () =>
                    {
                        await Task.Delay(delayTime, cancellationToken);
                        await action(cancellationToken);
                    },
                    cancellationToken);
            }

            /// <summary>
            /// Execute an action after a given of time in seconds.
            /// </summary>
            public static Task QueueDelayAsyncActionMultipleTimes(Func<CancellationToken, Task> action, int delayTimeInSecond, CancellationToken cancellationToken)
            {
                return QueueDelayAsyncAction(action, TimeSpan.FromSeconds(delayTimeInSecond), cancellationToken);
            }

            public static Task QueueIntervalAsyncAction(
                Func<CancellationToken, Task> action,
                int intervalTimeInSeconds,
                int? maximumIntervalExecutionCount = null,
                bool executeOnceImmediately = false,
                CancellationToken cancellationToken = default)
            {
                if (executeOnceImmediately)
                    action(cancellationToken).Wait(cancellationToken);

                if (maximumIntervalExecutionCount <= 0)
                    return Task.CompletedTask;

                return Task.Run(
                    async () =>
                    {
                        var executionCount = 0;
                        while (executionCount < maximumIntervalExecutionCount)
                        {
                            await Task.Delay(TimeSpan.FromSeconds(intervalTimeInSeconds), cancellationToken);
                            await action(cancellationToken);
                            executionCount += 1;
                        }
                    },
                    cancellationToken);
            }
        }
    }
}

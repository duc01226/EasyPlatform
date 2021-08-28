using System;
using System.Diagnostics;
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
            public static Task QueueDelayAsyncAction(Func<CancellationToken, Task> action, TimeSpan delayTime, CancellationToken cancellationToken = default)
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
            public static Task QueueDelayAsyncActionMultipleTimes(Func<CancellationToken, Task> action, int delayTimeInSecond, CancellationToken cancellationToken = default)
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

            public static void CatchException(Action action, Action<Exception> onException = null)
            {
                try
                {
                    action();
                }
                catch (Exception e)
                {
                    onException?.Invoke(e);
                }
            }

            public static T CatchException<T>(Func<T> func, Func<Exception, T> onException)
            {
                try
                {
                    return func();
                }
                catch (Exception e)
                {
                    return onException(e);
                }
            }

            public static T CatchExceptionContinueThrow<T>(Func<T> func, Action<Exception> onException)
            {
                try
                {
                    return func();
                }
                catch (Exception e)
                {
                    onException(e);
                    throw;
                }
            }

            /// <summary>
            /// Help to profiling an asyncTask.
            /// afterExecution is an optional action to execute. It's input is the task ElapsedMilliseconds of asyncTask execution.
            /// </summary>
            public static async Task ProfilingAsync(Func<Task> asyncTask, Action<long> afterExecution = null, Action beforeExecution = null)
            {
                beforeExecution?.Invoke();

                var stopwatch = Stopwatch.StartNew();
                await asyncTask();
                stopwatch.Stop();

                afterExecution?.Invoke(stopwatch.ElapsedMilliseconds);
            }
        }
    }
}

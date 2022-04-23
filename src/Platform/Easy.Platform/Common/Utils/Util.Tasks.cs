using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

namespace Easy.Platform.Common.Utils
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

            public static T CatchException<T>(Func<T> func, Func<Exception, T> onException = null)
            {
                try
                {
                    return func();
                }
                catch (Exception e)
                {
                    onException?.Invoke(e);
                    return default;
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

            public static Task<ValueTuple<T1, T2>> WhenAll<T1, T2>(Task<T1> task1, Task<T2> task2)
            {
                return Task.Run(() =>
                {
                    Task.WaitAll(task1, task2);
                    return (task1.Result, task2.Result);
                });
            }

            public static Task<ValueTuple<T1, T2, T3>> WhenAll<T1, T2, T3>(Task<T1> task1, Task<T2> task2, Task<T3> task3)
            {
                return Task.Run(() =>
                {
                    Task.WaitAll(task1, task2, task3);
                    return (task1.Result, task2.Result, task3.Result);
                });
            }

            public static Task<ValueTuple<T1, T2, T3, T4>> WhenAll<T1, T2, T3, T4>(Task<T1> task1, Task<T2> task2, Task<T3> task3, Task<T4> task4)
            {
                return Task.Run(() =>
                {
                    Task.WaitAll(task1, task2, task3, task4);
                    return (task1.Result, task2.Result, task3.Result, task4.Result);
                });
            }

            public static Task<ValueTuple<T1, T2, T3, T4, T5>> WhenAll<T1, T2, T3, T4, T5>(Task<T1> task1, Task<T2> task2, Task<T3> task3, Task<T4> task4, Task<T5> task5)
            {
                return Task.Run(() =>
                {
                    Task.WaitAll(task1, task2, task3, task4, task5);
                    return (task1.Result, task2.Result, task3.Result, task4.Result, task5.Result);
                });
            }

            public static Task<T> Async<T>(T t)
            {
                return Task.FromResult(t);
            }

            public static Task<T> Async<T>(Func<T> fn)
            {
                return Task.Run(fn);
            }
        }
    }
}

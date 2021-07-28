using System;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Extensions
{
    public static class TaskExtension
    {
        /// <summary>
        /// Apply using functional programming to map from Task[A] => (A) => B => Task[B]
        /// </summary>
        public static async Task<TR> Map<T, TR>(
            this Task<T> task, Func<T, TR> f)
        {
            return f(await task.ConfigureAwait(false));
        }

        /// <summary>
        /// Apply using functional programming to map from Task[A] => (A) => B => Task[B]
        /// </summary>
        public static async Task<TR> Map<T, TR>(
            this ValueTask<T> task, Func<T, TR> f)
        {
            return f(await task.ConfigureAwait(false));
        }

        /// <summary>
        /// Apply using functional programming to map from Task[A] => (A) => B => Task[B]
        /// </summary>
        public static async Task<TR> Map<TR>(
            this Task task, Func<TR> f)
        {
            await task;
            return f();
        }
    }
}

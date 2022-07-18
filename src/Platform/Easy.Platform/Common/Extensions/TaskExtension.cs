namespace Easy.Platform.Common.Extensions
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

        /// <summary>
        /// Apply using functional programming to map from Task[A] => (A) => Task[B] => Task[B]
        /// </summary>
        public static async Task<TR> Bind<T, TR>(
            this Task<T> task, Func<T, Task<TR>> f)
        {
            return await f(await task.ConfigureAwait(false)).ConfigureAwait(false);
        }

        public static Task<TR> MatchMap<T, TR>(
            this Task<T> task, Func<Exception, TR> faulted, Func<T, TR> completed)
        {
            return task.ContinueWith(t =>
                t.Status == TaskStatus.Faulted
                    ? faulted(t.Exception)
                    : completed(t.Result));
        }
    }
}

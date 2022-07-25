namespace Easy.Platform.Common.Extensions;

public static class TaskExtension
{
    /// <summary>
    /// Apply using functional programming to map from Task[A] => (A) => B => Task[B]
    /// </summary>
    public static async Task<TR> Map<T, TR>(
        this Task<T> task,
        Func<T, TR> f)
    {
        return f(await task.ConfigureAwait(continueOnCapturedContext: false));
    }

    /// <summary>
    /// Apply using functional programming to map from Task[A] => (A) => B => Task[B]
    /// </summary>
    public static async Task<TR> Map<T, TR>(
        this ValueTask<T> task,
        Func<T, TR> f)
    {
        return f(await task.ConfigureAwait(continueOnCapturedContext: false));
    }

    /// <summary>
    /// Apply using functional programming to map from Task[A] => (A) => B => Task[B]
    /// </summary>
    public static async Task<TR> Map<TR>(
        this Task task,
        Func<TR> f)
    {
        await task;
        return f();
    }

    /// <summary>
    /// Apply using functional programming to map from Task[A] => (A) => Task[B] => Task[B]
    /// </summary>
    public static async Task<TR> Bind<T, TR>(
        this Task<T> task,
        Func<T, Task<TR>> f)
    {
        return await f(await task.ConfigureAwait(continueOnCapturedContext: false)).ConfigureAwait(continueOnCapturedContext: false);
    }

    public static Task<TR> MatchMap<T, TR>(
        this Task<T> task,
        Func<Exception, TR> faulted,
        Func<T, TR> completed)
    {
        return task.ContinueWith(
            t =>
                t.Status == TaskStatus.Faulted
                    ? faulted(t.Exception)
                    : completed(t.Result));
    }

    public static Task<T> ThrowIfNull<T>(this Task<T> task, Func<Exception> exceptionFunc)
    {
        return task.Map(value => value != null ? value : throw exceptionFunc());
    }

    public static Task<ValueTuple<T, T1>> GetWith<T, T1>(this Task<T> task, Func<T, T1> with)
    {
        return task.Map(p => (p, with(p)));
    }

    public static async Task<ValueTuple<T, T1>> GetWith<T, T1>(this Task<T> task, Func<T, Task<T1>> with)
    {
        var value = await task;
        return (value, with(value).Result);
    }

    public static async Task<ValueTuple<T, T1, T2>> GetWith<T, T1, T2>(this Task<T> task, Func<T, T1> with1, Func<T, T1, T2> with2)
    {
        var (value, value1) = await task.GetWith(with1);
        return (value, value1, with2(value, value1));
    }

    public static async Task<ValueTuple<T, T1, T2>> GetWith<T, T1, T2>(this Task<T> task, Func<T, Task<T1>> with1, Func<T, T1, Task<T2>> with2)
    {
        var (value, value1) = await task.GetWith(with1);
        return (value, value1, await with2(value, value1));
    }
}

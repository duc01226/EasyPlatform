using Easy.Platform.Common.Utils;

namespace Easy.Platform.Common.DeprecatedFPLibrary;

public static class TaskExt
{
    public static Task<T> Recover<T>(
        this Task<T> task,
        Func<Exception, T> fallback)
    {
        return task.ContinueWith(
            t =>
                t.Status == TaskStatus.Faulted
                    ? fallback(t.Exception)
                    : t.Result);
    }

    public static Task<T> RecoverWith<T>(
        this Task<T> task,
        Func<Exception, Task<T>> fallback)
    {
        return task.ContinueWith(
                t =>
                    t.Status == TaskStatus.Faulted
                        ? fallback(t.Exception)
                        : Util.Tasks.Async(t.Result))
            .Unwrap();
    }
}

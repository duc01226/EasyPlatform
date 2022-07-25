namespace Easy.Platform.Common.Extensions;

public static class ObjectExtension
{
    /// <summary>
    /// Pipe the current target object through the <param name="action"></param> and return the same current target object
    /// </summary>
    public static T With<T>(this T target, Action<T> action)
    {
        action(target);

        return target;
    }

    public static T ThrowIfNull<T>(this T target, Func<Exception> exception)
    {
        return target.ThrowIf(isThrow: target => target == null, exception);
    }

    public static T ThrowIf<T>(this T target, Func<T, bool> isThrow, Func<Exception> exception)
    {
        return !isThrow(target) ? target : throw exception();
    }
}

namespace Easy.Platform.Common.Extensions;

public static class ActionExtension
{
    public static Func<ValueTuple> ToFunc(this Action action)
    {
        return () =>
        {
            action();
            return default;
        };
    }

    public static Func<T, ValueTuple> ToFunc<T>(this Action<T> action)
    {
        return t =>
        {
            action(t);
            return default;
        };
    }

    public static Func<T1, T2, ValueTuple> ToFunc<T1, T2>(this Action<T1, T2> action)
    {
        return (t1, t2) =>
        {
            action(t1, t2);
            return default;
        };
    }
}

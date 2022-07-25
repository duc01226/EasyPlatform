namespace Easy.Platform.Common.DeprecatedFPLibrary;

public static partial class F
{
    public static Option.None None => Option.None.Default; // the None value

    public static ValueTuple Unit()
    {
        return default;
    }

    public static Option<T> Some<T>(T value)
    {
        return new Option.Some<T>(value); // wrap the given value into a Some
    }

    public static List<T> List<T>(params T[] items)
    {
        return new List<T>(items);
    }

    // function manipulation 

    public static Func<T1, Func<T2, TR>> Curry<T1, T2, TR>(this Func<T1, T2, TR> func)
    {
        return t1 => t2 => func(t1, t2);
    }

    public static Func<T1, Func<T2, Func<T3, TR>>> Curry<T1, T2, T3, TR>(this Func<T1, T2, T3, TR> func)
    {
        return t1 => t2 => t3 => func(t1, t2, t3);
    }

    public static Func<T1, Func<T2, T3, TR>> CurryFirst<T1, T2, T3, TR>(
        this Func<T1, T2, T3, TR> @this)
    {
        return t1 => (t2, t3) => @this(t1, t2, t3);
    }
}

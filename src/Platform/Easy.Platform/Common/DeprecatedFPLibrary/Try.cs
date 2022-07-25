using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Common.DeprecatedFPLibrary;

public delegate Exceptional<T> Try<T>();

public static partial class F
{
    public static Try<T> Try<T>(Func<T> f)
    {
        return () => f();
    }

    public static Try<ValueTuple> Try(Action f)
    {
        return () => f.ToFunc()();
    }

    public static Try<T> Try<T>(Func<Task<T>> f)
    {
        return () =>
        {
            try
            {
                return f().Result;
            }
            catch (Exception ex)
            {
                return ex.InnerException;
            }
        };
    }

    public static Try<ValueTuple> Try(Func<Task> f)
    {
        return () =>
        {
            try
            {
                f().Wait();
                return Unit();
            }
            catch (Exception ex)
            {
                return ex.InnerException;
            }
        };
    }
}

public static class TryExt
{
    public static Exceptional<T> Run<T>(this Try<T> @try)
    {
        try
        {
            return @try();
        }
        catch (Exception ex) { return ex; }
    }

    public static Try<TR> Map<T, TR>(
        this Try<T> @try, Func<T, TR> f)
    {
        return ()
            => @try.Run()
                .Match<Exceptional<TR>>(
                    ex => ex,
                    t => f(t));
    }

    public static Try<Func<T2, TR>> Map<T1, T2, TR>(
        this Try<T1> @try, Func<T1, T2, TR> func)
    {
        return @try.Map(func.Curry());
    }

    public static Try<TR> Bind<T, TR>(
        this Try<T> @try, Func<T, Try<TR>> f)
    {
        return ()
            => @try.Run().Match(
                exception: ex => ex,
                success: t => f(t).Run());
    }

    // LINQ

    public static Try<TR> Select<T, TR>(this Try<T> @this, Func<T, TR> func)
    {
        return @this.Map(func);
    }

    public static Try<TRr> SelectMany<T, TR, TRr>(
        this Try<T> @try, Func<T, Try<TR>> bind, Func<T, TR, TRr> project)
    {
        return () => @try.Run().Match(
            ex => ex,
            t => bind(t).Run()
                .Match<Exceptional<TRr>>(
                    ex => ex,
                    r => project(t, r)));
    }
}

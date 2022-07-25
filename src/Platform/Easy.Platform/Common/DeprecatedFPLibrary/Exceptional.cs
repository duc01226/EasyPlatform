using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Common.DeprecatedFPLibrary;

public static partial class F
{
    public static Exceptional<T> Exceptional<T>(T value)
    {
        return new Exceptional<T>(value);
    }
}

public struct Exceptional<T>
{
    internal Exception Ex { get; }
    internal T Value { get; }

    public bool Success => Ex == null;
    public bool Exception => Ex != null;

    internal Exceptional(Exception ex)
    {
        Ex = ex ?? throw new ArgumentNullException(nameof(ex));
        Value = default;
    }

    internal Exceptional(T right)
    {
        Value = right;
        Ex = null;
    }

    public static implicit operator Exceptional<T>(Exception left)
    {
        return new Exceptional<T>(left);
    }

    public static implicit operator Exceptional<T>(T right)
    {
        return new Exceptional<T>(right);
    }

    public TR Match<TR>(Func<Exception, TR> exception, Func<T, TR> success)
    {
        return Exception ? exception(Ex) : success(Value);
    }

    public ValueTuple Match(Action<Exception> exception, Action<T> success)
    {
        return Match(exception.ToFunc(), success.ToFunc());
    }

    public T MatchException(Func<Exception, T> exception)
    {
        return Exception ? exception(Ex) : Value;
    }

    public ValueTuple MatchException(Action<Exception> exception)
    {
        return Exception ? exception.ToFunc()(Ex) : default;
    }

    public override string ToString()
    {
        return Match(
            ex => $"Exception({ex.Message})",
            t => $"Success({t})");
    }
}

public static class Exceptional
{
    // creating a new Exceptional

    public static Func<T, Exceptional<T>> Return<T>()
    {
        return t => t;
    }

    public static Exceptional<TR> Of<TR>(Exception left)
    {
        return new Exceptional<TR>(left);
    }

    public static Exceptional<TR> Of<TR>(TR right)
    {
        return new Exceptional<TR>(right);
    }

    // applicative

    public static Exceptional<TR> Apply<T, TR>(
        this Exceptional<Func<T, TR>> @this, Exceptional<T> arg)
    {
        return @this.Match(
            exception: ex => ex,
            success: func => arg.Match(
                exception: ex => ex,
                success: t => new Exceptional<TR>(func(t))));
    }

    // functor

    public static Exceptional<TRr> Map<TR, TRr>(this Exceptional<TR> @this,
        Func<TR, TRr> func)
    {
        return @this.Success ? func(@this.Value) : new Exceptional<TRr>(@this.Ex);
    }

    public static Exceptional<ValueTuple> ForEach<TR>(this Exceptional<TR> @this, Action<TR> act)
    {
        return Map(@this, act.ToFunc());
    }

    public static Exceptional<TRr> Bind<TR, TRr>(this Exceptional<TR> @this,
        Func<TR, Exceptional<TRr>> func)
    {
        return @this.Success ? func(@this.Value) : new Exceptional<TRr>(@this.Ex);
    }

    // LINQ

    public static Exceptional<TR> Select<T, TR>(this Exceptional<T> @this,
        Func<T, TR> map)
    {
        return @this.Map(map);
    }

    public static Exceptional<TRr> SelectMany<T, TR, TRr>(this Exceptional<T> @this,
        Func<T, Exceptional<TR>> bind, Func<T, TR, TRr> project)
    {
        if (@this.Exception)
            return new Exceptional<TRr>(@this.Ex);

        var bound = bind(@this.Value);
        return bound.Exception
            ? new Exceptional<TRr>(bound.Ex)
            : project(@this.Value, bound.Value);
    }
}

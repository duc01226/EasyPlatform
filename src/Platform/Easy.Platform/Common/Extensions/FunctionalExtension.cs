namespace Easy.Platform.Common.Extensions
{
    public static class FunctionalExtension
    {
        public static TResult Pipe<TTarget, TResult>(this TTarget target, Func<TTarget, TResult> pipeFunc)
        {
            return pipeFunc(target);
        }

        public static TTarget Pipe<TTarget>(this TTarget target, Action<TTarget> actionFn)
        {
            actionFn(target);

            return target;
        }

        public static TR Pipe<T, T1, TR>(this T @this, Func<T, T1> func, Func<T1, TR> func1)
        {
            return @this.Pipe(func).Pipe(func1);
        }

        public static TR Pipe<T, T1, T2, TR>(
            this T @this,
            Func<T, T1> func,
            Func<T1, T2> func1,
            Func<T2, TR> func2)
        {
            return @this.Pipe(func).Pipe(func1).Pipe(func2);
        }

        public static TResult PipeIf<TTarget, TResult>(
            this TTarget target,
            bool ifTrue,
            Func<TTarget, TResult> thenPipe) where TTarget : TResult
        {
            return ifTrue ? thenPipe(target) : target;
        }

        public static TResult PipeIfNotNull<TTarget, TResult>(
            this TTarget target,
            Func<TTarget, TResult> thenPipe)
        {
            return target != null ? thenPipe(target) : default;
        }
    }
}

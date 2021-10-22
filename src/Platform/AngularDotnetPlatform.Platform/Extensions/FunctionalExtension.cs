using System;

namespace AngularDotnetPlatform.Platform.Extensions
{
    public static class FunctionalExtension
    {
        public static TResult Pipe<TTarget, TResult>(this TTarget target, Func<TTarget, TResult> pipeFunc)
        {
            return pipeFunc(target);
        }

        public static TResult PipeIf<TTarget, TResult>(
            this TTarget target,
            bool ifTrue,
            Func<TTarget, TResult> thenPipe) where TTarget : TResult
        {
            return ifTrue ? thenPipe(target) : target;
        }
    }
}

using System;

namespace AngularDotnetPlatform.Platform.Extensions
{
    public static class FunctionalExtension
    {
        public static TResult Pipe<TTarget, TResult>(this TTarget target, Func<TTarget, TResult> pipeFunc)
        {
            return pipeFunc(target);
        }
    }
}

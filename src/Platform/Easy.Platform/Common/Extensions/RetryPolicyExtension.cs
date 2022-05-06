using System;
using System.Threading.Tasks;
using Polly.Retry;

namespace Easy.Platform.Common.Extensions
{
    public static class RetryPolicyExtension
    {
        public static void ExecuteAndThrowFinalException(
            this RetryPolicy retryPolicy,
            Action action,
            Action<Exception> onBeforeThrowFinalExceptionFn = null)
        {
            ExecuteAndThrowFinalException<object>(
                retryPolicy,
                () =>
                {
                    action();
                    return null;
                },
                onBeforeThrowFinalExceptionFn);
        }

        public static T ExecuteAndThrowFinalException<T>(
            this RetryPolicy retryPolicy,
            Func<T> executeFunc,
            Action<Exception> onBeforeThrowFinalExceptionFn = null)
        {
            var result = retryPolicy.ExecuteAndCapture(executeFunc);

            if (result.FinalException != null)
            {
                onBeforeThrowFinalExceptionFn?.Invoke(result.FinalException);

                throw result.FinalException;
            }

            return result.Result;
        }

        public static async Task ExecuteAndThrowFinalExceptionAsync(
            this AsyncRetryPolicy retryPolicy,
            Func<Task> action,
            Action<Exception> onBeforeThrowFinalExceptionFn = null)
        {
            await ExecuteAndThrowFinalExceptionAsync<object>(
                retryPolicy,
                async () =>
                {
                    await action();
                    return null;
                },
                onBeforeThrowFinalExceptionFn);
        }

        public static async Task<T> ExecuteAndThrowFinalExceptionAsync<T>(
            this AsyncRetryPolicy retryPolicy,
            Func<Task<T>> executeFunc,
            Action<Exception> onBeforeThrowFinalExceptionFn = null)
        {
            var result = await retryPolicy.ExecuteAndCaptureAsync(executeFunc);

            if (result.FinalException != null)
            {
                onBeforeThrowFinalExceptionFn?.Invoke(result.FinalException);

                throw result.FinalException;
            }

            return result.Result;
        }
    }
}

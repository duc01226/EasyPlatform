using System;
using System.Threading.Tasks;
using Polly.Retry;

namespace Easy.Platform.Common.Extensions
{
    public static class RetryPolicyExtension
    {
        public static void ExecuteAndThrowFinalException(this RetryPolicy retryPolicy, Action action, Action<Exception> beforeThrowFinalException = null)
        {
            ExecuteAndThrowFinalException<object>(
                retryPolicy,
                () =>
                {
                    action();
                    return null;
                },
                beforeThrowFinalException);
        }

        public static T ExecuteAndThrowFinalException<T>(this RetryPolicy retryPolicy, Func<T> executeFunc, Action<Exception> beforeThrowFinalException = null)
        {
            var result = retryPolicy.ExecuteAndCapture(executeFunc);

            if (result.FinalException != null)
            {
                beforeThrowFinalException?.Invoke(result.FinalException);

                throw result.FinalException;
            }

            return result.Result;
        }

        public static async Task ExecuteAndThrowFinalExceptionAsync(this AsyncRetryPolicy retryPolicy, Func<Task> action, Action<Exception> beforeThrowFinalException = null)
        {
            await ExecuteAndThrowFinalExceptionAsync<object>(
                retryPolicy,
                async () =>
                {
                    await action();
                    return null;
                },
                beforeThrowFinalException);
        }

        public static async Task<T> ExecuteAndThrowFinalExceptionAsync<T>(this AsyncRetryPolicy retryPolicy, Func<Task<T>> executeFunc, Action<Exception> beforeThrowFinalException = null)
        {
            var result = await retryPolicy.ExecuteAndCaptureAsync(executeFunc);

            if (result.FinalException != null)
            {
                beforeThrowFinalException?.Invoke(result.FinalException);

                throw result.FinalException;
            }

            return result.Result;
        }
    }
}

using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Common.Utils;

public static partial class Util
{
    /// <summary>
    /// Provides utility methods for executing asynchronous paged actions and scrolling paging.
    /// </summary>
    public static class Pager
    {
        /// <summary>
        /// Executes an asynchronous action in a paged manner.
        /// </summary>
        /// <param name="executeFn">Async function to execute. Takes parameters: skipCount, pageSize.</param>
        /// <param name="maxItemCount">Maximum number of items to process.</param>
        /// <param name="pageSize">Size of each page.</param>
        /// <param name="pageDelayTime">Optional delay time between pages.</param>
        /// <param name="cancellationToken"></param>
        /// <returns>A task representing the asynchronous operation.</returns>
        public static async Task ExecutePagingAsync(
            Func<int, int, Task> executeFn,
            long maxItemCount,
            int pageSize,
            TimeSpan? pageDelayTime = null,
            CancellationToken cancellationToken = default)
        {
            var currentSkipItemsCount = 0;

            do
            {
                if (cancellationToken.IsCancellationRequested) return;

                await executeFn(currentSkipItemsCount, pageSize);
                currentSkipItemsCount += pageSize;

                if (currentSkipItemsCount < maxItemCount && pageDelayTime.HasValue) await Task.Delay(pageDelayTime.Value, cancellationToken);
            } while (currentSkipItemsCount < maxItemCount);
        }

        /// <summary>
        /// Executes an asynchronous action in a paged manner with return values.
        /// </summary>
        /// <typeparam name="TPagedResult">Type of the paged result.</typeparam>
        /// <param name="executeFn">Async function to execute. Takes parameters: skipCount, pageSize.</param>
        /// <param name="maxItemCount">Maximum number of items to process.</param>
        /// <param name="pageSize">Size of each page.</param>
        /// <param name="pageDelayTime">Optional delay time between pages.</param>
        /// <param name="cancellationToken"></param>
        /// <returns>A task representing the asynchronous operation. The result is a list of paged results.</returns>
        public static async Task<List<TPagedResult>> ExecutePagingAsync<TPagedResult>(
            Func<int, int, Task<TPagedResult>> executeFn,
            long maxItemCount,
            int pageSize,
            TimeSpan? pageDelayTime = null,
            CancellationToken cancellationToken = default)
        {
            var currentSkipItemsCount = 0;
            var result = new List<TPagedResult>();

            do
            {
                if (cancellationToken.IsCancellationRequested) return result;

                var pagedResult = await executeFn(currentSkipItemsCount, pageSize);

                result.Add(pagedResult);
                currentSkipItemsCount += pageSize;

                if (currentSkipItemsCount < maxItemCount && pageDelayTime.HasValue) await Task.Delay(pageDelayTime.Value, cancellationToken);
            } while (currentSkipItemsCount < maxItemCount);

            return result;
        }

        /// <summary>
        /// Executes an asynchronous action repeatedly until it returns no items.
        /// </summary>
        /// <typeparam name="TItem">Type of items returned by the execute function.</typeparam>
        /// <param name="executeFn">Async function to execute.</param>
        /// <param name="maxExecutionCount">Maximum number of times to execute the function.</param>
        /// <param name="pageDelayTime">Optional delay time between executions.</param>
        /// <param name="cancellationToken"></param>
        /// <returns>A task representing the asynchronous operation.</returns>
        public static Task ExecuteScrollingPagingAsync<TItem>(
            Func<Task<IEnumerable<TItem>>> executeFn,
            int maxExecutionCount,
            TimeSpan? pageDelayTime = null,
            CancellationToken cancellationToken = default)
        {
            return ExecuteScrollingPagingAsync(executeFn: () => executeFn().Then(i => i.ToList()), maxExecutionCount, pageDelayTime, cancellationToken);
        }

        /// <summary>
        /// Executes an asynchronous action repeatedly until it returns no items.
        /// </summary>
        /// <typeparam name="TItem">Type of items returned by the execute function.</typeparam>
        /// <param name="executeFn">Async function to execute.</param>
        /// <param name="maxExecutionCount">Maximum number of times to execute the function.</param>
        /// <param name="pageDelayTime">Optional delay time between executions.</param>
        /// <param name="cancellationToken"></param>
        /// <returns>A task representing the asynchronous operation.</returns>
        public static async Task ExecuteScrollingPagingAsync<TItem>(
            Func<Task<List<TItem>>> executeFn,
            int maxExecutionCount,
            TimeSpan? pageDelayTime = null,
            CancellationToken cancellationToken = default)
        {
            var executionItemsResult = await executeFn();
            var totalExecutionCount = 1;

            while (totalExecutionCount <= maxExecutionCount && executionItemsResult.Any() && !cancellationToken.IsCancellationRequested)
            {
                if (pageDelayTime.HasValue) await Task.Delay(pageDelayTime.Value, cancellationToken);

                executionItemsResult = await executeFn();
                totalExecutionCount += 1;
            }
        }

        /// <summary>
        /// Executes an asynchronous action repeatedly until it returns no items, with no max execution limit.
        /// </summary>
        public static Task ExecuteScrollingPagingAsync<TItem>(
            Func<Task<IEnumerable<TItem>>> executeFn,
            TimeSpan? pageDelayTime = null,
            CancellationToken cancellationToken = default)
        {
            return ExecuteScrollingPagingAsync(executeFn: () => executeFn().Then(i => i.ToList()), pageDelayTime, cancellationToken);
        }

        /// <summary>
        /// Executes an asynchronous action repeatedly until it returns no items, with no max execution limit.
        /// </summary>
        public static async Task ExecuteScrollingPagingAsync<TItem>(
            Func<Task<List<TItem>>> executeFn,
            TimeSpan? pageDelayTime = null,
            CancellationToken cancellationToken = default)
        {
            var executionItemsResult = await executeFn();

            while (executionItemsResult.Any() && !cancellationToken.IsCancellationRequested)
            {
                if (pageDelayTime.HasValue) await Task.Delay(pageDelayTime.Value, cancellationToken);

                executionItemsResult = await executeFn();
            }
        }

        /// <summary>
        /// Executes paging where skip advances only over non-matched items, preventing cursor drift
        /// when matched items are removed during iteration.
        /// <para>
        /// Unlike standard offset paging (skip += pageSize), this advances skip by (pageCount - matchedCount),
        /// i.e. only over items that were NOT matched/removed. Items that shift position after deletion
        /// are still visited on the next page.
        /// </para>
        /// </summary>
        /// <param name="executeFn">
        /// Async function receiving (skip, take). Must return (PageCount, MatchedCount) where PageCount is
        /// the total items fetched before any filtering, and MatchedCount is how many were successfully
        /// removed from storage (positions vacated). Passing "found" count instead of "deleted" count will
        /// cause skip to under-advance, potentially revisiting non-stale items or looping indefinitely.
        /// </param>
        /// <param name="pageSize">Number of items per page.</param>
        /// <param name="cancellationToken"></param>
        public static async Task ExecuteAdaptiveSkipPagingAsync(
            Func<int, int, Task<(int PageCount, int MatchedCount)>> executeFn,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var skip = 0;

            while (!cancellationToken.IsCancellationRequested)
            {
                var (pageCount, matchedCount) = await executeFn(skip, pageSize);

                if (pageCount == 0) break;

                // Advance skip only over non-matched items — matched items were removed and no longer
                // occupy positions, so advancing by the full pageSize would overshoot and miss items
                // that shifted into the current window.
                skip += Math.Max(0, pageCount - matchedCount);

                if (pageCount < pageSize) break;
            }
        }
    }
}

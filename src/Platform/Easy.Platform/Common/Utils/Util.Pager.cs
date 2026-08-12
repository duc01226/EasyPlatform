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

        /// <summary>Backstop for <see cref="ExecuteCursorPagingAsync{TItem}" /> — a bug should fail loudly, not loop forever.</summary>
        public const int DefaultMaxCursorPageCount = 100_000;

        /// <summary>
        /// Keyset ("cursor") paging: each page asks for rows AFTER the last row of the previous page, instead of
        /// skipping a count. Use this when the loop body does NOT remove rows from its own query — e.g. it schedules
        /// background jobs, which mutate the rows LATER, in another scope.
        /// <para>
        /// Which pager to use:
        /// <list type="bullet">
        ///     <item><see cref="ExecutePagingAsync(Func{int, int, Task}, long, int, TimeSpan?, CancellationToken)" /> — offset paging. Only safe when the match set CANNOT change while you walk it; otherwise rows shift into the skipped range and are missed.</item>
        ///     <item><see cref="ExecuteScrollingPagingAsync{TItem}(Func{Task{List{TItem}}}, int, TimeSpan?, CancellationToken)" /> — re-runs the SAME query until it returns nothing. Needs the body to delete/update the rows it just read, in that same call, or it re-reads the same page forever.</item>
        ///     <item>THIS — the body reads rows but leaves them in the predicate. A cursor on an immutable unique key is immune to rows leaving the set, because "id &gt; last" never shifts.</item>
        /// </list>
        /// </para>
        /// <para>
        /// Example — dispatch one job per pending row without ever missing or repeating one:
        /// <code>
        /// await Util.Pager.ExecuteCursorPagingAsync(
        ///     afterId => repository.GetAllAsync(q => q
        ///         .Where(Order.PendingExpr())
        ///         .PipeIf(afterId != null, r => r.Where(p => p.Id.CompareTo(afterId) > 0))
        ///         .OrderBy(p => p.Id)          // MUST match the cursor field and direction
        ///         .Take(pageSize)),
        ///     order => order.Id,
        ///     pageSize,
        ///     page => page.ParallelAsync(o => scheduler.Schedule(...)).Then(() => true));
        /// </code>
        /// </para>
        /// </summary>
        /// <param name="fetchNextPageAsync">
        /// Builds and runs ONE page. Receives the previous page's last cursor (null on the first call) and must apply
        /// it as <c>Where(x =&gt; x.Key.CompareTo(cursor) &gt; 0)</c> INSIDE the query, plus a matching
        /// <c>OrderBy</c> and <c>Take(pageSize)</c>. Keeping query construction with the caller is deliberate: the
        /// cursor predicate has to sit where the store can serve it from an index.
        /// </param>
        /// <param name="cursorSelector">
        /// Reads the cursor key off an item. MUST be immutable, unique per item, and — because the strict-advance check
        /// below compares ORDINALLY to match how a store actually orders bytes — ASCII. That is not a style preference:
        /// <c>string.CompareTo</c> in the caller's query is CULTURE-sensitive, while MongoDB renders it to a byte-order
        /// <c>$gt</c> and EF Core to the column's collation, and the three disagree on mixed case ("a" &lt; "B" by
        /// culture, "a" &gt; "B" by byte). An id (ULID / GUID / ObjectId) is safe; a name, email or free-text field is not.
        /// </param>
        /// <param name="pageSize">Rows per page — the same value the caller passes to <c>Take</c>.</param>
        /// <param name="handlePageAsync">
        /// Processes one page. Return <c>true</c> to continue, <c>false</c> to stop the walk (e.g. a per-cycle bound
        /// was reached). Stopping early is the caller's decision and is never treated as an error.
        /// </param>
        /// <param name="maxPageCount">Hard ceiling on pages. Exceeding it throws rather than spinning.</param>
        /// <param name="cancellationToken"></param>
        /// <exception cref="InvalidOperationException">
        /// The cursor failed to advance, a page came back larger than <paramref name="pageSize" />, or
        /// <paramref name="maxPageCount" /> was exceeded — each of these means the caller's query and the arguments
        /// here disagree, which without these checks is an infinite loop or silent data loss.
        /// </exception>
        public static async Task ExecuteCursorPagingAsync<TItem>(
            Func<string?, Task<List<TItem>>> fetchNextPageAsync,
            Func<TItem, string> cursorSelector,
            int pageSize,
            Func<List<TItem>, Task<bool>> handlePageAsync,
            int maxPageCount = DefaultMaxCursorPageCount,
            CancellationToken cancellationToken = default)
        {
            if (pageSize <= 0) throw new ArgumentOutOfRangeException(nameof(pageSize), pageSize, "Page size must be positive.");

            string? cursor = null;
            var pageIndex = 0;

            while (!cancellationToken.IsCancellationRequested)
            {
                if (pageIndex >= maxPageCount)
                {
                    throw new InvalidOperationException(
                        $"{nameof(ExecuteCursorPagingAsync)} exceeded its {maxPageCount}-page ceiling at cursor '{cursor}'. The walk is not "
                        + "converging — usually the query's OrderBy does not match the cursor field/direction, or the cursor key is not unique.");
                }

                var page = await fetchNextPageAsync(cursor);
                pageIndex++;

                if (page.Count == 0) return;

                // A page bigger than asked for means Take(pageSize) is missing, so "page.Count < pageSize" can never end
                // the walk and the cursor may skip rows the caller never saw.
                if (page.Count > pageSize)
                {
                    throw new InvalidOperationException(
                        $"{nameof(ExecuteCursorPagingAsync)} received {page.Count} items for a page size of {pageSize}. The query is missing Take({pageSize}).");
                }

                var nextCursor = cursorSelector(page[^1]);

                // THE guard that makes this loop safe: the cursor must move strictly forward, or the next page repeats
                // this one. An unordered/mis-ordered query, or a non-unique cursor key, lands here instead of spinning.
                if (cursor != null && string.CompareOrdinal(nextCursor, cursor) <= 0)
                {
                    throw new InvalidOperationException(
                        $"{nameof(ExecuteCursorPagingAsync)} cursor did not advance ('{cursor}' -> '{nextCursor}'). The page must be ordered "
                        + "ASCENDING by the same key cursorSelector reads, and that key must be unique.");
                }

                cursor = nextCursor;

                if (!await handlePageAsync(page)) return;

                // Short page ⇒ nothing left after this cursor, because the query is ordered and bounded by Take.
                if (page.Count < pageSize) return;
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

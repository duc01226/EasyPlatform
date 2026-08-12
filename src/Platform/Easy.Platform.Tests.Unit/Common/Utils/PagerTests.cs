using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.Pager"/>.
/// </summary>
public class PagerTests : PlatformUnitTestBase
{
    // ── ExecutePagingAsync (void) ──

    [Fact]
    public async Task ExecutePagingAsync_ExecutesCorrectNumberOfPages()
    {
        var invocations = new List<(int Skip, int PageSize)>();

        await Util.Pager.ExecutePagingAsync(
            executeFn: (skip, pageSize) =>
            {
                invocations.Add((skip, pageSize));
                return Task.CompletedTask;
            },
            maxItemCount: 25,
            pageSize: 10);

        invocations.Should().HaveCount(3);
        invocations[0].Should().Be((0, 10));
        invocations[1].Should().Be((10, 10));
        invocations[2].Should().Be((20, 10));
    }

    [Fact]
    public async Task ExecutePagingAsync_ExactMultiple_ExecutesCorrectPages()
    {
        var invocationCount = 0;

        await Util.Pager.ExecutePagingAsync(
            executeFn: (_, _) =>
            {
                invocationCount++;
                return Task.CompletedTask;
            },
            maxItemCount: 20,
            pageSize: 10);

        invocationCount.Should().Be(2);
    }

    [Fact]
    public async Task ExecutePagingAsync_SinglePage_ExecutesOnce()
    {
        var invocationCount = 0;

        await Util.Pager.ExecutePagingAsync(
            executeFn: (_, _) =>
            {
                invocationCount++;
                return Task.CompletedTask;
            },
            maxItemCount: 5,
            pageSize: 10);

        invocationCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecutePagingAsync_CancellationRequested_StopsExecution()
    {
        using var cts = new CancellationTokenSource();
        var invocationCount = 0;

        await Util.Pager.ExecutePagingAsync(
            executeFn: (_, _) =>
            {
                invocationCount++;
                cts.Cancel();
                return Task.CompletedTask;
            },
            maxItemCount: 100,
            pageSize: 10,
            cancellationToken: cts.Token);

        invocationCount.Should().Be(1);
    }

    // ── ExecutePagingAsync<T> (with results) ──

    [Fact]
    public async Task ExecutePagingAsync_Generic_CollectsResults()
    {
        var results = await Util.Pager.ExecutePagingAsync(
            executeFn: (skip, pageSize) => Task.FromResult($"page-{skip / pageSize}"),
            maxItemCount: 30,
            pageSize: 10);

        results.Should().HaveCount(3);
        results[0].Should().Be("page-0");
        results[1].Should().Be("page-1");
        results[2].Should().Be("page-2");
    }

    [Fact]
    public async Task ExecutePagingAsync_Generic_SinglePage_ReturnsOneResult()
    {
        var results = await Util.Pager.ExecutePagingAsync(
            executeFn: (skip, pageSize) => Task.FromResult(skip),
            maxItemCount: 5,
            pageSize: 10);

        results.Should().HaveCount(1);
        results[0].Should().Be(0);
    }

    [Fact]
    public async Task ExecutePagingAsync_Generic_CancellationRequested_ReturnsPartialResults()
    {
        using var cts = new CancellationTokenSource();

        var results = await Util.Pager.ExecutePagingAsync(
            executeFn: (skip, pageSize) =>
            {
                cts.Cancel();
                return Task.FromResult(skip);
            },
            maxItemCount: 100,
            pageSize: 10,
            cancellationToken: cts.Token);

        results.Should().HaveCount(1);
    }

    [Fact]
    public async Task ExecutePagingAsync_Generic_PassesCorrectSkipAndPageSize()
    {
        var invocations = new List<(int Skip, int PageSize)>();

        await Util.Pager.ExecutePagingAsync(
            executeFn: (skip, pageSize) =>
            {
                invocations.Add((skip, pageSize));
                return Task.FromResult(0);
            },
            maxItemCount: 15,
            pageSize: 5);

        invocations.Should().HaveCount(3);
        invocations[0].Should().Be((0, 5));
        invocations[1].Should().Be((5, 5));
        invocations[2].Should().Be((10, 5));
    }

    // ── ExecuteCursorPagingAsync ──

    /// <summary>
    /// Simulates a store that serves "id > cursor, ordered, take N" — the only contract the pager requires.
    /// </summary>
    private static Func<string?, Task<List<string>>> FakeStore(IEnumerable<string> allIds, int pageSize)
    {
        var ordered = allIds.OrderBy(id => id, StringComparer.Ordinal).ToList();

        return cursor => Task.FromResult(
            ordered.Where(id => cursor == null || string.CompareOrdinal(id, cursor) > 0).Take(pageSize).ToList());
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_VisitsEveryItemExactlyOnce_AcrossPageBoundaries()
    {
        var allIds = Enumerable.Range(1, 25).Select(i => i.ToString("D3")).ToList();
        var visited = new List<string>();

        await Util.Pager.ExecuteCursorPagingAsync(
            FakeStore(allIds, 10),
            id => id,
            pageSize: 10,
            handlePageAsync: page =>
            {
                visited.AddRange(page);
                return Task.FromResult(true);
            });

        // Exactly once each, in order — the two failures this replaces are a missed item and a repeated one.
        visited.Should().BeEquivalentTo(allIds, options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_WhenTotalIsAnExactMultipleOfPageSize_StillTerminates()
    {
        // The boundary case: the last full page cannot tell "exhausted" from "more remain", so one extra empty
        // fetch must end the walk rather than loop.
        var fetchCount = 0;
        var allIds = Enumerable.Range(1, 20).Select(i => i.ToString("D3")).ToList();

        await Util.Pager.ExecuteCursorPagingAsync(
            cursor =>
            {
                fetchCount++;
                return FakeStore(allIds, 10)(cursor);
            },
            id => id,
            pageSize: 10,
            handlePageAsync: _ => Task.FromResult(true));

        fetchCount.Should().Be(3);
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_WhenRowsLeaveTheMatchSetMidWalk_MissesNothing()
    {
        // THE property offset paging does not have. Rows already visited are deleted while the walk continues —
        // with skip-based paging the surviving rows shift into the skipped range and are never seen.
        var remaining = Enumerable.Range(1, 30).Select(i => i.ToString("D3")).ToList();
        var visited = new List<string>();

        await Util.Pager.ExecuteCursorPagingAsync(
            cursor => Task.FromResult(
                remaining.Where(id => cursor == null || string.CompareOrdinal(id, cursor) > 0)
                    .OrderBy(id => id, StringComparer.Ordinal)
                    .Take(10)
                    .ToList()),
            id => id,
            pageSize: 10,
            handlePageAsync: page =>
            {
                visited.AddRange(page);
                page.ForEach(id => remaining.Remove(id)); // the mutation that breaks offset paging
                return Task.FromResult(true);
            });

        visited.Should().HaveCount(30);
        visited.Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_WhenHandlerReturnsFalse_StopsWithoutFetchingMore()
    {
        var fetchCount = 0;
        var allIds = Enumerable.Range(1, 100).Select(i => i.ToString("D3")).ToList();

        await Util.Pager.ExecuteCursorPagingAsync(
            cursor =>
            {
                fetchCount++;
                return FakeStore(allIds, 10)(cursor);
            },
            id => id,
            pageSize: 10,
            handlePageAsync: _ => Task.FromResult(false));

        // Early stop is a caller decision, not an error: one fetch, no exception.
        fetchCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_WhenTheQueryIgnoresTheCursor_ThrowsInsteadOfLoopingForever()
    {
        // The bug this guard exists for: a query whose OrderBy does not match the cursor (or that drops the cursor
        // predicate) returns the same page every call. Hand-rolled, that is an infinite loop hammering the database.
        var page = Enumerable.Range(1, 10).Select(i => i.ToString("D3")).ToList();

        var act = async () => await Util.Pager.ExecuteCursorPagingAsync(
            _ => Task.FromResult(page.ToList()),
            id => id,
            pageSize: 10,
            handlePageAsync: _ => Task.FromResult(true));

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*did not advance*");
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_WhenTheCursorGoesBackwards_ThrowsInsteadOfRepeatingRows()
    {
        // A DESCENDING OrderBy against an ascending cursor predicate: each page's last item is lower than the
        // previous cursor, so the walk would re-read rows indefinitely.
        var call = 0;

        var act = async () => await Util.Pager.ExecuteCursorPagingAsync(
            _ => Task.FromResult(call++ == 0 ? ["005", "004"] : new List<string> { "003", "002" }),
            id => id,
            pageSize: 2,
            handlePageAsync: _ => Task.FromResult(true));

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*did not advance*");
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_WhenTheQueryForgetsTake_Throws()
    {
        // Without Take, "page.Count < pageSize" can never end the walk and the cursor jumps past unvisited rows.
        var allIds = Enumerable.Range(1, 50).Select(i => i.ToString("D3")).ToList();

        var act = async () => await Util.Pager.ExecuteCursorPagingAsync(
            _ => Task.FromResult(allIds.ToList()),
            id => id,
            pageSize: 10,
            handlePageAsync: _ => Task.FromResult(true));

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*missing Take(10)*");
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_WhenTheCeilingIsReached_ThrowsRatherThanRunningUnbounded()
    {
        // Last-resort backstop for a non-convergence the strict-advance check cannot see (an ever-growing set).
        var next = 0;

        var act = async () => await Util.Pager.ExecuteCursorPagingAsync(
            _ => Task.FromResult(new List<string> { (++next).ToString("D9") }),
            id => id,
            pageSize: 1,
            handlePageAsync: _ => Task.FromResult(true),
            maxPageCount: 5);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*5-page ceiling*");
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_WhenCancelled_StopsWithoutThrowing()
    {
        using var cancellation = new CancellationTokenSource();
        var fetchCount = 0;

        await Util.Pager.ExecuteCursorPagingAsync(
            cursor => Task.FromResult(FakeStore(Enumerable.Range(1, 100).Select(i => i.ToString("D3")), 10)(cursor).Result),
            id => id,
            pageSize: 10,
            handlePageAsync: _ =>
            {
                fetchCount++;
                cancellation.Cancel();
                return Task.FromResult(true);
            },
            cancellationToken: cancellation.Token);

        fetchCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteCursorPagingAsync_EmptySet_DoesNothing()
    {
        var handled = false;

        await Util.Pager.ExecuteCursorPagingAsync(
            _ => Task.FromResult(new List<string>()),
            id => id,
            pageSize: 10,
            handlePageAsync: _ =>
            {
                handled = true;
                return Task.FromResult(true);
            });

        handled.Should().BeFalse();
    }
}

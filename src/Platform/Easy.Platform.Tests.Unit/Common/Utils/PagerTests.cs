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
}

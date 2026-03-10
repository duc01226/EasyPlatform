using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="ListExtension"/>.
/// </summary>
public class ListExtensionTests : PlatformUnitTestBase
{
    // ── RemoveWhere ──

    [Fact]
    public void RemoveWhere_RemovesMatchingItems()
    {
        IList<int> list = [1, 2, 3, 4, 5];

        var result = list.RemoveWhere(x => x > 3, out var removed);

        result.Should().BeEquivalentTo([1, 2, 3]);
        removed.Should().BeEquivalentTo([4, 5]);
    }

    [Fact]
    public void RemoveWhere_NoMatch_ReturnsOriginal()
    {
        IList<int> list = [1, 2, 3];

        var result = list.RemoveWhere(x => x > 10);

        result.Should().BeEquivalentTo([1, 2, 3]);
    }

    // ── RemoveMany ──

    [Fact]
    public void RemoveMany_RemovesSpecifiedItems()
    {
        IList<int> list = [1, 2, 3, 4, 5];

        var removed = list.RemoveMany([2, 4]);

        list.Should().BeEquivalentTo([1, 3, 5]);
        removed.Should().BeEquivalentTo([2, 4]);
    }

    // ── IsEmpty ──

    [Fact]
    public void IsEmpty_EmptyCollection_ReturnsTrue()
    {
        new List<int>().IsEmpty().Should().BeTrue();
    }

    [Fact]
    public void IsEmpty_NonEmptyCollection_ReturnsFalse()
    {
        new List<int> { 1 }.IsEmpty().Should().BeFalse();
    }

    // ── WhereIf ──

    [Fact]
    public void WhereIf_WhenConditionTrue_AppliesPredicate()
    {
        var items = new List<int> { 1, 2, 3, 4, 5 };

        var result = items.WhereIf(true, x => x > 3);

        result.Should().BeEquivalentTo([4, 5]);
    }

    [Fact]
    public void WhereIf_WhenConditionFalse_ReturnsAll()
    {
        var items = new List<int> { 1, 2, 3, 4, 5 };

        var result = items.WhereIf(false, x => x > 3);

        result.Should().BeEquivalentTo([1, 2, 3, 4, 5]);
    }

    // ── SelectList ──

    [Fact]
    public void SelectList_TransformsToList()
    {
        var items = new List<int> { 1, 2, 3 };

        var result = items.SelectList(x => x * 2);

        result.Should().BeOfType<List<int>>();
        result.Should().BeEquivalentTo([2, 4, 6]);
    }

    // ── ForEach (IEnumerable) ──

    [Fact]
    public void ForEach_ExecutesActionForEachItem()
    {
        var items = new List<int> { 1, 2, 3 };
        var sum = 0;

        items.ForEach(x => sum += x);

        sum.Should().Be(6);
    }

    [Fact]
    public void ForEach_WithIndex_PassesCorrectIndex()
    {
        var items = new List<string> { "a", "b", "c" };
        var indices = new List<int>();

        items.ForEach((_, i) => indices.Add(i));

        indices.Should().BeEquivalentTo([0, 1, 2]);
    }

    // ── ForEach (async) ──

    [Fact]
    public async Task ForEach_Async_ExecutesForEachItem()
    {
        var items = new List<int> { 1, 2, 3 };
        var results = new List<int>();

        await items.ForEach(MultiplyAction);

        async Task MultiplyAction(int x)
        {
            await Task.CompletedTask;
            results.Add(x * 2);
        }

        results.Should().BeEquivalentTo([2, 4, 6]);
    }
}

using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="ForEachLoopSupportNumberRangeExtension"/>.
/// </summary>
public class ForEachNumberRangeExtensionTests : PlatformUnitTestBase
{
    // -- Range GetEnumerator --

    [Fact]
    public void GetEnumerator_Range_IteratesInclusive()
    {
        var collected = new List<int>();

        foreach (var i in 1..5)
            collected.Add(i);

        collected.Should().BeEquivalentTo([1, 2, 3, 4, 5]);
    }

    [Fact]
    public void GetEnumerator_RangeStartingAtZero_IteratesFromZero()
    {
        var collected = new List<int>();

        foreach (var i in 0..3)
            collected.Add(i);

        collected.Should().BeEquivalentTo([0, 1, 2, 3]);
    }

    [Fact]
    public void GetEnumerator_SingleElementRange_ReturnsOneItem()
    {
        var collected = new List<int>();

        foreach (var i in 5..5)
            collected.Add(i);

        collected.Should().BeEquivalentTo([5]);
    }

    // -- int GetEnumerator --

    [Fact]
    public void GetEnumerator_Int_IteratesFromZeroToValue()
    {
        var collected = new List<int>();

        foreach (var i in 4)
            collected.Add(i);

        collected.Should().BeEquivalentTo([0, 1, 2, 3, 4]);
    }

    [Fact]
    public void GetEnumerator_IntZero_ReturnsSingleZero()
    {
        var collected = new List<int>();

        foreach (var i in 0)
            collected.Add(i);

        collected.Should().BeEquivalentTo([0]);
    }

    // -- Unsupported range --

    [Fact]
    public void GetEnumerator_FromEndRange_ThrowsNotSupported()
    {
        var act = () =>
        {
            foreach (var i in 1..)
            {
                // Should not reach here
                _ = i;
            }
        };

        act.Should().Throw<NotSupportedException>();
    }
}

#pragma warning disable CA1859 // IDictionary variables are intentional to test IDictionary-specific extension overloads

using System.Collections.Concurrent;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="DictionaryExtension"/>.
/// </summary>
public class DictionaryExtensionTests : PlatformUnitTestBase
{
    // ── Upsert ──

    [Fact]
    public void Upsert_NewKey_AddsEntry()
    {
        var dict = new Dictionary<string, int> { ["a"] = 1 };

        var result = dict.Upsert("b", 2);

        result.Should().ContainKey("b").WhoseValue.Should().Be(2);
        result.Should().BeSameAs(dict);
    }

    [Fact]
    public void Upsert_ExistingKey_UpdatesValue()
    {
        var dict = new Dictionary<string, int> { ["a"] = 1 };

        dict.Upsert("a", 99);

        dict["a"].Should().Be(99);
    }

    [Fact]
    public void Upsert_IDictionary_NewKey_AddsEntry()
    {
        IDictionary<string, int> dict = new Dictionary<string, int> { ["a"] = 1 };

        var result = dict.Upsert("b", 2);

        result.Should().ContainKey("b").WhoseValue.Should().Be(2);
    }

    [Fact]
    public void Upsert_IDictionary_ExistingKey_UpdatesValue()
    {
        IDictionary<string, int> dict = new Dictionary<string, int> { ["a"] = 1 };

        dict.Upsert("a", 42);

        dict["a"].Should().Be(42);
    }

    [Fact]
    public void Upsert_ConcurrentDictionary_AddsAndUpdates()
    {
        var dict = new ConcurrentDictionary<string, int>();
        dict.TryAdd("a", 1);

        dict.Upsert("a", 10);
        dict.Upsert("b", 20);

        dict["a"].Should().Be(10);
        dict["b"].Should().Be(20);
    }

    // ── GetValueOrDefault ──

    [Fact]
    public void GetValueOrDefault_KeyExists_ReturnsValue()
    {
        var dict = new Dictionary<string, int> { ["key"] = 42 };

        var result = dict.GetValueOrDefault("key", -1);

        result.Should().Be(42);
    }

    [Fact]
    public void GetValueOrDefault_KeyMissing_ReturnsDefault()
    {
        var dict = new Dictionary<string, int> { ["key"] = 42 };

        var result = dict.GetValueOrDefault("missing", -1);

        result.Should().Be(-1);
    }

    [Fact]
    public void GetValueOrDefault_NullKey_ReturnsDefault()
    {
        IDictionary<string, int> dict = new Dictionary<string, int> { ["key"] = 42 };

        var result = dict.GetValueOrDefault(null!, -1);

        result.Should().Be(-1);
    }

    [Fact]
    public void GetValueOrDefault_IDictionary_NoDefaultParam_ReturnsTypeDefault()
    {
        IDictionary<string, int> dict = new Dictionary<string, int>();

        var result = dict.GetValueOrDefault("missing");

        result.Should().Be(0);
    }

    [Fact]
    public void GetValueOrDefault_ConcurrentDictionary_ReturnsCorrectValue()
    {
        var dict = new ConcurrentDictionary<string, int>();
        dict.TryAdd("x", 5);

        dict.GetValueOrDefault("x", -1).Should().Be(5);
        dict.GetValueOrDefault("y", -1).Should().Be(-1);
        dict.GetValueOrDefault("y").Should().Be(0);
    }

    // ── Merge ──

    [Fact]
    public void Merge_CombinesTwoDictionaries()
    {
        IDictionary<string, int> first = new Dictionary<string, int> { ["a"] = 1, ["b"] = 2 };
        IDictionary<string, int> second = new Dictionary<string, int> { ["c"] = 3 };

        var result = first.Merge(second);

        result.Should().HaveCount(3);
        result["c"].Should().Be(3);
    }

    [Fact]
    public void Merge_DuplicateKey_KeepsFirstValue()
    {
        IDictionary<string, int> first = new Dictionary<string, int> { ["a"] = 1 };
        IDictionary<string, int> second = new Dictionary<string, int> { ["a"] = 99 };

        var result = first.Merge(second);

        result["a"].Should().Be(1);
    }

    [Fact]
    public void Merge_DoesNotMutateOriginal()
    {
        IDictionary<string, int> first = new Dictionary<string, int> { ["a"] = 1 };
        IDictionary<string, int> second = new Dictionary<string, int> { ["b"] = 2 };

        var result = first.Merge(second);

        first.Should().HaveCount(1);
        result.Should().HaveCount(2);
    }

    // ── UpsertMany ──

    [Fact]
    public void UpsertMany_AddsMultipleEntries()
    {
        var dict = new Dictionary<string, int> { ["a"] = 1 };
        var toAdd = new Dictionary<string, int> { ["b"] = 2, ["c"] = 3 };

        var result = dict.UpsertMany(toAdd);

        result.Should().HaveCount(3);
        result["b"].Should().Be(2);
        result["c"].Should().Be(3);
    }

    [Fact]
    public void UpsertMany_OverwritesExistingKeys()
    {
        var dict = new Dictionary<string, int> { ["a"] = 1 };
        var toAdd = new Dictionary<string, int> { ["a"] = 99 };

        dict.UpsertMany(toAdd);

        dict["a"].Should().Be(99);
    }

    // ── GetValueOrDefaultIgnoreCase ──

    [Fact]
    public void GetValueOrDefaultIgnoreCase_ExactMatch_ReturnsValue()
    {
        IDictionary<string, int> dict = new Dictionary<string, int> { ["Hello"] = 1 };

        var result = dict.GetValueOrDefaultIgnoreCase("Hello");

        result.Should().Be(1);
    }

    [Fact]
    public void GetValueOrDefaultIgnoreCase_DifferentCase_ReturnsValue()
    {
        IDictionary<string, int> dict = new Dictionary<string, int> { ["Hello"] = 1 };

        var result = dict.GetValueOrDefaultIgnoreCase("hello");

        result.Should().Be(1);
    }

    [Fact]
    public void GetValueOrDefaultIgnoreCase_NoMatch_ReturnsDefault()
    {
        IDictionary<string, int> dict = new Dictionary<string, int> { ["Hello"] = 1 };

        var result = dict.GetValueOrDefaultIgnoreCase("missing", -1);

        result.Should().Be(-1);
    }

    // ── TryGetValueOrDefault ──

    [Fact]
    public void TryGetValueOrDefault_KeyExists_ReturnsValue()
    {
        IDictionary<string, int> dict = new Dictionary<string, int> { ["a"] = 10 };

        var result = dict.TryGetValueOrDefault("a", -1);

        result.Should().Be(10);
    }

    [Fact]
    public void TryGetValueOrDefault_KeyMissing_ReturnsDefault()
    {
        IDictionary<string, int> dict = new Dictionary<string, int>();

        var result = dict.TryGetValueOrDefault("missing", -1);

        result.Should().Be(-1);
    }

    // ── GetValueOrKey ──

    [Fact]
    public void GetValueOrKey_KeyExists_ReturnsValue()
    {
        IDictionary<string, string> dict = new Dictionary<string, string> { ["key"] = "value" };

        dict.GetValueOrKey("key").Should().Be("value");
    }

    [Fact]
    public void GetValueOrKey_KeyMissing_ReturnsKey()
    {
        IDictionary<string, string> dict = new Dictionary<string, string>();

        dict.GetValueOrKey("missing").Should().Be("missing");
    }

    // ── GetValueOrFirst ──

    [Fact]
    public void GetValueOrFirst_KeyExists_ReturnsValue()
    {
        IDictionary<string, string> dict = new Dictionary<string, string> { ["a"] = "first", ["b"] = "second" };

        dict.GetValueOrFirst("b").Should().Be("second");
    }

    [Fact]
    public void GetValueOrFirst_KeyMissing_ReturnsFirstValue()
    {
        IDictionary<string, string> dict = new Dictionary<string, string> { ["a"] = "first", ["b"] = "second" };

        dict.GetValueOrFirst("missing").Should().Be("first");
    }
}

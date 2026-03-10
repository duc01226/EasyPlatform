using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="ObjectGeneralExtension"/> and related helpers.
/// Covers: As, Cast, TryCast, BoxedInArray, BoxedInList, IsValuesDifferent, Ensure.
/// </summary>
public class ObjectGeneralExtensionTests : PlatformUnitTestBase
{
    // ── As<T> ──

    [Fact]
    public void As_WhenCompatibleType_ReturnsCast()
    {
        object obj = "hello";

        ObjectGeneralExtension.As<string>(obj).Should().Be("hello");
    }

    [Fact]
    public void As_WhenIncompatibleType_ReturnsNull()
    {
        object obj = 42;

        ObjectGeneralExtension.As<string>(obj).Should().BeNull();
    }

    // ── Cast<T> ──

    [Fact]
    public void Cast_WhenCompatibleType_ReturnsCast()
    {
        object obj = "hello";

        obj.Cast<string>().Should().Be("hello");
    }

    [Fact]
    public void Cast_WhenIncompatibleType_ThrowsInvalidCastException()
    {
        object obj = 42;

        var act = () => obj.Cast<string>();

        act.Should().Throw<InvalidCastException>();
    }

    // ── TryCast<T> ──

    [Fact]
    public void TryCast_WhenCompatible_ReturnsTrueAndValue()
    {
        object obj = "hello";

        var success = obj.TryCast<string>(out var result);

        success.Should().BeTrue();
        result.Should().Be("hello");
    }

    [Fact]
    public void TryCast_WhenIncompatible_ReturnsFalse()
    {
        object obj = 42;

        var success = obj.TryCast<string>(out var result);

        success.Should().BeFalse();
        result.Should().BeNull();
    }

    // ── BoxedInArray ──

    [Fact]
    public void BoxedInArray_WrapsInSingleElementArray()
    {
        var result = "hello".BoxedInArray();

        result.Should().HaveCount(1);
        result[0].Should().Be("hello");
    }

    // ── BoxedInList ──

    [Fact]
    public void BoxedInList_WrapsInSingleElementList()
    {
        var result = 42.BoxedInList();

        result.Should().HaveCount(1);
        result[0].Should().Be(42);
    }

    // ── IsValuesDifferent ──

    [Fact]
    public void IsValuesDifferent_SameValues_ReturnsFalse()
    {
        "hello".IsValuesDifferent("hello").Should().BeFalse();
    }

    [Fact]
    public void IsValuesDifferent_DifferentValues_ReturnsTrue()
    {
        "hello".IsValuesDifferent("world").Should().BeTrue();
    }

    [Fact]
    public void IsValuesDifferent_NullVsValue_ReturnsTrue()
    {
        ((string?)null).IsValuesDifferent("hello").Should().BeTrue();
    }

    [Fact]
    public void IsValuesDifferent_BothNull_ReturnsFalse()
    {
        ((string?)null).IsValuesDifferent((string?)null).Should().BeFalse();
    }

    [Fact]
    public void IsValuesDifferent_SameIntegers_ReturnsFalse()
    {
        42.IsValuesDifferent(42).Should().BeFalse();
    }

    [Fact]
    public void IsValuesDifferent_DifferentIntegers_ReturnsTrue()
    {
        42.IsValuesDifferent(43).Should().BeTrue();
    }

    // ── Ensure (from EnsureExtension) ──

    [Fact]
    public void Ensure_WhenConditionMet_ReturnsValue()
    {
        var result = "hello".Ensure(v => v.Length > 0, () => new Exception("fail"));

        result.Should().Be("hello");
    }

    [Fact]
    public void Ensure_WhenConditionNotMet_Throws()
    {
        var act = () => "".Ensure(v => v.Length > 0, () => new InvalidOperationException("empty"));

        act.Should().Throw<InvalidOperationException>().WithMessage("empty");
    }

    [Fact]
    public void EnsureNotNull_WhenNotNull_ReturnsValue()
    {
        var result = "hello".EnsureNotNull(() => new Exception("null"));

        result.Should().Be("hello");
    }

    [Fact]
    public void EnsureNotNull_WhenNull_Throws()
    {
        var act = () => ((string?)null).EnsureNotNull(() => new InvalidOperationException("was null"));

        act.Should().Throw<InvalidOperationException>().WithMessage("was null");
    }

    // ── BoxedInTask (from TaskExtension) ──

    [Fact]
    public async Task BoxedInTask_WrapsValueInCompletedTask()
    {
        var result = await "hello".BoxedInTask();

        result.Should().Be("hello");
    }
}

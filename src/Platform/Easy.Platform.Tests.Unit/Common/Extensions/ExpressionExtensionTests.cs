using System.Linq.Expressions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="ExpressionExtension"/>.
/// </summary>
public class ExpressionExtensionTests : PlatformUnitTestBase
{
    // ── AndAlso ──

    [Fact]
    public void AndAlso_CombinesTwoPredicates()
    {
        Expression<Func<int, bool>> isPositive = x => x > 0;
        Expression<Func<int, bool>> isEven = x => x % 2 == 0;

        var combined = isPositive.AndAlso(isEven);
        var compiled = combined.Compile();

        compiled(4).Should().BeTrue();
        compiled(3).Should().BeFalse();
        compiled(-2).Should().BeFalse();
    }

    [Fact]
    public void AndAlso_WithConstantTrue_ReturnsSecond()
    {
        Expression<Func<int, bool>> alwaysTrue = x => true;
        Expression<Func<int, bool>> isPositive = x => x > 0;

        var combined = alwaysTrue.AndAlso(isPositive);
        var compiled = combined.Compile();

        compiled(5).Should().BeTrue();
        compiled(-1).Should().BeFalse();
    }

    // ── Or ──

    [Fact]
    public void Or_CombinesTwoPredicates()
    {
        Expression<Func<int, bool>> isNegative = x => x < 0;
        Expression<Func<int, bool>> isGreaterThan10 = x => x > 10;

        var combined = isNegative.Or(isGreaterThan10);
        var compiled = combined.Compile();

        compiled(-1).Should().BeTrue();
        compiled(20).Should().BeTrue();
        compiled(5).Should().BeFalse();
    }

    // ── Not ──

    [Fact]
    public void Not_NegatesPredicate()
    {
        Expression<Func<int, bool>> isPositive = x => x > 0;

        var negated = isPositive.Not();
        var compiled = negated.Compile();

        compiled(5).Should().BeFalse();
        compiled(-1).Should().BeTrue();
        compiled(0).Should().BeTrue();
    }

    // ── AndAlsoIf ──

    [Fact]
    public void AndAlsoIf_ConditionTrue_CombinesExpressions()
    {
        Expression<Func<int, bool>> isPositive = x => x > 0;

        var result = isPositive.AndAlsoIf(true, () => (Expression<Func<int, bool>>)(x => x < 100));
        var compiled = result.Compile();

        compiled(50).Should().BeTrue();
        compiled(-1).Should().BeFalse();
        compiled(200).Should().BeFalse();
    }

    [Fact]
    public void AndAlsoIf_ConditionFalse_ReturnsOriginal()
    {
        Expression<Func<int, bool>> isPositive = x => x > 0;

        var result = isPositive.AndAlsoIf(false, () => (Expression<Func<int, bool>>)(x => x < 100));
        var compiled = result.Compile();

        compiled(200).Should().BeTrue();
        compiled(-1).Should().BeFalse();
    }

    // ── IsConstantTrue / IsConstantFalse ──

    [Fact]
    public void IsConstantTrue_ConstantTrueExpression_ReturnsTrue()
    {
        Expression<Func<int, bool>> expr = x => true;

        expr.IsConstantTrue().Should().BeTrue();
    }

    [Fact]
    public void IsConstantTrue_NonConstantExpression_ReturnsFalse()
    {
        Expression<Func<int, bool>> expr = x => x > 0;

        expr.IsConstantTrue().Should().BeFalse();
    }

    [Fact]
    public void IsConstantFalse_ConstantFalseExpression_ReturnsTrue()
    {
        Expression<Func<int, bool>> expr = x => false;

        expr.IsConstantFalse().Should().BeTrue();
    }

    [Fact]
    public void IsConstantFalse_NonConstantExpression_ReturnsFalse()
    {
        Expression<Func<int, bool>> expr = x => x > 0;

        expr.IsConstantFalse().Should().BeFalse();
    }

    // ── GetPropertyName ──

    [Fact]
    public void GetPropertyName_SimpleProperty_ReturnsName()
    {
        Expression<Func<TestEntity, string>> expr = x => x.Name;

        var result = expr.GetPropertyName();

        result.Should().Be("Name");
    }

    [Fact]
    public void GetPropertyName_NestedProperty_ReturnsDottedPath()
    {
        Expression<Func<TestEntity, string>> expr = x => x.Inner.Value;

        var result = expr.GetPropertyName();

        result.Should().Be("Inner.Value");
    }

    [Fact]
    public void GetPropertyName_CustomSeparator_UsesSeparator()
    {
        Expression<Func<TestEntity, string>> expr = x => x.Inner.Value;

        var result = expr.GetPropertyName("/");

        result.Should().Be("Inner/Value");
    }

    // ── OrIf ──

    [Fact]
    public void OrIf_ConditionTrue_CombinesWithOr()
    {
        Expression<Func<int, bool>> isNegative = x => x < 0;

        var result = isNegative.OrIf(true, () => (Expression<Func<int, bool>>)(x => x > 100));
        var compiled = result.Compile();

        compiled(-5).Should().BeTrue();
        compiled(200).Should().BeTrue();
        compiled(50).Should().BeFalse();
    }

    [Fact]
    public void OrIf_ConditionFalse_ReturnsOriginal()
    {
        Expression<Func<int, bool>> isNegative = x => x < 0;

        var result = isNegative.OrIf(false, () => (Expression<Func<int, bool>>)(x => x > 100));
        var compiled = result.Compile();

        compiled(-5).Should().BeTrue();
        compiled(200).Should().BeFalse();
    }

    // ── AndAlsoNot ──

    [Fact]
    public void AndAlsoNot_NegatesCombinedResult()
    {
        Expression<Func<int, bool>> isPositive = x => x > 0;
        Expression<Func<int, bool>> isEven = x => x % 2 == 0;

        var combined = isPositive.AndAlsoNot(isEven);
        var compiled = combined.Compile();

        // NOT (positive AND even) => true for negative, odd-positive, and zero
        compiled(4).Should().BeFalse();
        compiled(3).Should().BeTrue();
        compiled(-2).Should().BeTrue();
    }

    // ── Test helper types ──

    private sealed class TestEntity
    {
        public string Name { get; set; } = string.Empty;
        public InnerEntity Inner { get; set; } = new();
    }

    private sealed class InnerEntity
    {
        public string Value { get; set; } = string.Empty;
    }
}

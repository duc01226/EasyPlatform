using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.ExpressionBuilder"/>.
/// </summary>
public sealed class UtilExpressionBuilderTests : PlatformUnitTestBase
{
    private sealed class TestItem
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    // ── BuildStringContainsExpression ──

    [Fact]
    public void BuildStringContainsExpression_MatchingValue_ReturnsTrue()
    {
        var expr = Util.ExpressionBuilder.BuildStringContainsExpression<TestItem>("Name", "hello");
        var compiled = expr.Compile();

        var result = compiled(new TestItem { Name = "say hello world" });

        result.Should().BeTrue();
    }

    [Fact]
    public void BuildStringContainsExpression_NonMatchingValue_ReturnsFalse()
    {
        var expr = Util.ExpressionBuilder.BuildStringContainsExpression<TestItem>("Name", "xyz");
        var compiled = expr.Compile();

        var result = compiled(new TestItem { Name = "hello world" });

        result.Should().BeFalse();
    }

    [Fact]
    public void BuildStringContainsExpression_EmptySearchString_ReturnsTrue()
    {
        var expr = Util.ExpressionBuilder.BuildStringContainsExpression<TestItem>("Name", "");
        var compiled = expr.Compile();

        var result = compiled(new TestItem { Name = "anything" });

        result.Should().BeTrue();
    }

    [Fact]
    public void BuildStringContainsExpression_ExactMatch_ReturnsTrue()
    {
        var expr = Util.ExpressionBuilder.BuildStringContainsExpression<TestItem>("Name", "exact");
        var compiled = expr.Compile();

        var result = compiled(new TestItem { Name = "exact" });

        result.Should().BeTrue();
    }

    // ── BuildChainExpression ──

    [Fact]
    public void BuildChainExpression_SingleMethod_CompilesAndEvaluates()
    {
        var expr = Util.ExpressionBuilder.BuildChainExpression<TestItem>(
            "Name",
            ("Contains", new object[] { "test" }));
        var compiled = expr.Compile();

        var result = compiled(new TestItem { Name = "this is a test" });

        result.Should().BeTrue();
    }

    [Fact]
    public void BuildChainExpression_ChainedMethods_CompilesAndEvaluates()
    {
        // Chain: Name.ToLower().Contains("hello")
        var expr = Util.ExpressionBuilder.BuildChainExpression<TestItem>(
            "Name",
            ("ToLower", null!),
            ("Contains", new object[] { "hello" }));
        var compiled = expr.Compile();

        var result = compiled(new TestItem { Name = "HELLO World" });

        result.Should().BeTrue();
    }

    [Fact]
    public void BuildChainExpression_NonMatchingChain_ReturnsFalse()
    {
        var expr = Util.ExpressionBuilder.BuildChainExpression<TestItem>(
            "Name",
            ("Contains", new object[] { "missing" }));
        var compiled = expr.Compile();

        var result = compiled(new TestItem { Name = "present" });

        result.Should().BeFalse();
    }

    [Fact]
    public void BuildChainExpression_NoChainMethods_ThrowsException()
    {
        var act = () => Util.ExpressionBuilder.BuildChainExpression<TestItem>("Name");

        act.Should().Throw<Exception>().WithMessage("*At least one chain method*");
    }
}

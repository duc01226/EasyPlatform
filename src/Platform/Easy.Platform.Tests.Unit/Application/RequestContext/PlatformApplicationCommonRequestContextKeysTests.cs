using Easy.Platform.Application.RequestContext;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Xunit;

namespace Easy.Platform.Tests.Unit.Application.RequestContext;

public class PlatformApplicationCommonRequestContextKeysTests : PlatformUnitTestBase
{
    [Fact]
    public void BuildConsumerOrEventHandlerPipeLineItem_ShouldRoundTripWithHasConsumerOrEventHandlerPipeLine()
    {
        IDictionary<string, object?> context = new Dictionary<string, object?>();
        context.SetConsumerOrEventHandlerPipeLine(
        [
            PlatformApplicationCommonRequestContextKeys.BuildConsumerOrEventHandlerPipeLineItem(
                "Employee-API",
                typeof(TestBusMessage),
                typeof(TestBusMessageConsumer))
        ]);

        context.HasConsumerOrEventHandlerPipeLine<TestBusMessage, TestBusMessageConsumer>().Should().BeTrue();
        context.HasConsumerOrEventHandlerPipeLine<TestBusMessage, OtherConsumer>().Should().BeFalse();
    }

    [Fact]
    public void HasConsumerOrEventHandlerPipeLine_WhenApplicationNameProvided_ShouldMatchExactApplication()
    {
        IDictionary<string, object?> context = new Dictionary<string, object?>();
        context.SetConsumerOrEventHandlerPipeLine(
        [
            PlatformApplicationCommonRequestContextKeys.BuildConsumerOrEventHandlerPipeLineItem(
                "Employee-API",
                typeof(TestBusMessage),
                typeof(TestBusMessageConsumer))
        ]);

        context.HasConsumerOrEventHandlerPipeLine<TestBusMessage, TestBusMessageConsumer>("Employee-API").Should().BeTrue();
        context.HasConsumerOrEventHandlerPipeLine<TestBusMessage, TestBusMessageConsumer>("Accounts").Should().BeFalse();
    }

    [Fact]
    public void HasConsumerOrEventHandlerPipeLine_WhenPipelineItemUsesUnsupportedFormat_ShouldReturnFalse()
    {
        IDictionary<string, object?> context = new Dictionary<string, object?>();
        context.SetConsumerOrEventHandlerPipeLine(["TestBusMessage::TestBusMessageConsumer"]);

        context.HasConsumerOrEventHandlerPipeLine<TestBusMessage, TestBusMessageConsumer>().Should().BeFalse();
    }

    [Trait("TechnicalSpec", "TC-CIRCSKIP-001")]
    [Fact]
    public void IsCircularPipeLineExceeded_AtOrAboveThreshold_True_BelowThreshold_False()
    {
        // max = 3 => length gate is max*2 = 6; the routing key must appear >= max (3) times
        // EXCLUDING the last (current) entry for the guard to fire. This pins the exact boundary
        // the old throw-guard used, now expressed as the shared predicate.
        const int max = 3;

        // Exactly max (3) occurrences of "A" before the last entry => circular (was: throw).
        new List<string> { "A", "A", "A", "B", "B", "A" }
            .IsCircularPipeLineExceeded("A", max)
            .Should().BeTrue("length 6 >= max*2 and 'A' appears exactly max times excluding the last entry");

        // Only max-1 (2) occurrences of "A" before the last entry => not circular.
        new List<string> { "A", "A", "B", "B", "B", "A" }
            .IsCircularPipeLineExceeded("A", max)
            .Should().BeFalse("'A' appears only max-1 times excluding the last entry");

        // Parity holds for a different threshold (max = 2 => length gate 4).
        new List<string> { "X", "X", "Y", "X" }
            .IsCircularPipeLineExceeded("X", 2)
            .Should().BeTrue("length 4 >= max*2 and 'X' appears exactly 2 times excluding the last entry");

        new List<string> { "X", "Y", "Y", "X" }
            .IsCircularPipeLineExceeded("X", 2)
            .Should().BeFalse("'X' appears only 1 time excluding the last entry");
    }

    [Trait("TechnicalSpec", "TC-CIRCSKIP-002")]
    [Fact]
    public void IsCircularPipeLineExceeded_WhenPipelineShorterThanMaxTimesTwo_ShortCircuitsToFalse()
    {
        const int max = 3;

        // Length 5 < max*2 (6): cheap-path short-circuit returns false even though "A" fills every slot.
        new List<string> { "A", "A", "A", "A", "A" }
            .IsCircularPipeLineExceeded("A", max)
            .Should().BeFalse("a pipeline shorter than max*2 is never treated as circular regardless of repeats");

        // Length 3 < 6: still false.
        new List<string> { "A", "A", "A" }
            .IsCircularPipeLineExceeded("A", max)
            .Should().BeFalse("a short pipeline can never trip the guard");

        // Empty pipeline: false.
        new List<string>()
            .IsCircularPipeLineExceeded("A", max)
            .Should().BeFalse("an empty pipeline is never circular");
    }

    [Trait("TechnicalSpec", "TC-CIRCSKIP-001")]
    [Fact]
    public void IsCircularPipeLineExceeded_ForAllSampledPipelines_MatchesOriginalInlinedGuardMath()
    {
        // Property (universally quantified): for ALL pipelines and thresholds, the extracted predicate
        // equals the original guard's inlined expression EXACTLY. This is the single-source-of-truth
        // parity invariant — a surviving mismatch would mean the consumer / event-handler / background-job
        // sites could drift from the boundary the old throw-guard enforced.
        const string routingKey = "RK";

        foreach (var max in new[] { 1, 2, 3, 4 })
        {
            foreach (var pipeline in BuildSamplePipelines(routingKey))
            {
                var expectedByOriginalInlinedMath =
                    pipeline.Count >= max * 2 &&
                    pipeline.Take(pipeline.Count - 1).Count(item => item == routingKey) >= max;

                pipeline.IsCircularPipeLineExceeded(routingKey, max)
                    .Should()
                    .Be(
                        expectedByOriginalInlinedMath,
                        "predicate must equal the original inlined math for max={0}, pipeline=[{1}]",
                        max,
                        string.Join(",", pipeline));
            }
        }
    }

    /// <summary>
    /// Yields a spread of pipelines (lengths 0..9, every key-count 0..length, both front- and
    /// back-loaded) so the <c>Take(Count-1)</c> "exclude the last entry" boundary is exercised with the
    /// routing key in AND out of the final slot.
    /// </summary>
    private static IEnumerable<List<string>> BuildSamplePipelines(string routingKey)
    {
        const string other = "OTHER";

        for (var length = 0; length <= 9; length++)
        {
            for (var keyCount = 0; keyCount <= length; keyCount++)
            {
                yield return BuildPipeline(length, keyCount, routingKey, other, keyAtFront: true);
                yield return BuildPipeline(length, keyCount, routingKey, other, keyAtFront: false);
            }
        }
    }

    private static List<string> BuildPipeline(int length, int keyCount, string routingKey, string other, bool keyAtFront)
    {
        var pipeline = new List<string>(length);

        for (var i = 0; i < length; i++)
        {
            var isKeySlot = keyAtFront ? i < keyCount : i >= length - keyCount;
            pipeline.Add(isKeySlot ? routingKey : other);
        }

        return pipeline;
    }

    private sealed class TestBusMessage;

    private sealed class TestBusMessageConsumer;

    private sealed class OtherConsumer;
}

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

    private sealed class TestBusMessage;

    private sealed class TestBusMessageConsumer;

    private sealed class OtherConsumer;
}

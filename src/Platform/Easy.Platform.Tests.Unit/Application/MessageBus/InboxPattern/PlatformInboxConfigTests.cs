using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.InboxPattern;

/// <summary>
/// Covers <see cref="PlatformInboxConfig"/> defaults and invariants. The hard-timeout default must
/// stay strictly greater than the ping-stale window so ping-based recovery remains the primary
/// signal under normal conditions and the wall-clock ceiling is only a fallback.
/// </summary>
public class PlatformInboxConfigTests : PlatformUnitTestBase
{
    [Fact]
    public void MaxProcessingDurationSeconds_DefaultsTo_7Days()
    {
        var config = new PlatformInboxConfig();

        // 7 days = 7 * 24 * 60 * 60 = 604800. Generous headroom for long-running legitimate consumers
        // (bulk migrations, batch imports, multi-hour ETL). Pinning this constant ensures any future
        // shortening is a deliberate, reviewed change — falsely killing a still-progressing consumer
        // causes duplicate-execution risk.
        config.MaxProcessingDurationSeconds.Should().Be(604800);
        config.MaxProcessingDurationSeconds.Should().Be(PlatformInboxBusMessage.DefaultMaxProcessingDurationSeconds);
    }

    [Fact]
    public void DefaultMaxProcessingDurationSeconds_MustExceedPingStaleWindow()
    {
        var pingStaleWindow =
            PlatformInboxBusMessage.CheckProcessingPingIntervalSeconds *
            PlatformInboxBusMessage.MaxAllowedProcessingPingMisses;

        PlatformInboxBusMessage.DefaultMaxProcessingDurationSeconds
            .Should()
            .BeGreaterThan(pingStaleWindow,
                "ping-based recovery must fire first under normal conditions; hard timeout is a fallback for hung consumers whose ping background task masks the ping-stale path");
    }
}

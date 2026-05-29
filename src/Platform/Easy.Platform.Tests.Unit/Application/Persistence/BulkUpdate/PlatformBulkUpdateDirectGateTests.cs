using Easy.Platform.Application.Persistence.BulkUpdate;
using Easy.Platform.Domain.Entities;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.Persistence.BulkUpdate;

public class PlatformBulkUpdateDirectGateTests
{
    [Fact]
    public void CanDirectUpdate_WhenNoHandlersAndNoConcurrencyFallback_ShouldAllowDirectUpdate()
    {
        var canDirectUpdate = PlatformBulkUpdateDirectGate.CanDirectUpdate(
            typeof(PlainEntity),
            dismissSendEvent: false,
            hasRegisteredEntityEventHandlers: false,
            hasProviderConcurrencyTokenThatRequiresFallback: false,
            PlatformBulkUpdateConcurrencyMode.PreserveExistingSemantics,
            out var deniedReason);

        canDirectUpdate.Should().BeTrue();
        deniedReason.Should().BeEmpty();
    }

    [Fact]
    public void CanDirectUpdate_WhenEventsEnabledAndHandlersRegistered_ShouldDenyDirectUpdate()
    {
        var canDirectUpdate = PlatformBulkUpdateDirectGate.CanDirectUpdate(
            typeof(PlainEntity),
            dismissSendEvent: false,
            hasRegisteredEntityEventHandlers: true,
            hasProviderConcurrencyTokenThatRequiresFallback: false,
            PlatformBulkUpdateConcurrencyMode.PreserveExistingSemantics,
            out var deniedReason);

        canDirectUpdate.Should().BeFalse();
        deniedReason.Should().Contain("registered entity event handlers");
    }

    [Fact]
    public void CanDirectUpdate_WhenRowVersionPreserveMode_ShouldDenyDirectUpdate()
    {
        var canDirectUpdate = PlatformBulkUpdateDirectGate.CanDirectUpdate(
            typeof(RowVersionEntity),
            dismissSendEvent: true,
            hasRegisteredEntityEventHandlers: false,
            hasProviderConcurrencyTokenThatRequiresFallback: false,
            PlatformBulkUpdateConcurrencyMode.PreserveExistingSemantics,
            out var deniedReason);

        canDirectUpdate.Should().BeFalse();
        deniedReason.Should().Contain("preserve mode requires per-row token checks");
    }

    [Fact]
    public void CanDirectUpdate_WhenRowVersionBypassModeAndNoProviderConcurrencyFallback_ShouldAllowDirectUpdate()
    {
        var canDirectUpdate = PlatformBulkUpdateDirectGate.CanDirectUpdate(
            typeof(RowVersionEntity),
            dismissSendEvent: true,
            hasRegisteredEntityEventHandlers: false,
            hasProviderConcurrencyTokenThatRequiresFallback: false,
            PlatformBulkUpdateConcurrencyMode.BypassOptimisticConcurrencyAndStampToken,
            out var deniedReason);

        canDirectUpdate.Should().BeTrue();
        deniedReason.Should().BeEmpty();
    }

    [Fact]
    public void CanDirectUpdate_WhenProviderConcurrencyTokenRequiresFallback_ShouldDenyDirectUpdate()
    {
        var canDirectUpdate = PlatformBulkUpdateDirectGate.CanDirectUpdate(
            typeof(PlainEntity),
            dismissSendEvent: true,
            hasRegisteredEntityEventHandlers: false,
            hasProviderConcurrencyTokenThatRequiresFallback: true,
            PlatformBulkUpdateConcurrencyMode.PreserveExistingSemantics,
            out var deniedReason);

        canDirectUpdate.Should().BeFalse();
        deniedReason.Should().Contain("provider concurrency tokens");
    }

    private sealed class PlainEntity;

    private sealed class RowVersionEntity : IRowVersionEntity
    {
        public string? ConcurrencyUpdateToken { get; set; }

        public object GetId()
        {
            return nameof(RowVersionEntity);
        }
    }
}

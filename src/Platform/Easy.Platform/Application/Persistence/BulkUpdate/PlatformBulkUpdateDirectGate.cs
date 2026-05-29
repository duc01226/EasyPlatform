using System;
using Easy.Platform.Domain.Entities;

namespace Easy.Platform.Application.Persistence.BulkUpdate;

internal static class PlatformBulkUpdateDirectGate
{
    public static bool CanDirectUpdate(
        Type entityType,
        bool dismissSendEvent,
        bool hasRegisteredEntityEventHandlers,
        bool hasProviderConcurrencyTokenThatRequiresFallback,
        PlatformBulkUpdateConcurrencyMode concurrencyMode,
        out string deniedReason)
    {
        if (!dismissSendEvent && hasRegisteredEntityEventHandlers)
        {
            deniedReason = $"{entityType.Name} has registered entity event handlers and events were not dismissed.";
            return false;
        }

        if (typeof(IRowVersionEntity).IsAssignableFrom(entityType) &&
            concurrencyMode == PlatformBulkUpdateConcurrencyMode.PreserveExistingSemantics)
        {
            deniedReason = $"{entityType.Name} implements IRowVersionEntity and preserve mode requires per-row token checks.";
            return false;
        }

        if (hasProviderConcurrencyTokenThatRequiresFallback)
        {
            deniedReason = $"{entityType.Name} has provider concurrency tokens that cannot be checked by predicate-only direct update.";
            return false;
        }

        deniedReason = string.Empty;
        return true;
    }
}

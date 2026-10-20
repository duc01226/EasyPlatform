using Easy.Platform.Infrastructures.MessageBus;

namespace PlatformExampleApp.TaskManagement.Contracts.Messages;

/// <summary>
/// Stable transport contract emitted when a TaskManagement task-board item is created.
/// </summary>
/// <remarks>
/// This is deliberately a payload-only contract. It carries no aggregate, repository, database, connection,
/// or provider type so the same assembly can be referenced by a composite host or a later standalone service.
/// </remarks>
public sealed class TaskBoardItemCreatedIntegrationEvent : PlatformTrackableBusMessage
{
    /// <summary>
    /// Stable logical name used by transport consumers and documentation across future assembly renames.
    /// </summary>
    public const string StableEventName = "TaskBoardItemCreated";

    /// <summary>
    /// Gets or sets the opaque TaskManagement item identifier.
    /// </summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the task title at creation time.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the serialized status value at creation time.
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <inheritdoc />
    public override string SubQueuePrefix()
    {
        return TaskId;
    }
}

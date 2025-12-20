namespace Easy.Platform.Domain.Events;

/// <summary>
/// Represents an event that is part of a unit of work.
/// </summary>
public interface IPlatformUowEvent
{
    /// <summary>
    /// Gets or sets the ID of the source unit of work.
    /// </summary>
    public string SourceUowId { get; set; }
}
